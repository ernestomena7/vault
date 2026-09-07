import '../src/lib/config/load-env';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import { generatePassword, hashPassword } from '../src/lib/auth/password';

/**
 * Seeds a usable starting point: one Admin and a taxonomy tree.
 *
 * The tree is duplicated under EVERY Approval Status, because that is how the
 * taxonomy is modelled (Quest belongs to a Status, Mission to a Quest, Stage to
 * a Mission). Without this, upload and transition could not be exercised before
 * User Story 4 exists.
 *
 * Idempotent: re-running leaves existing rows alone.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: url });
const db = drizzle(connection, { schema, mode: 'default' });

const STATUSES = [
  { name: 'Pending', dropboxPath: '/01 Pending', position: 1 },
  { name: 'In review', dropboxPath: '/02 In review', position: 2 },
  { name: 'Approved', dropboxPath: '/03 Approved', position: 3 },
  { name: 'Published', dropboxPath: '/04 Published', position: 4 },
];

/** The same tree is created beneath each status. */
const TREE = [
  {
    quest: 'Onboarding',
    missions: [
      { mission: 'Welcome', stages: ['Rough cut', 'Final'] },
      { mission: 'First steps', stages: ['Rough cut', 'Final'] },
    ],
  },
  {
    quest: 'Product tour',
    missions: [{ mission: 'Dashboard', stages: ['Rough cut', 'Final'] }],
  },
];

async function seed() {
  // --- Admin ---------------------------------------------------------------
  const adminEmail = 'admin@vault.local';
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (existingAdmin.length === 0) {
    const password = generatePassword();
    await db.insert(schema.users).values({
      email: adminEmail,
      name: 'Vault Admin',
      passwordHash: await hashPassword(password),
      role: 'admin',
      isActive: true,
    });
    console.log('\n  Admin account created');
    console.log(`    email:    ${adminEmail}`);
    console.log(`    password: ${password}`);
    console.log('  Shown once. Change it after signing in.\n');
  } else {
    console.log(`  Admin ${adminEmail} already exists — left unchanged.`);
  }

  // --- Taxonomy ------------------------------------------------------------
  let created = 0;

  for (const status of STATUSES) {
    const existing = await db
      .select()
      .from(schema.approvalStatuses)
      .where(eq(schema.approvalStatuses.name, status.name))
      .limit(1);

    let statusId: number;
    if (existing.length > 0 && existing[0]) {
      statusId = existing[0].id;
    } else {
      const [inserted] = await db.insert(schema.approvalStatuses).values(status).$returningId();
      statusId = inserted!.id;
      created += 1;
    }

    for (const { quest, missions } of TREE) {
      const questRows = await db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.approvalStatusId, statusId));
      const existingQuest = questRows.find((q) => q.nameNormalized === quest.trim().toLowerCase());

      let questId: number;
      if (existingQuest) {
        questId = existingQuest.id;
      } else {
        const [inserted] = await db
          .insert(schema.quests)
          .values({ approvalStatusId: statusId, name: quest, dropboxPath: `/${quest}` })
          .$returningId();
        questId = inserted!.id;
        created += 1;
      }

      for (const { mission, stages } of missions) {
        const missionRows = await db
          .select()
          .from(schema.missions)
          .where(eq(schema.missions.questId, questId));
        const existingMission = missionRows.find(
          (m) => m.nameNormalized === mission.trim().toLowerCase(),
        );

        let missionId: number;
        if (existingMission) {
          missionId = existingMission.id;
        } else {
          const [inserted] = await db
            .insert(schema.missions)
            .values({ questId, name: mission, dropboxPath: `/${mission}` })
            .$returningId();
          missionId = inserted!.id;
          created += 1;
        }

        const stageRows = await db
          .select()
          .from(schema.stages)
          .where(eq(schema.stages.missionId, missionId));

        for (const stage of stages) {
          const exists = stageRows.some((s) => s.nameNormalized === stage.trim().toLowerCase());
          if (!exists) {
            await db.insert(schema.stages).values({ missionId, name: stage });
            created += 1;
          }
        }
      }
    }
  }

  console.log(`  Taxonomy: ${created} new rows across ${STATUSES.length} approval statuses.`);
  console.log('\n  Note: these Dropbox folders are created on demand at upload time.');
}

await seed();
await connection.end();

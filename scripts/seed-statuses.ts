import '../src/lib/config/load-env';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, inArray, notInArray, sql } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

/**
 * Replaces the placeholder approval statuses with a real workflow.
 *
 * Edit STATUSES to match the folders that actually exist in Dropbox. Paths are
 * relative to DROPBOX_ROOT_PATH, and the names here are what people see in the
 * interface — both must match the real folder names exactly, because the folder
 * path is what routing uses.
 *
 * Refuses to remove a status that files already reference, for the same reason
 * the application does (FR-029).
 */
const STATUSES = [
  { name: '01 Assets', dropboxPath: '/01 Assets', position: 1 },
  { name: '02 Recording', dropboxPath: '/02 Recording', position: 2 },
  { name: '03 Ready for editing', dropboxPath: '/03 Ready for editing', position: 3 },
  { name: '04 Video processed', dropboxPath: '/04 Video processed', position: 4 },
  { name: '05 Ready for upload', dropboxPath: '/05 Ready for upload', position: 5 },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: url });
const db = drizzle(connection, { schema, mode: 'default' });

const wanted = STATUSES.map((s) => s.name);

// --- refuse to strand any file -------------------------------------------
const doomed = await db
  .select({ id: schema.approvalStatuses.id, name: schema.approvalStatuses.name })
  .from(schema.approvalStatuses)
  .where(notInArray(schema.approvalStatuses.name, wanted));

for (const status of doomed) {
  const [used] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(schema.files)
    .where(eq(schema.files.approvalStatusId, status.id));

  if (Number(used?.total ?? 0) > 0) {
    console.error(
      `Refusing to remove "${status.name}": ${used!.total} file(s) still use it. ` +
        'Move those files first, or deactivate the status in the app instead.',
    );
    process.exit(1);
  }
}

// --- clear the placeholder tree ------------------------------------------
const doomedIds = doomed.map((s) => s.id);
let removed = 0;

if (doomedIds.length > 0) {
  const questRows = await db
    .select({ id: schema.quests.id })
    .from(schema.quests)
    .where(inArray(schema.quests.approvalStatusId, doomedIds));

  for (const quest of questRows) {
    const missionRows = await db
      .select({ id: schema.missions.id })
      .from(schema.missions)
      .where(eq(schema.missions.questId, quest.id));

    for (const mission of missionRows) {
      await db.delete(schema.stages).where(eq(schema.stages.missionId, mission.id));
      await db.delete(schema.missions).where(eq(schema.missions.id, mission.id));
    }
    await db.delete(schema.quests).where(eq(schema.quests.id, quest.id));
  }

  await db
    .delete(schema.approvalStatuses)
    .where(inArray(schema.approvalStatuses.id, doomedIds));
  removed = doomedIds.length;
}

// --- write the real workflow ---------------------------------------------
// Positions are parked high first: the column is uniquely indexed, so an
// in-place rewrite would collide with itself part-way through.
const existing = await db.select().from(schema.approvalStatuses);
for (const [index, row] of existing.entries()) {
  await db
    .update(schema.approvalStatuses)
    .set({ position: 900_000 + index })
    .where(eq(schema.approvalStatuses.id, row.id));
}

let created = 0;
let updated = 0;

for (const status of STATUSES) {
  const match = existing.find((row) => row.name === status.name);
  if (match) {
    await db
      .update(schema.approvalStatuses)
      .set({ dropboxPath: status.dropboxPath, position: status.position, isActive: true })
      .where(eq(schema.approvalStatuses.id, match.id));
    updated += 1;
  } else {
    await db.insert(schema.approvalStatuses).values(status);
    created += 1;
  }
}

console.log(`Approval statuses: ${created} created, ${updated} updated, ${removed} removed.`);
for (const status of STATUSES) {
  console.log(`  ${status.position}. ${status.name}  ->  ${status.dropboxPath}`);
}
console.log('\nQuests, missions and stages are now yours to create in the app.');

await connection.end();

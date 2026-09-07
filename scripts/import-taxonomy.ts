import '../src/lib/config/load-env';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import { getDropboxStorage } from '../src/lib/storage/dropbox';
import { normalizeName } from '../src/lib/naming';

/**
 * Builds the taxonomy from the folder structure that already exists in Dropbox.
 *
 *   Approval Status  ->  the folders you configured (01 Assets, 02 Recording, …)
 *     Quest          ->  each folder inside a status
 *       Mission      ->  each folder inside a quest
 *         Stage      ->  each folder inside a mission
 *
 * Dropbox is the source of truth here: the script reads and never writes to it.
 * Nothing is deleted from the database either — an entry that exists is left
 * alone, so running this twice is safe and running it after adding folders
 * picks up only what is new.
 *
 *   npm run db:import-taxonomy            # apply
 *   npm run db:import-taxonomy -- --dry   # show what it would do, change nothing
 */
const dryRun = process.argv.includes('--dry');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: url });
const db = drizzle(connection, { schema, mode: 'default' });
const storage = getDropboxStorage();

const created = { quests: 0, missions: 0, stages: 0 };
const skipped = { quests: 0, missions: 0, stages: 0 };

/** A folder name is a name; the folder path is what routing uses. */
function pathSegment(name: string): string {
  return `/${name.trim()}`;
}

const statuses = await db
  .select()
  .from(schema.approvalStatuses)
  .orderBy(schema.approvalStatuses.position);

if (statuses.length === 0) {
  console.error('No approval statuses exist yet. Create them first (npm run db:statuses).');
  process.exit(1);
}

console.log(`\nReading Dropbox under "${process.env.DROPBOX_ROOT_PATH || '(app folder root)'}"`);
if (dryRun) console.log('DRY RUN — nothing will be written.\n');

for (const status of statuses) {
  const questFolders = await storage.listFolders(status.dropboxPath);
  console.log(`\n${status.name}  (${questFolders.length} quest folder(s))`);

  if (questFolders.length === 0) {
    console.log('   — empty in Dropbox, nothing to import');
    continue;
  }

  const existingQuests = await db
    .select()
    .from(schema.quests)
    .where(eq(schema.quests.approvalStatusId, status.id));

  for (const questFolder of questFolders) {
    let quest = existingQuests.find(
      (row) => row.nameNormalized === normalizeName(questFolder.name),
    );

    if (quest) {
      skipped.quests += 1;
      console.log(`   = ${questFolder.name}`);
    } else {
      console.log(`   + ${questFolder.name}`);
      created.quests += 1;
      if (!dryRun) {
        const [inserted] = await db
          .insert(schema.quests)
          .values({
            approvalStatusId: status.id,
            name: questFolder.name,
            dropboxPath: pathSegment(questFolder.name),
          })
          .$returningId();
        const reloaded = await db
          .select()
          .from(schema.quests)
          .where(eq(schema.quests.id, inserted!.id))
          .limit(1);
        quest = reloaded[0]!;
      }
    }

    const missionFolders = await storage.listFolders(questFolder.path);
    // A quest that does not exist yet cannot have existing missions, so an
    // empty list is the correct answer for a dry run — and recursing still
    // reports the whole tree rather than stopping at the first new folder.
    const existingMissions = quest
      ? await db.select().from(schema.missions).where(eq(schema.missions.questId, quest.id))
      : [];

    for (const missionFolder of missionFolders) {
      let mission = existingMissions.find(
        (row) => row.nameNormalized === normalizeName(missionFolder.name),
      );

      if (mission) {
        skipped.missions += 1;
        console.log(`      = ${missionFolder.name}`);
      } else {
        console.log(`      + ${missionFolder.name}`);
        created.missions += 1;
        if (!dryRun && quest) {
          const [inserted] = await db
            .insert(schema.missions)
            .values({
              questId: quest.id,
              name: missionFolder.name,
              dropboxPath: pathSegment(missionFolder.name),
            })
            .$returningId();
          const reloaded = await db
            .select()
            .from(schema.missions)
            .where(eq(schema.missions.id, inserted!.id))
            .limit(1);
          mission = reloaded[0]!;
        }
      }

      const stageFolders = await storage.listFolders(missionFolder.path);
      const existingStages = mission
        ? await db.select().from(schema.stages).where(eq(schema.stages.missionId, mission.id))
        : [];

      for (const stageFolder of stageFolders) {
        const already = existingStages.some(
          (row) => row.nameNormalized === normalizeName(stageFolder.name),
        );

        if (already) {
          skipped.stages += 1;
          console.log(`         = ${stageFolder.name}`);
          continue;
        }

        console.log(`         + ${stageFolder.name}`);
        created.stages += 1;
        if (!dryRun && mission) {
          await db
            .insert(schema.stages)
            .values({ missionId: mission.id, name: stageFolder.name });
        }
      }
    }
  }
}

console.log('\n---');
console.log(
  dryRun
    ? `Would create: ${created.quests} quest(s), ${created.missions} mission(s), ${created.stages} stage(s).`
    : `Created: ${created.quests} quest(s), ${created.missions} mission(s), ${created.stages} stage(s).`,
);
console.log(
  `Already present: ${skipped.quests} quest(s), ${skipped.missions} mission(s), ${skipped.stages} stage(s).`,
);
console.log('\nNothing in Dropbox was modified — this only ever reads.');

// A Stage is a name, not a folder: Vault puts files in the Mission folder and
// uses the Stage in the file name. Folders named per stage are read here as
// stage names, which is what makes an existing structure importable at all.
if (created.stages > 0 || skipped.stages > 0) {
  console.log(
    '\nNote: stage folders were read as stage NAMES. Vault stores files in the\n' +
      'mission folder and puts the stage in the file name, so it will not upload\n' +
      'into those per-stage subfolders.',
  );
}

await connection.end();

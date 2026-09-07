import '../src/lib/config/load-env';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '../src/lib/db/schema';
import { normalizeName } from '../src/lib/naming';

/**
 * Applies a standard set of stage names to every mission.
 *
 * A Stage is a name, not a folder — Vault stores the file in the mission's
 * folder and puts the stage in the file name. So stages cannot be imported from
 * Dropbox the way quests and missions can; they have to come from a template.
 *
 * Nothing is ever deleted. A mission that already has a stage keeps it, and a
 * stage outside this template (an existing "Stage 10", say) is left alone. That
 * makes re-running safe, and makes this usable again after adding missions.
 *
 *   npm run db:seed-stages            # apply
 *   npm run db:seed-stages -- --dry   # count what it would do, change nothing
 */
const TEMPLATE = [
  'Stage 01',
  'Stage 02',
  'Stage 03',
  'Stage 04',
  'Stage 05',
  'Stage 06',
  'Stage 07',
  'Stage 08',
  'Stage 09',
];

/** MySQL has a packet limit; inserting 8,000 rows in one statement risks it. */
const CHUNK = 500;

const dryRun = process.argv.includes('--dry');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: url });
const db = drizzle(connection, { schema, mode: 'default' });

const missions = await db.select({ id: schema.missions.id }).from(schema.missions);

if (missions.length === 0) {
  console.error('No missions exist yet. Run `npm run db:import-taxonomy` first.');
  process.exit(1);
}

// One query for every existing stage, rather than one per mission. At this
// scale the difference is seconds versus minutes.
const existing = await db
  .select({
    missionId: schema.stages.missionId,
    nameNormalized: schema.stages.nameNormalized,
  })
  .from(schema.stages);

const byMission = new Map<number, Set<string>>();
for (const stage of existing) {
  const set = byMission.get(stage.missionId) ?? new Set<string>();
  // Typed nullable only because MariaDB's generated-column grammar has no NOT
  // NULL slot to declare (schema.ts); it is computed from `name`, which is
  // itself NOT NULL, so it can never actually be null here.
  set.add(stage.nameNormalized!);
  byMission.set(stage.missionId, set);
}

const toInsert: Array<{ missionId: number; name: string }> = [];
let alreadyPresent = 0;

for (const mission of missions) {
  const present = byMission.get(mission.id) ?? new Set<string>();
  for (const name of TEMPLATE) {
    if (present.has(normalizeName(name))) {
      alreadyPresent += 1;
      continue;
    }
    toInsert.push({ missionId: mission.id, name });
  }
}

console.log(`\nMissions:        ${missions.length}`);
console.log(`Template:        ${TEMPLATE.length} stages (${TEMPLATE[0]} … ${TEMPLATE.at(-1)})`);
console.log(`Already present: ${alreadyPresent}`);
console.log(`${dryRun ? 'Would create' : 'To create'}:    ${toInsert.length}`);

if (dryRun) {
  console.log('\nDRY RUN — nothing was written.');
  await connection.end();
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log('\nEvery mission already has the full set. Nothing to do.');
  await connection.end();
  process.exit(0);
}

let written = 0;
for (let index = 0; index < toInsert.length; index += CHUNK) {
  const chunk = toInsert.slice(index, index + CHUNK);
  await db.insert(schema.stages).values(chunk);
  written += chunk.length;
  process.stdout.write(`\r  Inserted ${written} / ${toInsert.length}`);
}

console.log(`\n\nCreated ${written} stage(s). Nothing was deleted.`);

const total = await db.select({ id: schema.stages.id }).from(schema.stages);
console.log(`Stages in total: ${total.length}`);

await connection.end();

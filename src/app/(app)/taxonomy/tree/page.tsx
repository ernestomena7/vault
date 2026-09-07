import { requireAdmin } from '@/lib/auth/guards';
import {
  listApprovalStatuses,
  listMissions,
  listQuests,
  listStages,
} from '@/lib/db/queries/taxonomy';
import { TaxonomyTree } from './taxonomy-tree';

export const metadata = { title: 'Taxonomy · Vault' };
export const dynamic = 'force-dynamic';

/**
 * Quests, Missions and Stages, browsed down from an Approval Status (FR-028).
 *
 * The tree is scoped per status by design, so the parent chain is always
 * visible: the same Quest name under two statuses is genuinely two entries, and
 * hiding that would make the taxonomy confusing to maintain.
 */
export default async function TaxonomyTreePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; quest?: string; mission?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const statuses = await listApprovalStatuses();
  const statusId = params.status ? Number(params.status) : statuses[0]?.id;

  const quests = statusId ? await listQuests(statusId) : [];
  const questId = params.quest ? Number(params.quest) : undefined;

  const missions = questId ? await listMissions(questId) : [];
  const missionId = params.mission ? Number(params.mission) : undefined;

  const stages = missionId ? await listStages(missionId) : [];

  return (
    <div style={{ maxWidth: 980 }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1
          style={{
            fontSize: 'var(--text-heading-lg)',
            lineHeight: 'var(--leading-heading-lg)',
            fontWeight: 'var(--fw-semibold)',
          }}
        >
          Taxonomy
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          Each quest belongs to one approval status, each mission to one quest, each stage to one
          mission. The same names exist separately under every status.
        </p>
      </header>

      <TaxonomyTree
        statuses={statuses.map((s) => ({ id: s.id, name: s.name }))}
        selectedStatusId={statusId ?? null}
        quests={quests.map((q) => ({ id: q.id, name: q.name, path: q.dropboxPath, isActive: q.isActive }))}
        selectedQuestId={questId ?? null}
        missions={missions.map((m) => ({
          id: m.id,
          name: m.name,
          path: m.dropboxPath,
          isActive: m.isActive,
        }))}
        selectedMissionId={missionId ?? null}
        stages={stages.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive }))}
      />
    </div>
  );
}

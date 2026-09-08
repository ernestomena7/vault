'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, FileDropzone, Icon, Select } from '@/components/ds';
import { BatchFileRow, type BatchRow, type StageOption } from '@/components/batch-file-row';
import {
  AuthorizeError,
  uploadBatch,
  type BatchOutcome,
} from '@/lib/uploads/client-uploader';
import { MAX_BATCH_FILES } from '@/lib/validation';
// The same separator the server uses, so this preview cannot drift from the
// name that actually gets computed.
import { PART_SEPARATOR } from '@/lib/naming';

interface Option {
  id: number;
  name: string;
}

type Level = 'statuses' | 'quests' | 'missions' | 'stages';

async function fetchOptions(level: Level, parentId: number | null): Promise<Option[]> {
  const params: Record<Level, string> = {
    statuses: '',
    quests: `?approvalStatusId=${parentId}`,
    missions: `?questId=${parentId}`,
    stages: `?missionId=${parentId}`,
  };

  const response = await fetch(`/api/taxonomy/${level}${params[level]}`);
  if (!response.ok) return [];
  const body = (await response.json()) as { items: Option[] };
  return body.items;
}

/** Mirrors the server's rule, for the preview only. The server still decides. */
const FORBIDDEN_IN_TEXT = /[\\/:?*<>"|]/;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot + 1).toLowerCase();
}

let refCounter = 0;
const nextRef = () => `f${(refCounter += 1)}`;

export function UploadForm({
  statuses,
  storageReady = true,
}: {
  statuses: Option[];
  storageReady?: boolean;
}) {
  const [statusId, setStatusId] = useState<number | null>(null);
  const [questId, setQuestId] = useState<number | null>(null);
  const [missionId, setMissionId] = useState<number | null>(null);

  const [quests, setQuests] = useState<Option[]>([]);
  const [missions, setMissions] = useState<Option[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);

  const [rows, setRows] = useState<BatchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<BatchOutcome | null>(null);

  const selectedQuest = quests.find((q) => q.id === questId);
  const selectedMission = missions.find((m) => m.id === missionId);

  /**
   * Changing a shared selection clears everything below it, including every
   * per-file stage — those stages belong to the previous branch, and letting
   * them travel would send the server ids it must refuse (FR-013).
   */
  useEffect(() => {
    setQuestId(null);
    setMissions([]);
    setMissionId(null);
    setStages([]);
    setRows((current) => current.map((row) => ({ ...row, stageId: null })));
    if (statusId === null) {
      setQuests([]);
      return;
    }
    void fetchOptions('quests', statusId).then(setQuests);
  }, [statusId]);

  useEffect(() => {
    setMissionId(null);
    setStages([]);
    setRows((current) => current.map((row) => ({ ...row, stageId: null })));
    if (questId === null) {
      setMissions([]);
      return;
    }
    void fetchOptions('missions', questId).then(setMissions);
  }, [questId]);

  useEffect(() => {
    setRows((current) => current.map((row) => ({ ...row, stageId: null })));
    if (missionId === null) {
      setStages([]);
      return;
    }
    void fetchOptions('stages', missionId).then(setStages);
  }, [missionId]);

  const addFiles = useCallback((incoming: File[]) => {
    setBatchError(null);
    setOutcome(null);
    setRows((current) => {
      const room = MAX_BATCH_FILES - current.length;
      if (room <= 0) return current;
      return [
        ...current,
        ...incoming.slice(0, room).map((file) => ({
          clientRef: nextRef(),
          file,
          stageId: null,
          distinguishingText: '',
          state: 'queued' as const,
          percent: 0,
        })),
      ];
    });
  }, []);

  /** The name the server will compute, shown as the uploader types. */
  const previewFor = useCallback(
    (row: BatchRow): string | null => {
      if (!selectedQuest || !selectedMission || row.stageId === null) return null;
      const stage = stages.find((s) => s.id === row.stageId);
      if (!stage) return null;

      const parts = [selectedQuest.name, selectedMission.name, stage.name];
      const text = row.distinguishingText.trim();
      if (text) parts.push(text);

      const extension = extensionOf(row.file.name);
      const stem = parts.join(PART_SEPARATOR);
      return extension ? `${stem}.${extension}` : stem;
    },
    [selectedQuest, selectedMission, stages],
  );

  const textErrorFor = (row: BatchRow): string | null => {
    const text = row.distinguishingText.trim();
    if (!text) return null;
    if (FORBIDDEN_IN_TEXT.test(text)) return 'Cannot contain \\ / : ? * < > " |';
    if (text.length > 80) return 'Keep it under 80 characters';
    return null;
  };

  const missing = [
    !storageReady && 'a connected Dropbox account',
    rows.length === 0 && 'at least one file',
    statusId === null && 'an approval status',
    questId === null && 'a quest',
    missionId === null && 'a mission',
    rows.length > 0 &&
      rows.some((row) => row.stageId === null) &&
      `a stage for ${rows.filter((row) => row.stageId === null).length} file(s)`,
    rows.some((row) => textErrorFor(row) !== null) && 'a valid distinguishing text',
  ].filter(Boolean) as string[];

  const failedRows = useMemo(
    () => rows.filter((row) => row.state === 'failed'),
    [rows],
  );

  const submit = useCallback(
    async (only?: BatchRow[]) => {
      const batch = only ?? rows;
      if (statusId === null || questId === null || missionId === null) return;
      if (batch.some((row) => row.stageId === null)) return;

      setBusy(true);
      setBatchError(null);
      setOutcome(null);

      const refs = new Set(batch.map((row) => row.clientRef));
      setRows((current) =>
        current.map((row) =>
          refs.has(row.clientRef)
            ? { ...row, state: 'queued', percent: 0, error: undefined, conflict: undefined }
            : row,
        ),
      );

      try {
        const result = await uploadBatch(
          { approvalStatusId: statusId, questId, missionId },
          batch.map((row) => ({
            clientRef: row.clientRef,
            file: row.file,
            stageId: row.stageId!,
            distinguishingText: row.distinguishingText,
          })),
          {
            onFileProgress: (clientRef, percent) =>
              setRows((current) =>
                current.map((row) => (row.clientRef === clientRef ? { ...row, percent } : row)),
              ),
            onFileState: (clientRef, state, detail) =>
              setRows((current) =>
                current.map((row) =>
                  row.clientRef === clientRef
                    ? { ...row, state, ...(detail ? { error: detail } : {}) }
                    : row,
                ),
              ),
          },
        );
        setOutcome(result);
      } catch (error) {
        if (error instanceof AuthorizeError) {
          // Nothing transferred. Attach the refusal to the rows it names, so it
          // reads as a problem with those files rather than with the batch.
          setBatchError(error.message);
          setRows((current) =>
            current.map((row) =>
              error.conflicts.includes(row.clientRef)
                ? { ...row, conflict: error.message }
                : row,
            ),
          );
        } else {
          setBatchError(error instanceof Error ? error.message : 'The upload failed.');
        }
      } finally {
        setBusy(false);
      }
    },
    [rows, statusId, questId, missionId],
  );

  const toSelectOptions = (options: Option[], placeholder: string) => [
    { value: '', label: placeholder },
    ...options.map((option) => ({ value: String(option.id), label: option.name })),
  ];

  const asId = (value: string): number | null => (value === '' ? null : Number(value));

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {!storageReady && (
        <Card
          style={{
            padding: 'var(--space-5)',
            borderColor: 'var(--warning)',
            background: 'var(--warning-bg)',
            display: 'flex',
            gap: 'var(--space-3)',
            alignItems: 'flex-start',
          }}
        >
          <Icon name="alert-circle" size={18} color="var(--warning)" />
          <div>
            <strong style={{ color: 'var(--warning)' }}>Uploading is not available yet</strong>
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              Vault is not fully connected to Dropbox, so there is nowhere for a file to go. An
              administrator needs to finish that setup before anything can be uploaded. Everything
              else still works.
            </p>
          </div>
        </Card>
      )}

      <Card style={{ padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)' }}>
        <h2 className="eyebrow">Where these files belong</h2>
        <p
          style={{
            margin: 0,
            marginTop: 'calc(var(--space-2) * -1)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-body-sm)',
          }}
        >
          Chosen once, and applied to every file below.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <Select
            label="Approval status"
            value={statusId === null ? '' : String(statusId)}
            options={toSelectOptions(statuses, 'Choose a status')}
            disabled={busy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusId(asId(e.target.value))}
          />
          <Select
            label="Quest"
            value={questId === null ? '' : String(questId)}
            options={toSelectOptions(
              quests,
              statusId === null ? 'Choose a status first' : 'Choose a quest',
            )}
            disabled={busy || statusId === null}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuestId(asId(e.target.value))}
          />
          <Select
            label="Mission"
            value={missionId === null ? '' : String(missionId)}
            options={toSelectOptions(
              missions,
              questId === null ? 'Choose a quest first' : 'Choose a mission',
            )}
            disabled={busy || questId === null}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setMissionId(asId(e.target.value))
            }
          />
        </div>
      </Card>

      <Card style={{ padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)' }}>
        <FileDropzone
          accept="video/*"
          multiple
          disabled={busy || !storageReady || rows.length >= MAX_BATCH_FILES}
          onFiles={addFiles}
        />

        {rows.length >= MAX_BATCH_FILES && (
          <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 'var(--text-body-sm)' }}>
            That is the maximum of {MAX_BATCH_FILES} files in one batch.
          </p>
        )}

        {rows.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: 'var(--space-3)',
            }}
          >
            {rows.map((row) => (
              <BatchFileRow
                key={row.clientRef}
                row={row}
                stages={stages}
                disabled={busy}
                namePreview={previewFor(row)}
                textError={textErrorFor(row)}
                onStageChange={(stageId) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.clientRef === row.clientRef ? { ...item, stageId } : item,
                    ),
                  )
                }
                onTextChange={(distinguishingText) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.clientRef === row.clientRef ? { ...item, distinguishingText } : item,
                    ),
                  )
                }
                onRemove={() =>
                  setRows((current) =>
                    current.filter((item) => item.clientRef !== row.clientRef),
                  )
                }
              />
            ))}
          </ul>
        )}

        {missing.length > 0 && !busy && (
          <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 'var(--text-body-sm)' }}>
            Still needed: {missing.join(', ')}.
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button onClick={() => void submit()} loading={busy} disabled={missing.length > 0}>
            {rows.length > 1 ? `Upload ${rows.length} files` : 'Upload'}
          </Button>

          {failedRows.length > 0 && !busy && (
            <Button variant="secondary" onClick={() => void submit(failedRows)}>
              Retry {failedRows.length} failed
            </Button>
          )}
        </div>
      </Card>

      {batchError && (
        <Card
          style={{
            padding: 'var(--space-5)',
            borderColor: 'var(--danger)',
            background: 'var(--danger-bg)',
          }}
        >
          <strong style={{ color: 'var(--danger)' }}>Nothing was uploaded</strong>
          <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>
            {batchError}
          </p>
        </Card>
      )}

      {outcome && (
        <Card style={{ padding: 'var(--space-5)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: outcome.complete ? 'var(--success)' : 'var(--warning)',
            }}
          >
            <Icon name={outcome.complete ? 'check-circle-2' : 'alert-circle'} size={18} />
            <strong>
              {outcome.complete
                ? `All ${outcome.succeededFileIds.length} file(s) uploaded`
                : `${outcome.succeededFileIds.length} uploaded, ${outcome.failedRefs.length} failed`}
            </strong>
          </div>
          {!outcome.complete && (
            <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-secondary)' }}>
              The files that uploaded are saved and marked as part of an unfinished set. Retry the
              failures above, or dismiss the mark from My files.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

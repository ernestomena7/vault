import { describe, expect, it } from 'vitest';
import {
  DestinationOccupiedError,
  NotFoundError,
  StorageUnavailableError,
  type StoragePort,
} from '@/lib/storage/port';

/**
 * The storage port contract.
 *
 * Every implementation runs THIS suite — the fake and the Dropbox adapter both.
 * A fake that passes a different suite is worse than no fake: it lets tests go
 * green while the real adapter mishandles the provider.
 *
 * Items 2, 7 and 12 are where a naive implementation drifts. They encode
 * "already exists is fine", "absent is not a failure", and "never silently
 * autorename" — each of which a correctness requirement depends on.
 *
 * Source of truth: specs/001-dropbox-upload-approval/contracts/storage-port.md
 */

export interface ContractHarness {
  /** A clean adapter for one test. */
  create(): Promise<StoragePort> | StoragePort;
  /** Place a file without going through beginUpload. */
  seedFile(port: StoragePort, folderPath: string, fileName: string, sizeBytes?: number): Promise<void>;
  /** Force the next call to fail, for the failure assertions. Optional. */
  forceFailure?(port: StoragePort): void;
}

export function runStoragePortContract(name: string, harness: ContractHarness): void {
  describe(`storage port contract: ${name}`, () => {
    const setup = async () => harness.create();

    // --- ensureFolder -----------------------------------------------------

    describe('ensureFolder', () => {
      it('1. reports created:true for an absent folder', async () => {
        const port = await setup();
        const result = await port.ensureFolder('/01 Pending/Onboarding');
        expect(result.created).toBe(true);
        expect((await port.resolveFolder('/01 Pending/Onboarding')).exists).toBe(true);
      });

      it('2. succeeds with created:false when the folder already exists', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        // Must NOT throw. FR-036 creates counterparts blindly and relies on this.
        const again = await port.ensureFolder('/01 Pending/Onboarding');
        expect(again.created).toBe(false);
      });

      it('3. creates every missing ancestor of a nested path', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding/Welcome');
        expect((await port.resolveFolder('/01 Pending')).exists).toBe(true);
        expect((await port.resolveFolder('/01 Pending/Onboarding')).exists).toBe(true);
        expect((await port.resolveFolder('/01 Pending/Onboarding/Welcome')).exists).toBe(true);
      });

      it('4. rejects an invalid segment before calling the provider', async () => {
        const port = await setup();
        await expect(port.ensureFolder('/01 Pending/bad:name')).rejects.toThrow();
      });
    });

    // --- fileExists / getMetadata ----------------------------------------

    describe('fileExists and getMetadata', () => {
      it('5. reports a present file with its size', async () => {
        const port = await setup();
        await harness.seedFile(port, '/01 Pending/Onboarding', 'a.mp4', 2048);
        const probe = await port.fileExists('/01 Pending/Onboarding', 'a.mp4');
        expect(probe.exists).toBe(true);
        expect(probe.sizeBytes).toBe(2048);
      });

      it('6. reports an absent file as exists:false without throwing', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        const probe = await port.fileExists('/01 Pending/Onboarding', 'missing.mp4');
        expect(probe.exists).toBe(false);
      });

      it('7. raises NotFoundError from getMetadata, distinct from a transport failure', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        // This distinction drives both upload confirmation and FR-042's
        // broken-record state. Conflating them would mark files broken during
        // an outage.
        const error = await port
          .getMetadata('/01 Pending/Onboarding', 'missing.mp4')
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error).not.toBeInstanceOf(StorageUnavailableError);
      });
    });

    // --- listFolders ------------------------------------------------------

    describe('listFolders', () => {
      it('23. returns the immediate child folders, sorted by name', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Zebra');
        await port.ensureFolder('/01 Pending/Alpha');
        await port.ensureFolder('/01 Pending/Mango');

        const children = await port.listFolders('/01 Pending');
        expect(children.map((entry) => entry.name)).toEqual(['Alpha', 'Mango', 'Zebra']);
      });

      it('24. does not return grandchildren', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Quest/Mission');

        const children = await port.listFolders('/01 Pending');
        // A taxonomy import walks level by level; returning deeper folders here
        // would flatten the tree and invent quests that do not exist.
        expect(children.map((entry) => entry.name)).toEqual(['Quest']);
      });

      it('25. returns an empty list for a folder that does not exist', async () => {
        const port = await setup();
        // "Nothing there" and "no children" are the same answer to the caller,
        // so this must not throw.
        await expect(port.listFolders('/nowhere at all')).resolves.toEqual([]);
      });

      it('26. returns an empty list for a folder with no subfolders', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Empty');
        await expect(port.listFolders('/01 Pending/Empty')).resolves.toEqual([]);
      });

      it('27. reports a usable path for each child', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');

        const [child] = await port.listFolders('/01 Pending');
        // The path must be one the port itself accepts, or a caller cannot
        // recurse with it.
        expect((await port.resolveFolder(child!.path)).exists).toBe(true);
      });
    });

    // --- beginUpload ------------------------------------------------------

    describe('beginUpload', () => {
      it('8. returns a session id and a credential', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        const grant = await port.beginUpload('/01 Pending/Onboarding', 'a.mp4', 1024);
        expect(grant.sessionId).toBeTruthy();
        expect(grant.token).toBeTruthy();
        expect(grant.chunkSizeBytes).toBeGreaterThan(0);
      });

      it('9. reports a token expiry in the future', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        const grant = await port.beginUpload('/01 Pending/Onboarding', 'a.mp4', 1024);
        expect(grant.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
      });

      it('10. never returns the app refresh token or secret', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        const grant = await port.beginUpload('/01 Pending/Onboarding', 'a.mp4', 1024);
        const forbidden = [
          process.env.DROPBOX_REFRESH_TOKEN,
          process.env.DROPBOX_APP_SECRET,
        ].filter((v): v is string => Boolean(v) && (v as string).length > 8);
        for (const secret of forbidden) {
          expect(grant.token).not.toContain(secret);
        }
      });
    });

    // --- beginUploads (batches) ------------------------------------------

    describe('beginUploads', () => {
      it('19. opens one session per file under ONE credential', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');

        const grant = await port.beginUploads([
          { folderPath: '/01 Pending/Onboarding', fileName: 'a.mp4', sizeBytes: 1024 },
          { folderPath: '/01 Pending/Onboarding', fileName: 'b.mp4', sizeBytes: 2048 },
          { folderPath: '/01 Pending/Onboarding', fileName: 'c.mp4', sizeBytes: 4096 },
        ]);

        // One token for the batch is the whole point: twenty identical tokens
        // would buy nothing and cost twenty round trips.
        expect(grant.token).toBeTruthy();
        expect(grant.sessions).toHaveLength(3);
        expect(new Set(grant.sessions.map((session) => session.sessionId)).size).toBe(3);
      });

      it('20. returns sessions in the order the files were requested', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');

        const grant = await port.beginUploads([
          { folderPath: '/01 Pending/Onboarding', fileName: 'first.mp4', sizeBytes: 1024 },
          { folderPath: '/01 Pending/Onboarding', fileName: 'second.mp4', sizeBytes: 1024 },
        ]);

        // Callers pair sessions with files by index; a different order would
        // silently commit each file under the other one's name.
        expect(grant.sessions[0]!.commitPath).toContain('first.mp4');
        expect(grant.sessions[1]!.commitPath).toContain('second.mp4');
      });

      it('21. reports a token expiry in the future', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        const grant = await port.beginUploads([
          { folderPath: '/01 Pending/Onboarding', fileName: 'a.mp4', sizeBytes: 1024 },
        ]);
        expect(grant.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
      });

      it('22. rejects an invalid file name before calling the provider', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        await expect(
          port.beginUploads([
            { folderPath: '/01 Pending/Onboarding', fileName: 'bad:name.mp4', sizeBytes: 1024 },
          ]),
        ).rejects.toThrow();
      });
    });

    // --- moveFile ---------------------------------------------------------

    describe('moveFile', () => {
      it('11. moves to a free destination and preserves the id', async () => {
        const port = await setup();
        await harness.seedFile(port, '/01 Pending/Onboarding', 'a.mp4');
        const before = await port.fileExists('/01 Pending/Onboarding', 'a.mp4');
        await port.ensureFolder('/02 Approved/Onboarding');

        const moved = await port.moveFile('/01 Pending/Onboarding', '/02 Approved/Onboarding', 'a.mp4');

        expect(moved.id).toBe(before.id);
        expect((await port.fileExists('/01 Pending/Onboarding', 'a.mp4')).exists).toBe(false);
        expect((await port.fileExists('/02 Approved/Onboarding', 'a.mp4')).exists).toBe(true);
      });

      it('12. refuses an occupied destination and moves nothing', async () => {
        const port = await setup();
        await harness.seedFile(port, '/01 Pending/Onboarding', 'a.mp4');
        await harness.seedFile(port, '/02 Approved/Onboarding', 'a.mp4');

        // Provider autorename must be off. Silent renaming here would break
        // SC-001's guarantee that every stored name is the standard name.
        await expect(
          port.moveFile('/01 Pending/Onboarding', '/02 Approved/Onboarding', 'a.mp4'),
        ).rejects.toBeInstanceOf(DestinationOccupiedError);

        expect((await port.fileExists('/01 Pending/Onboarding', 'a.mp4')).exists).toBe(true);
      });

      it('13. raises NotFoundError for an absent source', async () => {
        const port = await setup();
        await port.ensureFolder('/01 Pending/Onboarding');
        await expect(
          port.moveFile('/01 Pending/Onboarding', '/02 Approved/Onboarding', 'ghost.mp4'),
        ).rejects.toBeInstanceOf(NotFoundError);
      });

      it('14. leaves the source in place after a failed move', async () => {
        const port = await setup();
        await harness.seedFile(port, '/01 Pending/Onboarding', 'a.mp4');
        await harness.seedFile(port, '/02 Approved/Onboarding', 'a.mp4');

        await port
          .moveFile('/01 Pending/Onboarding', '/02 Approved/Onboarding', 'a.mp4')
          .catch(() => undefined);

        const source = await port.fileExists('/01 Pending/Onboarding', 'a.mp4');
        expect(source.exists).toBe(true);
      });
    });

    // --- createTemporaryLink ---------------------------------------------

    describe('createTemporaryLink', () => {
      it('15. returns a URL with an expiry', async () => {
        const port = await setup();
        await harness.seedFile(port, '/01 Pending/Onboarding', 'a.mp4');
        const link = await port.createTemporaryLink('/01 Pending/Onboarding', 'a.mp4');
        expect(link.url).toMatch(/^https:\/\//);
        expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });

      it('16. never returns an unbounded link', async () => {
        const port = await setup();
        await harness.seedFile(port, '/01 Pending/Onboarding', 'a.mp4');
        const link = await port.createTemporaryLink('/01 Pending/Onboarding', 'a.mp4');
        // FR-043: bounded, not a permanent public URL.
        const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
        expect(link.expiresAt.getTime()).toBeLessThan(oneWeek);
      });
    });

    // --- failures ---------------------------------------------------------

    describe('failures', () => {
      it.runIf(harness.forceFailure)(
        '17. surfaces transport and provider errors as StorageUnavailableError',
        async () => {
          const port = await setup();
          harness.forceFailure?.(port);
          const error = await port.resolveFolder('/01 Pending').catch((e: unknown) => e);
          expect(error).toBeInstanceOf(StorageUnavailableError);
        },
      );

      it('18. exposes a retry hint field on StorageUnavailableError', () => {
        // Rate limiting arrives as StorageUnavailable carrying a hint, not as a
        // generic failure the caller cannot act on.
        const rateLimited = new StorageUnavailableError('rate limited', { retryAfterSeconds: 30 });
        expect(rateLimited.retryAfterSeconds).toBe(30);
        expect(new StorageUnavailableError('plain').retryAfterSeconds).toBeUndefined();
      });
    });
  });
}

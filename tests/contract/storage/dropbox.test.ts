import { describe, it } from 'vitest';

/**
 * The Dropbox adapter against the SAME contract suite as the fake.
 *
 * This run talks to a real Dropbox app folder, so it is opt-in: the default
 * `npm test` must complete with no network access (Constitution V). Enable it
 * with a configured .env.local and:
 *
 *   VAULT_TEST_DROPBOX=1 npm run test:contract
 *
 * It writes only under /__vault_contract_tests__ inside the app folder.
 */
const enabled = process.env.VAULT_TEST_DROPBOX === '1';

const TEST_ROOT = '/__vault_contract_tests__';

if (enabled) {
  const { getDropboxStorage } = await import('@/lib/storage/dropbox');
  const { runStoragePortContract } = await import('./port-contract');

  // Namespaced per run so a crashed run cannot poison the next one.
  const runId = `run-${Date.now()}`;

  runStoragePortContract('DropboxStorage', {
    create: () => {
      const port = getDropboxStorage();
      // Scope every path in the suite under a disposable prefix.
      return new Proxy(port, {
        get(target, property, receiver) {
          const original = Reflect.get(target, property, receiver) as unknown;
          if (typeof original !== 'function') return original;
          return (...args: unknown[]) => {
            const scoped = args.map((arg, index) =>
              typeof arg === 'string' && index < 2 && arg.startsWith('/')
                ? `${TEST_ROOT}/${runId}${arg}`
                : arg,
            );
            return (original as (...a: unknown[]) => unknown).apply(target, scoped);
          };
        },
      });
    },

    async seedFile() {
      throw new Error(
        'Seeding a file directly is not possible against real Dropbox: the adapter never handles ' +
          'file content by design (Constitution I). Run the fake suite for placement assertions, ' +
          'and quickstart V2 for the real end-to-end path.',
      );
    },
  });
} else {
  describe('storage port contract: DropboxStorage', () => {
    it.skip('requires VAULT_TEST_DROPBOX=1 and a configured Dropbox app', () => {});
  });
}

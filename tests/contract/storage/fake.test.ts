import { FakeStorage, createFakeStorage } from '@/lib/storage/fake';
import type { StoragePort } from '@/lib/storage/port';
import { runStoragePortContract } from './port-contract';

/**
 * The in-memory adapter against the shared contract. This is the run that keeps
 * `npm test` offline (Constitution V).
 */
runStoragePortContract('FakeStorage', {
  create: () => createFakeStorage(),

  async seedFile(port: StoragePort, folderPath: string, fileName: string, sizeBytes = 1024) {
    (port as FakeStorage).seedFile(folderPath, fileName, sizeBytes);
  },

  forceFailure(port: StoragePort) {
    (port as FakeStorage).failNext(1);
  },
});

import Dexie, { type Table } from 'dexie';

export type PendingEntry = {
  id: string;
  typeEvenementId: string;
  timestamp: string;
  description: string;
  localisation?: string;
  gravite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  photoUrl?: string;
  descriptionHash: string;
  clientUpdatedAt: string;
};

export type SyncConflict = {
  id?: number;
  entryId: string;
  reason: string;
  serverEntryId?: string;
  createdAt: string;
};

class MainCouranteDexie extends Dexie {
  pendingEntries!: Table<PendingEntry, string>;
  conflicts!: Table<SyncConflict, number>;

  constructor() {
    super('main-courante-offline');
    this.version(1).stores({
      pendingEntries: '&id, timestamp',
      conflicts: '++id, entryId, createdAt',
    });
  }
}

export const offlineDb = new MainCouranteDexie();

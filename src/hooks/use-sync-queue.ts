'use client';

import { useCallback, useEffect, useState } from 'react';
import { offlineDb, type PendingEntry } from '@/lib/offline/db';

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const count = await offlineDb.pendingEntries.count();
    setPendingCount(count);
  }, []);

  const enqueue = useCallback(async (entry: PendingEntry) => {
    await offlineDb.pendingEntries.put(entry);
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const syncManager = (reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }).sync;
      if (syncManager) {
        await syncManager.register('manual-entries-sync');
      }
    }
    await refreshCount();
  }, [refreshCount]);

  const syncNow = useCallback(async () => {
    const all = await offlineDb.pendingEntries.toArray();
    if (all.length === 0) return;

    const res = await fetch('/api/entries/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: all }),
    });
    if (!res.ok) return;

    const payload = (await res.json()) as {
      syncedIds: string[];
      conflicts: Array<{ entryId: string; reason: string; serverEntryId?: string }>;
    };

    if (payload.syncedIds.length) {
      await offlineDb.pendingEntries.bulkDelete(payload.syncedIds);
    }
    if (payload.conflicts.length) {
      await offlineDb.conflicts.bulkAdd(
        payload.conflicts.map((c) => ({ ...c, createdAt: new Date().toISOString() })),
      );
    }
    await refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    const listener = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'SYNC_PENDING_ENTRIES') {
        syncNow().catch(() => undefined);
      }
    };
    navigator.serviceWorker?.addEventListener('message', listener);
    return () => navigator.serviceWorker?.removeEventListener('message', listener);
  }, [refreshCount, syncNow]);

  return { pendingCount, enqueue, syncNow, refreshCount };
}

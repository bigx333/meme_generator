import type { ObservableParam } from '@legendapp/state'
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'
import { useValue } from '@legendapp/state/react'
import { configureSynced } from '@legendapp/state/sync'

import { subscribeToResource } from '@/lib/realtime'
import { normalizeCollection, syncedAsh } from '@/lib/syncedAsh'

const persistPlugin = observablePersistIndexedDB({
  databaseName: 'meme-generator-sync',
  version: 1,
  tableNames: ['templates', 'memes'],
})

export const syncAsh = configureSynced(syncedAsh, {
  changesSince: 'last-sync',
  fieldDeleted: 'archivedAt',
  fieldId: 'id',
  fieldUpdatedAt: 'updatedAt',
  mode: 'merge',
  persist: {
    plugin: persistPlugin,
    retrySync: true,
  },
  retry: {
    delay: 1000,
    infinite: true,
  },
  subscribeResource: subscribeToResource,
})

export function useSyncedCollection<TItem>(value$: ObservableParam<unknown>): TItem[] {
  return normalizeCollection<TItem>(useValue(value$))
}

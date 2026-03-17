import { observable, syncState, type ObservableParam } from '@legendapp/state'
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'
import { syncedCrud } from '@legendapp/state/sync-plugins/crud'

import type { IncrementalListRpc } from '@/lib/ashRpc'
import { subscribeToResource } from '@/lib/realtime'

const persistPlugin = observablePersistIndexedDB({
  databaseName: 'meme-generator-sync',
  version: 1,
  tableNames: ['templates', 'memes'],
})

type CollectionConfig<TItem extends { id: number }> = {
  changesSince?: 'last-sync'
  rpc: {
    list: () => Promise<TItem[]>
    listSince?: (since: number) => Promise<TItem[]>
  }
  persistName: 'templates' | 'memes'
  resourceName: string
}

export function createSyncedAshCollection<TItem extends { id: number }>(config: CollectionConfig<TItem>) {
  return observable(
    syncedCrud<TItem, TItem>({
      changesSince: config.changesSince,
      fieldId: 'id',
      fieldUpdatedAt: 'updatedAt',
      fieldDeleted: 'archivedAt',
      list: async ({ lastSync }) => {
        if (config.changesSince === 'last-sync' && lastSync != null && config.rpc.listSince) {
          return config.rpc.listSince(lastSync)
        }

        return config.rpc.list()
      },
      mode: 'merge',
      persist: {
        name: config.persistName,
        plugin: persistPlugin,
        retrySync: true,
      },
      retry: {
        infinite: true,
        delay: 1000,
      },
      subscribe: ({ refresh }) => subscribeToResource(config.resourceName, refresh),
    }),
  )
}

export async function syncCollection(value$: ObservableParam<unknown>) {
  await syncState(value$).sync()
}

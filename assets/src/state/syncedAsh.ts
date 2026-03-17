import { observable, syncState, type ObservableParam } from '@legendapp/state'
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'
import { syncedCrud } from '@legendapp/state/sync-plugins/crud'

import { subscribeToResource } from '@/lib/realtime'

const persistPlugin = observablePersistIndexedDB({
  databaseName: 'meme-generator-sync',
  version: 1,
  tableNames: ['templates', 'memes'],
})

type CollectionConfig<TItem extends { id: number }> = {
  persistName: 'templates' | 'memes'
  resourceName: string
  list: () => Promise<TItem[]>
}

export function createSyncedAshCollection<TItem extends { id: number }>(config: CollectionConfig<TItem>) {
  return observable(
    syncedCrud<TItem, TItem, 'array'>({
      as: 'array',
      fieldId: 'id',
      list: async () => config.list(),
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

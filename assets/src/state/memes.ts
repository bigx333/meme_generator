import { memesCollectionRpc, templatesCollectionRpc } from '@/lib/ashRpc'
import type { Meme, MemeTemplate } from '@/lib/types'
import { createSyncedAshCollection, syncCollection, useSyncedCollection } from './syncedAsh'

export const templates$ = createSyncedAshCollection<MemeTemplate>({
  persistName: 'templates',
  resourceName: 'MemeTemplate',
  rpc: templatesCollectionRpc,
})

export const memes$ = createSyncedAshCollection<Meme>({
  persistName: 'memes',
  resourceName: 'Meme',
  rpc: memesCollectionRpc,
})

export async function ensureMemeDataLoaded() {
  await Promise.all([syncCollection(templates$), syncCollection(memes$)])
}

export async function refreshMemes() {
  await syncCollection(memes$)
}

export function useTemplates(): MemeTemplate[] {
  return useSyncedCollection<MemeTemplate>(templates$)
}

export function useMemes(): Meme[] {
  return useSyncedCollection<Meme>(memes$)
}

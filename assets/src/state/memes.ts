import { observable } from '@legendapp/state'

import { memesResource, templatesResource } from '@/lib/ashRpc'
import type { Meme, MemeTemplate } from '@/lib/types'
import { syncCollection } from '@/lib/syncedAsh'
import { syncAsh, useSyncedCollection } from './sync'

export const templates$ = observable(syncAsh({
  ...templatesResource,
  persist: { name: 'templates' },
}))

export const memes$ = observable(syncAsh({
  ...memesResource,
  persist: { name: 'memes' },
}))

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

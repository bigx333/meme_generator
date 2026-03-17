import { useValue } from '@legendapp/state/react'

import { fetchMemes, fetchTemplates } from '@/lib/ashRpc'
import type { Meme, MemeTemplate } from '@/lib/types'
import { createSyncedAshCollection, syncCollection } from './syncedAsh'

export const templates$ = createSyncedAshCollection<MemeTemplate>({
  persistName: 'templates',
  resourceName: 'MemeTemplate',
  list: fetchTemplates,
})

export const memes$ = createSyncedAshCollection<Meme>({
  persistName: 'memes',
  resourceName: 'Meme',
  list: fetchMemes,
})

export async function ensureMemeDataLoaded() {
  await Promise.all([syncCollection(templates$), syncCollection(memes$)])
}

export async function refreshMemes() {
  await syncCollection(memes$)
}

export function useTemplates(): MemeTemplate[] {
  return (useValue(templates$) as MemeTemplate[] | undefined) ?? []
}

export function useMemes(): Meme[] {
  return (useValue(memes$) as Meme[] | undefined) ?? []
}

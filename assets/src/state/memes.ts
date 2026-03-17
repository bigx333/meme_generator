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

function normalizeCollection<TItem>(value: unknown): TItem[] {
  if (Array.isArray(value)) return value as TItem[]
  if (value && typeof value === 'object') return Object.values(value) as TItem[]
  return []
}

export function useTemplates(): MemeTemplate[] {
  return normalizeCollection<MemeTemplate>(useValue(templates$))
}

export function useMemes(): Meme[] {
  return normalizeCollection<Meme>(useValue(memes$))
}

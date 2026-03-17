import { observable } from '@legendapp/state'

import { buildMemeLabel, memesResource, templatesResource } from '@/lib/ashRpc'
import { memeLineSchema, type Meme, type MemeLine, type MemeTemplate } from '@/lib/types'
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

let nextLocalMemeId = -1

export function createMeme(input: {
  template: MemeTemplate
  lines: MemeLine[]
  renderDataUrl?: string | null
}) {
  const updatedAt = Date.now()
  const optimisticMeme: Meme = {
    id: nextLocalMemeId--,
    templateId: input.template.id,
    label: buildMemeLabel(input.template.name, input.lines),
    lines: input.lines.map((line) => memeLineSchema.parse(line)),
    renderDataUrl: input.renderDataUrl ?? null,
    archivedAt: null,
    createdAt: Math.floor(updatedAt / 1000),
    updatedAt,
  }

  memes$[optimisticMeme.id].set(optimisticMeme)

  return optimisticMeme
}

export function updateMeme(
  id: number,
  input: Partial<Pick<Meme, 'templateId' | 'label' | 'lines' | 'renderDataUrl'>>,
) {
  const current = memes$[id].peek()

  if (!current) {
    throw new Error(`Cannot update meme ${id}: not found`)
  }

  memes$[id].assign({
    ...input,
    lines: input.lines?.map((line) => memeLineSchema.parse(line)),
    updatedAt: Date.now(),
  })
}

export function deleteMeme(id: number) {
  if (!memes$[id].peek()) {
    return
  }

  memes$[id].delete()
}

export function useTemplates(): MemeTemplate[] {
  return useSyncedCollection<MemeTemplate>(templates$)
}

export function useMemes(): Meme[] {
  return useSyncedCollection<Meme>(memes$)
}

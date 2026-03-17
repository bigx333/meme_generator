import { memeResourceMeta, memeTemplateResourceMeta } from '../../js/ash_rpc'
import { memeSchema, memeTemplateSchema, type MemeLine } from './types'
import { defineAshResource } from './syncedAsh'

export function buildMemeLabel(templateName: string, lines: MemeLine[]): string {
  const fragments = lines.map((line) => line.text.trim()).filter(Boolean)
  return fragments.join(' · ').slice(0, 88) || templateName
}

export const templatesResource = defineAshResource({
  defaults: {
    aiPlacements: [],
  },
  meta: memeTemplateResourceMeta,
  schema: memeTemplateSchema,
})

export const memesResource = defineAshResource({
  meta: memeResourceMeta,
  schema: memeSchema,
  sort: (left, right) => right.createdAt - left.createdAt,
})

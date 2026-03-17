import {
  createMeme,
  listMemes,
  listMemesSince,
  listTemplates,
  listTemplatesSince,
  type CreateMemeFields,
  type ListMemesFields,
  type ListMemesSinceFields,
  type ListTemplatesFields,
  type ListTemplatesSinceFields,
} from '../../js/ash_rpc'
import {
  memeLineSchema,
  memeSchema,
  memeTemplateSchema,
  type Meme,
  type MemeLine,
  type MemeTemplate,
} from './types'
import { defineAshResource, runAshAction } from './syncedAsh'

const templateFields = [
  'id',
  'name',
  'imageUrl',
  'width',
  'height',
  'boxCount',
  'source',
  'createdAt',
  'updatedAt',
  { placements: ['id', 'label', 'x', 'y', 'width', 'height', 'align'] },
  { aiPlacements: ['id', 'label', 'x', 'y', 'width', 'height', 'align'] },
] satisfies ListTemplatesFields & ListTemplatesSinceFields

const memeFields = [
  'id',
  'templateId',
  'label',
  'createdAt',
  'updatedAt',
  'archivedAt',
  'renderDataUrl',
  { lines: ['id', 'text', 'align'] },
] satisfies ListMemesFields & ListMemesSinceFields & CreateMemeFields

function buildLabel(templateName: string, lines: MemeLine[]): string {
  const fragments = lines.map((line) => line.text.trim()).filter(Boolean)
  return fragments.join(' · ').slice(0, 88) || templateName
}
export const templatesResource = defineAshResource<MemeTemplate, typeof templateFields>({
  resourceName: 'MemeTemplate',
  defaults: {
    aiPlacements: [],
  },
  fields: templateFields,
  list: listTemplates,
  listSince: listTemplatesSince,
  schema: memeTemplateSchema,
})

export const memesResource = defineAshResource<Meme, typeof memeFields>({
  fields: memeFields,
  list: listMemes,
  listSince: listMemesSince,
  resourceName: 'Meme',
  schema: memeSchema,
  sort: (left, right) => right.createdAt - left.createdAt,
})

export async function createMemeRecord(input: {
  template: MemeTemplate
  lines: MemeLine[]
  renderDataUrl?: string | null
}): Promise<Meme> {
  const lines = input.lines.map((line) => memeLineSchema.parse(line))
  return runAshAction({
    action: createMeme,
    input: {
      templateId: input.template.id,
      label: buildLabel(input.template.name, lines),
      lines,
      renderDataUrl: input.renderDataUrl ?? null,
    },
    resource: memesResource,
  })
}

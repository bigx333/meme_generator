import {
  createMeme,
  destroyMeme,
  listMemes,
  listMemesSince,
  listTemplates,
  listTemplatesSince,
  updateMeme,
  type CreateMemeFields,
  type CreateMemeInput,
  type ListMemesFields,
  type ListMemesSinceFields,
  type ListTemplatesFields,
  type ListTemplatesSinceFields,
  type UpdateMemeInput,
} from '../../js/ash_rpc'
import {
  memeLineSchema,
  memeSchema,
  memeTemplateSchema,
  type Meme,
  type MemeLine,
  type MemeTemplate,
} from './types'
import {
  type AshCreateMutation,
  type AshDeleteMutation,
  type AshUpdateMutation,
  defineAshResource,
} from './syncedAsh'

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

const memeWritableFields = [
  'templateId',
  'label',
  'lines',
  'renderDataUrl',
] satisfies Array<keyof Meme & string>

export function buildMemeLabel(templateName: string, lines: MemeLine[]): string {
  const fragments = lines.map((line) => line.text.trim()).filter(Boolean)
  return fragments.join(' · ').slice(0, 88) || templateName
}

function normalizeMemeLines(lines: MemeLine[] | undefined) {
  return lines?.map((line) => memeLineSchema.parse(line))
}

function buildCreateMemeInput(input: Pick<Meme, 'templateId' | 'label' | 'lines' | 'renderDataUrl'>) {
  return {
    templateId: input.templateId,
    label: input.label ?? null,
    lines: normalizeMemeLines(input.lines),
    renderDataUrl: input.renderDataUrl ?? null,
  } satisfies CreateMemeInput
}

function buildUpdateMemeInput(input: Partial<Pick<Meme, 'templateId' | 'label' | 'lines' | 'renderDataUrl'>>) {
  const payload = {} as UpdateMemeInput

  if (input.templateId !== undefined) {
    payload.templateId = input.templateId
  }

  if (input.label !== undefined) {
    payload.label = input.label
  }

  if (input.lines !== undefined) {
    payload.lines = normalizeMemeLines(input.lines)
  }

  if (input.renderDataUrl !== undefined) {
    payload.renderDataUrl = input.renderDataUrl
  }

  return payload
}

const createMemeMutation = {
  action: createMeme,
  fields: memeWritableFields,
  input: buildCreateMemeInput,
} satisfies AshCreateMutation<Meme, typeof memeFields, CreateMemeInput>

const updateMemeMutation = {
  action: updateMeme,
  fields: memeWritableFields,
  identity: (meme: Partial<Meme>) => {
    if (meme.id == null) {
      throw new Error('Cannot update meme without an id')
    }

    return meme.id
  },
  input: buildUpdateMemeInput,
} satisfies AshUpdateMutation<Meme, typeof memeFields, UpdateMemeInput, number>

const deleteMemeMutation = {
  action: destroyMeme,
  identity: (meme: Meme) => meme.id,
} satisfies AshDeleteMutation<Meme, number>

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
  mutations: {
    create: createMemeMutation,
    delete: deleteMemeMutation,
    update: updateMemeMutation,
  },
  resourceName: 'Meme',
  schema: memeSchema,
  sort: (left, right) => right.createdAt - left.createdAt,
})

import {
  buildCSRFHeaders,
  createMeme,
  listMemes,
  listTemplates,
  type CreateMemeFields,
  type ListMemesFields,
  type ListTemplatesFields,
} from '../../js/ash_rpc'
import {
  memeLineSchema,
  memeSchema,
  memeTemplateSchema,
  type Meme,
  type MemeLine,
  type MemeTemplate,
} from './types'

const templateFields = [
  'id',
  'name',
  'imageUrl',
  'width',
  'height',
  'boxCount',
  'source',
  'createdAt',
  { placements: ['id', 'label', 'x', 'y', 'width', 'height', 'align'] },
  { aiPlacements: ['id', 'label', 'x', 'y', 'width', 'height', 'align'] },
] as unknown as ListTemplatesFields

const memeFields = [
  'id',
  'templateId',
  'label',
  'createdAt',
  'renderDataUrl',
  { lines: ['id', 'text', 'align'] },
] as unknown as ListMemesFields

function unwrapResult<T>(
  result:
    | { success: true; data: T }
    | { success: false; errors: Array<{ message?: string; shortMessage?: string }> },
): T {
  if (result.success) {
    return result.data
  }

  const message = result.errors[0]?.message ?? result.errors[0]?.shortMessage ?? 'Ash RPC request failed'
  throw new Error(message)
}

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results
}

function normalizeTemplate(value: unknown): MemeTemplate {
  const base = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return memeTemplateSchema.parse({
    ...base,
    aiPlacements: base.aiPlacements ?? [],
  })
}

function normalizeMeme(value: unknown): Meme {
  return memeSchema.parse(value)
}

function buildLabel(templateName: string, lines: MemeLine[]): string {
  const fragments = lines.map((line) => line.text.trim()).filter(Boolean)
  return fragments.join(' · ').slice(0, 88) || templateName
}

function rpcHeaders() {
  return buildCSRFHeaders()
}

export async function fetchTemplates(): Promise<MemeTemplate[]> {
  const response = await listTemplates({
    fields: templateFields,
    headers: rpcHeaders(),
  })

  return unwrapList(unwrapResult(response)).map((item) => normalizeTemplate(item))
}

export async function fetchMemes(): Promise<Meme[]> {
  const response = await listMemes({
    fields: memeFields,
    headers: rpcHeaders(),
  })

  return unwrapList(unwrapResult(response))
    .map((item) => normalizeMeme(item))
    .sort((left, right) => right.createdAt - left.createdAt)
}

export async function createMemeRecord(input: {
  template: MemeTemplate
  lines: MemeLine[]
  renderDataUrl?: string | null
}): Promise<Meme> {
  const lines = input.lines.map((line) => memeLineSchema.parse(line))
  const response = await createMeme({
    headers: rpcHeaders(),
    input: {
      templateId: input.template.id,
      label: buildLabel(input.template.name, lines),
      lines,
      renderDataUrl: input.renderDataUrl ?? null,
    },
    fields: memeFields as unknown as CreateMemeFields,
  })

  return normalizeMeme(unwrapResult(response))
}

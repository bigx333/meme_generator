import {
  buildCSRFHeaders,
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
] as unknown as ListTemplatesFields & ListTemplatesSinceFields

const memeFields = [
  'id',
  'templateId',
  'label',
  'createdAt',
  'updatedAt',
  'archivedAt',
  'renderDataUrl',
  { lines: ['id', 'text', 'align'] },
] as unknown as ListMemesFields & ListMemesSinceFields

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
  const base = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return memeSchema.parse({
    ...base,
    archivedAt: normalizeUnixTimestamp(base.archivedAt),
  })
}

function buildLabel(templateName: string, lines: MemeLine[]): string {
  const fragments = lines.map((line) => line.text.trim()).filter(Boolean)
  return fragments.join(' · ').slice(0, 88) || templateName
}

function rpcHeaders() {
  return buildCSRFHeaders()
}

function normalizeUnixTimestamp(value: unknown): number | null | undefined {
  if (value == null) return value as null | undefined
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  return null
}

type RpcResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Array<{ message?: string; shortMessage?: string }> }

export type IncrementalListRpc<TItem> = {
  list: () => Promise<TItem[]>
  listSince: (since: number) => Promise<TItem[]>
}

function createIncrementalListRpc<TItem>(config: {
  full: () => Promise<RpcResult<unknown[] | { results: unknown[] }>>
  normalize: (value: unknown) => TItem
  since: (since: number) => Promise<RpcResult<unknown[] | { results: unknown[] }>>
  sort?: (left: TItem, right: TItem) => number
}): IncrementalListRpc<TItem> {
  const load = async (resultPromise: Promise<RpcResult<unknown[] | { results: unknown[] }>>) => {
    const items = unwrapList(unwrapResult(await resultPromise)).map((item) => config.normalize(item))

    return config.sort ? [...items].sort(config.sort) : items
  }

  return {
    list: () => load(config.full()),
    listSince: (since: number) => load(config.since(since)),
  }
}

export const templatesCollectionRpc = createIncrementalListRpc({
  full: () =>
    listTemplates({
      fields: templateFields,
      headers: rpcHeaders(),
    }),
  normalize: normalizeTemplate,
  since: (since) =>
    listTemplatesSince({
      fields: templateFields,
      headers: rpcHeaders(),
      input: { since },
    }),
})

export const memesCollectionRpc = createIncrementalListRpc({
  full: () =>
    listMemes({
      fields: memeFields,
      headers: rpcHeaders(),
    }),
  normalize: normalizeMeme,
  since: (since) =>
    listMemesSince({
      fields: memeFields,
      headers: rpcHeaders(),
      input: { since },
    }),
  sort: (left, right) => right.createdAt - left.createdAt,
})

export async function listTemplatesRpc(): Promise<MemeTemplate[]> {
  return templatesCollectionRpc.list()
}

export async function listTemplatesSinceRpc(since: number): Promise<MemeTemplate[]> {
  return templatesCollectionRpc.listSince(since)
}

export async function listMemesRpc(): Promise<Meme[]> {
  return memesCollectionRpc.list()
}

export async function listMemesSinceRpc(since: number): Promise<Meme[]> {
  return memesCollectionRpc.listSince(since)
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

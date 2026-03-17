import type { ZodType } from 'zod'

import { buildCSRFHeaders } from '../../js/ash_rpc'

type RpcError = { message?: string; shortMessage?: string }

type RpcResult<T> =
  | { success: true; data: T }
  | { success: false; errors: RpcError[] }

type ListPayload = unknown[] | { results: unknown[] }

type TimestampField = 'createdAt' | 'updatedAt' | 'archivedAt'

type ListRpc<TFields> = (params: {
  fields: TFields
  headers: Record<string, string>
}) => Promise<RpcResult<ListPayload>>

type ListSinceRpc<TFields> = (params: {
  fields: TFields
  headers: Record<string, string>
  input: { since: number }
}) => Promise<RpcResult<ListPayload>>

const defaultTimestampFields: TimestampField[] = ['createdAt', 'updatedAt', 'archivedAt']

export type AshCollectionRpc<TItem> = {
  list: () => Promise<TItem[]>
  listSince?: (since: number) => Promise<TItem[]>
  parse: (value: unknown) => TItem
}

export function ashRpcHeaders() {
  return buildCSRFHeaders()
}

export function unwrapAshResult<T>(result: RpcResult<T>): T {
  if (result.success) {
    return result.data
  }

  const message = result.errors[0]?.message ?? result.errors[0]?.shortMessage ?? 'Ash RPC request failed'
  throw new Error(message)
}

export function normalizeCollection<TItem>(value: unknown): TItem[] {
  if (Array.isArray(value)) return value as TItem[]
  if (value && typeof value === 'object') return Object.values(value) as TItem[]
  return []
}

function unwrapAshList(data: ListPayload): unknown[] {
  return Array.isArray(data) ? data : data.results
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

function parseAshRecord<TItem>(value: unknown, config: {
  defaults?: Partial<Record<keyof TItem & string, unknown>>
  schema: ZodType<TItem>
  timestampFields?: Array<keyof TItem & string>
}): TItem {
  const record = value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {}

  for (const field of config.timestampFields ?? defaultTimestampFields) {
    if (field in record || record[field] != null) {
      record[field] = normalizeUnixTimestamp(record[field])
    }
  }

  for (const [field, fallback] of Object.entries(config.defaults ?? {})) {
    if (record[field] == null) {
      record[field] = fallback
    }
  }

  return config.schema.parse(record)
}

export function createAshCollectionRpc<TItem, TFields>(config: {
  defaults?: Partial<Record<keyof TItem & string, unknown>>
  fields: TFields
  list: ListRpc<TFields>
  listSince?: ListSinceRpc<TFields>
  schema: ZodType<TItem>
  sort?: (left: TItem, right: TItem) => number
  timestampFields?: Array<keyof TItem & string>
}): AshCollectionRpc<TItem> {
  const parse = (value: unknown) =>
    parseAshRecord(value, {
      defaults: config.defaults,
      schema: config.schema,
      timestampFields: config.timestampFields,
    })
  const listSince = config.listSince

  const load = async (request: Promise<RpcResult<ListPayload>>) => {
    const items = unwrapAshList(unwrapAshResult(await request)).map(parse)
    return config.sort ? [...items].sort(config.sort) : items
  }

  return {
    list: () =>
      load(
        config.list({
          fields: config.fields,
          headers: ashRpcHeaders(),
        }),
      ),
    listSince: listSince
      ? (since: number) =>
          load(
            listSince({
              fields: config.fields,
              headers: ashRpcHeaders(),
              input: { since },
            }),
          )
      : undefined,
    parse,
  }
}

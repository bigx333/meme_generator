import { syncState, type ObservableParam } from '@legendapp/state'
import { type SyncedSubscribeParams } from '@legendapp/state/sync'
import { syncedCrud, type SyncedCrudPropsBase } from '@legendapp/state/sync-plugins/crud'
import type { ZodType } from 'zod'

import { buildCSRFHeaders } from '../../js/ash_rpc'

type AshId = string | number
type RpcError = { message?: string; shortMessage?: string }
type RpcHeaders = Record<string, string>
type RpcResult<T> =
  | { success: true; data: T }
  | { success: false; errors: RpcError[] }

type ListPayload = unknown[] | { results: unknown[] }
type TimestampField = 'createdAt' | 'updatedAt' | 'archivedAt'

export type AshListRpc<TFields> = (params: {
  fields: TFields
  headers: RpcHeaders
}) => Promise<RpcResult<ListPayload>>

export type AshListSinceRpc<TFields> = (params: {
  fields: TFields
  headers: RpcHeaders
  input: { since: number }
}) => Promise<RpcResult<ListPayload>>

export type AshActionRpc<TFields, TInput, TResult = unknown> = (params: {
  fields: TFields
  headers: RpcHeaders
  input: TInput
}) => Promise<RpcResult<TResult>>

export type AshResource<TItem, TFields> = {
  defaults?: Partial<Record<keyof TItem & string, unknown>>
  fields: TFields
  list: AshListRpc<TFields>
  listSince?: AshListSinceRpc<TFields>
  resourceName: string
  schema: ZodType<TItem>
  sort?: (left: TItem, right: TItem) => number
  timestampFields?: Array<keyof TItem & string>
}

type SyncedAshOptions<TItem extends { id: AshId }, TFields> = Omit<
  SyncedCrudPropsBase<TItem, TItem>,
  'get' | 'list' | 'subscribe'
> &
  AshResource<TItem, TFields> & {
    subscribe?: (params: SyncedSubscribeParams<TItem[]>) => (() => void) | void
    subscribeResource?: (resourceName: string, refresh: () => void) => (() => void) | void
  }

const defaultTimestampFields: TimestampField[] = ['createdAt', 'updatedAt', 'archivedAt']

export function defineAshResource<TItem, TFields>(
  resource: AshResource<TItem, TFields>,
): AshResource<TItem, TFields> {
  return resource
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

export function parseAshItem<TItem>(
  resource: Pick<AshResource<TItem, unknown>, 'defaults' | 'schema' | 'timestampFields'>,
  value: unknown,
): TItem {
  const record = value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {}

  for (const field of resource.timestampFields ?? defaultTimestampFields) {
    if (field in record || record[field] != null) {
      record[field] = normalizeUnixTimestamp(record[field])
    }
  }

  for (const [field, fallback] of Object.entries(resource.defaults ?? {})) {
    if (record[field] == null) {
      record[field] = fallback
    }
  }

  return resource.schema.parse(record)
}

export async function runAshAction<TItem, TFields, TInput>(config: {
  action: AshActionRpc<TFields, TInput>
  input: TInput
  resource: Pick<AshResource<TItem, TFields>, 'defaults' | 'fields' | 'schema' | 'timestampFields'>
}): Promise<TItem> {
  const response = await config.action({
    fields: config.resource.fields,
    headers: ashRpcHeaders(),
    input: config.input,
  })

  return parseAshItem(config.resource, unwrapAshResult(response))
}

export function syncedAsh<TItem extends { id: AshId }, TFields>(config: SyncedAshOptions<TItem, TFields>) {
  const {
    defaults,
    fields,
    list,
    listSince,
    resourceName,
    schema,
    sort,
    subscribe,
    subscribeResource,
    timestampFields,
    ...rest
  } = config

  const parse = (value: unknown) => parseAshItem({ defaults, schema, timestampFields }, value)

  const load = async (request: Promise<RpcResult<ListPayload>>) => {
    const data = unwrapAshList(unwrapAshResult(await request)).map(parse)
    return sort ? [...data].sort(sort) : data
  }

  const inferredChangesSince =
    listSince ? (rest.changesSince ?? 'last-sync') : rest.changesSince === 'all' ? 'all' : undefined

  return syncedCrud<TItem, TItem>({
    ...rest,
    changesSince: inferredChangesSince,
    list: ({ lastSync }) => {
      if (inferredChangesSince === 'last-sync' && lastSync != null && listSince) {
        return load(
          listSince({
            fields,
            headers: ashRpcHeaders(),
            input: { since: lastSync },
          }),
        )
      }

      return load(
        list({
          fields,
          headers: ashRpcHeaders(),
        }),
      )
    },
    subscribe:
      subscribe ??
      (subscribeResource
        ? ({ refresh }) => {
            return subscribeResource(resourceName, refresh)
          }
        : undefined),
  })
}

export async function syncCollection(value$: ObservableParam<unknown>) {
  await syncState(value$).sync()
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

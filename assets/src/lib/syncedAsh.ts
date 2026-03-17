import { internal, syncState, type ObservableParam } from '@legendapp/state'
import { type SyncedSetParams, type SyncedSubscribeParams } from '@legendapp/state/sync'
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

export type AshActionWithIdentityRpc<TFields, TIdentity, TInput, TResult = unknown> = (params: {
  fields: TFields
  headers: RpcHeaders
  identity: TIdentity
  input: TInput
}) => Promise<RpcResult<TResult>>

export type AshDestroyRpc<TIdentity, TResult = unknown> = (params: {
  headers: RpcHeaders
  identity: TIdentity
}) => Promise<RpcResult<TResult>>

export type AshCreateMutation<TItem extends object, TFields, TInput = unknown> = {
  action: AshActionRpc<TFields, TInput>
  fields?: Array<keyof TItem & string>
  input?: (item: TItem) => TInput
}

export type AshUpdateMutation<TItem extends object, TFields, TInput = unknown, TIdentity = AshId> = {
  action: AshActionWithIdentityRpc<TFields, TIdentity, TInput>
  fields?: Array<keyof TItem & string>
  identity?: (item: Partial<TItem>) => TIdentity
  input?: (item: Partial<TItem>) => TInput
}

export type AshDeleteMutation<TItem extends object, TIdentity = AshId> = {
  action: AshDestroyRpc<TIdentity>
  identity?: (item: TItem) => TIdentity
}

export type AshMutations<TItem extends object, TFields> = {
  create?: AshCreateMutation<TItem, TFields, any>
  delete?: AshDeleteMutation<TItem, any>
  update?: AshUpdateMutation<TItem, TFields, any, any>
}

export type AshResource<TItem extends object, TFields> = {
  create?: SyncedCrudPropsBase<TItem, TItem>['create']
  delete?: SyncedCrudPropsBase<TItem, TItem>['delete']
  defaults?: Partial<Record<keyof TItem & string, unknown>>
  fields: TFields
  generateId?: SyncedCrudPropsBase<TItem, TItem>['generateId']
  list: AshListRpc<TFields>
  listSince?: AshListSinceRpc<TFields>
  mutations?: AshMutations<TItem, TFields>
  onSaved?: SyncedCrudPropsBase<TItem, TItem>['onSaved']
  resourceName: string
  schema: ZodType<TItem>
  sort?: (left: TItem, right: TItem) => number
  timestampFields?: Array<keyof TItem & string>
  update?: SyncedCrudPropsBase<TItem, TItem>['update']
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

export function defineAshResource<TItem extends object, TFields>(
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

export function parseAshItem<TItem extends object>(
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

export async function runAshAction<TItem extends object, TFields, TInput>(config: {
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

export async function runAshActionWithIdentity<TItem extends object, TFields, TIdentity, TInput>(config: {
  action: (params: {
    fields: TFields
    headers: RpcHeaders
    identity: TIdentity
    input: TInput
  }) => Promise<RpcResult<unknown>>
  identity: TIdentity
  input: TInput
  resource: Pick<AshResource<TItem, TFields>, 'defaults' | 'fields' | 'schema' | 'timestampFields'>
}): Promise<TItem> {
  const response = await config.action({
    fields: config.resource.fields,
    headers: ashRpcHeaders(),
    identity: config.identity,
    input: config.input,
  })

  return parseAshItem(config.resource, unwrapAshResult(response))
}

export async function runAshDestroy<TIdentity>(config: {
  action: (params: {
    headers: RpcHeaders
    identity: TIdentity
  }) => Promise<RpcResult<unknown>>
  identity: TIdentity
}) {
  const response = await config.action({
    headers: ashRpcHeaders(),
    identity: config.identity,
  })

  unwrapAshResult(response)
}

export function syncedAsh<TItem extends { id: AshId }, TFields>(config: SyncedAshOptions<TItem, TFields>) {
  const {
    create,
    delete: deleteFn,
    defaults,
    fields,
    generateId,
    list,
    listSince,
    mutations,
    onSaved,
    resourceName,
    schema,
    sort,
    subscribe,
    subscribeResource,
    timestampFields,
    update,
    ...rest
  } = config

  const parse = (value: unknown) => parseAshItem({ defaults, schema, timestampFields }, value)
  const resource = { defaults, fields, schema, timestampFields } as const

  const load = async (request: Promise<RpcResult<ListPayload>>) => {
    const data = unwrapAshList(unwrapAshResult(await request)).map(parse)
    return sort ? [...data].sort(sort) : data
  }

  const syncedCreate =
    create ??
    (mutations?.create
      ? async (item, params) => {
          const saved = await runAshAction({
            action: mutations.create!.action,
            input: buildAshMutationInput(item, mutations.create!),
            resource,
          })

          params.update({
            value: buildCreatePatch(item.id, saved) as never,
            mode: 'assign',
            changes: params.changes,
          })

          return null
        }
      : undefined)

  const syncedUpdate =
    update ??
    (mutations?.update
      ? async (item) => {
          const identity = resolveUpdateIdentity(item, mutations.update!)

          return runAshActionWithIdentity({
            action: mutations.update!.action,
            identity,
            input: buildAshMutationInput(item, mutations.update!),
            resource,
          })
        }
      : undefined)

  const syncedDelete =
    deleteFn ??
    (mutations?.delete
      ? async (item) => {
          await runAshDestroy({
            action: mutations.delete!.action,
            identity: resolveDeleteIdentity(item, mutations.delete!),
          })
        }
      : undefined)

  const inferredChangesSince =
    listSince ? (rest.changesSince ?? 'last-sync') : rest.changesSince === 'all' ? 'all' : undefined

  return syncedCrud<TItem, TItem>({
    ...rest,
    changesSince: inferredChangesSince,
    create: syncedCreate,
    delete: syncedDelete,
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
    generateId,
    onSaved,
    subscribe:
      subscribe ??
      (subscribeResource
        ? ({ refresh }) => {
            return subscribeResource(resourceName, refresh)
          }
        : undefined),
    update: syncedUpdate,
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

function buildAshMutationInput<TItem, TInput>(
  item: TItem,
  mutation: { fields?: Array<keyof TItem & string>; input?: (item: TItem) => TInput },
): TInput {
  if (mutation.input) {
    return mutation.input(item)
  }

  if (!mutation.fields) {
    throw new Error('Ash mutation config requires either input or fields')
  }

  const input = {} as Record<string, unknown>

  for (const field of mutation.fields) {
    const value = (item as Record<string, unknown>)[field]

    if (value !== undefined) {
      input[field] = value
    }
  }

  return input as TInput
}

function buildCreatePatch<TItem extends { id: AshId }>(localId: AshId, saved: TItem) {
  const patch: Record<AshId, TItem | typeof internal.symbolDelete> = {
    [saved.id]: saved,
  }

  if (saved.id !== localId) {
    patch[localId] = internal.symbolDelete
  }

  return patch
}

function resolveUpdateIdentity<TItem extends { id: AshId }, TFields, TInput, TIdentity>(
  item: Partial<TItem>,
  mutation: AshUpdateMutation<TItem, TFields, TInput, TIdentity>,
) {
  if (mutation.identity) {
    return mutation.identity(item)
  }

  if (item.id == null) {
    throw new Error('Ash update mutation requires an id')
  }

  return item.id as TIdentity
}

function resolveDeleteIdentity<TItem extends { id: AshId }, TIdentity>(
  item: TItem,
  mutation: AshDeleteMutation<TItem, TIdentity>,
) {
  return mutation.identity ? mutation.identity(item) : (item.id as TIdentity)
}

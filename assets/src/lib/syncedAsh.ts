import { internal, syncState, type ObservableParam } from '@legendapp/state'
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

export type AshRpcIdentityDescriptor =
  | { kind: 'field'; field: string }
  | { kind: 'fields'; fields: readonly string[] }

export type AshRpcReadActionMeta<TFields> = {
  action: (...args: any[]) => Promise<unknown>
  fields: TFields
}

export type AshRpcListSinceActionMeta<TFields> = {
  action: (...args: any[]) => Promise<unknown>
  fields: TFields
}

export type AshRpcCreateActionMeta<TFields> = {
  action: (...args: any[]) => Promise<unknown>
  fields: TFields
  writableFields: readonly string[]
}

export type AshRpcUpdateActionMeta<TFields> = {
  action: (...args: any[]) => Promise<unknown>
  fields: TFields
  identity: AshRpcIdentityDescriptor
  writableFields: readonly string[]
}

export type AshRpcDeleteActionMeta = {
  action: (...args: any[]) => Promise<unknown>
  identity: AshRpcIdentityDescriptor
}

export type AshRpcResourceMeta<TFields> = {
  resourceName: string
  schemaName: string
  actions: {
    create: AshRpcCreateActionMeta<TFields> | null
    delete: AshRpcDeleteActionMeta | null
    list: AshRpcReadActionMeta<TFields> | null
    listSince: AshRpcListSinceActionMeta<TFields> | null
    update: AshRpcUpdateActionMeta<TFields> | null
  }
}

export type AshCreateOverride<TItem extends object, TFields, TInput = unknown> = {
  action?: AshActionRpc<TFields, TInput>
  fields?: TFields
  input?: (item: TItem) => TInput
  writableFields?: Array<keyof TItem & string>
}

export type AshUpdateOverride<TItem extends object, TFields, TInput = unknown, TIdentity = unknown> = {
  action?: AshActionWithIdentityRpc<TFields, TIdentity, TInput>
  fields?: TFields
  identity?: (item: Partial<TItem>) => TIdentity
  input?: (item: Partial<TItem>) => TInput
  writableFields?: Array<keyof TItem & string>
}

export type AshDeleteOverride<TItem extends object, TIdentity = unknown> = {
  action?: AshDestroyRpc<TIdentity>
  identity?: (item: TItem) => TIdentity
}

export type AshResourceOverrides<TItem extends object, TFields> = {
  create?: AshCreateOverride<TItem, TFields, any>
  delete?: AshDeleteOverride<TItem, any>
  list?: Partial<AshRpcReadActionMeta<TFields>>
  listSince?: Partial<AshRpcListSinceActionMeta<TFields>>
  update?: AshUpdateOverride<TItem, TFields, any, any>
}

export type AshResource<TItem extends object, TFields, TMeta extends AshRpcResourceMeta<TFields>> = {
  create?: SyncedCrudPropsBase<TItem, TItem>['create']
  defaults?: Partial<Record<keyof TItem & string, unknown>>
  delete?: SyncedCrudPropsBase<TItem, TItem>['delete']
  generateId?: SyncedCrudPropsBase<TItem, TItem>['generateId']
  meta: TMeta
  onSaved?: SyncedCrudPropsBase<TItem, TItem>['onSaved']
  overrides?: AshResourceOverrides<TItem, TFields>
  schema: ZodType<TItem>
  sort?: (left: TItem, right: TItem) => number
  timestampFields?: Array<keyof TItem & string>
  update?: SyncedCrudPropsBase<TItem, TItem>['update']
}

type AshParseConfig<TItem extends object> = Pick<
  AshResource<TItem, unknown, AshRpcResourceMeta<unknown>>,
  'defaults' | 'schema' | 'timestampFields'
>

type SyncedAshOptions<TItem extends { id: AshId }, TFields, TMeta extends AshRpcResourceMeta<TFields>> = Omit<
  SyncedCrudPropsBase<TItem, TItem>,
  'get' | 'list' | 'subscribe'
> &
  AshResource<TItem, TFields, TMeta> & {
    subscribe?: (params: SyncedSubscribeParams<TItem[]>) => (() => void) | void
    subscribeResource?: (resourceName: string, refresh: () => void) => (() => void) | void
  }

const defaultTimestampFields: TimestampField[] = ['createdAt', 'updatedAt', 'archivedAt']

export function defineAshResource<TItem extends object, TFields, TMeta extends AshRpcResourceMeta<TFields>>(
  resource: AshResource<TItem, TFields, TMeta>,
): AshResource<TItem, TFields, TMeta> {
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
  resource: AshParseConfig<TItem>,
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
  fields: TFields
  input: TInput
  resource: AshParseConfig<TItem>
}): Promise<TItem> {
  const response = await config.action({
    fields: config.fields,
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
  fields: TFields
  identity: TIdentity
  input: TInput
  resource: AshParseConfig<TItem>
}): Promise<TItem> {
  const response = await config.action({
    fields: config.fields,
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

export function syncedAsh<TItem extends { id: AshId }, TFields, TMeta extends AshRpcResourceMeta<TFields>>(
  config: SyncedAshOptions<TItem, TFields, TMeta>,
) {
  const {
    create,
    defaults,
    delete: deleteFn,
    generateId,
    meta,
    onSaved,
    overrides,
    schema,
    sort,
    subscribe,
    subscribeResource,
    timestampFields,
    update,
    ...rest
  } = config

  const parse = (value: unknown) => parseAshItem({ defaults, schema, timestampFields }, value)
  const resource = { defaults, schema, timestampFields } as const

  const listMeta = {
    action: (overrides?.list?.action ?? meta.actions.list?.action) as AshListRpc<TFields> | undefined,
    fields: overrides?.list?.fields ?? meta.actions.list?.fields,
  }

  if (!listMeta.action || listMeta.fields == null) {
    throw new Error(`Ash resource ${meta.resourceName} is missing automatic list metadata`)
  }

  const listSinceMeta = {
    action: (overrides?.listSince?.action ?? meta.actions.listSince?.action) as
      | AshListSinceRpc<TFields>
      | undefined,
    fields: overrides?.listSince?.fields ?? meta.actions.listSince?.fields,
  }

  const load = async (request: Promise<RpcResult<ListPayload>>) => {
    const data = unwrapAshList(unwrapAshResult(await request)).map(parse)
    return sort ? [...data].sort(sort) : data
  }

  const syncedCreate =
    create ??
    (meta.actions.create || overrides?.create
      ? async (item, params) => {
          const action = (overrides?.create?.action ?? meta.actions.create?.action) as
            | AshActionRpc<TFields, unknown>
            | undefined
          const fields = overrides?.create?.fields ?? meta.actions.create?.fields

          if (!action || fields == null) {
            throw new Error(`Ash resource ${meta.resourceName} is missing automatic create metadata`)
          }

          const saved = await runAshAction({
            action,
            fields,
            input: buildAshMutationInput(item, {
              input: overrides?.create?.input,
              writableFields: overrides?.create?.writableFields ?? meta.actions.create?.writableFields,
            }),
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
    (meta.actions.update || overrides?.update
      ? async (item) => {
          const action = (overrides?.update?.action ?? meta.actions.update?.action) as
            | AshActionWithIdentityRpc<TFields, unknown, unknown>
            | undefined
          const fields = overrides?.update?.fields ?? meta.actions.update?.fields

          if (!action || fields == null) {
            throw new Error(`Ash resource ${meta.resourceName} is missing automatic update metadata`)
          }

          return runAshActionWithIdentity({
            action,
            fields,
            identity: resolveUpdateIdentity(item, {
              descriptor: meta.actions.update?.identity ?? null,
              identity: overrides?.update?.identity,
            }),
            input: buildAshMutationInput(item, {
              input: overrides?.update?.input,
              writableFields: overrides?.update?.writableFields ?? meta.actions.update?.writableFields,
            }),
            resource,
          })
        }
      : undefined)

  const syncedDelete =
    deleteFn ??
    (meta.actions.delete || overrides?.delete
      ? async (item) => {
          const action = (overrides?.delete?.action ?? meta.actions.delete?.action) as
            | AshDestroyRpc<unknown>
            | undefined

          if (!action) {
            throw new Error(`Ash resource ${meta.resourceName} is missing automatic delete metadata`)
          }

          await runAshDestroy({
            action,
            identity: resolveDeleteIdentity(item, {
              descriptor: meta.actions.delete?.identity ?? null,
              identity: overrides?.delete?.identity,
            }),
          })
        }
      : undefined)

  const inferredChangesSince =
    listSinceMeta.action && listSinceMeta.fields != null
      ? (rest.changesSince ?? 'last-sync')
      : rest.changesSince === 'all'
        ? 'all'
        : undefined

  return syncedCrud<TItem, TItem>({
    ...rest,
    changesSince: inferredChangesSince,
    create: syncedCreate,
    delete: syncedDelete,
    list: ({ lastSync }) => {
      if (
        inferredChangesSince === 'last-sync' &&
        lastSync != null &&
        listSinceMeta.action &&
        listSinceMeta.fields != null
      ) {
        const listSinceAction = listSinceMeta.action
        const listSinceFields = listSinceMeta.fields

        return load(
          listSinceAction({
            fields: listSinceFields,
            headers: ashRpcHeaders(),
            input: { since: lastSync },
          }),
        )
      }

      const listAction = listMeta.action as AshListRpc<TFields>
      const listFields = listMeta.fields as TFields

      return load(
        listAction({
          fields: listFields,
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
            return subscribeResource(meta.resourceName, refresh)
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

function buildAshMutationInput<TItem, TInput>(item: TItem, mutation: {
  input?: (item: TItem) => TInput
  writableFields?: readonly string[]
}): TInput {
  if (mutation.input) {
    return mutation.input(item)
  }

  if (!mutation.writableFields) {
    throw new Error('Ash mutation metadata requires either input or writableFields')
  }

  const input = {} as Record<string, unknown>
  const source = item as Record<string, unknown>

  for (const field of mutation.writableFields) {
    const value = source[field]

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

function resolveUpdateIdentity<TItem extends { id: AshId }, TIdentity>(
  item: Partial<TItem>,
  config: {
    descriptor: AshRpcIdentityDescriptor | null
    identity?: (item: Partial<TItem>) => TIdentity
  },
) {
  if (config.identity) {
    return config.identity(item)
  }

  if (!config.descriptor) {
    throw new Error('Ash update metadata requires an identity descriptor or override')
  }

  return buildIdentityFromDescriptor(item, config.descriptor, 'update')
}

function resolveDeleteIdentity<TItem extends { id: AshId }, TIdentity>(
  item: TItem,
  config: {
    descriptor: AshRpcIdentityDescriptor | null
    identity?: (item: TItem) => TIdentity
  },
) {
  if (config.identity) {
    return config.identity(item)
  }

  if (!config.descriptor) {
    throw new Error('Ash delete metadata requires an identity descriptor or override')
  }

  return buildIdentityFromDescriptor(item, config.descriptor, 'delete')
}

function buildIdentityFromDescriptor(
  item: Record<string, unknown>,
  descriptor: AshRpcIdentityDescriptor,
  operation: string,
) {
  if (descriptor.kind === 'field') {
    const value = item[descriptor.field]

    if (value == null) {
      throw new Error(`Cannot ${operation} without identity field "${descriptor.field}"`)
    }

    return value
  }

  const identity = {} as Record<string, unknown>

  for (const field of descriptor.fields) {
    const value = item[field]

    if (value == null) {
      throw new Error(`Cannot ${operation} without identity field "${field}"`)
    }

    identity[field] = value
  }

  return identity
}

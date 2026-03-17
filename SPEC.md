# syncedAsh — Legend-State Sync Plugin for Ash Framework

> A Legend-State sync plugin that bridges Ash Framework's typed RPC layer (ash_typescript) with Legend-State's reactive observable store, providing automatic optimistic updates, local persistence, smart incremental sync, and real-time invalidation via Phoenix Channels.

## Problem

Building SPAs on top of Ash Framework today means choosing between:

1. **ash_typescript + TanStack Query** — typed CRUD but manual cache invalidation, manual optimistic updates, loading spinners on every page visit
2. **AshGraphQL + Relay** — complete but heavy: GraphQL schema overhead, Relay's steep learning curve, and two type systems (Elixir + GraphQL SDL)
3. **Roll your own** — wire fetch calls, cache logic, retry, offline, subscriptions by hand

None of these give you the "define a resource, get everything" DX that Ash provides on the backend.

## Solution

`syncedAsh` is a Legend-State sync plugin (built on `syncedCrud`) that:

- Consumes **ash_typescript**'s generated RPC functions directly
- Provides **automatic optimistic updates** with rollback on error
- **Persists data locally** (no loading spinners on revisit)
- Supports **incremental sync** via `changesSince: 'last-sync'` (only fetches rows where `updatedAt > lastSync`)
- Integrates with **Phoenix Channels** for real-time invalidation (server pushes "something changed", client smart-refetches)
- Requires **zero manual cache management** — mutations flow through the observable, sync engine handles the rest

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   React SPA                      │
│                                                  │
│  useValue(todos$)          todos$.set(...)       │
│       ↓                         ↓                │
│  ┌─────────────────────────────────────────┐     │
│  │         Legend-State Observable          │     │
│  │    (fine-grained reactivity, local)     │     │
│  └──────────────┬──────────────────────────┘     │
│                 │                                 │
│  ┌──────────────▼──────────────────────────┐     │
│  │           syncedAsh plugin              │     │
│  │                                         │     │
│  │  • Maps ash_typescript RPC → CRUD ops   │     │
│  │  • Optimistic apply → server persist    │     │
│  │  • Local persistence (IndexedDB/LS)     │     │
│  │  • changesSince: 'last-sync'            │     │
│  │  • subscribe() → Phoenix Channel        │     │
│  └──────────┬───────────────┬──────────────┘     │
│             │               │                    │
└─────────────│───────────────│────────────────────┘
              │               │
     HTTP/RPC │               │ WebSocket
              ▼               ▼
┌─────────────────────────────────────────────────┐
│              Phoenix / Ash Backend               │
│                                                  │
│  ash_typescript RPC ←── Ash Resources ──→ PubSub │
│  (CRUD endpoints)       (policies,        (notifies│
│                          generated CRUD)   on mutation)
│                              │                   │
│                              ▼                   │
│                          PostgreSQL               │
└─────────────────────────────────────────────────┘
```

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Backend framework | Ash Framework | Declarative resources, policies, generated CRUD |
| API layer | ash_typescript | Typed RPC codegen (TS types, Zod schemas, RPC functions) |
| Real-time | Ash.Notifier.PubSub + Phoenix Channels | Broadcast resource change events to clients |
| Client sync | syncedAsh (this plugin) | Legend-State sync plugin wrapping ash_typescript |
| Client state | Legend-State v3 | Fine-grained reactive observables |
| Local persistence | Legend-State persist (IndexedDB / localStorage) | Survive page refreshes, offline resilience |
| UI | React | Components consume observables via `useValue` |

## Plugin API

### Configuration

```typescript
import { observable } from '@legendapp/state'
import { configureSynced } from '@legendapp/state/sync'
import { syncedAsh } from 'synced-ash'
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'
import { subscribeToResource } from './realtime'

const persistPlugin = observablePersistIndexedDB({
  databaseName: 'my-app-sync',
  version: 1,
  tableNames: ['todos'],
})

const sync = configureSynced(syncedAsh, {
  persist: {
    plugin: persistPlugin,
    retrySync: true,
  },
  subscribeResource: subscribeToResource,
  changesSince: 'last-sync',
  retry: { infinite: true },
})
```

### Defining Collections

```typescript
import { observable } from '@legendapp/state'
import { defineAshResource } from '@/lib/syncedAsh'
import { listTodos, listTodosSince } from './generated/ash_rpc'

const todosResource = defineAshResource({
  resourceName: 'Todo',
  fields: ['id', 'title', 'completed', 'createdAt', 'updatedAt'],
  schema: todoSchema,
  list: listTodos,
  listSince: listTodosSince,
})

const todos$ = observable(sync({
  ...todosResource,
  persist: { name: 'todos' },
}))

// The plugin owns:
// - RPC envelope unwrapping
// - list/results normalization
// - createdAt/updatedAt/archivedAt coercion
// - incremental listSince(lastSync) switching
// - realtime subscription wiring via subscribeResource
```

### Usage in Components

```tsx
import { useValue } from '@legendapp/state/react'

function TodoList() {
  const todos = useValue(todos$)

  const addTodo = (title: string) => {
    const id = crypto.randomUUID()
    // Optimistically added, synced to server, rolled back on error
    todos$[id].set({
      id,
      title,
      completed: false,
      createdAt: undefined,  // server fills these
      updatedAt: undefined,
    })
  }

  const toggleTodo = (id: string) => {
    // Optimistically toggled, synced to server
    todos$[id].completed.set(!todos$[id].completed.get())
  }

  return (
    <ul>
      {Object.values(todos).map(todo => (
        <li key={todo.id} onClick={() => toggleTodo(todo.id)}>
          {todo.title} {todo.completed ? '✅' : '⬜'}
        </li>
      ))}
    </ul>
  )
}
```

## Real-Time Invalidation Protocol

### Backend (Elixir)

Ash resources publish change events via `Ash.Notifier.PubSub`. A Phoenix Channel broadcasts these to subscribed clients:

```elixir
# Resource notifier config (in Ash resource)
pub_sub do
  module MyAppWeb.Endpoint
  prefix "resource"

  publish :create, ["Todo", :id]
  publish :update, ["Todo", :id]
  publish :destroy, ["Todo", :id]
end
```

```elixir
# Channel handler
defmodule MyAppWeb.AshSyncChannel do
  use Phoenix.Channel

  def join("ash:sync", _params, socket) do
    {:ok, socket}
  end

  # Called by PubSub when any resource changes
  def handle_info({:resource_changed, resource_name, action, id}, socket) do
    push(socket, "changed", %{
      resource: resource_name,
      action: action,   # "create" | "update" | "delete"
      id: id
    })
    {:noreply, socket}
  end
end
```

### Frontend (syncedAsh)

The plugin subscribes to the Phoenix Channel and triggers Legend-State's `refresh()` for affected collections:

```typescript
// Internal implementation (simplified)
subscribe: ({ refresh, update }) => {
  const channel = socket.channel(channelTopic, {})
  channel.join()

  channel.on('changed', ({ resource, action, id }) => {
    if (resource === resourceName) {
      // Smart refetch — changesSince: 'last-sync' means only
      // rows with updatedAt > lastSync are fetched
      refresh()
    }
  })

  return () => channel.leave()
}
```

### Message Format

```json
{
  "resource": "Todo",
  "action": "update",
  "id": "abc-123"
}
```

Lightweight invalidation events only — no data in the payload. The client decides what to refetch. This keeps the channel auth simple (no need to filter fields/policies on the push path).

## Sync Lifecycle

### Write Path (mutation)

```
User sets todos$[id].completed = true
  ↓
1. Legend-State applies change to local observable (instant UI update)
2. Change persisted to local storage (survives refresh)
3. syncedAsh calls updateTodo() RPC (debounced)
4. On success: server response merged back (updatedAt, etc.)
5. On error: automatic rollback to pre-mutation state
6. On network failure: queued for retry (retrySync: true)
```

### Read Path (initial load + sync)

```
Component calls todos$.get()
  ↓
1. Legend-State loads from local persistence (instant, no spinner)
2. syncedAsh calls listTodos() in background
   - First load: fetches all
   - Subsequent: fetches where updatedAt > lastSync (incremental)
3. Response merged into observable (fine-grained re-renders)
4. lastSync timestamp updated in local persistence
```

### Real-Time Path (other user makes a change)

```
Phoenix Channel receives "changed" event
  ↓
1. syncedAsh subscribe handler calls refresh()
2. Legend-State re-runs list() with changesSince: 'last-sync'
3. Only changed rows fetched and merged
4. Affected components re-render automatically
```

## ash_typescript Response Adapter

ash_typescript RPC functions return a specific response shape. syncedAsh normalizes this for Legend-State:

```typescript
// ash_typescript returns:
{ success: true, data: { results: [...], hasMore: boolean } }
// or
{ success: false, errors: [...] }

// syncedAsh adapter (internal):
async function adaptList<T>(fn: () => Promise<AshResponse<T[]>>): Promise<T[]> {
  const res = await fn()
  if (!res.success) {
    throw new AshSyncError(res.errors)
  }
  return res.data.results
}

async function adaptSingle<T>(fn: () => Promise<AshResponse<T>>): Promise<T> {
  const res = await fn()
  if (!res.success) {
    throw new AshSyncError(res.errors)
  }
  return res.data
}
```

## Field Selection Strategy

ash_typescript supports field selection. syncedAsh requires `updatedAt` in every field list for incremental sync:

```typescript
// Plugin automatically appends 'updatedAt' if changesSince is enabled
// and it's not already in the field list
const fields = ensureField(userFields, 'updatedAt')
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Network error | Mutation queued locally, retried on reconnect |
| Server validation error | Optimistic state rolled back, error surfaced |
| Auth expired | `waitFor` observable blocks sync until re-authenticated |
| Channel disconnected | Auto-reconnect (Phoenix Channel default), missed changes caught by next `changesSince` sync |
| Stale local cache | Full refetch on first sync if no `lastSync` timestamp exists |

## Package Structure

```
synced-ash/
├── src/
│   ├── index.ts              # Public API: syncedAsh, configureSyncedAsh
│   ├── plugin.ts             # Core syncedCrud wrapper
│   ├── adapter.ts            # ash_typescript response normalization
│   ├── channel.ts            # Phoenix Channel subscription manager
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Field selection helpers, ID generation
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

```json
{
  "peerDependencies": {
    "@legendapp/state": "^3.0.0",
    "phoenix": "^1.7.0"
  }
}
```

- **Zero hard dependencies** — ash_typescript generated code is passed in as functions, not imported
- Phoenix JS client is a peer dep for the channel subscription
- Legend-State v3 for sync primitives

## Scope Boundaries

### In Scope

- Legend-State sync plugin wrapping ash_typescript RPC functions
- Optimistic mutations with automatic rollback
- Local persistence integration
- Incremental sync via `changesSince: 'last-sync'`
- Phoenix Channel subscription for real-time invalidation
- Response adapter for ash_typescript's response format
- TypeScript types inferred from ash_typescript generated code

### Out of Scope

- Ash backend code / Elixir packages (documented as setup requirements)
- Normalized cache (Legend-State uses object store, not Relay-style normalization)
- Offline-first conflict resolution (last-write-wins via server, no CRDT)
- GraphQL / AshGraphQL integration (separate path)
- React Native persistence plugins (use Legend-State's existing RN plugins)
- Code generation (ash_typescript handles this; syncedAsh consumes the output)

## Example: Full Resource Setup

```typescript
// store/todos.ts
import { observable } from '@legendapp/state'
import { sync } from './config'  // pre-configured syncedAsh
import { listTodos, createTodo, updateTodo, deleteTodo } from '../generated/ash_rpc'

export const todos$ = observable(sync({
  list: (params) => listTodos({
    fields: ['id', 'title', 'completed', 'assigneeId', 'updatedAt'],
    filter: { ...params?.where, completed: { eq: false } },
    sort: [{ field: 'createdAt', order: 'desc' }],
  }),
  create: (input) => createTodo({ input, fields: ['id', 'title', 'completed', 'assigneeId', 'createdAt', 'updatedAt'] }),
  update: ({ where, values }) => updateTodo({ input: { id: where.id, ...values }, fields: ['id', 'title', 'completed', 'assigneeId', 'updatedAt'] }),
  delete: ({ id }) => deleteTodo({ input: { id } }),
  persist: { name: 'todos' },
  resourceName: 'Todo',
  // Optional: filter channel events (only refresh if relevant)
  shouldRefresh: (event) => event.action !== 'delete' || todos$[event.id].get() !== undefined,
}))
```

## Prior Art

- **Legend-State syncedKeel** — same pattern, Keel backend. syncedAsh follows identical conventions.
- **Legend-State syncedSupabase** — Supabase Realtime for subscriptions (Postgres changes → client). Similar but uses Supabase's proprietary protocol.
- **TanStack DB QueryCollection** — refetch-on-mutate pattern without real-time push.
- **TanStack DB ElectricCollection** — Postgres logical replication streaming (heavier infra, but true diffs).

## Open Questions

1. **Batching channel events** — If multiple resources change in quick succession, should we debounce `refresh()` calls? (Probably yes, ~100ms window)
2. **Partial updates via channel** — Should the channel event include changed fields so the client can apply without refetching? (Nice to have, but complicates auth on the push path)
3. **Multi-tenant support** — ash_typescript handles tenant params. How should syncedAsh pass tenant context to the channel subscription?
4. **Pagination** — Legend-State's `syncedCrud` supports cursor/offset pagination. How should this interact with `changesSince` incremental sync?
5. **Ash action metadata** — ash_typescript supports action metadata. Should syncedAsh expose this in mutation callbacks?

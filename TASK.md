# Task: Reimplement Memesmith as Ash + TanStack Start + syncedAsh

## Goal

Reimplement the memesmith app (a meme generator) using:
- **Backend:** Phoenix + Ash Framework (already scaffolded in this project)
- **Frontend:** TanStack Start (React) with ash_typescript for type-safe RPC
- **State/Sync:** Legend-State with the syncedAsh plugin (spec at `SPEC.md`)
- **Database:** SQLite via Ecto (already configured)

## Reference App

The original memesmith lives at `~/Projects/memesmith/`. Study it carefully. It's a TanStack Start app with Drizzle/SQLite. Key files:

### Features to Reimplement
1. **Home page** (`/`) — Gallery of saved memes with download buttons, hero section, spotlight templates
2. **Create page** (`/create`) — Template picker (sidebar with search), live meme preview with text overlays, caption line inputs, save + download
3. **Templates page** (`/templates`) — Browse all 100 seeded templates with search, link to create with that template
4. **Meme rendering** — Canvas-based PNG rendering with white text + black outline (Impact font style)
5. **Template seeding** — 100 templates from imgflip with AI-guided placement data

### Data Model (from memesmith)
```
MemeTemplate:
  - id (integer, PK)
  - name (string)
  - imageUrl (string)  
  - width (integer)
  - height (integer)
  - boxCount (integer)
  - placements (JSON array of {id, label, x, y, width, height, align})
  - aiPlacements (optional JSON array, same shape)
  - source (string, default "imgflip")
  - createdAt (timestamp)

Meme:
  - id (integer, PK)
  - templateId (references MemeTemplate)
  - label (string, optional)
  - lines (JSON array of {id, text, align})
  - renderDataUrl (string, optional - base64 PNG)
  - createdAt (timestamp)
```

### Design
- Dark theme with gradient backgrounds (radial gradients with indigo/cyan/rose)
- Rounded cards with glassmorphism (bg-white/5, border-white/10)
- Cyan accents, uppercase tracking labels
- Gradient CTAs (indigo → cyan → lime)
- Copy the visual design exactly from the reference app

## Architecture

### Phase 1: Backend (Ash)
1. Add `ash`, `ash_phoenix`, `ash_typescript`, `ash_json_api` (or just `ash_typescript`) to mix.exs
2. Create Ash resources: `MemeGenerator.Memes.Template` and `MemeGenerator.Memes.Meme`
3. Create domain: `MemeGenerator.Memes`
4. Configure ash_typescript RPC actions for all CRUD operations
5. Run `mix ash.codegen --dev` to generate TypeScript types
6. Seed the 100 templates (copy `meme-templates.json` from reference app)
7. Add Phoenix Channel for real-time (PubSub notifier on Meme resource)

### Phase 2: Frontend (TanStack Start)
1. Initialize TanStack Start inside `assets/` (or a `frontend/` dir) — follow ash_typescript React setup guide
2. Install Legend-State v3, phoenix JS client
3. Build the syncedAsh plugin per SPEC.md (or simplified version):
   - Wrap ash_typescript RPC functions in syncedCrud
   - Add Phoenix Channel subscription for real-time invalidation
   - Add local persistence (IndexedDB)
4. Wire up the three pages: Home, Create, Templates
5. Port MemePreview component and canvas renderer from reference
6. Port meme-examples.ts and placements.ts helpers

### Phase 3: Integration
1. Phoenix serves the TanStack Start app (or proxy in dev)
2. ash_typescript RPC endpoints work end-to-end
3. Real-time: creating a meme triggers channel event → other tabs refresh
4. Template seeding runs on first boot

## Key Reference Files in ~/Projects/memesmith/
- `src/routes/index.tsx` — Home page
- `src/routes/create.tsx` — Create page  
- `src/routes/templates.tsx` — Templates page
- `src/components/MemePreview.tsx` — Preview component
- `src/lib/memeRenderer.ts` — Canvas rendering
- `src/lib/placements.ts` — Placement source selection
- `src/lib/memeService.ts` — Server-side CRUD + AI label generation
- `src/db-collections/index.ts` — Zod schemas + TanStack DB collections
- `src/hooks/useMemeData.ts` — React hooks for data access
- `src/data/meme-templates.json` — Template seed data (100 templates)
- `src/data/meme-examples.ts` — Example text per template

## ash_typescript Setup (from hexdocs)

### Install
```
mix igniter.install ash_typescript --framework react
```

### Resource Extension
```elixir
defmodule MemeGenerator.Memes.Template do
  use Ash.Resource,
    domain: MemeGenerator.Memes,
    extensions: [AshTypescript.Resource]
    
  typescript do
    type_name "MemeTemplate"
  end
end
```

### Domain RPC Config
```elixir
defmodule MemeGenerator.Memes do
  use Ash.Domain, extensions: [AshTypescript.Rpc]
  
  typescript_rpc do
    resource MemeGenerator.Memes.Template do
      rpc_action :list_templates, :read
      rpc_action :get_template, :get
    end
    
    resource MemeGenerator.Memes.Meme do
      rpc_action :list_memes, :read
      rpc_action :create_meme, :create
      rpc_action :get_meme, :get
    end
  end
end
```

### Generate Types
```
mix ash.codegen --dev
```

## Testing

Use the browser to verify:
1. Templates page loads and shows all 100 templates
2. Create page works: select template, type captions, see live preview, save to gallery
3. Home page shows saved memes with download
4. Downloads produce correct PNG with text overlays

## What NOT to do
- Don't use LiveView — this is a React SPA with Ash backend
- Don't skip the syncedAsh/Legend-State layer — that's the whole point of this POC
- Don't stub implementations — everything should work end-to-end
- Don't skip the visual design — match the reference app's look

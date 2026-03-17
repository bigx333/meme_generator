import { Link, createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { MemePreview } from '@/components/MemePreview'
import { ensureMemeDataLoaded, useTemplates } from '@/state/memes'

export const Route = createFileRoute('/templates')({
  loader: () => ensureMemeDataLoaded(),
  component: TemplatesPage,
})

function TemplatesPage() {
  const templates = useTemplates()
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () =>
      templates.filter((template) =>
        template.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, templates],
  )

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="m-0 text-xs uppercase tracking-[0.3em] text-cyan-100">
              {templates.length} seeded templates
            </p>
            <h1 className="m-0 mt-2 text-3xl font-bold">Pick your canvas</h1>
            <p className="mt-2 text-slate-200/80">
              Pulled from Imgflip's classics, normalized with guided placements. Tap one to start
              captioning.
            </p>
          </div>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Back to creator
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/30">
          <Search size={16} className="text-cyan-100" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Drake, Spongebob, Cat..."
            className="w-full bg-transparent text-sm text-white outline-none"
          />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-100">
            {filtered.length} / {templates.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <article
              key={template.id}
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-indigo-900/30"
            >
              <MemePreview
                template={template}
                lines={[]}
                showGuides
                className="transition group-hover:scale-[1.01]"
              />
              <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                <div>
                  <p className="m-0 font-semibold">{template.name}</p>
                  <p className="m-0 text-slate-300/70">
                    {template.boxCount} lines · {template.source}
                  </p>
                </div>
                <Link
                  to="/create"
                  search={{ templateId: template.id }}
                  className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/40"
                >
                  Use it
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

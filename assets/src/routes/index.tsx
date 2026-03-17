import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Download, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { MemePreview } from '@/components/MemePreview'
import { renderMemeToDataUrl } from '@/lib/memeRenderer'
import { getPlacements } from '@/lib/placements'
import { ensureMemeDataLoaded, useMemes, useTemplates } from '@/state/memes'

export const Route = createFileRoute('/')({
  loader: () => ensureMemeDataLoaded(),
  component: HomePage,
})

function HomePage() {
  const templates = useTemplates()
  const memes = useMemes()
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const liveMemes = useMemo(
    () => [...memes].sort((left, right) => right.createdAt - left.createdAt),
    [memes],
  )
  const templateMap = useMemo(
    () => new Map(templates.map((template) => [template.id, template] as const)),
    [templates],
  )
  const highlightedTemplates = templates.slice(0, 3)
  const heroMeme = liveMemes[0]
  const heroTemplate = heroMeme ? templateMap.get(heroMeme.templateId) : undefined
  const totalPlacements = templates.reduce(
    (count, template) => count + getPlacements(template).length,
    0,
  )

  async function handleDownload(memeId: number) {
    const meme = liveMemes.find((item) => item.id === memeId)
    if (!meme) return

    const template = templateMap.get(meme.templateId)
    if (!template) return

    setDownloadingId(memeId)
    try {
      const dataUrl = await renderMemeToDataUrl(template, meme.lines)
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `${meme.label ?? 'meme'}.png`
      anchor.click()
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen text-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-14 pt-16 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">
            <Wand2 size={14} />
            AI guided placements
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Craft and remix memes with the classic look, no Photoshop required.
          </h1>
          <p className="max-w-3xl text-lg text-slate-200/80">
            100 top meme templates, guided text regions, instant previews, and a living gallery of
            your saved chaos.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-lime-200 px-5 py-3 text-sm font-semibold text-slate-900 shadow-xl shadow-indigo-500/30 transition hover:-translate-y-px hover:shadow-indigo-500/50"
            >
              Start a meme
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/templates"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              Browse templates
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
            <StatCard label="Templates" value={templates.length} />
            <StatCard label="Memes saved" value={liveMemes.length} />
            <StatCard label="Placements" value={totalPlacements} />
            <StatCard label="Style" value="White + black" subtle />
          </div>
        </div>

        {heroMeme && heroTemplate ? (
          <div className="max-w-xl flex-1 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-indigo-900/40">
            <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cyan-200/80">
              Latest creation
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-300/60 to-transparent" />
            </p>
            <MemePreview
              template={heroTemplate}
              lines={heroMeme.lines}
              size="md"
              className="w-full max-w-full"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-slate-200/80">
              <span>{heroMeme.label ?? 'Untitled meme'}</span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/40"
                onClick={() => handleDownload(heroMeme.id)}
              >
                <Download size={14} />
                {downloadingId === heroMeme.id ? 'Rendering...' : 'Download'}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Fresh in your gallery</h2>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
          >
            Make another
            <Sparkles size={16} />
          </Link>
        </div>

        {liveMemes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-slate-200">
            <p className="m-0 text-lg font-semibold">No memes yet.</p>
            <p className="mt-2 text-slate-300/80">
              Start with any template and your creations will appear here with quick download links.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveMemes.slice(0, 9).map((meme) => {
              const template = templateMap.get(meme.templateId)
              if (!template) return null

              return (
                <article
                  key={meme.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-indigo-900/30"
                >
                  <MemePreview template={template} lines={meme.lines} size="sm" />
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                    <div>
                      <p className="m-0 font-semibold">{meme.label ?? template.name}</p>
                      <p className="m-0 text-slate-300/70">{template.name}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/40"
                      onClick={() => handleDownload(meme.id)}
                    >
                      <Download size={14} />
                      {downloadingId === meme.id ? 'Rendering...' : 'Download'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Spotlight templates</h2>
          <Link to="/templates" className="text-sm font-semibold text-cyan-200 hover:text-white">
            View the full 100
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {highlightedTemplates.map((template) => (
            <div
              key={template.id}
              className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-indigo-900/50 p-4 shadow-xl shadow-indigo-900/30"
            >
              <Link
                to="/create"
                search={{ templateId: template.id }}
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
              >
                <MemePreview
                  template={template}
                  lines={[]}
                  className="transition group-hover:scale-[1.01]"
                />
              </Link>
              <div className="flex items-center justify-between text-sm text-slate-200">
                <div>
                  <p className="m-0 font-semibold">{template.name}</p>
                  <p className="m-0 text-slate-300/70">{template.boxCount} lines</p>
                </div>
                <Link
                  to="/create"
                  search={{ templateId: template.id }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/40"
                >
                  Use it
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  subtle = false,
}: {
  label: string
  value: number | string
  subtle?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-inner shadow-black/30">
      <p className="m-0 text-xs uppercase tracking-[0.28em] text-slate-300/70">{label}</p>
      <p className={subtle ? 'm-0 text-lg font-semibold text-white' : 'm-0 text-2xl font-black text-white'}>
        {value}
      </p>
    </div>
  )
}

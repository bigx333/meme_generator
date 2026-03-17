import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Download, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { MemePreview } from '@/components/MemePreview'
import { getMemeExample } from '@/data/meme-examples'
import { createMemeRecord } from '@/lib/ashRpc'
import { normalizeLines, renderMemeToDataUrl } from '@/lib/memeRenderer'
import { ensureMemeDataLoaded, refreshMemes, useTemplates } from '@/state/memes'
import type { MemeLine } from '@/lib/types'

export const Route = createFileRoute('/create')({
  loader: () => ensureMemeDataLoaded(),
  validateSearch: z.object({ templateId: z.coerce.number().optional() }),
  component: CreateMemePage,
})

function CreateMemePage() {
  const templates = useTemplates()
  const search = Route.useSearch()
  const [templateQuery, setTemplateQuery] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(search.templateId)
  const [lines, setLines] = useState<MemeLine[]>([])
  const [hiddenLineIds, setHiddenLineIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        template.name.toLowerCase().includes(templateQuery.toLowerCase()),
      ),
    [templateQuery, templates],
  )

  const selectedTemplate = useMemo(() => {
    if (templates.length === 0) return undefined
    return (
      templates.find((template) => template.id === selectedTemplateId) ??
      templates.find((template) => template.id === search.templateId) ??
      templates[0]
    )
  }, [search.templateId, selectedTemplateId, templates])

  useEffect(() => {
    if (!selectedTemplate) return
    setSelectedTemplateId(selectedTemplate.id)
    setLines((current) => normalizeLines(selectedTemplate, current))
  }, [selectedTemplate])

  const previewLines = useMemo(() => {
    if (!selectedTemplate) return []

    return lines.map((line, index) => {
      if (hiddenLineIds.has(line.id)) {
        return { ...line, text: '' }
      }

      const example = getMemeExample(selectedTemplate.id, index)
      return line.text.trim() ? line : { ...line, text: example ?? line.text }
    })
  }, [hiddenLineIds, lines, selectedTemplate])

  if (!selectedTemplate) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-white">
        <p className="text-lg">Templates are loading. Try again in a moment.</p>
      </div>
    )
  }

  const activeTemplate = selectedTemplate

  function updateLine(id: string, text: string) {
    setSaveStatus(null)
    setLines((current) => current.map((line) => (line.id === id ? { ...line, text } : line)))
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      const dataUrl = await renderMemeToDataUrl(activeTemplate, lines)
      const created = await createMemeRecord({
        template: activeTemplate,
        lines,
        renderDataUrl: dataUrl,
      })
      setPreviewDataUrl(dataUrl)
      await refreshMemes()
      setSaveStatus(`Saved ${created.label ?? activeTemplate.name} to the gallery.`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDownload() {
    const dataUrl = previewDataUrl ?? (await renderMemeToDataUrl(activeTemplate, lines))
    const filename =
      lines
        .map((line) => line.text.trim())
        .filter(Boolean)
        .join(' - ') || activeTemplate.name

    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `${filename}.png`
    anchor.click()
    setPreviewDataUrl(dataUrl)
  }

  function toggleLineHidden(id: string) {
    setSaveStatus(null)
    setHiddenLineIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        setLines((prev) => prev.map((line) => (line.id === id ? { ...line, text: '' } : line)))
      }
      return next
    })
  }

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/30"
            >
              <ArrowLeft size={14} />
              Back to gallery
            </Link>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">
              <Wand2 size={14} /> Guided layout
            </p>
          </div>
          <Link to="/templates" className="text-sm font-semibold text-cyan-200 hover:text-white">
            Browse all templates
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="glass-panel space-y-4 rounded-2xl border border-white/10 p-4 shadow-xl shadow-indigo-900/30">
            <p className="m-0 text-sm font-semibold text-cyan-100">Choose a template</p>
            <input
              value={templateQuery}
              onChange={(event) => setTemplateQuery(event.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-500/40"
            />
            <div className="grid max-h-[520px] grid-cols-3 gap-3 overflow-y-auto pr-1">
              {filteredTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplateId(template.id)
                    setSaveStatus(null)
                    setHiddenLineIds(new Set())
                  }}
                  className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition hover:-translate-y-px hover:border-white/40 hover:shadow-indigo-900/30 ${
                    template.id === activeTemplate.id
                      ? 'border-indigo-300 bg-indigo-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-slate-100'
                  }`}
                >
                  <div className="relative w-full overflow-hidden">
                    <div
                      className="aspect-[4/3] w-full bg-cover bg-center transition duration-300 group-hover:scale-[1.04]"
                      style={{ backgroundImage: `url(${template.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                  </div>
                  <div className="flex items-start justify-between gap-2 px-3 pb-3 pt-2">
                    <div className="leading-tight">
                      <p className="m-0 line-clamp-2 text-sm font-semibold">{template.name}</p>
                      <p className="m-0 text-xs text-cyan-100/80">{template.boxCount} lines</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      {template.id === activeTemplate.id ? 'Using' : 'Select'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-panel rounded-3xl border border-white/10 p-5 shadow-2xl shadow-indigo-900/40">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="m-0 text-xs uppercase tracking-[0.28em] text-slate-300/70">Live preview</p>
                  <p className="m-0 text-lg font-semibold">{activeTemplate.name}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/40"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
              <MemePreview
                template={activeTemplate}
                lines={previewLines}
                hiddenLineIds={hiddenLineIds}
                size="lg"
                showGuides
              />
            </div>

            <div className="glass-panel rounded-3xl border border-white/10 p-5 shadow-xl shadow-indigo-900/30">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="m-0 text-lg font-semibold">Caption lines</h2>
                <p className="m-0 text-xs uppercase tracking-[0.26em] text-cyan-100">
                  White text · black outline
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {activeTemplate.placements.map((placement, index) => (
                  <div
                    key={placement.id}
                    className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300/70">
                        {placement.label || `Line ${index + 1}`}
                      </p>
                      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-cyan-300"
                          checked={hiddenLineIds.has(placement.id)}
                          onChange={() => toggleLineHidden(placement.id)}
                        />
                        Hide
                      </label>
                    </div>
                    <input
                      type="text"
                      value={lines[index]?.text ?? ''}
                      onChange={(event) => updateLine(placement.id, event.target.value)}
                      onFocus={() => setFocusedLineId(placement.id)}
                      onBlur={() =>
                        setFocusedLineId((current) => (current === placement.id ? null : current))
                      }
                      disabled={hiddenLineIds.has(placement.id)}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10"
                      placeholder={
                        focusedLineId === placement.id || hiddenLineIds.has(placement.id)
                          ? ''
                          : (getMemeExample(activeTemplate.id, index) ?? `Line ${index + 1}`)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-6 text-sm text-cyan-100/85">{saveStatus}</div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-lime-200 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-500/30 transition hover:-translate-y-px hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles size={16} />
                  {isSaving ? 'Saving...' : 'Add to gallery'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

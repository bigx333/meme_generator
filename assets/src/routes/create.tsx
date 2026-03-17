import { useForm, useStore } from '@tanstack/react-form'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Download, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { MemePreview } from '@/components/MemePreview'
import { getMemeExample } from '@/data/meme-examples'
import { normalizeLines, renderMemeToDataUrl } from '@/lib/memeRenderer'
import type { MemeLine, MemeTemplate } from '@/lib/types'
import { createMeme, ensureMemeDataLoaded, useTemplates } from '@/state/memes'

type CreateMemeLineInput = MemeLine & { hidden: boolean }

type CreateMemeFormValues = {
  templateQuery: string
  selectedTemplateId: number | undefined
  lines: CreateMemeLineInput[]
}

export const Route = createFileRoute('/create')({
  loader: () => ensureMemeDataLoaded(),
  validateSearch: z.object({ templateId: z.coerce.number().optional() }),
  component: CreateMemePage,
})

function normalizeCreateLines(
  template: MemeTemplate,
  draftLines: CreateMemeLineInput[] | undefined,
): CreateMemeLineInput[] {
  const normalizedLines = normalizeLines(
    template,
    draftLines?.map(({ hidden: _hidden, ...line }) => line),
  )

  return normalizedLines.map((line) => ({
    ...line,
    hidden: false,
  }))
}

function lineIdsMatchTemplate(template: MemeTemplate, lines: CreateMemeLineInput[]) {
  const templateLines = normalizeLines(
    template,
    lines.map(({ hidden: _hidden, ...line }) => line),
  )

  return (
    templateLines.length === lines.length &&
    templateLines.every((line, index) => line.id === lines[index]?.id)
  )
}

function getRenderedLines(lines: CreateMemeLineInput[]): MemeLine[] {
  return lines.map(({ hidden, ...line }) => ({
    ...line,
    text: hidden ? '' : line.text,
  }))
}

function buildFilename(lines: MemeLine[], fallbackName: string) {
  return lines
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join(' - ') || fallbackName
}

function CreateMemePage() {
  const templates = useTemplates()
  const search = Route.useSearch()
  const [isSaving, setIsSaving] = useState(false)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const defaultValues: CreateMemeFormValues = {
    templateQuery: '',
    selectedTemplateId: search.templateId,
    lines: [],
  }

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const activeTemplate =
        templates.find((template) => template.id === value.selectedTemplateId) ?? templates[0]

      if (!activeTemplate) {
        return
      }

      const renderedLines = getRenderedLines(value.lines)

      setIsSaving(true)
      setSaveStatus(null)

      try {
        const dataUrl = await renderMemeToDataUrl(activeTemplate, renderedLines)
        const created = createMeme({
          template: activeTemplate,
          lines: renderedLines,
          renderDataUrl: dataUrl,
        })
        setPreviewDataUrl(dataUrl)
        setSaveStatus(`Added ${created.label ?? activeTemplate.name} to the gallery.`)
      } finally {
        setIsSaving(false)
      }
    },
  })

  const formValues = useStore(form.store, (state) => state.values)

  const activeTemplate = useMemo(() => {
    if (templates.length === 0) return undefined
    return (
      templates.find((template) => template.id === formValues.selectedTemplateId) ?? templates[0]
    )
  }, [formValues.selectedTemplateId, templates])

  useEffect(() => {
    if (!activeTemplate) return

    const currentValues = form.state.values
    const needsSelectedTemplate = currentValues.selectedTemplateId !== activeTemplate.id
    const needsLineSync =
      currentValues.lines.length === 0 || !lineIdsMatchTemplate(activeTemplate, currentValues.lines)

    if (needsSelectedTemplate) {
      form.setFieldValue('selectedTemplateId', activeTemplate.id)
    }

    if (needsLineSync) {
      form.setFieldValue('lines', normalizeCreateLines(activeTemplate, currentValues.lines))
    }
  }, [activeTemplate, form])

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        template.name.toLowerCase().includes(formValues.templateQuery.toLowerCase()),
      ),
    [formValues.templateQuery, templates],
  )

  const hiddenLineIds = useMemo(
    () =>
      new Set(
        formValues.lines.filter((line) => line.hidden).map((line) => line.id),
      ),
    [formValues.lines],
  )

  const previewLines = useMemo(() => {
    if (!activeTemplate) return []

    return formValues.lines.map(({ hidden: _hidden, ...line }, index) => {
      if (hiddenLineIds.has(line.id)) {
        return { ...line, text: '' }
      }

      const example = getMemeExample(activeTemplate.id, index)
      return line.text.trim() ? line : { ...line, text: example ?? line.text }
    })
  }, [activeTemplate, formValues.lines, hiddenLineIds])

  if (!activeTemplate) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-white">
        <p className="text-lg">Templates are loading. Try again in a moment.</p>
      </div>
    )
  }

  async function handleDownload() {
    const currentTemplate =
      templates.find((template) => template.id === form.state.values.selectedTemplateId) ??
      activeTemplate
    if (!currentTemplate) return

    const renderedLines = getRenderedLines(form.state.values.lines)
    const dataUrl = previewDataUrl ?? (await renderMemeToDataUrl(currentTemplate, renderedLines))

    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `${buildFilename(renderedLines, currentTemplate.name)}.png`
    anchor.click()
    setPreviewDataUrl(dataUrl)
  }

  function handleTemplateSelect(template: MemeTemplate) {
    form.setFieldValue('selectedTemplateId', template.id)
    form.setFieldValue('lines', normalizeCreateLines(template, form.state.values.lines))
    setFocusedLineId(null)
    setSaveStatus(null)
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
            <form.Field name="templateQuery">
              {(field) => (
                <input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Search templates..."
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-500/40"
                />
              )}
            </form.Field>
            <div className="grid max-h-[520px] grid-cols-3 gap-3 overflow-y-auto pr-1">
              {filteredTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
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
                  <p className="m-0 text-xs uppercase tracking-[0.28em] text-slate-300/70">
                    Live preview
                  </p>
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
                {activeTemplate.placements.map((placement, index) => {
                  const line = formValues.lines[index]
                  const lineId = line?.id ?? placement.id
                  const isHidden = line?.hidden ?? false

                  return (
                    <div
                      key={placement.id}
                      className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300/70">
                          {placement.label || `Line ${index + 1}`}
                        </p>
                        <form.Field name={`lines[${index}].hidden`}>
                          {(field) => (
                            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 accent-cyan-300"
                                checked={field.state.value ?? false}
                                onChange={(event) => {
                                  const hidden = event.target.checked
                                  field.handleChange(hidden)
                                  if (hidden) {
                                    form.setFieldValue(`lines[${index}].text`, '')
                                    setFocusedLineId((current) =>
                                      current === lineId ? null : current,
                                    )
                                  }
                                  setSaveStatus(null)
                                }}
                              />
                              Hide
                            </label>
                          )}
                        </form.Field>
                      </div>
                      <form.Field name={`lines[${index}].text`}>
                        {(field) => (
                          <input
                            type="text"
                            value={field.state.value ?? ''}
                            onChange={(event) => {
                              field.handleChange(event.target.value)
                              setSaveStatus(null)
                            }}
                            onFocus={() => setFocusedLineId(lineId)}
                            onBlur={() =>
                              setFocusedLineId((current) => (current === lineId ? null : current))
                            }
                            disabled={isHidden}
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-300 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10"
                            placeholder={
                              focusedLineId === lineId || isHidden
                                ? ''
                                : (getMemeExample(activeTemplate.id, index) ?? `Line ${index + 1}`)
                            }
                          />
                        )}
                      </form.Field>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-6 text-sm text-cyan-100/85">{saveStatus}</div>
                <button
                  type="button"
                  onClick={() => void form.handleSubmit()}
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

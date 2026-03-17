import { getPlacements } from './placements'
import type { MemeLine, MemeTemplate } from './types'

function resolvePlacement(template: MemeTemplate, line: MemeLine, index: number) {
  const placements = getPlacements(template)
  return placements.find((placement) => placement.id === line.id) ?? placements[index]
}

export function normalizeLines(
  template: MemeTemplate,
  draftLines: MemeLine[] | undefined,
): MemeLine[] {
  const placements = getPlacements(template)

  if (!draftLines || draftLines.length === 0) {
    return placements.map((placement, index) => ({
      id: placement.id,
      text: index === 0 ? 'Top text' : index === 1 ? 'Bottom text' : `Caption ${index + 1}`,
      align: placement.align,
    }))
  }

  const byId = new Map(draftLines.map((line) => [line.id, line]))
  return placements.map((placement, index) => {
    const existing = byId.get(placement.id)
    return (
      existing ?? {
        id: placement.id,
        text: `Caption ${index + 1}`,
        align: placement.align,
      }
    )
  })
}

export async function renderMemeToDataUrl(
  template: MemeTemplate,
  lines: MemeLine[],
): Promise<string> {
  if (typeof document === 'undefined') {
    throw new Error('renderMemeToDataUrl can only run in the browser')
  }

  const response = await fetch(template.imageUrl)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)

  const canvas = document.createElement('canvas')
  canvas.width = template.width
  canvas.height = template.height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to create canvas context')
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  for (const [index, line] of lines.entries()) {
    if (!line.text.trim()) continue

    const placement = resolvePlacement(template, line, index)
    if (!placement) continue

    const fontSize = Math.max(
      18,
      Math.round(Math.min(template.width, template.height) * placement.height * 0.7),
    )
    const x = placement.x * template.width + (placement.width * template.width) / 2
    const y = placement.y * template.height + (placement.height * template.height) / 2

    context.font = `800 ${fontSize}px 'Impact', 'Anton', 'Arial Black', sans-serif`
    context.textAlign =
      placement.align === 'left' ? 'left' : placement.align === 'right' ? 'right' : 'center'
    context.textBaseline = 'middle'
    context.lineWidth = Math.max(4, Math.round(fontSize * 0.09))
    context.strokeStyle = '#000'
    context.fillStyle = '#fff'
    const text = line.text.toUpperCase()

    context.strokeText(text, x, y)
    context.fillText(text, x, y)
  }

  return canvas.toDataURL('image/png')
}

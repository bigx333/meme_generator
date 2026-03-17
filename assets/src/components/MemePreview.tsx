import clsx from 'clsx'

import { normalizeLines } from '@/lib/memeRenderer'
import { getPlacements } from '@/lib/placements'
import type { MemeLine, MemeTemplate } from '@/lib/types'

type MemePreviewProps = {
  template: MemeTemplate
  lines: MemeLine[]
  size?: 'sm' | 'md' | 'lg'
  showGuides?: boolean
  className?: string
  hiddenLineIds?: Set<string>
}

export function MemePreview({
  template,
  lines,
  size = 'md',
  showGuides = false,
  className,
  hiddenLineIds,
}: MemePreviewProps) {
  const resolvedLines = normalizeLines(template, lines)
  const placements = getPlacements(template)
  const aspect = template.width / template.height
  const sizeClass =
    size === 'lg' ? 'min-h-[420px]' : size === 'sm' ? 'min-h-[220px]' : 'min-h-[320px]'

  return (
    <div
      className={clsx(
        'glass-panel relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-indigo-900/40',
        'bg-slate-950/60',
        sizeClass,
        className,
      )}
      style={{
        width: '100%',
        aspectRatio: aspect,
        backgroundImage: `url(${template.imageUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {placements.map((placement, index) => {
        if (hiddenLineIds?.has(placement.id)) return null
        const line = resolvedLines[index]
        const alignClass =
          placement.align === 'left'
            ? 'items-start text-left'
            : placement.align === 'right'
              ? 'items-end text-right'
              : 'items-center text-center'

        return (
          <div
            key={placement.id}
            className={clsx('pointer-events-none absolute flex gap-2 px-2 py-1 select-none', alignClass)}
            style={{
              left: `${placement.x * 100}%`,
              top: `${placement.y * 100}%`,
              width: `${placement.width * 100}%`,
              height: `${placement.height * 100}%`,
            }}
          >
            {showGuides ? (
              <div className="absolute inset-0 rounded-lg border border-cyan-300/40 bg-cyan-300/5" />
            ) : null}
            <p
              className="meme-display m-0 w-full text-white uppercase tracking-[0.06em] drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
              style={{
                fontWeight: 900,
                fontSize: 'clamp(18px, 2.6vw, 42px)',
                WebkitTextStroke: '2px #000',
                textShadow:
                  '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 0 24px rgba(0,0,0,0.4)',
                lineHeight: 1.1,
                wordBreak: 'break-word',
              }}
            >
              {line?.text || placement.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

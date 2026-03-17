import type { MemeTemplate, Placement } from './types'

export type PlacementSource = 'imgflip' | 'ai'

const envSource = (import.meta.env.VITE_PLACEMENT_SOURCE as string | undefined)?.trim()
export const placementSource: PlacementSource = envSource === 'ai' ? 'ai' : 'imgflip'

export function getPlacements(template: MemeTemplate): Placement[] {
  if (placementSource === 'ai' && template.aiPlacements.length > 0) {
    return template.aiPlacements
  }

  return template.placements
}

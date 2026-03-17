import { z } from 'zod'

export const placementSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  align: z.enum(['center', 'left', 'right']).default('center'),
})

export const memeLineSchema = z.object({
  id: z.string(),
  text: z.string(),
  align: z.enum(['center', 'left', 'right']).default('center'),
})

export const memeTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  imageUrl: z.string(),
  width: z.number(),
  height: z.number(),
  boxCount: z.number(),
  placements: z.array(placementSchema),
  aiPlacements: z.array(placementSchema).default([]),
  source: z.string().default('imgflip'),
  createdAt: z.number().optional(),
})

export const memeSchema = z.object({
  id: z.number(),
  templateId: z.number(),
  label: z.string().nullable().optional(),
  lines: z.array(memeLineSchema),
  renderDataUrl: z.string().nullable().optional(),
  createdAt: z.number(),
})

export type Placement = z.infer<typeof placementSchema>
export type MemeLine = z.infer<typeof memeLineSchema>
export type MemeTemplate = z.infer<typeof memeTemplateSchema>
export type Meme = z.infer<typeof memeSchema>

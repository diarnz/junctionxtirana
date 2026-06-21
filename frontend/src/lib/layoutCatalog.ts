import type { RoomLayoutItem } from '@/types'

export interface ModelMeta {
  label: string
  /** footprint width (x) in metres */
  w: number
  /** footprint depth (z) in metres */
  d: number
  category: string
  color: string
}

export const CATEGORY_COLORS: Record<string, string> = {
  seating: '#3da9f5',
  tables: '#f5a623',
  av_equipment: '#a855f7',
  staging: '#ef4444',
  lighting: '#eab308',
  misc: '#10b981',
  other: '#94a3b8',
}

/** Top-down metadata for each 3D model key (footprints are sensible approximations). */
export const MODEL_META: Record<string, ModelMeta> = {
  simple_chair: { label: 'Chair (Standard)', w: 0.5, d: 0.5, category: 'seating', color: CATEGORY_COLORS.seating },
  office_chair: { label: 'Chair (Executive)', w: 0.55, d: 0.55, category: 'seating', color: CATEGORY_COLORS.seating },
  simple_table: { label: 'Round Table', w: 1.2, d: 1.2, category: 'tables', color: CATEGORY_COLORS.tables },
  office_table: { label: 'Rectangular Table', w: 1.6, d: 0.8, category: 'tables', color: CATEGORY_COLORS.tables },
  office_monitor: { label: 'Monitor / PC', w: 0.55, d: 0.25, category: 'av_equipment', color: CATEGORY_COLORS.av_equipment },
  keyboard_mouse: { label: 'Keyboard & Mouse', w: 0.45, d: 0.18, category: 'misc', color: CATEGORY_COLORS.misc },
  led_tv: { label: 'TV Display', w: 1.2, d: 0.25, category: 'av_equipment', color: CATEGORY_COLORS.av_equipment },
  wall_flat_tv: { label: 'Wall TV / Projector', w: 1.3, d: 0.15, category: 'av_equipment', color: CATEGORY_COLORS.av_equipment },
  speaker: { label: 'Speaker / Lighting', w: 0.45, d: 0.45, category: 'lighting', color: CATEGORY_COLORS.lighting },
  microphone_stand: { label: 'Microphone', w: 0.3, d: 0.3, category: 'av_equipment', color: CATEGORY_COLORS.av_equipment },
  whiteboard: { label: 'Whiteboard', w: 1.2, d: 0.2, category: 'misc', color: CATEGORY_COLORS.misc },
}

export const ROOM_DIMS: Record<string, { w: number; d: number }> = {
  'lime-green-box': { w: 5.5, d: 3.2 },
  'dark-green-box': { w: 4.2, d: 4.0 },
  'orange-box': { w: 8.0, d: 4.2 },
  'blue-box': { w: 5.2, d: 3.8 },
}

export function metaFor(modelKey: string): ModelMeta {
  return (
    MODEL_META[modelKey] ?? {
      label: modelKey.replace(/_/g, ' '),
      w: 0.5,
      d: 0.5,
      category: 'other',
      color: CATEGORY_COLORS.other,
    }
  )
}

export interface LayoutCount {
  modelKey: string
  label: string
  category: string
  color: string
  count: number
}

export function countItems(items: RoomLayoutItem[]): LayoutCount[] {
  const map = new Map<string, LayoutCount>()
  for (const item of items) {
    if (!item?.modelKey) continue
    const meta = metaFor(item.modelKey)
    const existing = map.get(item.modelKey)
    if (existing) {
      existing.count += 1
    } else {
      map.set(item.modelKey, {
        modelKey: item.modelKey,
        label: meta.label,
        category: meta.category,
        color: meta.color,
        count: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

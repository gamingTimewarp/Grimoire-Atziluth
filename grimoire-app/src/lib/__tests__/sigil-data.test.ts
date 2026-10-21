import { describe, it, expect } from 'vitest'
import { SIGIL_PRESETS, SIGIL_VIEWBOX_SIZE } from '../sigil-data'

describe('SIGIL_PRESETS', () => {
  it('circle preset has one circle and no points or lines', () => {
    const d = SIGIL_PRESETS.find(p => p.id === 'circle')!.build()
    expect(d.circles).toHaveLength(1)
    expect(d.points).toHaveLength(0)
    expect(d.lines).toHaveLength(0)
  })

  it('circle+pentagram preset has 5 points, 5 lines, and 1 circle, all lines referencing real points', () => {
    const d = SIGIL_PRESETS.find(p => p.id === 'circle-pentagram')!.build()
    expect(d.points).toHaveLength(5)
    expect(d.lines).toHaveLength(5)
    expect(d.circles).toHaveLength(1)
    const ids = new Set(d.points.map(p => p.id))
    for (const l of d.lines) {
      expect(ids.has(l.a)).toBe(true)
      expect(ids.has(l.b)).toBe(true)
      expect(l.a).not.toBe(l.b)
    }
  })

  it('circle+hexagram preset has 6 points, 6 lines (two overlapping triangles), and 1 circle', () => {
    const d = SIGIL_PRESETS.find(p => p.id === 'circle-hexagram')!.build()
    expect(d.points).toHaveLength(6)
    expect(d.lines).toHaveLength(6)
    expect(d.circles).toHaveLength(1)
    const ids = new Set(d.points.map(p => p.id))
    for (const l of d.lines) {
      expect(ids.has(l.a)).toBe(true)
      expect(ids.has(l.b)).toBe(true)
    }
  })

  it('every preset keeps its geometry within the shared viewBox', () => {
    for (const preset of SIGIL_PRESETS) {
      const d = preset.build()
      for (const p of d.points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(SIGIL_VIEWBOX_SIZE)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(SIGIL_VIEWBOX_SIZE)
      }
      for (const c of d.circles) {
        expect(c.cx - c.r).toBeGreaterThanOrEqual(0)
        expect(c.cx + c.r).toBeLessThanOrEqual(SIGIL_VIEWBOX_SIZE)
      }
    }
  })

  it('each preset call generates fresh ids rather than reusing a shared instance', () => {
    const d1 = SIGIL_PRESETS.find(p => p.id === 'circle-pentagram')!.build()
    const d2 = SIGIL_PRESETS.find(p => p.id === 'circle-pentagram')!.build()
    expect(d1.points[0].id).not.toBe(d2.points[0].id)
  })
})

/**
 * AspectsModal.tsx
 * Full-list view of a chart's aspects, pulled out of the natal chart detail
 * page's sidebar — a plain always-expanded list got unwieldy once a chart had
 * more than a handful of aspects. Adds two sort modes beyond the engine's
 * default (tightest orb first): grouped by the planets involved, or grouped by
 * aspect type.
 */

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { ASPECT_DEFS } from '@/lib/astro-engine'
import type { Aspect, AspectType } from '@/lib/astro-engine'

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'var(--color-text)',
  sextile:     '#6ab0a8',
  square:      '#c44a4a',
  trine:       '#6aa86a',
  opposition:  '#c47a4a',
}

type AspectSortMode = 'degree' | 'planet' | 'aspect'

const ASPECT_TYPE_ORDER: Record<AspectType, number> = Object.fromEntries(
  ASPECT_DEFS.map((d, i) => [d.type, i]),
) as Record<AspectType, number>

interface AspectsModalProps {
  aspects: Aspect[]
  /** Canonical names of the chart's planets, in the chart's own display order — used
   * as the "By Planet" sort key so grouping follows the chart's own planet sequence
   * (Sun, Moon, Mercury, ...) rather than an arbitrary alphabetical one. */
  planetOrder: string[]
  onNavigate: (canonicalName: string) => void
  onClose: () => void
}

export function AspectsModal({ aspects, planetOrder, onNavigate, onClose }: AspectsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [sortMode, setSortMode] = useState<AspectSortMode>('degree')
  useFocusTrap(dialogRef)

  useEffect(() => { dialogRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const planetIndex = new Map(planetOrder.map((cn, i) => [cn, i]))
  const idxOf = (cn: string) => planetIndex.get(cn) ?? 999

  const sorted = [...aspects].sort((a, b) => {
    if (sortMode === 'aspect') {
      const at = ASPECT_TYPE_ORDER[a.type] - ASPECT_TYPE_ORDER[b.type]
      if (at !== 0) return at
      return a.orb - b.orb
    }
    if (sortMode === 'planet') {
      const aMin = Math.min(idxOf(a.planet1.canonicalName), idxOf(a.planet2.canonicalName))
      const bMin = Math.min(idxOf(b.planet1.canonicalName), idxOf(b.planet2.canonicalName))
      if (aMin !== bMin) return aMin - bMin
      const aMax = Math.max(idxOf(a.planet1.canonicalName), idxOf(a.planet2.canonicalName))
      const bMax = Math.max(idxOf(b.planet1.canonicalName), idxOf(b.planet2.canonicalName))
      if (aMax !== bMax) return aMax - bMax
      return a.orb - b.orb
    }
    return a.orb - b.orb
  })

  const goToRef = (cn: string) => { onNavigate(cn); onClose() }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Aspects"
      tabIndex={-1}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        outline: 'none', padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '10px', boxShadow: '0 8px 48px rgba(0, 0, 0, 0.6)',
        width: '100%', maxWidth: '480px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
          gap: '10px', flexWrap: 'wrap',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, margin: 0 }}>Aspects ({aspects.length})</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SegmentedToggle
              value={sortMode}
              onChange={setSortMode}
              options={[
                { value: 'degree', label: 'Degree', title: 'Sort by tightest orb first' },
                { value: 'planet', label: 'Planet',  title: 'Group by the planets involved' },
                { value: 'aspect', label: 'Aspect',  title: 'Group by aspect type' },
              ]}
            />
            <button
              type="button" onClick={onClose} aria-label="Close aspects"
              style={{
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '6px', padding: '6px', cursor: 'pointer',
                color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {sorted.map((asp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span
                role="button" tabIndex={0}
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => goToRef(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet1.canonicalName) } }} title={asp.planet1.name}
              >{asp.planet1.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)', minWidth: '18px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => goToRef('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef('astrology.aspect.' + asp.type) } }} title={asp.type}
              >{asp.symbol}</span>
              <span
                role="button" tabIndex={0}
                style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', minWidth: '18px', cursor: 'pointer' }}
                onClick={() => goToRef(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet2.canonicalName) } }} title={asp.planet2.name}
              >{asp.planet2.symbol}</span>
              <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => goToRef(asp.planet1.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet1.canonicalName) } }}>{asp.planet1.name}</span>
                {' '}
                <span
                  role="button" tabIndex={0}
                  style={{ cursor: 'pointer', color: ASPECT_COLORS[asp.type] ?? 'var(--color-text-muted)' }}
                  onClick={() => goToRef('astrology.aspect.' + asp.type)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef('astrology.aspect.' + asp.type) } }}
                >{asp.type}</span>
                {' '}
                <span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => goToRef(asp.planet2.canonicalName)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToRef(asp.planet2.canonicalName) } }}>{asp.planet2.name}</span>
              </span>
              <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>{asp.orb}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

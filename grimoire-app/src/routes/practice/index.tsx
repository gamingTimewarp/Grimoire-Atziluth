import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, X, ExternalLink, Timer, CircleDot, Layers, Hash, Play, Pause, RotateCcw,
  Save, FolderOpen, Upload, Download, Archive, Circle, User, Settings,
} from 'lucide-react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity, GrimoireEngine } from '@grimoire/core'
import { PYTHAGOREAN_TABLE, CHALDEAN_TABLE, sumLatinWord, sumGematriaWord, reduceNumber } from '@/lib/numerology-calc'
import { WheelChart } from '@/components/ui/WheelChart'
import { getNatalChart } from '@/lib/astro-engine'
import type { AstrologyMode, NatalChartData } from '@/lib/astro-engine'
import { getEffectiveDate, getHomeLocation } from '@/lib/settings-store'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { listNatalCharts, getNatalChartById } from '@/lib/natal-db'
import type { NatalChartRecord } from '@/lib/natal-db'
import { zonedTimeToUtc } from '@/lib/timezone'
import { RITUAL_CORRESPONDENCES, RITUAL_CORRESPONDENCE_CATEGORIES } from '@/lib/ritual-correspondences'
import type { RitualCorrespondence } from '@/lib/ritual-correspondences'
import {
  loadPinnedCanonicalNames, savePinnedCanonicalNames, loadSlotPicks, saveSlotPicks,
  loadRitualSettings, loadWidgetSlots, saveWidgetSlots, loadRitualNotes, saveRitualNotes,
} from '@/lib/practice-store'
import type {
  RitualGroupsEnabled, RitualWidgetState, TimerWidgetState, MagicCircleWidgetState, ReadingWidgetState,
  NumerologyWidgetState, NatalChartWidgetState,
} from '@/lib/practice-store'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import type { DeckFilter } from '@/lib/built-in-data'
import { getAllCustomDecks, deckRecordToFilter } from '@/lib/custom-db'
import type { CustomEntityRecord } from '@/lib/custom-db'
import {
  exportRitualToFile, pickAndImportRitualFile, saveRitualAsCustomEntity, getSavedRituals,
} from '@/lib/ritual-io'
import type { RitualSnapshot } from '@/lib/ritual-io'
import { EntityArt } from '@/components/ui/EntityArt'
import { SolomonicCircleDiagram } from '@/components/ui/SolomonicCircleDiagram'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { SigillumDiagram } from '@/components/ui/SigillumDiagram'
import { KameaDiagram } from '@/components/ui/KameaDiagram'
import { PentagramDiagram } from '@/components/ui/PentagramDiagram'
import { HexagramDiagram } from '@/components/ui/HexagramDiagram'
import { Toast } from '@/components/ui/Toast'

const MAGIC_DIAGRAM_ENTITY_TYPES = ['magic.circle', 'magic.pentagram', 'magic.hexagram', 'magic.kamea']

export const Route = createFileRoute('/practice/')({
  component: PracticePage,
})

const BAR_HEIGHT = 72
const ADD_BOX_WIDTH = 72

// ─── Side ritual widgets (2 left + 2 right of the ritual space) ───────────

const WIDGET_SLOT_SIZE = 150

// ─── Ritual space geometry ──────────────────────────────────────────────────
// 8 compass points on the ring (cardinal N/E/S/W + intercardinal NE/SE/SW/NW),
// plus 4 corner slots (Tetragrammaton — Yod, Heh, Waw, Heh, reading clockwise
// from top-left: YHVH) and one unlabelled slot dead centre. All 13 are
// otherwise functionally identical RitualSlots; `group` is only used to let
// Settings → Traditions → Ritual show/hide each category independently.

const SPACE_SIZE = 440
const SPACE_R = 170
const SLOT_SIZE = 64
const CORNER_INSET = SLOT_SIZE / 2 + 10
const RITUAL_ROW_GAP = 20
// The ritual space + its two widget columns are given a hard minimum total
// width (rather than letting their minmax(0,1fr) tracks shrink to fit a
// narrow viewport) so the layout never reflows on mobile — instead it
// overflows, and the ZoomableSVGContainer wrapping it clips/pans/zooms that
// overflow, same as every other fixed-size diagram in this app.
const RITUAL_ROW_MIN_WIDTH = WIDGET_SLOT_SIZE * 2 + SPACE_SIZE + RITUAL_ROW_GAP * 2

function dirPos(angleDeg: number): { x: number; y: number } {
  const rad = angleDeg * Math.PI / 180
  return { x: SPACE_SIZE / 2 + SPACE_R * Math.cos(rad), y: SPACE_SIZE / 2 + SPACE_R * Math.sin(rad) }
}

interface SlotDef {
  id: string
  group: keyof RitualGroupsEnabled
  /** Default display label — the Hebrew letter itself for corners, blank for centre. */
  hebrewLabel: string
  /** English transliteration, shown alongside hebrewLabel when that option is on. Equal to
   *  hebrewLabel for compass points, which have no Hebrew/English distinction. */
  englishLabel: string
  x: number
  y: number
}

const SLOT_DEFS: SlotDef[] = [
  { id: 'N',  group: 'cardinal',       hebrewLabel: 'N',  englishLabel: 'N',  ...dirPos(-90) },
  { id: 'NE', group: 'intercardinal',  hebrewLabel: 'NE', englishLabel: 'NE', ...dirPos(-45) },
  { id: 'E',  group: 'cardinal',       hebrewLabel: 'E',  englishLabel: 'E',  ...dirPos(0) },
  { id: 'SE', group: 'intercardinal',  hebrewLabel: 'SE', englishLabel: 'SE', ...dirPos(45) },
  { id: 'S',  group: 'cardinal',       hebrewLabel: 'S',  englishLabel: 'S',  ...dirPos(90) },
  { id: 'SW', group: 'intercardinal',  hebrewLabel: 'SW', englishLabel: 'SW', ...dirPos(135) },
  { id: 'W',  group: 'cardinal',       hebrewLabel: 'W',  englishLabel: 'W',  ...dirPos(180) },
  { id: 'NW', group: 'intercardinal',  hebrewLabel: 'NW', englishLabel: 'NW', ...dirPos(225) },
  { id: 'CENTER', group: 'center',  hebrewLabel: '',  englishLabel: '',    x: SPACE_SIZE / 2,            y: SPACE_SIZE / 2 },
  { id: 'TL',     group: 'corners', hebrewLabel: 'י', englishLabel: 'Yod', x: CORNER_INSET,              y: CORNER_INSET },
  { id: 'TR',     group: 'corners', hebrewLabel: 'ה', englishLabel: 'Heh', x: SPACE_SIZE - CORNER_INSET, y: CORNER_INSET },
  { id: 'BR',     group: 'corners', hebrewLabel: 'ו', englishLabel: 'Waw', x: SPACE_SIZE - CORNER_INSET, y: SPACE_SIZE - CORNER_INSET },
  { id: 'BL',     group: 'corners', hebrewLabel: 'ה', englishLabel: 'Heh', x: CORNER_INSET,              y: SPACE_SIZE - CORNER_INSET },
]

function slotDisplayLabel(def: SlotDef, showEnglishCaptions: boolean): string {
  if (!def.hebrewLabel) return ''
  if (!showEnglishCaptions || def.hebrewLabel === def.englishLabel) return def.hebrewLabel
  return `${def.hebrewLabel} (${def.englishLabel})`
}

function PracticePage() {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [pinned, setPinned] = useState<BaseEntity[]>([])
  const [pinnedHydrated, setPinnedHydrated] = useState(false)
  // Slot id → RitualCorrespondence canonicalName. Resolved against the
  // static RITUAL_CORRESPONDENCES list, so (unlike pinned entities) there's
  // nothing async to hydrate — the saved value is immediately usable.
  const [slotPicks, setSlotPicks] = useState<Record<string, string>>(() => loadSlotPicks())
  const [ritualSettings, setRitualSettings] = useState(() => loadRitualSettings())
  const [widgetSlots, setWidgetSlots] = useState<Record<string, RitualWidgetState>>(() => loadWidgetSlots())
  const [notes, setNotes] = useState(() => loadRitualNotes())
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Settings → Traditions → Ritual can change these while this page isn't mounted;
  // re-read on focus/change so returning here (or a second window) reflects the latest.
  useEffect(() => {
    const handler = () => setRitualSettings(loadRitualSettings())
    window.addEventListener('grimoire:ritual-settings-changed', handler)
    return () => window.removeEventListener('grimoire:ritual-settings-changed', handler)
  }, [])

  // Re-hydrate pinned entities from their saved canonicalNames once the engine is ready.
  useEffect(() => {
    if (!engine) return
    const saved = loadPinnedCanonicalNames()
    if (saved.length === 0) { setPinnedHydrated(true); return }
    Promise.all(saved.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
      .then(results => setPinned(results.filter((e): e is BaseEntity => e !== null)))
      .catch(console.error)
      .finally(() => setPinnedHydrated(true))
  }, [engine])

  // Persist pinned entities — gated on pinnedHydrated so this can't fire with
  // the empty initial state and wipe the saved list before hydration runs.
  useEffect(() => {
    if (!pinnedHydrated) return
    savePinnedCanonicalNames(pinned.map(e => e.canonicalName))
  }, [pinned, pinnedHydrated])

  useEffect(() => {
    saveSlotPicks(slotPicks)
  }, [slotPicks])

  useEffect(() => {
    saveWidgetSlots(widgetSlots)
  }, [widgetSlots])

  useEffect(() => {
    saveRitualNotes(notes)
  }, [notes])

  const addPin = (entity: BaseEntity) => {
    setPinned(prev => prev.some(e => e.canonicalName === entity.canonicalName) ? prev : [...prev, entity])
  }
  const removePin = (canonicalName: string) => {
    setPinned(prev => prev.filter(e => e.canonicalName !== canonicalName))
  }
  const clearPins = () => setPinned([])

  const setSlot = (id: string, c: RitualCorrespondence) => setSlotPicks(prev => ({ ...prev, [id]: c.canonicalName }))
  const clearSlot = (id: string) => setSlotPicks(prev => {
    const next = { ...prev }
    delete next[id]
    return next
  })
  const clearAllSlots = () => {
    setSlotPicks({})
    setWidgetSlots({})
  }
  const anySlotSet = Object.keys(slotPicks).length > 0 || Object.keys(widgetSlots).length > 0

  const setWidget = (id: string, w: RitualWidgetState) => setWidgetSlots(prev => ({ ...prev, [id]: w }))
  const clearWidget = (id: string) => setWidgetSlots(prev => {
    const next = { ...prev }
    delete next[id]
    return next
  })

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  const buildSnapshot = (): RitualSnapshot => ({
    pinnedCanonicalNames: pinned.map(e => e.canonicalName),
    slotPicks,
    widgetSlots,
    notes,
  })

  const applySnapshot = (snapshot: RitualSnapshot) => {
    setSlotPicks(snapshot.slotPicks)
    setWidgetSlots(snapshot.widgetSlots)
    setNotes(snapshot.notes)
    if (!engine) { setPinned([]); return }
    Promise.all(snapshot.pinnedCanonicalNames.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
      .then(results => setPinned(results.filter((e): e is BaseEntity => e !== null)))
      .catch(console.error)
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Practice</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <SaveRitualButton getSnapshot={buildSnapshot} engine={engine} onToast={showToast} />
          <LoadRitualButton onApply={applySnapshot} onToast={showToast} />
        </div>
      </div>
      {toastMsg && <Toast message={toastMsg} />}

      {/* Pinned-entities bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Pinned References
        </span>
        {pinned.length > 0 && (
          <button
            onClick={clearPins}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '11px', padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
          >
            Clear all
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
        {pinned.map(entity => (
          <PinSlot
            key={entity.canonicalName}
            entity={entity}
            onOpen={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: entity.canonicalName } })}
            onRemove={() => removePin(entity.canonicalName)}
          />
        ))}
        <AddPinSlot full={pinned.length === 0} excluding={pinned.map(e => e.canonicalName)} onPick={addPin} />
      </div>

      {/* Ritual space */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Ritual Space
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate({ to: '/settings/traditions', hash: 'ritual-settings' })}
            title="Ritual settings"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '11px', padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
          >
            <Settings size={11} /> Ritual settings
          </button>
          {anySlotSet && (
            <button
              onClick={clearAllSlots}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '11px', padding: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      <ZoomableSVGContainer>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center',
          gap: `${RITUAL_ROW_GAP}px`, minWidth: `${RITUAL_ROW_MIN_WIDTH}px`,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifySelf: 'end' }}>
            <WidgetSlot state={widgetSlots['left-1']} onSet={w => setWidget('left-1', w)} onClear={() => clearWidget('left-1')} />
            <WidgetSlot state={widgetSlots['left-2']} onSet={w => setWidget('left-2', w)} onClear={() => clearWidget('left-2')} />
          </div>

          <div style={{ position: 'relative', width: `${SPACE_SIZE}px`, height: `${SPACE_SIZE}px`, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: `${SPACE_R * 2}px`, height: `${SPACE_R * 2}px`, borderRadius: '50%',
              border: '1px dashed var(--color-border)',
            }} />
            {SLOT_DEFS.filter(d => ritualSettings.groupsEnabled[d.group]).map(d => {
              const cn = slotPicks[d.id]
              const value = cn ? RITUAL_CORRESPONDENCES.find(c => c.canonicalName === cn) ?? null : null
              return (
                <RitualSlot
                  key={d.id}
                  label={slotDisplayLabel(d, ritualSettings.showEnglishCaptions)}
                  x={d.x}
                  y={d.y}
                  value={value}
                  onPick={c => setSlot(d.id, c)}
                  onClear={() => clearSlot(d.id)}
                  navigate={navigate}
                />
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifySelf: 'start' }}>
            <WidgetSlot state={widgetSlots['right-1']} onSet={w => setWidget('right-1', w)} onClear={() => clearWidget('right-1')} />
            <WidgetSlot state={widgetSlots['right-2']} onSet={w => setWidget('right-2', w)} onClear={() => clearWidget('right-2')} />
          </div>
        </div>
      </ZoomableSVGContainer>

      {/* Notes */}
      <div style={{ marginTop: '32px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
          Notes
        </span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes for this ritual…"
          rows={6}
          style={{
            width: '100%', padding: '10px 12px', boxSizing: 'border-box',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px',
            fontFamily: 'inherit', outline: 'none', resize: 'vertical',
          }}
        />
      </div>
    </div>
  )
}

// ─── Pinned entity slot ─────────────────────────────────────────────────────

function PinSlot({ entity, onOpen, onRemove }: { entity: BaseEntity; onOpen: () => void; onRemove: () => void }) {
  return (
    <div
      style={{
        position: 'relative', flex: '1 1 140px', minWidth: '140px', height: `${BAR_HEIGHT}px`,
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px',
      }}
      onClick={onOpen}
      title={entity.primaryDisplayName}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <span style={{
        fontSize: '13px', fontWeight: 500, color: 'var(--color-text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
      }}>
        {entity.primaryDisplayName}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        title="Unpin"
        style={{
          position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px', display: 'flex', color: 'var(--color-text-subtle)',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Add-pin slot + search popover ──────────────────────────────────────────

function AddPinSlot({ full, excluding, onPick }: { full: boolean; excluding: string[]; onPick: (e: BaseEntity) => void }) {
  const { engine } = useEngineStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BaseEntity[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!engine || !query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const r = await engine.adapter.searchEntities(query.trim(), undefined, { offset: 0, limit: 8 })
      setResults(r.items.map(sr => sr.entity).filter(e => !excluding.includes(e.canonicalName)))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, engine, excluding])

  const pick = (entity: BaseEntity) => {
    onPick(entity)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: full ? '1 1 0' : `0 0 ${ADD_BOX_WIDTH}px`, minWidth: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Pin a reference entity"
        style={{
          width: '100%', height: `${BAR_HEIGHT}px`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: '2px dashed var(--color-border)', borderRadius: '8px',
          cursor: 'pointer', color: 'var(--color-text-subtle)', transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)'; e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        <Plus size={full ? 22 : 18} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: `${BAR_HEIGHT + 6}px`, right: 0, zIndex: 20,
          width: '280px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '10px',
        }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search entities…"
            style={{
              width: '100%', padding: '7px 10px', boxSizing: 'border-box',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
              marginBottom: results.length > 0 ? '8px' : 0,
            }}
          />
          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '240px', overflowY: 'auto' }}>
              {results.map(e => (
                <button
                  key={e.canonicalName}
                  onClick={() => pick(e)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px',
                    background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                    color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
                  }}
                  onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--color-surface-3)' }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = 'none' }}
                >
                  {e.primaryDisplayName}
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '6px' }}>
                    {e.canonicalName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Ritual slot (compass point, corner, or centre) ────────────────────────

function RitualSlot({
  label, x, y, value, onPick, onClear, navigate,
}: {
  label: string
  x: number
  y: number
  value: RitualCorrespondence | null
  onPick: (c: RitualCorrespondence) => void
  onClear: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Position is captured fresh each time the popover opens — it's portaled to
  // document.body (see CorrespondencePicker) to escape this slot's own and the
  // ritual space's pan/zoom transforms, both of which would otherwise trap a
  // plain position:fixed/absolute to their own transformed box instead of the
  // real viewport. Escaping that way means the popover no longer inherits a
  // position from its trigger automatically, so this recomputes it explicitly
  // from the actual click point, rather than the button's own (much larger)
  // bounding box, so it opens right where the pointer is instead of trailing
  // off toward whichever edge the box happens to end at.
  const toggleOpen = (e: React.MouseEvent) => {
    if (!open) setAnchor({ top: e.clientY + 8, left: e.clientX })
    setOpen(o => !o)
  }

  return (
    <div
      style={{
        position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
      }}
    >
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          onClick={toggleOpen}
          title={value ? value.label : (label ? `Set ${label}` : 'Set')}
          style={{
            width: `${SLOT_SIZE}px`, height: `${SLOT_SIZE}px`, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit', padding: 0,
            ...(value
              ? { background: value.color, border: '2px solid rgba(255,255,255,0.18)', color: '#fff' }
              : { background: 'none', border: '2px dashed var(--color-border)', color: 'var(--color-text-subtle)' }),
          }}
          onMouseEnter={e => { if (!value) { e.currentTarget.style.borderColor = 'var(--color-accent-muted)'; e.currentTarget.style.color = 'var(--color-accent)' } }}
          onMouseLeave={e => { if (!value) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-subtle)' } }}
        >
          {value ? <span style={{ fontSize: '22px', lineHeight: 1 }}>{value.symbol}</span> : <Plus size={20} />}
        </button>

        {value && (
          <>
            <button
              onClick={e => { e.stopPropagation(); onClear() }}
              title="Clear"
              style={{
                position: 'absolute', top: '-6px', left: '-6px', width: '20px', height: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '4px',
                cursor: 'pointer', color: 'var(--color-text-muted)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.borderColor = 'var(--color-danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              <X size={11} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); navigate({ to: '/reference', search: { tag: value.tag, q: undefined, custom: undefined } }) }}
              title={`View all "${value.tag}"-tagged entities in Reference`}
              style={{
                position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '4px',
                cursor: 'pointer', color: 'var(--color-text-muted)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              <ExternalLink size={11} />
            </button>
          </>
        )}

        {open && anchor && (
          <CorrespondencePicker
            innerRef={popoverRef}
            anchor={anchor}
            onPick={c => { onPick(c); setOpen(false) }}
            onClear={value ? () => { onClear(); setOpen(false) } : undefined}
          />
        )}
      </div>

      {label && (
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-subtle)', letterSpacing: '0.05em' }}>
          {label}
        </span>
      )}
    </div>
  )
}

function CorrespondencePicker({
  innerRef, anchor, onPick, onClear,
}: {
  innerRef: RefObject<HTMLDivElement | null>
  anchor: { top: number; left: number }
  onPick: (c: RitualCorrespondence) => void
  onClear?: () => void
}) {
  return createPortal(
    <div ref={innerRef} style={{
      position: 'fixed', top: `${anchor.top}px`, left: `${anchor.left}px`, transform: 'translateX(-50%)', zIndex: 9000,
      width: '220px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '10px',
      maxHeight: '320px', overflowY: 'auto',
    }}>
      {RITUAL_CORRESPONDENCE_CATEGORIES.map(cat => (
        <div key={cat} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            {cat}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {RITUAL_CORRESPONDENCES.filter(c => c.category === cat).map(c => (
              <button
                key={c.canonicalName}
                onClick={() => onPick(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                  padding: '6px 8px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                  color: 'var(--color-text)', fontSize: '12px', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: c.color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff',
                }}>
                  {c.symbol}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {onClear && (
        <button
          onClick={onClear}
          style={{
            width: '100%', textAlign: 'center', padding: '6px', background: 'none', cursor: 'pointer',
            border: 'none', borderTop: '1px solid var(--color-border)', marginTop: '4px',
            color: 'var(--color-text-subtle)', fontSize: '11px', fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
      )}
    </div>,
    document.body,
  )
}

// ─── Side widget slot (timer/stopwatch or Magic Circle) ────────────────────

function WidgetSlot({
  state, onSet, onClear,
}: {
  state: RitualWidgetState | undefined
  onSet: (w: RitualWidgetState) => void
  onClear: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Captured fresh on open from the actual click point — the popover is
  // portaled to document.body (escaping this slot's and the ritual space's
  // pan/zoom transforms, see CorrespondencePicker) purely to guarantee it
  // paints on top of everything else; its x/y should still track wherever was
  // clicked. Using the click coordinates directly, rather than the trigger's
  // own (150px-square) bounding box, matters here specifically because the
  // [+] icon sits in the middle of that box — anchoring off the box's bottom
  // edge put the popover ~75px further down than the icon itself.
  const toggleOpen = (e: React.MouseEvent) => {
    if (!pickerOpen) setPickerAnchor({ top: e.clientY + 8, left: e.clientX })
    setPickerOpen(o => !o)
  }

  if (!state) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          onClick={toggleOpen}
          title="Add a ritual widget"
          style={{
            width: `${WIDGET_SLOT_SIZE}px`, height: `${WIDGET_SLOT_SIZE}px`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: '2px dashed var(--color-border)', borderRadius: '8px',
            cursor: 'pointer', color: 'var(--color-text-subtle)', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)'; e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          <Plus size={22} />
        </button>

        {pickerOpen && pickerAnchor && createPortal(
          <div ref={popoverRef} style={{
            position: 'fixed', top: `${pickerAnchor.top}px`, left: `${pickerAnchor.left}px`, transform: 'translateX(-50%)', zIndex: 9000,
            width: '190px', maxHeight: '280px', overflowY: 'auto',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '8px',
            display: 'flex', flexDirection: 'column', gap: '2px',
          }}>
            <button
              onClick={() => { onSet({ kind: 'timer', mode: 'stopwatch', running: false, accumulatedMs: 0, startedAt: null, durationMs: 5 * 60 * 1000 }); setPickerOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <Timer size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Timer / Stopwatch
            </button>
            <button
              onClick={() => { onSet({ kind: 'magic-circle', canonicalName: null }); setPickerOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <CircleDot size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Magic Circle
            </button>
            <button
              onClick={() => { onSet({ kind: 'reading', deckId: null }); setPickerOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <Layers size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Reading
            </button>
            <button
              onClick={() => { onSet({ kind: 'numerology', system: 'pythagorean', input: '' }); setPickerOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <Hash size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Numerology
            </button>
            <button
              onClick={() => { onSet({ kind: 'sky-wheel' }); setPickerOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <Circle size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Sky Wheel
            </button>
            <button
              onClick={() => { onSet({ kind: 'natal-chart', chartId: null }); setPickerOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <User size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Natal Chart
            </button>
          </div>,
          document.body,
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        minWidth: `${WIDGET_SLOT_SIZE}px`, minHeight: `${WIDGET_SLOT_SIZE}px`, boxSizing: 'border-box',
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {state.kind === 'timer' && <TimerWidget state={state} onChange={onSet} />}
        {state.kind === 'magic-circle' && <MagicCircleWidget state={state} onChange={onSet} />}
        {state.kind === 'reading' && <ReadingWidget state={state} onChange={onSet} />}
        {state.kind === 'numerology' && <NumerologyWidget state={state} onChange={onSet} />}
        {state.kind === 'sky-wheel' && <SkyWheelWidget />}
        {state.kind === 'natal-chart' && <NatalChartWidget state={state} onChange={onSet} />}
      </div>
      <button
        onClick={onClear}
        title="Remove widget"
        style={{
          position: 'absolute', top: '-6px', left: '-6px', width: '20px', height: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '4px',
          cursor: 'pointer', color: 'var(--color-text-muted)',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.borderColor = 'var(--color-danger)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
      >
        <X size={11} />
      </button>
    </div>
  )
}

// ─── Timer / stopwatch widget ───────────────────────────────────────────────

function formatClock(ms: number): { main: string; ms: string } {
  const clampedMs = Math.max(0, Math.floor(ms))
  const totalSec = Math.floor(clampedMs / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  const mmm = String(clampedMs % 1000).padStart(3, '0')
  return { main: `${mm}:${ss}`, ms: mmm }
}

function TimerWidget({ state, onChange }: { state: TimerWidgetState; onChange: (w: TimerWidgetState) => void }) {
  // Re-render every tick while running so the displayed time advances — the
  // actual elapsed value is always computed fresh from wall-clock time
  // against startedAt, not accumulated by the tick itself, so it's correct
  // immediately after a reload instead of restarting from 0. 50ms (rather
  // than a coarser tick) keeps the milliseconds digits reading smoothly.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!state.running) return
    const id = setInterval(() => forceTick(t => t + 1), 50)
    return () => clearInterval(id)
  }, [state.running])

  const elapsedMs = state.accumulatedMs + (state.running && state.startedAt ? Date.now() - state.startedAt : 0)
  const displayMs = state.mode === 'countdown' ? Math.max(0, state.durationMs - elapsedMs) : elapsedMs
  const { main, ms } = formatClock(displayMs)

  // Auto-stop a running countdown once it reaches zero. Flipping `running`
  // to false here stops the tick effect above, so this can't re-trigger itself.
  useEffect(() => {
    if (state.mode === 'countdown' && state.running && elapsedMs >= state.durationMs) {
      onChange({ ...state, running: false, accumulatedMs: state.durationMs, startedAt: null })
    }
  }, [state, elapsedMs, onChange])

  const toggle = () => {
    if (state.running) {
      onChange({ ...state, running: false, accumulatedMs: elapsedMs, startedAt: null })
    } else {
      onChange({ ...state, running: true, startedAt: Date.now() })
    }
  }
  const reset = () => onChange({ ...state, running: false, accumulatedMs: 0, startedAt: null })

  const setMode = (mode: 'stopwatch' | 'countdown') => {
    if (state.running || mode === state.mode) return
    onChange({ ...state, mode, running: false, accumulatedMs: 0, startedAt: null })
  }

  const durationTotalSec = Math.floor(state.durationMs / 1000)
  const durMm = Math.floor(durationTotalSec / 60)
  const durSs = durationTotalSec % 60
  const setDuration = (mm: number, ss: number) => {
    const clampedMm = Math.min(99, Math.max(0, Math.floor(mm) || 0))
    const clampedSs = Math.min(59, Math.max(0, Math.floor(ss) || 0))
    onChange({ ...state, durationMs: (clampedMm * 60 + clampedSs) * 1000 })
  }

  const btnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px',
    background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: '6px',
    cursor: 'pointer', color: 'var(--color-text-muted)',
  } as const

  const modeTabStyle = (active: boolean) => ({
    padding: '3px 9px', fontSize: '11px', borderRadius: '5px', cursor: state.running ? 'default' : 'pointer',
    background: active ? 'var(--color-accent)' : 'none',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-accent-contrast)' : 'var(--color-text-subtle)',
    opacity: state.running && !active ? 0.5 : 1,
    fontFamily: 'inherit',
  } as const)

  const durInputStyle = {
    width: '32px', padding: '3px 2px', textAlign: 'center', background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)',
    fontSize: '12px', fontVariantNumeric: 'tabular-nums',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => setMode('stopwatch')} disabled={state.running} style={modeTabStyle(state.mode === 'stopwatch')}>
          Stopwatch
        </button>
        <button onClick={() => setMode('countdown')} disabled={state.running} style={modeTabStyle(state.mode === 'countdown')}>
          Timer
        </button>
      </div>

      {state.mode === 'countdown' && !state.running && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number" min={0} max={99} value={durMm}
            onChange={e => setDuration(Number(e.target.value), durSs)}
            style={durInputStyle}
          />
          <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>:</span>
          <input
            type="number" min={0} max={59} value={durSs}
            onChange={e => setDuration(durMm, Number(e.target.value))}
            style={durInputStyle}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontSize: '26px', fontWeight: 300, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
          {main}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 300, color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
          .{ms}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={toggle}
          title={state.running ? 'Pause' : 'Start'}
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          {state.running ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={reset}
          title="Reset"
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Magic Circle widget ────────────────────────────────────────────────────

function MagicCircleWidget({ state, onChange }: { state: MagicCircleWidgetState; onChange: (w: MagicCircleWidgetState) => void }) {
  const { engine } = useEngineStore()
  const [entities, setEntities] = useState<BaseEntity[]>([])
  const [selected, setSelected] = useState<BaseEntity | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!engine || state.canonicalName) return
    Promise.all(MAGIC_DIAGRAM_ENTITY_TYPES.map(entityType =>
      engine.adapter.listEntities({ entityType }, { offset: 0, limit: 50 })))
      .then(results => setEntities(results.flatMap(r => r.items)))
      .catch(console.error)
  }, [engine, state.canonicalName])

  useEffect(() => {
    if (!engine || !state.canonicalName) { setSelected(null); return }
    engine.adapter.getEntityByCanonicalName(state.canonicalName).then(setSelected).catch(console.error)
  }, [engine, state.canonicalName])

  if (!state.canonicalName) {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? entities.filter(e => e.primaryDisplayName.toLowerCase().includes(q) || e.canonicalName.toLowerCase().includes(q))
      : entities

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: `${WIDGET_SLOT_SIZE - 24}px` }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          Select a Diagram
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            width: '100%', padding: '6px 8px', boxSizing: 'border-box',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '12px', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: `${WIDGET_SLOT_SIZE - 24}px`, overflowY: 'auto' }}>
          {entities.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Loading…</div>}
          {entities.length > 0 && filtered.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No matches.</div>
          )}
          {filtered.map(e => (
            <button
              key={e.canonicalName}
              onClick={() => onChange({ kind: 'magic-circle', canonicalName: e.canonicalName })}
              style={{
                textAlign: 'left', padding: '7px 9px', background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '12px', fontFamily: 'inherit',
              }}
              onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
              onMouseLeave={ev => { ev.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              {e.primaryDisplayName}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '280px', maxWidth: '100%' }}>
      {state.canonicalName === 'magic.circle.solomonic' && <SolomonicCircleDiagram />}
      {state.canonicalName === 'magic.circle.sigillum-dei-aemeth' && <SigillumDiagram />}
      {selected?.entityType === 'magic.pentagram' && <PentagramDiagram entity={selected} />}
      {selected?.entityType === 'magic.hexagram' && <HexagramDiagram entity={selected} />}
      {selected?.entityType === 'magic.kamea' && <KameaDiagram entity={selected} />}
    </div>
  )
}

// ─── Reading widget (pick a deck, draw a single card) ──────────────────────

/** Flattens decks with variants (e.g. Rider-Waite-Smith "Full 78" vs "Major
 *  Arcana Only") into directly-pickable leaf DeckFilters, merging each
 *  variant's tags/entityType/cardCanonicalNames over the parent deck's —
 *  same resolution read/index.tsx's DeckSelection does on variant click,
 *  just flattened up front instead of as a two-step picker. */
function flattenDeckOptions(decks: DeckFilter[]): DeckFilter[] {
  return decks.flatMap(d => {
    if (!d.variants || d.variants.length === 0) return [d]
    return d.variants.map(v => ({
      id: v.id,
      displayName: d.variants!.length > 1 ? `${d.displayName} — ${v.label}` : d.displayName,
      description: d.description,
      tags: v.tags,
      entityType: v.entityType ?? d.entityType,
      cardCanonicalNames: v.cardCanonicalNames,
      reversalEnabled: d.reversalEnabled,
    }))
  })
}

function ReadingWidget({ state, onChange }: { state: ReadingWidgetState; onChange: (w: ReadingWidgetState) => void }) {
  const navigate = useNavigate()
  const { engine } = useEngineStore()
  const [decks, setDecks] = useState<DeckFilter[]>(BUILT_IN_DECK_FILTERS)
  const [card, setCard] = useState<BaseEntity | null>(null)
  const [orientation, setOrientation] = useState<'upright' | 'reversed'>('upright')
  const [drawing, setDrawing] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getAllCustomDecks()
      .then(records => setDecks([...BUILT_IN_DECK_FILTERS, ...records.map(deckRecordToFilter)]))
      .catch(console.error)
  }, [])

  const deckOptions = flattenDeckOptions(decks)
  const deck = deckOptions.find(d => d.id === state.deckId) ?? null

  const pickDeck = (deckId: string) => {
    onChange({ kind: 'reading', deckId })
    setCard(null)
  }
  const changeDeck = () => {
    onChange({ kind: 'reading', deckId: null })
    setCard(null)
  }

  const draw = async () => {
    if (!engine || !deck) return
    setDrawing(true)
    try {
      let items: BaseEntity[]
      if (deck.cardCanonicalNames) {
        const resolved = await Promise.all(deck.cardCanonicalNames.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
        items = resolved.filter((e): e is BaseEntity => e !== null)
      } else {
        const result = await engine.adapter.listEntities({ tags: deck.tags, entityType: deck.entityType }, { offset: 0, limit: 500 })
        items = result.items
      }
      if (items.length === 0) return
      setCard(items[Math.floor(Math.random() * items.length)])
      setOrientation(deck.reversalEnabled && Math.random() < 0.5 ? 'reversed' : 'upright')
    } catch (err) {
      console.error('Failed to draw a card:', err)
    } finally {
      setDrawing(false)
    }
  }

  if (!state.deckId) {
    const q = query.trim().toLowerCase()
    const filteredDecks = q ? deckOptions.filter(d => d.displayName.toLowerCase().includes(q)) : deckOptions

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: `${WIDGET_SLOT_SIZE - 24}px` }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          Select a Deck
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            width: '100%', padding: '6px 8px', boxSizing: 'border-box',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '12px', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: `${WIDGET_SLOT_SIZE - 24}px`, overflowY: 'auto' }}>
          {deckOptions.length > 0 && filteredDecks.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No matches.</div>
          )}
          {filteredDecks.map(d => (
            <button
              key={d.id}
              onClick={() => pickDeck(d.id)}
              style={{
                textAlign: 'left', padding: '7px 9px', background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '12px', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              {d.displayName}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {deck?.displayName ?? 'Reading'}
      </div>

      {card ? (
        <>
          <button
            onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: card.canonicalName } })}
            title={`View ${card.primaryDisplayName} in Reference`}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
          >
            <EntityArt entity={card} width={70} height={112} />
          </button>
          <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
            {orientation === 'reversed' ? '↓ Reversed' : '↑ Upright'}
          </div>
        </>
      ) : (
        <div style={{
          width: '70px', height: '112px', borderRadius: '6px',
          border: '1px dashed var(--color-border)',
        }} />
      )}

      <button
        onClick={draw}
        disabled={drawing || !deck}
        style={{
          padding: '5px 14px', background: 'var(--color-accent)', border: '1px solid var(--color-accent)',
          borderRadius: '6px', cursor: drawing ? 'default' : 'pointer', color: 'var(--color-accent-contrast)',
          fontSize: '12px', fontFamily: 'inherit', opacity: drawing ? 0.6 : 1,
        }}
      >
        {card ? 'Draw Again' : 'Draw'}
      </button>

      <button
        onClick={changeDeck}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '10px', padding: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        Change deck
      </button>
    </div>
  )
}

// ─── Numerology widget ───────────────────────────────────────────────────────

function numerologySystemTabStyle(active: boolean) {
  return {
    flex: 1, padding: '4px 0', fontSize: '10px', borderRadius: '5px', cursor: 'pointer',
    background: active ? 'var(--color-accent)' : 'none',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-accent-contrast)' : 'var(--color-text-subtle)',
    fontFamily: 'inherit',
  } as const
}

const NUMEROLOGY_SYSTEM_LABELS: Record<NumerologyWidgetState['system'], string> = {
  pythagorean: 'Pyth',
  chaldean: 'Chald',
  gematria: 'Gem',
}

function NumerologyWidget({ state, onChange }: { state: NumerologyWidgetState; onChange: (w: NumerologyWidgetState) => void }) {
  const setSystem = (system: NumerologyWidgetState['system']) => onChange({ ...state, system })
  const setInput = (input: string) => onChange({ ...state, input })

  const hasInput = state.input.trim().length > 0
  let error: string | null = null
  let display: { big: number; sub: string | null } | null = null

  if (hasInput) {
    if (state.system === 'gematria') {
      const r = sumGematriaWord(state.input)
      error = r.error
      if (!error) display = { big: r.total, sub: null }
    } else {
      const table = state.system === 'pythagorean' ? PYTHAGOREAN_TABLE : CHALDEAN_TABLE
      const sum = sumLatinWord(state.input, table)
      const reduced = reduceNumber(sum)
      display = { big: reduced.result, sub: sum !== reduced.result ? `sum ${sum}` : null }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: `${WIDGET_SLOT_SIZE - 24}px` }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {(Object.keys(NUMEROLOGY_SYSTEM_LABELS) as NumerologyWidgetState['system'][]).map(sys => (
          <button key={sys} onClick={() => setSystem(sys)} style={numerologySystemTabStyle(state.system === sys)}>
            {NUMEROLOGY_SYSTEM_LABELS[sys]}
          </button>
        ))}
      </div>
      <input
        value={state.input}
        onChange={e => setInput(e.target.value)}
        placeholder={state.system === 'gematria' ? 'Hebrew word/phrase…' : 'Word or phrase…'}
        style={{
          width: '100%', padding: '6px 8px', boxSizing: 'border-box',
          background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
          borderRadius: '6px', color: 'var(--color-text)', fontSize: '12px', outline: 'none',
        }}
      />
      <div style={{ textAlign: 'center', minHeight: '38px' }}>
        {error ? (
          <div style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{error}</div>
        ) : display ? (
          <>
            <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
              {display.big}
            </div>
            {display.sub && (
              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{display.sub}</div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
            Enter a word or phrase
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sky Wheel / Natal Chart widgets ────────────────────────────────────────
// Both render a WheelChart much larger than WIDGET_SLOT_SIZE — at the normal
// ~130px widget content width a wheel's glyphs and degree ticks are illegible,
// so these two intentionally grow past the nominal slot size (the filled-slot
// container has no max-width, same as MagicCircleWidget's 280px diagrams).
const WHEEL_WIDGET_SIZE = 260

function SkyWheelWidget() {
  const navigate = useNavigate()
  const [chart, setChart] = useState<NatalChartData | null>(null)
  const [mode, setMode] = useState<AstrologyMode>('tropical')

  useEffect(() => {
    const compute = () => {
      const date = getEffectiveDate()
      const loc = getHomeLocation()
      const { astrologyMode, houseSystem } = loadTraditionSettings()
      setMode(astrologyMode)
      try {
        // Classical planets only (no nodes/modern/asteroids) and no aspects —
        // at this widget's scale, those just clutter a chart that's meant to
        // be glanced at, not analysed in full the way the Astrology page's
        // own wheel is.
        const c = getNatalChart(date, loc?.lat ?? 0, loc?.lon ?? 0, houseSystem, astrologyMode, { showNodes: false, showModernPlanets: false })
        setChart({ ...c, aspects: [] })
      } catch (err) {
        console.error('Sky Wheel widget compute error:', err)
      }
    }
    compute()
    const id = setInterval(compute, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Sky Wheel
      </div>
      {chart ? (
        <WheelChart
          chart={chart} size={WHEEL_WIDGET_SIZE} mode={mode} hideControls showTooltip={false}
          showLots={false} defaultLayout="rings" glyphScale={3} zodiacBandScale={2}
        />
      ) : (
        <div style={{ width: `${WHEEL_WIDGET_SIZE}px`, height: `${WHEEL_WIDGET_SIZE}px`, borderRadius: '50%', border: '1px dashed var(--color-border)' }} />
      )}
      <button
        onClick={() => navigate({ to: '/astrology' })}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '10px', padding: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
      >
        Open Astrology page
      </button>
    </div>
  )
}

function NatalChartWidget({ state, onChange }: { state: NatalChartWidgetState; onChange: (w: NatalChartWidgetState) => void }) {
  const navigate = useNavigate()
  const [records, setRecords] = useState<NatalChartRecord[]>([])
  const [record, setRecord] = useState<NatalChartRecord | null>(null)
  const [chart, setChart] = useState<NatalChartData | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (state.chartId) return
    listNatalCharts().then(setRecords).catch(console.error)
  }, [state.chartId])

  useEffect(() => {
    if (!state.chartId) { setRecord(null); setChart(null); return }
    getNatalChartById(state.chartId).then(r => {
      setRecord(r)
      if (!r) return
      const { astrologyMode, houseSystem } = loadTraditionSettings()
      const birthDate = zonedTimeToUtc(r.birthDate, r.birthTime ?? '12:00', r.birthTimezone)
      try {
        // Classical planets only, no aspects — see SkyWheelWidget.
        const c = getNatalChart(birthDate, r.birthLat ?? 0, r.birthLon ?? 0, houseSystem, astrologyMode, { showNodes: false, showModernPlanets: false })
        setChart({ ...c, aspects: [] })
      } catch (err) {
        console.error('Natal Chart widget compute error:', err)
      }
    }).catch(console.error)
  }, [state.chartId])

  const pickChart = (chartId: string) => onChange({ kind: 'natal-chart', chartId })
  const changeChart = () => onChange({ kind: 'natal-chart', chartId: null })

  if (!state.chartId) {
    const q = query.trim().toLowerCase()
    const filtered = q ? records.filter(r => r.name.toLowerCase().includes(q)) : records

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: `${WHEEL_WIDGET_SIZE}px` }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          Select a Natal Chart
        </div>
        {records.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            No natal charts saved.{' '}
            <button
              onClick={() => navigate({ to: '/astrology/new', search: { edit: undefined } })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px', padding: 0 }}
            >
              Create one
            </button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%', padding: '6px 8px', boxSizing: 'border-box',
                background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                borderRadius: '6px', color: 'var(--color-text)', fontSize: '12px', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {filtered.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No matches.</div>}
              {filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => pickChart(r.id)}
                  style={{
                    textAlign: 'left', padding: '7px 9px', background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer',
                    color: 'var(--color-text)', fontSize: '12px', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                >
                  {r.name}{r.isSelf ? ' (Self)' : ''}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {record?.name ?? 'Natal Chart'}
      </div>
      {chart ? (
        <WheelChart
          chart={chart} size={WHEEL_WIDGET_SIZE} hideControls showTooltip={false}
          showLots={false} defaultLayout="rings" glyphScale={3} zodiacBandScale={2}
        />
      ) : (
        <div style={{ width: `${WHEEL_WIDGET_SIZE}px`, height: `${WHEEL_WIDGET_SIZE}px`, borderRadius: '50%', border: '1px dashed var(--color-border)' }} />
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        {record && (
          <button
            onClick={() => navigate({ to: '/astrology/$id', params: { id: record.id } })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '10px', padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
          >
            View full chart
          </button>
        )}
        <button
          onClick={changeChart}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', fontSize: '10px', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          Change chart
        </button>
      </div>
    </div>
  )
}

// ─── Save / Load ritual toolbar ─────────────────────────────────────────────

const toolbarBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
  background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px',
  cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'inherit',
} as const

const popoverStyle = {
  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20,
  width: '240px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
  borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '10px',
  display: 'flex', flexDirection: 'column', gap: '4px',
} as const

const popoverRowBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
  padding: '8px 9px', background: 'none', border: 'none', borderRadius: '5px', cursor: 'pointer',
  color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box',
} as const

function useClosePopoverOnOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])
  return ref
}

function SaveRitualButton({
  getSnapshot, engine, onToast,
}: {
  getSnapshot: () => RitualSnapshot
  engine: GrimoireEngine | null
  onToast: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ref = useClosePopoverOnOutsideClick(open, () => setOpen(false))

  const doExport = async () => {
    try {
      const path = await exportRitualToFile(getSnapshot(), name.trim() || 'Ritual')
      if (path) { onToast('Ritual exported.'); setOpen(false) }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to export ritual.')
    }
  }

  const doSaveInternal = async () => {
    if (!engine) return
    const dn = name.trim()
    if (!dn) return
    try {
      await saveRitualAsCustomEntity(engine, getSnapshot(), dn)
      onToast(`Saved ritual "${dn}".`)
      setOpen(false)
      setName('')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to save ritual.')
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={toolbarBtnStyle}>
        <Save size={13} /> Save
      </button>
      {open && (
        <div style={popoverStyle}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ritual name"
            style={{
              width: '100%', padding: '7px 9px', boxSizing: 'border-box',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
              marginBottom: '4px',
            }}
          />
          <button onClick={doExport} style={popoverRowBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <Download size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Export as JSON…
          </button>
          <button onClick={doSaveInternal} disabled={!name.trim()} style={{ ...popoverRowBtnStyle, opacity: name.trim() ? 1 : 0.5, cursor: name.trim() ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (name.trim()) e.currentTarget.style.background = 'var(--color-surface-3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <Archive size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Save as Custom Entity
          </button>
        </div>
      )}
    </div>
  )
}

function LoadRitualButton({
  onApply, onToast,
}: {
  onApply: (s: RitualSnapshot) => void
  onToast: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<{ record: CustomEntityRecord; snapshot: RitualSnapshot }[]>([])
  const ref = useClosePopoverOnOutsideClick(open, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    getSavedRituals().then(setSaved).catch(console.error)
  }, [open])

  const confirmApply = (snapshot: RitualSnapshot, label: string) => {
    if (!window.confirm(`Load "${label}"? This replaces the current pinned references, ritual-space picks, widgets, and notes.`)) return
    onApply(snapshot)
    onToast(`Loaded "${label}".`)
    setOpen(false)
  }

  const doImportFile = async () => {
    try {
      const result = await pickAndImportRitualFile()
      if (!result) return
      confirmApply(result.snapshot, result.displayName)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to import ritual file.')
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={toolbarBtnStyle}>
        <FolderOpen size={13} /> Load
      </button>
      {open && (
        <div style={popoverStyle}>
          <button onClick={doImportFile} style={popoverRowBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <Upload size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} /> Import from JSON…
          </button>
          {saved.length > 0 && (
            <>
              <div style={{
                fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase',
                letterSpacing: '0.08em', margin: '6px 2px 2px',
              }}>
                Saved Rituals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '220px', overflowY: 'auto' }}>
                {saved.map(({ record, snapshot }) => (
                  <button
                    key={record.canonicalName}
                    onClick={() => confirmApply(snapshot, record.displayName)}
                    style={popoverRowBtnStyle}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    {record.displayName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

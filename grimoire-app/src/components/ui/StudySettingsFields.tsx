/**
 * StudySettingsFields.tsx
 * The "Session" / "Question Modes" / "Entity Types & Fields" editor body shared
 * between the preset editor (/study/presets) and the one-time session
 * customizer (/study/new) — one editor, two hosts, so they can never drift.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Info, Image as ImageIcon } from 'lucide-react'
import type { QuizSettings, QuestionMode } from '@/lib/quiz-db'
import { TAROT_DECK_OPTIONS, groupByNamespace, groupKey } from '@/lib/quiz-engine'
import type { DiscoveredEntityType, QuestionTypeDef } from '@/lib/quiz-engine'
import type { EntityTypeDiscovery } from '@/lib/quiz-discovery-hooks'
import { EntityLink } from './EntityLink'

// ─── Shared layout primitives ──────────────────────────────────────────────────

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px', padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</span>
      {children}
    </div>
  )
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', padding: 0,
        background: on ? 'var(--color-accent)' : 'var(--color-border)', position: 'relative', flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
        position: 'absolute', top: '3px', left: on ? '19px' : '3px',
        transition: 'left 0.15s',
      }} />
    </button>
  )
}

const optionRowStyle = (correct: boolean): React.CSSProperties => ({
  padding: '5px 9px', borderRadius: '4px', fontSize: '11px', marginBottom: '4px',
  border: `1px solid ${correct ? '#4a8a4a' : 'var(--color-border)'}`,
  background: correct ? 'rgba(100,160,100,0.15)' : 'var(--color-surface-1)',
  color: 'var(--color-text)',
})

/** Static, illustrative mock of what each question mode looks like in a session —
 * not wired to real entities/engine, just enough to show the shape at a glance. */
function QuestionModePreview({ mode }: { mode: QuestionMode }) {
  if (mode === 'flashcard') {
    return (
      <>
        <div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '8px' }}>
          &ldquo;What is the Hebrew letter of The Fool?&rdquo;
        </div>
        <div style={{
          display: 'inline-block', fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
          border: '1px dashed var(--color-border)', color: 'var(--color-text-subtle)', marginBottom: '8px',
        }}>
          tap to reveal
        </div>
        <div style={{ fontSize: '15px', fontWeight: 300, color: 'var(--color-accent)' }}>
          Aleph (א)
        </div>
      </>
    )
  }
  if (mode === 'multiple-choice') {
    return (
      <>
        <div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '8px' }}>
          &ldquo;What is the planetary ruler of Scorpio?&rdquo;
        </div>
        {[['Mars', true], ['Venus', false], ['Saturn', false], ['Jupiter', false]].map(([label, correct]) => (
          <div key={label as string} style={optionRowStyle(correct as boolean)}>{label}</div>
        ))}
      </>
    )
  }
  if (mode === 'fill-in-blank') {
    return (
      <>
        <div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '8px' }}>
          &ldquo;What is the number of The Chariot?&rdquo;
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input disabled value="7" style={{ ...inputStyle, width: '48px', textAlign: 'left' }} />
          <div style={{
            fontSize: '11px', padding: '5px 10px', borderRadius: '4px',
            border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)',
          }}>
            Check
          </div>
        </div>
      </>
    )
  }
  // image-recognition
  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{
          width: '40px', height: '56px', flexShrink: 0, borderRadius: '4px',
          background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ImageIcon size={16} style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text)', paddingTop: '4px' }}>
          &ldquo;Name this card&rdquo;
        </div>
      </div>
      {[['The Star', true], ['The Moon', false], ['The Sun', false], ['The World', false]].map(([label, correct]) => (
        <div key={label as string} style={optionRowStyle(correct as boolean)}>{label}</div>
      ))}
    </>
  )
}

/** Hover (desktop) / tap (mobile) info icon that reveals a QuestionModePreview.
 * Hover opens/closes via mouseenter/mouseleave; tap opens it and leaves it open
 * until the user taps the backdrop, since touch devices don't reliably fire
 * mouseleave the way a real pointer does. */
function ModeInfoIcon({ mode, open, onOpen, onClose }: {
  mode: QuestionMode
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <>
      {/* The backdrop must be a sibling, not a descendant, of the hover-tracked div below —
       * otherwise it covers the whole viewport as part of that div's own subtree, so the
       * pointer is always "inside" it and mouseleave never fires. */}
      <div
        style={{ position: 'relative', display: 'inline-flex', zIndex: open ? 201 : undefined }}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        <button
          onClick={e => { e.stopPropagation(); onOpen() }}
          aria-label={`Example ${mode.replace(/-/g, ' ')} question`}
          style={{
            display: 'flex', alignItems: 'center', background: 'none', border: 'none',
            padding: '2px', margin: 0, cursor: 'pointer', color: 'var(--color-text-subtle)',
          }}
        >
          <Info size={12} />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '20px', left: '-6px', width: '230px',
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
            borderRadius: '6px', padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            <QuestionModePreview mode={mode} />
          </div>
        )}
      </div>
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
      )}
    </>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '70px', padding: '6px 10px', textAlign: 'right',
  background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
  borderRadius: '5px', color: 'var(--color-text)', fontSize: '13px',
  fontFamily: 'inherit', outline: 'none',
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px', fontSize: '11px', fontFamily: 'inherit',
  border: '1px solid', borderRadius: '4px', cursor: 'pointer',
  borderColor: active ? 'var(--color-accent-muted)' : 'var(--color-border)',
  background: active ? 'rgba(180,156,90,0.1)' : 'transparent',
  color: active ? 'var(--color-accent)' : 'var(--color-text-subtle)',
})

// groupKey/groupByNamespace now live in quiz-engine.ts (general-purpose, also
// reused by the Study dashboard's progress tracker so the two screens can
// never structurally drift apart).

// ─── Single entity-type row (toggle + its question-type chips) ─────────────────

function EntityTypeToggleRow({
  et, enabled, defs, loading, enabledKeys, tarotDecks, onToggleType, onToggleQuestionType, onToggleTarotDeck,
}: {
  et: DiscoveredEntityType
  enabled: boolean
  defs: QuestionTypeDef[]
  loading: boolean
  enabledKeys: string[]
  tarotDecks: string[]
  onToggleType: () => void
  onToggleQuestionType: (key: string) => void
  onToggleTarotDeck: (deckId: string) => void
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? '8px' : 0 }}>
        <span style={{ fontSize: '13px', color: enabled ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
          {et.label} <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>({et.count})</span>
        </span>
        <Toggle on={enabled} onToggle={onToggleType} />
      </div>
      {enabled && loading && (
        <div style={{ paddingLeft: '16px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
          Discovering fields…
        </div>
      )}
      {enabled && defs.length > 0 && (
        <div style={{ paddingLeft: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {defs.map(def => (
            <button key={def.key} onClick={() => onToggleQuestionType(def.key)} style={pillStyle(enabledKeys.includes(def.key))}>
              {def.label}
            </button>
          ))}
        </div>
      )}
      {enabled && et.entityType === 'tarot.card' && (
        <div style={{ paddingLeft: '16px', marginTop: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '6px' }}>
            Decks — independent of the default deck set in Settings → Traditions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TAROT_DECK_OPTIONS.map(deck => (
              <button key={deck.id} onClick={() => onToggleTarotDeck(deck.id)} style={pillStyle(tarotDecks.length === 0 || tarotDecks.includes(deck.id))}>
                {deck.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Editor body ────────────────────────────────────────────────────────────────

export function StudySettingsFields({
  settings,
  onChange,
  discovery,
}: {
  settings: QuizSettings
  onChange: (next: QuizSettings) => void
  discovery: EntityTypeDiscovery
}) {
  const { entityTypes, defsByType, defsLoading, groupOverviews } = discovery

  const [search, setSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const seededExpansion = useRef(false)

  // Seed which groups start expanded (any group containing an already-enabled
  // type) exactly once, the first time discovery data arrives — after that,
  // expand/collapse is entirely up to the user.
  useEffect(() => {
    if (seededExpansion.current || entityTypes.length === 0) return
    seededExpansion.current = true
    const initial = new Set<string>()
    for (const et of entityTypes) {
      if (settings.enabledEntityTypes.includes(et.entityType)) initial.add(groupKey(et.entityType))
    }
    setExpandedGroups(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityTypes])

  const groups = useMemo(() => groupByNamespace(entityTypes, groupOverviews), [entityTypes, groupOverviews])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map(g => {
        const groupMatches = g.label.toLowerCase().includes(q)
        const items = groupMatches ? g.items : g.items.filter(t => t.label.toLowerCase().includes(q))
        return { ...g, items }
      })
      .filter(g => g.items.length > 0)
  }, [groups, search])

  const isSearching = search.trim() !== ''
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const [infoOpenMode, setInfoOpenMode] = useState<QuestionMode | null>(null)

  const toggleMode = (mode: QuestionMode) => {
    const has = settings.enabledModes.includes(mode)
    if (has && settings.enabledModes.length === 1) return  // keep at least one
    const next = has
      ? settings.enabledModes.filter(m => m !== mode)
      : [...settings.enabledModes, mode]
    onChange({ ...settings, enabledModes: next })
  }

  const toggleEntityType = (et: string) => {
    const has = settings.enabledEntityTypes.includes(et)
    const next = has
      ? settings.enabledEntityTypes.filter(t => t !== et)
      : [...settings.enabledEntityTypes, et]
    onChange({ ...settings, enabledEntityTypes: next })
  }

  const toggleQuestionType = (entityType: string, key: string) => {
    const current = settings.enabledQuestionTypes[entityType] ?? []
    const has = current.includes(key)
    const next = has ? current.filter(k => k !== key) : [...current, key]
    onChange({ ...settings, enabledQuestionTypes: { ...settings.enabledQuestionTypes, [entityType]: next } })
  }

  const toggleTarotDeck = (deckId: string) => {
    // Empty/missing means "all decks" — expand to the full list before removing one,
    // so the first toggle narrows the set instead of leaving it empty.
    const current = settings.tarotDecks.length > 0 ? settings.tarotDecks : TAROT_DECK_OPTIONS.map(d => d.id)
    const has = current.includes(deckId)
    if (has && current.length === 1) return  // keep at least one deck
    const next = has ? current.filter(id => id !== deckId) : [...current, deckId]
    onChange({ ...settings, tarotDecks: next })
  }

  return (
    <>
      {/* Session settings */}
      <Section label="Session">
        <Row label="Cards per session">
          <input
            type="number" min={1} max={500} value={settings.sessionSize}
            onChange={e => onChange({ ...settings, sessionSize: Math.max(1, parseInt(e.target.value) || 1) })}
            style={inputStyle}
          />
        </Row>
        <Row label="Multiple-choice options">
          <input
            type="number" min={2} max={8} value={settings.multipleChoiceCount}
            onChange={e => onChange({ ...settings, multipleChoiceCount: Math.max(2, parseInt(e.target.value) || 2) })}
            style={inputStyle}
          />
        </Row>
        <Row label="Include user-created cards">
          <Toggle on={settings.includeUserCards} onToggle={() => onChange({ ...settings, includeUserCards: !settings.includeUserCards })} />
        </Row>
      </Section>

      {/* Question modes */}
      <Section label="Question Modes">
        {([
          ['flashcard',         'Flashcard — flip to reveal answer'],
          ['multiple-choice',   'Multiple Choice — pick from options'],
          ['fill-in-blank',     'Fill in the Blank — type the answer'],
          ['image-recognition', 'Image Recognition — identify from visual'],
        ] as [QuestionMode, string][]).map(([mode, desc]) => (
          <div key={mode} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '13px', color: settings.enabledModes.includes(mode) ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {mode.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <ModeInfoIcon
                  mode={mode}
                  open={infoOpenMode === mode}
                  onOpen={() => setInfoOpenMode(mode)}
                  onClose={() => setInfoOpenMode(null)}
                />
              </div>
              <Toggle on={settings.enabledModes.includes(mode)} onToggle={() => toggleMode(mode)} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', paddingRight: '44px' }}>{desc}</div>
          </div>
        ))}
      </Section>

      {/* Entity types + fields */}
      <Section label="Entity Types & Fields">
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entity types or traditions…"
            style={{
              width: '100%', padding: '8px 30px 8px 32px', boxSizing: 'border-box',
              background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
              borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-subtle)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>No entity types match "{search}".</div>
        ) : filteredGroups.map(g => {
          const enabledCount = g.items.filter(t => settings.enabledEntityTypes.includes(t.entityType)).length
          const expanded = isSearching || expandedGroups.has(g.key)
          return (
            <div key={g.key} style={{ marginBottom: '10px' }}>
              <div
                onClick={() => !isSearching && toggleGroup(g.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0', cursor: isSearching ? 'default' : 'pointer',
                  borderBottom: '1px solid var(--color-border)', marginBottom: expanded ? '10px' : '0',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {!isSearching && (
                    <span style={{ fontSize: '10px', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
                  )}
                  {g.overviewCanonicalName ? (
                    <EntityLink canonicalName={g.overviewCanonicalName} style={{ fontWeight: 500 }} title={`View ${g.label} in Reference`}>
                      {g.label}
                    </EntityLink>
                  ) : g.label}
                </span>
                <span style={{ fontSize: '11px', color: enabledCount > 0 ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}>
                  {enabledCount > 0 ? `${enabledCount} of ${g.items.length} selected` : `${g.items.length} type${g.items.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              {expanded && (
                <div style={{ paddingLeft: '4px' }}>
                  {g.items.map(et => (
                    <EntityTypeToggleRow
                      key={et.entityType}
                      et={et}
                      enabled={settings.enabledEntityTypes.includes(et.entityType)}
                      defs={defsByType[et.entityType] ?? []}
                      loading={defsLoading.has(et.entityType)}
                      enabledKeys={settings.enabledQuestionTypes[et.entityType] ?? []}
                      tarotDecks={settings.tarotDecks}
                      onToggleType={() => toggleEntityType(et.entityType)}
                      onToggleQuestionType={key => toggleQuestionType(et.entityType, key)}
                      onToggleTarotDeck={toggleTarotDeck}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Section>
    </>
  )
}

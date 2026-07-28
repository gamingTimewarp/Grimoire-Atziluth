import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity, Link, Reading } from '@grimoire/core'
import { ArrowLeft, Star, BookMarked, ChevronDown, ChevronRight, Info, Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { loadTraditionSettings, isLinkVisible, resolveDisplayName } from '@/lib/tradition-store'
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks-store'
import { formatEntityType, formatTag } from '@/lib/format'
import { getEntriesForEntity, getReadingsForEntity } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import { getEntityAnnotation, saveEntityAnnotation } from '@/lib/custom-db'
import { recordRecentEntity } from '@/lib/recent-entities'
import { artGroupForEntityType } from '@/lib/art-store'
import { getCustomImageFileName } from '@/lib/custom-art'
import { EntityArt } from '@/components/ui/EntityArt'
import { SolomonicCircleDiagram } from '@/components/ui/SolomonicCircleDiagram'
import { SigillumDiagram } from '@/components/ui/SigillumDiagram'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import { ConstellationDiagram } from '@/components/ui/ConstellationDiagram'
import { CONSTELLATION_DIAGRAMS } from '@/lib/constellation-diagrams'
import { useReadingStore } from '@/stores/reading'
import { TRADITION_DISPLAY_NAMES } from '@/lib/tradition-store'
import {
  looksLikeCanonicalName, flattenToStrings, formatFieldLabel,
  formatLinkLabel as formatSlug, getAttributeEntries,
} from '@/lib/entity-attributes'

export const Route = createFileRoute('/reference/$canonicalName')({
  component: EntityDetailPage,
})

// ─── Planet context constants ─────────────────────────────────────────────────

const DIGNITY_LABELS       = new Set(['traditional-ruler', 'modern-ruler', 'exaltation', 'detriment', 'fall'])
const PLANET_SPIRIT_LABELS = new Set(['serves', 'embodies'])
const PLANET_STAR_LABELS   = new Set(['planetary-nature-primary', 'planetary-nature-secondary'])
const PLANET_ALL_OWN_LABELS = new Set([
  ...DIGNITY_LABELS, ...PLANET_SPIRIT_LABELS, ...PLANET_STAR_LABELS, 'ruled-by',
])
const PLANET_NATURE_KEYS = ['dayOfWeek', 'metalAlchemy', 'orbDegrees', 'polarity', 'yinYang', 'qabalisticSephira'] as const

// ─── Zodiac sign context constants ────────────────────────────────────────────

const SIGN_ALL_OWN_LABELS = new Set([...DIGNITY_LABELS, 'belongs-to'])
const SIGN_PROFILE_KEYS = ['element', 'modality', 'dateRange', 'bodyPart', 'polarity', 'hebrewLetterGD', 'hebrewLetterThoth'] as const
const SIGN_DATA_HIDE_KEYS = new Set([
  'traditionalRuler', 'modernRuler', 'exaltation', 'detriment', 'fall',
  ...SIGN_PROFILE_KEYS,
])

function EntityDetailPage() {
  const { canonicalName } = Route.useParams()
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const [entity, setEntity] = useState<BaseEntity | null>(null)
  const [links, setLinks] = useState<Link[]>([])
  const [linkedNames, setLinkedNames] = useState<Map<string, string>>(new Map())
  const [members, setMembers] = useState<BaseEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('alpha')

  useEffect(() => {
    if (!engine) return
    setLoading(true)
    setNotFound(false)
    setMembers([])

    Promise.all([
      engine.adapter.getEntityByCanonicalName(canonicalName),
      engine.adapter.queryLinks({ involvedCanonicalName: canonicalName, direction: 'both', limit: 100, offset: 0 }),
    ])
      .then(async ([e, linkResult]) => {
        if (!e) { setNotFound(true); return }

        // Redirect entities that have a designated overview page
        if (typeof e.extendedData.overviewPage === 'string') {
          navigate({ to: '/reference/$canonicalName', params: { canonicalName: e.extendedData.overviewPage }, replace: true })
          return
        }

        setEntity(e)
        recordRecentEntity(e.canonicalName, e.primaryDisplayName, e.entityType)
        setLinks(linkResult.items)

        // Collect canonical names from links
        const allCns = new Set(
          linkResult.items.flatMap(l => [l.sourceCanonicalName, l.targetCanonicalName])
            .filter(cn => cn !== canonicalName)
        )

        // Also collect canonical name-shaped strings from extendedData
        // Format: ≥3 dot-separated lowercase-hyphen segments, e.g. "tarot.deck.rider-waite-smith"
        for (const value of Object.values(e.extendedData)) {
          for (const candidate of flattenToStrings(value)) {
            if (looksLikeCanonicalName(candidate) && candidate !== canonicalName) {
              allCns.add(candidate)
            }
          }
        }

        const nameEntries = await Promise.all(
          [...allCns].map(cn =>
            engine.adapter.getEntityByCanonicalName(cn)
              .then(linked => linked ? [cn, linked.primaryDisplayName] as const : null)
          )
        )
        setLinkedNames(new Map(nameEntries.filter((entry): entry is [string, string] => entry !== null)))

        // Load members for overview entities and decks
        let memberEntityType: string | null = null
        let memberTag: string | null = null
        let memberList: string[] | null = null

        if (e.entityType === 'system.overview') {
          memberEntityType = typeof e.extendedData.memberEntityType === 'string' ? e.extendedData.memberEntityType : null
          memberTag = typeof e.extendedData.memberTag === 'string' ? e.extendedData.memberTag : null
          memberList = Array.isArray(e.extendedData.members) ? e.extendedData.members as string[] : null
        } else if (e.entityType.includes('deck')) {
          memberTag = canonicalName.split('.').pop() ?? null
        } else if (e.entityType === 'qabalah.triangle' || e.entityType === 'qabalah.pillar') {
          memberList = Array.isArray(e.extendedData.sephiroth) ? e.extendedData.sephiroth as string[] : null
        }

        if (memberList) {
          const fetched = await Promise.all(memberList.map(cn => engine.adapter.getEntityByCanonicalName(cn)))
          setMembers(fetched.filter((m): m is BaseEntity => m !== null))
        } else if (memberEntityType || memberTag) {
          const filter: { entityType?: string; tags?: string[] } = {}
          if (memberEntityType) filter.entityType = memberEntityType
          if (memberTag) filter.tags = [memberTag]
          const memberResult = await engine.adapter.listEntities(filter, { offset: 0, limit: 500 })
          setMembers(memberResult.items)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [engine, canonicalName])

  const useRwsOrder = loadTraditionSettings().primaryBySystem['tarot'] === 'tradition.golden-dawn'
  const hasTraditionalOrder = members.some(m => traditionalSortKey(m, useRwsOrder) < Infinity)
  const sortedMembers = useMemo(() => {
    if (sortMode === 'traditional' && hasTraditionalOrder) {
      return [...members].sort((a, b) => {
        const ka = traditionalSortKey(a, useRwsOrder), kb = traditionalSortKey(b, useRwsOrder)
        if (ka !== kb) return ka - kb
        return a.primaryDisplayName.localeCompare(b.primaryDisplayName)
      })
    }
    return [...members].sort((a, b) => a.primaryDisplayName.localeCompare(b.primaryDisplayName))
  }, [members, sortMode, hasTraditionalOrder, useRwsOrder])

  // Must be called before any early returns (Rules of Hooks)
  const readingDeck = useReadingStore(s => s.step !== 'deck' && s.step !== 'complete' ? s.selectedDeck : null)

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading…</div>
  }

  if (notFound || !entity) {
    return (
      <div style={{ maxWidth: '760px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/reference', search: { tag: undefined } })} style={{ marginBottom: '24px' }}>
          <ArrowLeft size={14} /> Reference
        </Button>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Entity not found: <code style={{ fontFamily: 'monospace', color: 'var(--color-text-subtle)' }}>{canonicalName}</code>
        </div>
      </div>
    )
  }

  const { activeTraditions, primaryBySystem } = loadTraditionSettings()

  // If there's an active reading, surface that deck's associated traditions in addition
  // to the user's global active-tradition filter.
  const readingTraditionIds = readingDeck?.traditionIds ?? []
  const effectiveTraditions = readingTraditionIds.length > 0
    ? [...new Set([...activeTraditions, ...readingTraditionIds])]
    : activeTraditions
  const readingContextLabel = readingTraditionIds
    .filter(id => !activeTraditions.includes(id))
    .map(id => TRADITION_DISPLAY_NAMES[id] ?? id.split('.').pop())

  const visibleLinks = links.filter(l => isLinkVisible(l, effectiveTraditions))

  // Outgoing: links where we're the source
  const outgoing = visibleLinks.filter(l => l.sourceCanonicalName === canonicalName)
  // Incoming bidirectional: where we're the target and the link is symmetric
  const incomingBidi = visibleLinks.filter(l => l.targetCanonicalName === canonicalName && l.bidirectional)
  // Incoming non-bidirectional: "referenced by" section
  const incomingUnidi = visibleLinks.filter(l => l.targetCanonicalName === canonicalName && !l.bidirectional)

  // Attribution links (attributed-*): properties the entity has — shown in Attributes
  // Correspondence links: entities that ARE the same thing in some way — shown in Correspondences
  const isAttribution = (l: Link) => l.label.startsWith('attributed-')
  const attributionLinks  = [...outgoing, ...incomingBidi].filter(isAttribution)
  const allCorrespondences = [...outgoing, ...incomingBidi].filter(l => !isAttribution(l))

  const isPlanet     = entity.entityType === 'astrology.planet'
  const isSign       = entity.entityType === 'astrology.zodiac-sign'
  const isRune       = entity.entityType === 'rune' || entity.entityType.startsWith('rune.')
  const isKamea      = entity.entityType === 'magic.kamea'
  const isPentagram  = entity.entityType === 'magic.pentagram'
  const isHexagram   = entity.entityType === 'magic.hexagram'
  const isMagicCircle = entity.entityType === 'magic.circle'
  const isConstellation = entity.entityType === 'astrology.constellation'

  const dignityLinks = isPlanet ? allCorrespondences.filter(l => DIGNITY_LABELS.has(l.label)) : []
  const spiritLinks  = isPlanet ? allCorrespondences.filter(l => PLANET_SPIRIT_LABELS.has(l.label)) : []
  const decanLinks   = isPlanet ? allCorrespondences.filter(l => l.label === 'ruled-by') : []
  const starLinks    = isPlanet ? allCorrespondences.filter(l => PLANET_STAR_LABELS.has(l.label)) : []

  const signDignityLinks = isSign ? allCorrespondences.filter(l => DIGNITY_LABELS.has(l.label)) : []
  const signDecanLinks   = isSign ? allCorrespondences.filter(l => l.label === 'belongs-to') : []

  const correspondences = (isPlanet || isSign)
    ? allCorrespondences.filter(l => isPlanet
        ? !PLANET_ALL_OWN_LABELS.has(l.label)
        : !SIGN_ALL_OWN_LABELS.has(l.label))
    : isRune
      ? allCorrespondences.filter(l => l.label !== 'aett-deity')
      : allCorrespondences
  const planetExtDataHide = isPlanet
    ? new Set(['rulesSign', 'exaltedIn', 'detrimentIn', 'fallIn', 'traditionalRulesSign', ...PLANET_NATURE_KEYS])
    : undefined
  const signExtDataHide = isSign ? SIGN_DATA_HIDE_KEYS : undefined
  const kameaExtDataHide = isKamea
    ? new Set(['grid', 'sigils', 'order', 'magicConstant', 'totalSum'])
    : undefined
  const pentagramExtDataHide = isPentagram
    ? new Set(['constructionSteps', 'vertexElements', 'startVertex', 'elementVertex', 'spiritVariant', 'elementColor', 'elementEntityCN'])
    : undefined
  const hexagramExtDataHide = isHexagram
    ? new Set(['constructionSteps', 'planetVertex', 'planetTriangle', 'planetColor', 'kameaCN', 'hexagramNote'])
    : undefined
  const circleExtDataHide = isMagicCircle
    ? new Set(['triangleNames', 'ringInscriptions', 'heptarchicKings', 'angelNames'])
    : undefined
  const constellationExtDataHide = isConstellation
    ? new Set(['brightestStarCn'])
    : undefined

  const navToEntity = (cn: string) => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Back */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft size={14} /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/reference', search: { tag: undefined } })}>
          Reference
        </Button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <EntityArtPanel entity={entity} />
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '4px' }}>
          {formatEntityType(entity.entityType)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 300, margin: 0, color: 'var(--color-text)' }}>
            {resolveDisplayName(entity, primaryBySystem)}
          </h1>
          <BookmarkButton canonicalName={entity.canonicalName} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
          {entity.canonicalName}
        </div>

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {entity.tags.map(tag => (
              <button
                key={tag}
                onClick={() => navigate({ to: '/reference', search: { tag } })}
                title={`Browse all entities tagged "${tag}"`}
                style={{
                  padding: '2px 8px', background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)', borderRadius: '4px',
                  fontSize: '11px', color: 'var(--color-text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent-muted)'
                  e.currentTarget.style.color = 'var(--color-accent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
              >
                {formatTag(tag)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Secondary names */}
      {entity.secondaryNames.length > 0 && (
        <Section title="Names">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {entity.secondaryNames
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>{n.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>{n.languageTag}</span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Description */}
      {entity.description && (
        <Section title="Description">
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
            {entity.description}
          </p>
        </Section>
      )}

      {/* Author Notes — symbolic interpretation notes for generated Thoth cards */}
      {typeof entity.extendedData.authorNotes === 'string' && (
        <Section
          title="Author Notes"
          action={
            <button
              onClick={() => navigate({ to: '/settings/credits', hash: 'thoth-licence' })}
              title="View licence information"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: 'var(--color-text-subtle)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
            >
              <Info size={13} />
            </button>
          }
        >
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.7', margin: 0 }}>
            {entity.extendedData.authorNotes}
          </p>
        </Section>
      )}

      {/* Upright / Reversed meanings */}
      <MeaningsSection data={entity.extendedData} />

      {/* Planet dignities + nature boxes */}
      {isPlanet && (
        <PlanetContextSection
          dignityLinks={dignityLinks}
          spiritLinks={spiritLinks}
          decanLinks={decanLinks}
          starLinks={starLinks}
          extendedData={entity.extendedData as Record<string, unknown>}
          linkedNames={linkedNames}
          onNavigate={navToEntity}
        />
      )}

      {/* Zodiac sign dignities + profile boxes */}
      {isSign && (
        <ZodiacSignContextSection
          dignityLinks={signDignityLinks}
          decanLinks={signDecanLinks}
          extendedData={entity.extendedData as Record<string, unknown>}
          linkedNames={linkedNames}
          onNavigate={navToEntity}
        />
      )}

      {/* Kamea magic square + sigil overlays */}
      {isKamea && <KameaSection entity={entity} />}

      {/* Pentagram construction animation */}
      {isPentagram && <PentagramSection entity={entity} />}

      {/* Hexagram construction animation */}
      {isHexagram && <HexagramSection entity={entity} />}

      {/* Magic circle diagram */}
      {isMagicCircle && <MagicCircleSection entity={entity} onNavigate={navToEntity} />}

      {/* Constellation star chart */}
      {isConstellation && <ConstellationSection entity={entity} onNavigate={navToEntity} />}

      {/* Extended data + attribution links — type-specific fields and tradition attributions */}
      {(Object.keys(entity.extendedData).length > 0 || attributionLinks.length > 0) && (
        <Section title="Attributes">
          <ExtendedDataTable data={entity.extendedData} linkedNames={linkedNames} onNavigate={navToEntity} additionalHiddenKeys={planetExtDataHide ?? signExtDataHide ?? kameaExtDataHide ?? pentagramExtDataHide ?? hexagramExtDataHide ?? circleExtDataHide ?? constellationExtDataHide} />
          {attributionLinks.length > 0 && (
            <div style={{ marginTop: Object.keys(entity.extendedData).length > 0 ? '10px' : 0 }}>
              <LinkList links={attributionLinks} selfName={canonicalName} linkedNames={linkedNames} onNavigate={navToEntity} stripAttributedPrefix />
            </div>
          )}
        </Section>
      )}

      {/* Custom attributes */}
      {entity.customAttributes.length > 0 && (
        <Section title="Custom Attributes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {entity.customAttributes
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(attr => (
                <div key={attr.id} style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', minWidth: '120px' }}>
                    {attr.label ?? attr.key}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                    {JSON.stringify(attr.value)}
                  </span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Links: outgoing + incoming bidirectional */}
      {correspondences.length > 0 && (
        <Section
          title="Correspondences"
          action={readingContextLabel.length > 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontStyle: 'italic' }}>
              + {readingContextLabel.join(', ')}
            </span>
          ) : undefined}
        >
          <LinkList links={correspondences} selfName={canonicalName} linkedNames={linkedNames} onNavigate={navToEntity} />
        </Section>
      )}

      {/* Links: incoming non-bidirectional */}
      {incomingUnidi.length > 0 && (
        <Section title="Referenced By">
          <LinkList links={incomingUnidi} selfName={canonicalName} linkedNames={linkedNames} onNavigate={navToEntity} />
        </Section>
      )}

      {/* Related overviews — reads the entity's own extendedData.relatedOverviews
          directly (resolved via the same linkedNames map used everywhere else),
          rather than a separately hand-maintained list that can drift from it. */}
      {Array.isArray(entity.extendedData.relatedOverviews) && entity.extendedData.relatedOverviews.length > 0 && (
        <Section title="See Also">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(entity.extendedData.relatedOverviews as string[]).map(cn => (
              <button
                key={cn}
                onClick={() => navToEntity(cn)}
                style={{
                  padding: '8px 14px', background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  cursor: 'pointer', color: 'var(--color-text)', fontSize: '13px',
                  fontFamily: 'inherit', fontWeight: 500, transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Members — used for decks and overview pages */}
      {sortedMembers.length > 0 && (
        <Section
          title={membersSectionTitle(entity, sortedMembers.length)}
          action={hasTraditionalOrder ? <SortToggle mode={sortMode} onChange={setSortMode} /> : undefined}
        >
          <MemberGrid members={sortedMembers} onNavigate={navToEntity} />
        </Section>
      )}

      {/* User notes */}
      {entity.userNotes && (
        <Section title="Notes">
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
            {entity.userNotes}
          </p>
        </Section>
      )}

      {/* My Notes — personal annotation */}
      <EntityAnnotationSection canonicalName={canonicalName} />

      {/* Journal entries linked to this entity */}
      <JournalLinksSection canonicalName={canonicalName} />
    </div>
  )
}


// ─── Entity art panel ─────────────────────────────────────────────────────────

/**
 * Floated art preview shown in the entity header when classic image art is available.
 * Uses an onError handler to silently hide itself if the image file doesn't exist
 * (e.g. for tarot decks that haven't been downloaded yet, or symbolic-only entities).
 */
const CARD_ART_GROUPS = new Set(['tarot-rws', 'tarot-tdm', 'tarot-thoth', 'tarot-etteilla', 'lenormand'])

// Entity types that have symbolic renderers in EntityArt but no art group
const SYMBOLIC_ENTITY_TYPES = new Set([
  'astrology.planet', 'astrology.node', 'astrology.element', 'astrology.zodiac-sign',
  'iching.hexagram', 'letter.hebrew', 'colour.colour',
])

/**
 * EntityArt already reads the current art-pack settings internally and picks the
 * right renderer (symbolic, classic image with fallback, or a custom pack/image) —
 * so this panel's only job is deciding *whether* to show a floating art preview at
 * all, not *how*. Previously this duplicated that pack-selection logic with its own
 * classicArtUrl() call hardcoded to the 'classic' pack id, which ignored whatever
 * pack the user actually had selected (e.g. always showing Lenormand's "Playing
 * Card" pack even when "Symbolic" was selected).
 */
function EntityArtPanel({ entity }: { entity: BaseEntity }) {
  const group = artGroupForEntityType(entity.entityType, entity.canonicalName)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const hasArt = !!getCustomImageFileName(entity) || !!group || SYMBOLIC_ENTITY_TYPES.has(entity.entityType)
  if (!hasArt) return null

  const w = 80
  const h = Math.round(w * 1.4)

  return (
    <>
      <div
        onClick={() => setLightboxOpen(true)}
        title="Click to zoom"
        style={{ float: 'right', marginLeft: '20px', marginBottom: '12px', cursor: 'zoom-in' }}
      >
        <EntityArt entity={entity} width={w} height={h} />
      </div>
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <EntityArt entity={entity} width={200} height={280} />
        </div>
      )}
    </>
  )
}

// ─── Member section helpers ───────────────────────────────────────────────────

function membersSectionTitle(entity: BaseEntity, count: number): string {
  if (entity.entityType === 'system.overview') return `Contents (${count})`
  if (entity.entityType.includes('deck')) return `Cards in this Deck (${count})`
  if (entity.entityType === 'qabalah.triangle' || entity.entityType === 'qabalah.pillar') return `Sephiroth (${count})`
  return `Members (${count})`
}

function MemberGrid({ members, onNavigate }: { members: BaseEntity[]; onNavigate: (cn: string) => void }) {
  // Check if the first member with an art group should drive a card-art layout
  const firstWithArt = members.find(m => artGroupForEntityType(m.entityType, m.canonicalName) !== null)
  const artGroup = firstWithArt ? artGroupForEntityType(firstWithArt.entityType, firstWithArt.canonicalName) : null
  const showArt = artGroup !== null
  const isCard = artGroup !== null && CARD_ART_GROUPS.has(artGroup)

  if (showArt) {
    // Art-card grid: portrait tiles for tarot/lenormand, square for others
    const tileW = isCard ? 90 : 72
    const tileH = isCard ? Math.round(tileW * 1.4) : 72
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {members.map(m => (
          <MemberArtTile key={m.id} member={m} tileW={tileW} tileH={tileH} isCard={isCard} onNavigate={onNavigate} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
      {members.map(m => (
        <button
          key={m.id}
          onClick={() => onNavigate(m.canonicalName)}
          title={m.canonicalName}
          style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '5px', padding: '8px 10px', cursor: 'pointer',
            color: 'var(--color-text)', fontSize: '13px', textAlign: 'left',
            fontFamily: 'inherit', transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          <div style={{ fontWeight: 500, marginBottom: '2px' }}>{m.primaryDisplayName}</div>
          {m.description && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: '1.3' }}>
              {m.description.slice(0, 60)}{m.description.length > 60 ? '…' : ''}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function MemberArtTile({
  member, tileW, tileH, isCard, onNavigate,
}: {
  member: BaseEntity; tileW: number; tileH: number; isCard: boolean; onNavigate: (cn: string) => void
}) {
  return (
    <button
      onClick={() => onNavigate(member.canonicalName)}
      title={member.primaryDisplayName}
      style={{
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: isCard ? '6px' : '4px', padding: 0, cursor: 'pointer',
        color: 'var(--color-text)', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: tileW + 2, transition: 'border-color 0.15s', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <EntityArt entity={member} width={tileW} height={tileH} />
      <div style={{
        fontSize: '9px', color: 'var(--color-text-muted)', padding: '3px 4px',
        textAlign: 'center', lineHeight: '1.2', width: '100%',
        borderTop: '1px solid var(--color-border)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {member.primaryDisplayName}
      </div>
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true)
  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen ? '10px' : '0', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          {title}
        </div>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {isOpen && (
        <div style={{ padding: '16px', background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Sort toggle ──────────────────────────────────────────────────────────────

type SortMode = 'alpha' | 'traditional'

/** Priority list of extendedData fields that encode traditional/canonical order. */
const SORT_NUMBER_FIELDS = [
  'cardNumber', 'orderNumber', 'number', 'etteillaCN',
  'pathNumber', 'aethyrNumber', 'starNumber', 'sephiraNumber',
  'positionInAlphabet', 'abjadPosition', 'value', 'decanNumber', 'sunLongitude',
] as const

// Keyed by lowercase slug (last segment of suit value, or lowercased plain name)
const SUIT_ORDER_BY_SLUG: Record<string, number> = {
  // Tarot suits
  wands: 0, batons: 0, rods: 0, staves: 0,
  cups: 1, chalices: 1,
  swords: 2, epees: 2,
  pentacles: 3, coins: 3, deniers: 3, disks: 3,
  // Playing card suits (matching file order: spades, hearts, diamonds, clubs)
  spades: 20, hearts: 21, diamonds: 22, clubs: 23,
  // Mahjong suits (offset to stay above tarot within suit-block)
  wan: 30, characters: 30,
  bamboo: 31,
  circles: 32,
  winds: 33,
  dragons: 34,
  flowers: 35,
  seasons: 36,
}

const WIND_ORDER: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 }

/** Playing card text rank → sort number. */
const PLAYING_CARD_RANK: Record<string, number> = {
  'Ace': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'Jack': 11, 'Queen': 12, 'King': 13,
}

function traditionalSortKey(entity: BaseEntity, rwsOrder = false): number {
  const d = entity.extendedData as Record<string, unknown>
  const cn = entity.canonicalName
  const suitVal = typeof d.suit === 'string' ? d.suit : null

  // Suit-based entities: tarot minor arcana OR any entity with a non-'major' suit field
  // Tarot major arcana store suit:'major' — excluded so they keep their low cardNumber keys
  if (cn.includes('.minor.') || (suitVal !== null && suitVal !== 'major')) {
    const suitRaw = suitVal ? suitVal.split('.').pop()!.toLowerCase() : ''
    const suitIdx = SUIT_ORDER_BY_SLUG[suitRaw] ?? 99

    let rank: number
    if (typeof d.rankNumber === 'number')       rank = d.rankNumber          // RWS/TdM/Etteilla
    else if (cn.includes('.minor.') && typeof d.cardNumber === 'number')
                                                 rank = d.cardNumber          // Thoth
    else if (typeof d.number === 'number')       rank = d.number             // Mahjong numbered tiles
    else if (typeof d.rank === 'string' && PLAYING_CARD_RANK[d.rank] !== undefined)
                                                 rank = PLAYING_CARD_RANK[d.rank]  // Playing cards
    else {
      const dir = typeof d.direction === 'string' ? d.direction.toLowerCase() : ''
      rank = WIND_ORDER[dir] ?? 99                                            // Mahjong winds
    }

    return 1000 + suitIdx * 100 + rank
  }

  // Playing card Jokers: suit is null, rank is 'Joker' — sort after all suited cards
  if (typeof d.rank === 'string' && d.rank === 'Joker') {
    return 5000 + (typeof d.color === 'string' && d.color === 'Red' ? 0 : 1)
  }

  // Playing card suit entities — sort after jokers in the same suit order
  if (cn.startsWith('playing.suit.')) {
    const suitSlug = cn.split('.').pop()!.toLowerCase()
    return 6000 + (SUIT_ORDER_BY_SLUG[suitSlug] ?? 99)
  }

  // RWS order override: overview entities carry cardNumberRws for the Waite-transposed numbering
  if (rwsOrder && typeof d.cardNumberRws === 'number') return d.cardNumberRws

  // Major arcana, Goetia, letters, aethyrs, etc. — use natural numeric field
  for (const field of SORT_NUMBER_FIELDS) {
    const v = d[field]
    if (typeof v === 'number') return v
  }
  return Infinity
}

function SortToggle({ mode, onChange }: { mode: SortMode; onChange: (m: SortMode) => void }) {
  const btn = (m: SortMode, label: string, title: string) => (
    <button
      key={m}
      onClick={() => onChange(m)}
      title={title}
      style={{
        padding: '2px 6px',
        fontSize: '10px',
        fontFamily: 'monospace',
        fontWeight: 600,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: mode === m ? 'var(--color-accent-muted)' : 'var(--color-border)',
        background: mode === m ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
        color: mode === m ? 'var(--color-accent)' : 'var(--color-text-subtle)',
        borderRadius: m === 'alpha' ? '4px 0 0 4px' : '0 4px 4px 0',
        lineHeight: '1.6',
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex' }}>
      {btn('alpha', 'ABC', 'Sort alphabetically')}
      {btn('traditional', 'I·II·III', 'Sort by traditional order')}
    </div>
  )
}

// ─── Bookmark button ──────────────────────────────────────────────────────────

function BookmarkButton({ canonicalName }: { canonicalName: string }) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(canonicalName))

  const handleClick = () => {
    const next = toggleBookmark(canonicalName)
    setBookmarked(next)
  }

  return (
    <button
      onClick={handleClick}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this entity'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
        color: bookmarked ? 'var(--color-accent)' : 'var(--color-text-subtle)',
        display: 'flex', alignItems: 'center', opacity: bookmarked ? 1 : 0.5,
        transition: 'opacity 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-accent)' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = bookmarked ? '1' : '0.5'; e.currentTarget.style.color = bookmarked ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
    >
      <Star size={16} fill={bookmarked ? 'currentColor' : 'none'} />
    </button>
  )
}

// ─── Upright / Reversed meanings ─────────────────────────────────────────────

function MeaningsSection({ data }: { data: Record<string, unknown> }) {
  const uprightText   = typeof data.uprightMeaning === 'string'   ? data.uprightMeaning   : null
  const reversedText  = typeof data.reversedMeaning === 'string'  ? data.reversedMeaning  : null
  const uprightKeys   = Array.isArray(data.uprightKeywords)  ? (data.uprightKeywords  as unknown[]).filter((k): k is string => typeof k === 'string') : null
  const reversedKeys  = Array.isArray(data.reversedKeywords) ? (data.reversedKeywords as unknown[]).filter((k): k is string => typeof k === 'string') : null

  const hasUpright  = uprightText  || (uprightKeys  && uprightKeys.length  > 0)
  const hasReversed = reversedText || (reversedKeys && reversedKeys.length > 0)
  if (!hasUpright && !hasReversed) return null

  const Panel = ({ orientation, text, keywords }: { orientation: 'upright' | 'reversed'; text: string | null; keywords: string[] | null }) => {
    const isUpright = orientation === 'upright'
    return (
      <div style={{
        flex: 1, minWidth: 0,
        padding: '14px 16px',
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
      }}>
        <div style={{
          fontSize: '11px',
          color: isUpright ? 'var(--color-accent)' : 'var(--color-text-subtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}>
          <span style={{ fontSize: '14px' }}>{isUpright ? '↑' : '↓'}</span>
          {isUpright ? 'Upright' : 'Reversed'}
        </div>
        {text && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.65', margin: 0 }}>
            {text}
          </p>
        )}
        {keywords && keywords.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {keywords.map(kw => (
              <span
                key={kw}
                style={{
                  fontSize: '12px', padding: '2px 8px',
                  background: 'var(--color-surface-2)',
                  border: `1px solid ${isUpright ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
                  borderRadius: '4px',
                  color: isUpright ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Meanings
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {hasUpright  && <Panel orientation="upright"  text={uprightText}  keywords={uprightKeys}  />}
        {hasReversed && <Panel orientation="reversed" text={reversedText} keywords={reversedKeys} />}
      </div>
    </div>
  )
}

// ─── Planet context section ───────────────────────────────────────────────────

const DIGNITY_LABEL_DISPLAY: Record<string, string> = {
  'traditional-ruler': 'Ruler',
  'modern-ruler':      'Modern Ruler',
  'exaltation':        'Exaltation',
  'detriment':         'Detriment',
  'fall':              'Fall',
}

const NATURE_ROW_LABELS: Record<string, string> = {
  dayOfWeek:         'Day',
  metalAlchemy:      'Metal',
  polarity:          'Polarity',
  yinYang:           'Yin / Yang',
  qabalisticSephira: 'Sephira',
  orbDegrees:        'Orb',
}

const SPIRIT_LABEL_DISPLAY: Record<string, string> = {
  serves:   'Intelligence',
  embodies: 'Spirit',
}

function PlanetContextSection({
  dignityLinks,
  spiritLinks,
  decanLinks,
  starLinks,
  extendedData,
  linkedNames,
  onNavigate,
}: {
  dignityLinks: Link[]
  spiritLinks:  Link[]
  decanLinks:   Link[]
  starLinks:    Link[]
  extendedData: Record<string, unknown>
  linkedNames:  Map<string, string>
  onNavigate:   (cn: string) => void
}) {
  // Dignity links: planet is TARGET, sign is SOURCE
  const dignityByLabel = new Map<string, string[]>()
  for (const link of dignityLinks) {
    const arr = dignityByLabel.get(link.label) ?? []
    arr.push(link.sourceCanonicalName)
    dignityByLabel.set(link.label, arr)
  }
  const dignityRows = (['traditional-ruler', 'modern-ruler', 'exaltation', 'detriment', 'fall'] as const)
    .map(lbl => ({ label: DIGNITY_LABEL_DISPLAY[lbl], signs: dignityByLabel.get(lbl) ?? [] }))
    .filter(r => r.signs.length > 0)

  const natureRows = PLANET_NATURE_KEYS
    .filter(k => extendedData[k] !== undefined && extendedData[k] !== null && extendedData[k] !== '')
    .map(k => ({ label: NATURE_ROW_LABELS[k], key: k, value: extendedData[k] }))

  // Spirit links: spirit is SOURCE, planet is TARGET
  const spiritRows = spiritLinks.map(l => ({
    label: SPIRIT_LABEL_DISPLAY[l.label] ?? formatSlug(l.label),
    cn: l.sourceCanonicalName,
  }))

  // Decan links: decan is SOURCE, planet is TARGET
  const decanCns = decanLinks.map(l => l.sourceCanonicalName)

  // Fixed star nature links: star is SOURCE, planet is TARGET
  const primaryStars   = starLinks.filter(l => l.label === 'planetary-nature-primary').map(l => l.sourceCanonicalName)
  const secondaryStars = starLinks.filter(l => l.label === 'planetary-nature-secondary').map(l => l.sourceCanonicalName)

  const hasAny = dignityRows.length > 0 || natureRows.length > 0 || spiritRows.length > 0 ||
                 decanCns.length > 0 || primaryStars.length > 0 || secondaryStars.length > 0
  if (!hasAny) return null

  const cellStyle = { fontSize: '12px', color: 'var(--color-accent)', alignSelf: 'start' as const, paddingTop: '2px' }
  const boxStyle  = { padding: '14px 16px', background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)' }
  const labelStyle = { fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '10px' }
  const gridStyle = { display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr', gap: '8px 12px' }

  const InlineLink = ({ cn }: { cn: string }) => (
    <button
      onClick={() => onNavigate(cn)}
      title={cn}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--color-text)', fontSize: '13px',
        textDecoration: 'underline', textDecorationColor: 'var(--color-border)',
        fontFamily: 'inherit',
      }}
    >
      {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
    </button>
  )

  return (
    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Row 1: Dignities + Nature side by side */}
      {(dignityRows.length > 0 || natureRows.length > 0) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {dignityRows.length > 0 && (
            <div style={{ flex: '1 1 180px' }}>
              <div style={labelStyle}>Dignities</div>
              <div style={boxStyle}>
                <div style={gridStyle}>
                  {dignityRows.map(row => (
                    <React.Fragment key={row.label}>
                      <span style={cellStyle}>{row.label}</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {row.signs.map(cn => <InlineLink key={cn} cn={cn} />)}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
          {natureRows.length > 0 && (
            <div style={{ flex: '1 1 180px' }}>
              <div style={labelStyle}>Nature</div>
              <div style={boxStyle}>
                <div style={gridStyle}>
                  {natureRows.map(row => (
                    <React.Fragment key={row.key}>
                      <span style={cellStyle}>{row.label}</span>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                        <ExtendedValue value={row.value} linkedNames={linkedNames} onNavigate={onNavigate} />
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 2: Spirits + Decans side by side */}
      {(spiritRows.length > 0 || decanCns.length > 0) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {spiritRows.length > 0 && (
            <div style={{ flex: '1 1 180px' }}>
              <div style={labelStyle}>Spirits</div>
              <div style={boxStyle}>
                <div style={gridStyle}>
                  {spiritRows.map(row => (
                    <React.Fragment key={row.cn}>
                      <span style={cellStyle}>{row.label}</span>
                      <InlineLink cn={row.cn} />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
          {decanCns.length > 0 && (
            <div style={{ flex: '1 1 180px' }}>
              <div style={labelStyle}>Decans Ruled</div>
              <div style={boxStyle}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {decanCns.map(cn => (
                    <button
                      key={cn}
                      onClick={() => onNavigate(cn)}
                      title={cn}
                      style={{
                        padding: '3px 8px', background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)', borderRadius: '4px',
                        cursor: 'pointer', color: 'var(--color-text)', fontSize: '12px',
                        fontFamily: 'inherit', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    >
                      {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Fixed star natures */}
      {(primaryStars.length > 0 || secondaryStars.length > 0) && (
        <div>
          <div style={labelStyle}>Fixed Star Natures</div>
          <div style={boxStyle}>
            {primaryStars.length > 0 && (
              <div style={{ marginBottom: secondaryStars.length > 0 ? '10px' : 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '6px' }}>Primary nature</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {primaryStars.map(cn => (
                    <button
                      key={cn}
                      onClick={() => onNavigate(cn)}
                      title={cn}
                      style={{
                        padding: '3px 8px', background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)', borderRadius: '4px',
                        cursor: 'pointer', color: 'var(--color-text)', fontSize: '12px',
                        fontFamily: 'inherit', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    >
                      {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {secondaryStars.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '6px' }}>Secondary nature</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {secondaryStars.map(cn => (
                    <button
                      key={cn}
                      onClick={() => onNavigate(cn)}
                      title={cn}
                      style={{
                        padding: '3px 8px', background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)', borderRadius: '4px',
                        cursor: 'pointer', color: 'var(--color-text)', fontSize: '12px',
                        fontFamily: 'inherit', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    >
                      {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Zodiac sign context section ─────────────────────────────────────────────

const SIGN_DIGNITY_LABEL_DISPLAY: Record<string, string> = {
  'traditional-ruler': 'Ruler',
  'modern-ruler':      'Modern Ruler',
  'exaltation':        'Exaltation',
  'detriment':         'Detriment',
  'fall':              'Fall',
}

const SIGN_PROFILE_ROW_LABELS: Record<string, string> = {
  element:          'Element',
  modality:         'Modality',
  dateRange:        'Date Range',
  bodyPart:         'Body Part',
  polarity:         'Polarity',
  hebrewLetterGD:   'Hebrew Letter (GD)',
  hebrewLetterThoth:'Hebrew Letter (Thoth)',
}

function ZodiacSignContextSection({
  dignityLinks,
  decanLinks,
  extendedData,
  linkedNames,
  onNavigate,
}: {
  dignityLinks: Link[]
  decanLinks:   Link[]
  extendedData: Record<string, unknown>
  linkedNames:  Map<string, string>
  onNavigate:   (cn: string) => void
}) {
  // Dignity links: sign is SOURCE, planet is TARGET
  const dignityByLabel = new Map<string, string[]>()
  for (const link of dignityLinks) {
    const arr = dignityByLabel.get(link.label) ?? []
    arr.push(link.targetCanonicalName)
    dignityByLabel.set(link.label, arr)
  }
  const dignityRows = (['traditional-ruler', 'modern-ruler', 'exaltation', 'detriment', 'fall'] as const)
    .map(lbl => ({ label: SIGN_DIGNITY_LABEL_DISPLAY[lbl], planets: dignityByLabel.get(lbl) ?? [] }))
    .filter(r => r.planets.length > 0)

  const profileRows = SIGN_PROFILE_KEYS
    .filter(k => extendedData[k] !== undefined && extendedData[k] !== null && extendedData[k] !== '')
    .map(k => ({ label: SIGN_PROFILE_ROW_LABELS[k], key: k, value: extendedData[k] }))

  // Decans: decan is SOURCE, sign is TARGET
  const decanCns = decanLinks.map(l => l.sourceCanonicalName)

  const hasAny = dignityRows.length > 0 || profileRows.length > 0 || decanCns.length > 0
  if (!hasAny) return null

  const cellStyle = { fontSize: '12px', color: 'var(--color-accent)', alignSelf: 'start' as const, paddingTop: '2px' }
  const boxStyle  = { padding: '14px 16px', background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)' }
  const labelStyle = { fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '10px' }
  const gridStyle = { display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '8px 12px' }

  const InlineLink = ({ cn }: { cn: string }) => (
    <button
      onClick={() => onNavigate(cn)}
      title={cn}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--color-text)', fontSize: '13px',
        textDecoration: 'underline', textDecorationColor: 'var(--color-border)',
        fontFamily: 'inherit',
      }}
    >
      {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
    </button>
  )

  return (
    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Row 1: Dignities + Profile side by side */}
      {(dignityRows.length > 0 || profileRows.length > 0) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {dignityRows.length > 0 && (
            <div style={{ flex: '1 1 180px' }}>
              <div style={labelStyle}>Dignities</div>
              <div style={boxStyle}>
                <div style={gridStyle}>
                  {dignityRows.map(row => (
                    <React.Fragment key={row.label}>
                      <span style={cellStyle}>{row.label}</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {row.planets.map(cn => <InlineLink key={cn} cn={cn} />)}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
          {profileRows.length > 0 && (
            <div style={{ flex: '1 1 180px' }}>
              <div style={labelStyle}>Profile</div>
              <div style={boxStyle}>
                <div style={gridStyle}>
                  {profileRows.map(row => (
                    <React.Fragment key={row.key}>
                      <span style={cellStyle}>{row.label}</span>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                        <ExtendedValue value={row.value} linkedNames={linkedNames} onNavigate={onNavigate} />
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 2: Decans */}
      {decanCns.length > 0 && (
        <div>
          <div style={labelStyle}>Decans</div>
          <div style={boxStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {decanCns.map(cn => (
                <button
                  key={cn}
                  onClick={() => onNavigate(cn)}
                  title={cn}
                  style={{
                    padding: '3px 8px', background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)', borderRadius: '4px',
                    cursor: 'pointer', color: 'var(--color-text)', fontSize: '12px',
                    fontFamily: 'inherit', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                >
                  {linkedNames.get(cn) ?? formatSlug(cn.split('.').pop() ?? cn)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Kamea section ────────────────────────────────────────────────────────────

type KameaOverlay = 'none' | 'intelligence' | 'spirit' | 'full'

interface KameaSigilDef { name: string; cells: number[] }
interface KameaExtData {
  grid: number[][]
  sigils: { intelligence: KameaSigilDef; spirit: KameaSigilDef }
  order: number
  magicConstant: number
  totalSum: number
  intelligenceName: string
  spiritName: string
}

function KameaSection({ entity }: { entity: BaseEntity }) {
  const d = entity.extendedData as unknown as KameaExtData
  const [overlay, setOverlay] = useState<KameaOverlay>('none')

  const cellPos = useMemo(() => {
    const map = new Map<number, [number, number]>()
    d.grid.forEach((row, r) => row.forEach((val, c) => map.set(val, [r, c])))
    return map
  }, [d.grid])

  const n = d.order
  // Font size scales with grid size so numbers fit comfortably
  const cellFontSize = n <= 4 ? '14px' : n <= 6 ? '12px' : n <= 7 ? '11px' : '9px'
  const sumFontSize  = n <= 4 ? '11px' : '9px'
  // Max container width so large grids don't overflow narrow mobile viewports
  const maxW = Math.min(n * 46 + 36, 420)

  const fullSequence = useMemo(() => Array.from({ length: n * n }, (_, i) => i + 1), [n])

  const overlayColor =
    overlay === 'intelligence' ? '#c8a84b'
    : overlay === 'spirit'     ? '#c84b4b'
    :                            '#4b8bc8'

  const overlayLabel =
    overlay === 'intelligence' ? `${d.sigils.intelligence.name} (Intelligence)`
    : overlay === 'spirit'     ? `${d.sigils.spirit.name} (Spirit)`
    : overlay === 'full'       ? `Full sequence (1–${n * n})`
    : null

  return (
    <Section title="Magic Square">
      <div style={{ width: '100%', maxWidth: `${maxW}px`, margin: '0 auto' }}>
        {/* Outer grid: [data+overlay | row-sums] over [col-sums | Σ] */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: '1fr auto', gap: '4px' }}>
          {/* Data cells with SVG sigil overlay */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, 1fr)`,
              gap: 0,
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              {d.grid.flat().map((val, i) => {
                const r = Math.floor(i / n)
                const c = i % n
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-surface-2)',
                      borderRight: c < n - 1 ? '1px solid var(--color-border)' : undefined,
                      borderBottom: r < n - 1 ? '1px solid var(--color-border)' : undefined,
                      fontSize: cellFontSize,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--color-text)',
                      fontWeight: 500,
                      lineHeight: 1,
                    }}
                  >
                    {val}
                  </div>
                )
              })}
            </div>
            {overlay !== 'none' && (
              <KameaSigilOverlay
                cells={overlay === 'full' ? fullSequence : d.sigils[overlay].cells}
                cellPos={cellPos}
                n={n}
                color={overlayColor}
              />
            )}
          </div>

          {/* Row sums */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingLeft: '4px' }}>
            {d.grid.map((row, r) => (
              <div key={r} style={{ fontSize: sumFontSize, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {row.reduce((s, v) => s + v, 0)}
              </div>
            ))}
          </div>

          {/* Column sums */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {Array.from({ length: n }, (_, c) => (
              <div key={c} style={{ display: 'flex', justifyContent: 'center', paddingTop: '2px', fontSize: sumFontSize, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {d.grid.reduce((s, row) => s + row[c], 0)}
              </div>
            ))}
          </div>

          {/* Empty bottom-right cell — keeps grid layout intact */}
          <div />
        </div>
        {/* Stats line */}
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '8px 0 0' }}>
          {n}×{n} · magic constant {d.magicConstant} · total {d.totalSum}
        </p>
      </div>

      {/* Sigil toggle buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(['none', 'intelligence', 'spirit', 'full'] as const).map(opt => {
          const label =
            opt === 'none'         ? 'No Sigil'
            : opt === 'intelligence' ? d.sigils.intelligence.name
            : opt === 'spirit'       ? d.sigils.spirit.name
            :                          `1–${n * n}`
          const active = overlay === opt
          return (
            <button
              key={opt}
              onClick={() => setOverlay(opt)}
              style={{
                padding: '5px 14px',
                background: active ? 'var(--color-accent)' : 'var(--color-surface-2)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: '5px',
                fontSize: '12px',
                color: active ? 'var(--color-bg)' : 'var(--color-text)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              {opt === 'intelligence' ? '✦ ' : opt === 'spirit' ? '⬡ ' : opt === 'full' ? '◈ ' : ''}{label}
            </button>
          )
        })}
      </div>
      {overlayLabel && (
        <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textAlign: 'center', margin: '8px 0 0', fontStyle: 'italic' }}>
          {overlayLabel}
        </p>
      )}
    </Section>
  )
}

function KameaSigilOverlay({
  cells,
  cellPos,
  n,
  color,
}: {
  cells: number[]
  cellPos: Map<number, [number, number]>
  n: number
  color: string
}) {
  // Map each cell number to SVG coords (0-100 range, zero gaps)
  const toXY = ([r, c]: [number, number]): [number, number] =>
    [(c + 0.5) / n * 100, (r + 0.5) / n * 100]

  const rawPoints = cells
    .map(cell => cellPos.get(cell))
    .filter((pos): pos is [number, number] => pos !== undefined)
    .map(toXY)

  if (rawPoints.length < 2) return null

  // Deduplicate consecutive identical points; track loop positions instead
  const points: [number, number][] = []
  const loops: [number, number][] = []
  rawPoints.forEach((pt, i) => {
    const prev = rawPoints[i - 1]
    if (prev && prev[0] === pt[0] && prev[1] === pt[1]) {
      loops.push(pt)
    } else {
      points.push(pt)
    }
  })

  const first = points[0]
  const last  = points[points.length - 1]

  // Perpendicular end-bar
  const prev2 = points[points.length - 2] ?? first
  const angle = Math.atan2(last[1] - prev2[1], last[0] - prev2[0])
  const perp  = angle + Math.PI / 2
  const barLen = 3.5
  const bar = {
    x1: last[0] + Math.cos(perp) * barLen, y1: last[1] + Math.sin(perp) * barLen,
    x2: last[0] - Math.cos(perp) * barLen, y2: last[1] - Math.sin(perp) * barLen,
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(' ')

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    >
      <g opacity="0.55">
        {/* Drop shadow for readability */}
        <path d={pathD} stroke="rgba(0,0,0,0.5)" strokeWidth="3.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Main sigil path */}
        <path d={pathD} stroke={color} strokeWidth="2" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Loop indicators (repeated cell) */}
        {loops.map(([lx, ly], i) => (
          <circle key={i} cx={lx} cy={ly} r="4" fill="none"
            stroke={color} strokeWidth="1.5" />
        ))}
        {/* Start: filled circle */}
        <circle cx={first[0]} cy={first[1]} r="2.8"
          fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      {/* End: perpendicular bar */}
      <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2}
        stroke={color} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// ─── Shared animation controls helper ────────────────────────────────────────

function animCtrlBtn(primary = false): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px',
    background: primary ? 'var(--color-accent)' : 'var(--color-surface-2)',
    border: `1px solid ${primary ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: '5px', cursor: 'pointer',
    color: primary ? 'var(--color-bg)' : 'var(--color-text-muted)',
    padding: 0,
  }
}

// ─── Pentagram section ────────────────────────────────────────────────────────

const PENTA_VERTEX_LABELS = ['Spirit', 'Fire', 'Earth', 'Water', 'Air']
const PENTA_ALL_EDGES: [number, number][] = [[0,2],[2,4],[4,1],[1,3],[3,0]]
const PENTA_VERTS = [0,1,2,3,4].map(i => {
  const a = (i * 72 - 90) * Math.PI / 180
  return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)] as [number, number]
})

function PentagramSection({ entity }: { entity: BaseEntity }) {
  const d = entity.extendedData as Record<string, unknown>
  const steps = (d.constructionSteps as [number, number][]) ?? []
  const elementVertex = (d.elementVertex as number) ?? 0
  const elementColor = (d.elementColor as string) || 'var(--color-accent)'
  const variant = (d.variant as string) ?? ''

  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalSteps = steps.length

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= totalSteps - 1) { setPlaying(false); return prev }
        return prev + 1
      })
    }, 700)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [playing, totalSteps])

  const handleReset     = () => { setPlaying(false); setStep(-1) }
  const handleBack      = () => { setPlaying(false); setStep(s => Math.max(-1, s - 1)) }
  const handleFwd       = () => { setPlaying(false); setStep(s => Math.min(totalSteps - 1, s + 1)) }
  const handleTogglePlay = () => {
    if (step >= totalSteps - 1) { setStep(-1); setPlaying(true) }
    else setPlaying(p => !p)
  }

  const completedEdges = step >= 0 ? steps.slice(0, step + 1) : steps
  const activeEdge = (step >= 0 && step < totalSteps) ? steps[step] : null
  const isComplete = step < 0

  return (
    <Section title="Construction">
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <ZoomableSVGContainer style={{ flex: '1 1 200px', maxWidth: '240px', borderRadius: '6px' }}>
          <svg viewBox="-8 0 120 100" width="100%" style={{ display: 'block' }}
            aria-label="Pentagram construction diagram">
            {PENTA_ALL_EDGES.map(([a, b], i) => (
              <line key={i}
                x1={PENTA_VERTS[a][0]} y1={PENTA_VERTS[a][1]}
                x2={PENTA_VERTS[b][0]} y2={PENTA_VERTS[b][1]}
                stroke="var(--color-border)" strokeWidth="0.8" opacity="0.4" />
            ))}
            {completedEdges.map(([a, b], i) => {
              const isActive = !isComplete && activeEdge && activeEdge[0] === a && activeEdge[1] === b
              return (
                <line key={i}
                  x1={PENTA_VERTS[a][0]} y1={PENTA_VERTS[a][1]}
                  x2={PENTA_VERTS[b][0]} y2={PENTA_VERTS[b][1]}
                  stroke={elementColor}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  opacity={isActive ? 1 : 0.75}
                />
              )
            })}
            {PENTA_VERTS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y}
                r={i === elementVertex ? 3.5 : 2.5}
                fill={i === elementVertex ? elementColor : 'var(--color-surface-2)'}
                stroke={i === elementVertex ? elementColor : 'var(--color-border)'}
                strokeWidth="1"
              />
            ))}
            {PENTA_VERTS.map(([x, y], i) => {
              const lx = x + (x < 45 ? -7 : x > 55 ? 7 : 0)
              const ly = y + (y < 30 ? -5 : y > 70 ? 5 : y < 50 ? -5 : 5)
              return (
                <text key={i} x={lx} y={ly}
                  textAnchor={x < 45 ? 'end' : x > 55 ? 'start' : 'middle'}
                  dominantBaseline="middle" fontSize="5.5"
                  fill={i === elementVertex ? elementColor : 'var(--color-text-muted)'}
                  style={{ userSelect: 'none' } as React.CSSProperties}
                >
                  {PENTA_VERTEX_LABELS[i]}
                </text>
              )
            })}
          </svg>
        </ZoomableSVGContainer>

        <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={handleReset} title="Reset" style={animCtrlBtn()}>
              <RotateCcw size={13} />
            </button>
            <button onClick={handleBack} title="Step back" style={animCtrlBtn()}>
              <SkipBack size={13} />
            </button>
            <button onClick={handleTogglePlay} title={playing ? 'Pause' : 'Play'} style={animCtrlBtn(true)}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button onClick={handleFwd} title="Step forward" style={animCtrlBtn()}>
              <SkipForward size={13} />
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', minHeight: '32px', lineHeight: '1.5' }}>
            {step < 0 ? (
              <span style={{ fontStyle: 'italic', color: 'var(--color-text-subtle)' }}>
                Complete — press ▶ to animate
              </span>
            ) : (
              <>
                <span style={{ color: 'var(--color-text-subtle)' }}>Step {step + 1} of {totalSteps}</span>
                <br />
                <span style={{ color: 'var(--color-text)' }}>
                  {PENTA_VERTEX_LABELS[steps[step][0]]} → {PENTA_VERTEX_LABELS[steps[step][1]]}
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', textTransform: 'capitalize' }}>
            {variant} form
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── Hexagram section ─────────────────────────────────────────────────────────

const HEX_VERTEX_LABELS  = ['Saturn', 'Jupiter', 'Mars', 'Sol', 'Venus', 'Mercury']
const HEX_VERTEX_SYMBOLS = ['♄', '♃', '♂', '☉', '♀', '☿']
const HEX_ALL_EDGES: [number, number][] = [[0,2],[2,4],[4,0],[3,5],[5,1],[1,3]]
const HEX_VERTS = [0,1,2,3,4,5].map(i => {
  const a = (i * 60 - 90) * Math.PI / 180
  return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)] as [number, number]
})

function HexagramSection({ entity }: { entity: BaseEntity }) {
  const d = entity.extendedData as Record<string, unknown>
  const steps = (d.constructionSteps as [number, number][]) ?? []
  const planetVertex = (d.planetVertex as number) ?? 0
  const planetColor = (d.planetColor as string) || 'var(--color-accent)'
  const secondColor = '#888899'

  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalSteps = steps.length

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= totalSteps - 1) { setPlaying(false); return prev }
        return prev + 1
      })
    }, 700)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [playing, totalSteps])

  const handleReset     = () => { setPlaying(false); setStep(-1) }
  const handleBack      = () => { setPlaying(false); setStep(s => Math.max(-1, s - 1)) }
  const handleFwd       = () => { setPlaying(false); setStep(s => Math.min(totalSteps - 1, s + 1)) }
  const handleTogglePlay = () => {
    if (step >= totalSteps - 1) { setStep(-1); setPlaying(true) }
    else setPlaying(p => !p)
  }

  const completedEdges = step >= 0 ? steps.slice(0, step + 1) : steps
  const activeEdge = (step >= 0 && step < totalSteps) ? steps[step] : null
  const isComplete = step < 0

  return (
    <Section title="Construction">
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <ZoomableSVGContainer style={{ flex: '1 1 200px', maxWidth: '240px', borderRadius: '6px' }}>
          <svg viewBox="-30 -5 160 110" width="100%" style={{ display: 'block' }}
            aria-label="Hexagram construction diagram">
            {HEX_ALL_EDGES.map(([a, b], i) => (
              <line key={i}
                x1={HEX_VERTS[a][0]} y1={HEX_VERTS[a][1]}
                x2={HEX_VERTS[b][0]} y2={HEX_VERTS[b][1]}
                stroke="var(--color-border)" strokeWidth="0.8" opacity="0.4" />
            ))}
            {completedEdges.map(([a, b], i) => {
              const isActive = !isComplete && activeEdge && activeEdge[0] === a && activeEdge[1] === b
              const color = i < 3 ? planetColor : secondColor
              return (
                <line key={i}
                  x1={HEX_VERTS[a][0]} y1={HEX_VERTS[a][1]}
                  x2={HEX_VERTS[b][0]} y2={HEX_VERTS[b][1]}
                  stroke={color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  opacity={isActive ? 1 : 0.75}
                />
              )
            })}
            {HEX_VERTS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y}
                r={i === planetVertex ? 3.5 : 2.5}
                fill={i === planetVertex ? planetColor : 'var(--color-surface-2)'}
                stroke={i === planetVertex ? planetColor : 'var(--color-border)'}
                strokeWidth="1"
              />
            ))}
            {HEX_VERTS.map(([x, y], i) => {
              const lx = x + (x < 45 ? -7 : x > 55 ? 7 : 0)
              const ly = y + (y < 45 ? -5 : y > 55 ? 5 : 0)
              return (
                <text key={i} x={lx} y={ly}
                  textAnchor={x < 45 ? 'end' : x > 55 ? 'start' : 'middle'}
                  dominantBaseline="middle" fontSize="5"
                  fill={i === planetVertex ? planetColor : 'var(--color-text-muted)'}
                  style={{ userSelect: 'none' } as React.CSSProperties}
                >
                  {HEX_VERTEX_SYMBOLS[i]} {HEX_VERTEX_LABELS[i]}
                </text>
              )
            })}
          </svg>
        </ZoomableSVGContainer>

        <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={handleReset} title="Reset" style={animCtrlBtn()}>
              <RotateCcw size={13} />
            </button>
            <button onClick={handleBack} title="Step back" style={animCtrlBtn()}>
              <SkipBack size={13} />
            </button>
            <button onClick={handleTogglePlay} title={playing ? 'Pause' : 'Play'} style={animCtrlBtn(true)}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button onClick={handleFwd} title="Step forward" style={animCtrlBtn()}>
              <SkipForward size={13} />
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', minHeight: '32px', lineHeight: '1.5' }}>
            {step < 0 ? (
              <span style={{ fontStyle: 'italic', color: 'var(--color-text-subtle)' }}>
                Complete — press ▶ to animate
              </span>
            ) : (
              <>
                <span style={{ color: 'var(--color-text-subtle)' }}>Step {step + 1} of {totalSteps}</span>
                <br />
                <span style={{ color: 'var(--color-text)' }}>
                  {HEX_VERTEX_SYMBOLS[steps[step][0]]} {HEX_VERTEX_LABELS[steps[step][0]]} → {HEX_VERTEX_SYMBOLS[steps[step][1]]} {HEX_VERTEX_LABELS[steps[step][1]]}
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            Godname: <span style={{ color: 'var(--color-text)' }}>ARARITA</span>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── Magic circle section ─────────────────────────────────────────────────────

function MagicCircleSection({ entity, onNavigate }: { entity: BaseEntity; onNavigate: (cn: string) => void }) {
  const cn = entity.canonicalName
  return (
    <Section title="Diagram">
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: '1.5' }}>
        Hover over regions to see details.
      </p>
      {cn === 'magic.circle.solomonic' && <SolomonicCircleDiagram onNavigate={onNavigate} />}
      {cn === 'magic.circle.sigillum-dei-aemeth' && <SigillumDiagram />}
    </Section>
  )
}

// ─── Constellation star chart section ────────────────────────────────────────

function ConstellationSection({ entity, onNavigate }: { entity: BaseEntity; onNavigate: (cn: string) => void }) {
  const slug = entity.canonicalName.split('.').pop() ?? ''
  const diagram = CONSTELLATION_DIAGRAMS[slug]
  if (!diagram) return null
  return (
    <Section title="Star Chart">
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: '1.5' }}>
        A schematic outline of the constellation, not a to-scale sky chart. Named, clickable stars
        have their own reference page; the remaining points fill out the traditional shape.
      </p>
      <ConstellationDiagram data={diagram} onNavigate={onNavigate} />
    </Section>
  )
}

// ─── Extended data table ──────────────────────────────────────────────────────

function ExtendedDataTable({
  data,
  linkedNames,
  onNavigate,
  additionalHiddenKeys,
}: {
  data: Record<string, unknown>
  linkedNames: Map<string, string>
  onNavigate: (canonicalName: string) => void
  additionalHiddenKeys?: Set<string>
}) {
  // Hidden here because Reference shows these in a bespoke section elsewhere on the
  // page, not because they're bad content — they remain fair game elsewhere (e.g.
  // as quiz fields, via the same getAttributeEntries() used for that).
  const HIDDEN_KEYS = new Set(['authorNotes', 'uprightMeaning', 'reversedMeaning', 'uprightKeywords', 'reversedKeywords', 'relatedOverviews'])
  const DURATION_KEYS = new Set(['durationYears', 'durationYearsInt', 'durationMonths', 'durationDays'])

  const hasDuration = 'durationYearsInt' in data && 'durationMonths' in data && 'durationDays' in data

  const entries: [string, unknown][] = getAttributeEntries(data)
    .filter(([k]) => !HIDDEN_KEYS.has(k) && !additionalHiddenKeys?.has(k) && !DURATION_KEYS.has(k))

  if (hasDuration) {
    const y = data.durationYearsInt as number
    const m = data.durationMonths as number
    const d = data.durationDays as number
    const fmt = (n: number, unit: string) => `${n} ${n === 1 ? unit : unit + 's'}`
    const durationStr = [fmt(y, 'year'), fmt(m, 'month'), fmt(d, 'day')].join(', ')
    entries.unshift(['duration', durationStr])
  }

  // Major arcana trumps split into elements (3), planets (7), or zodiac signs (12) under the
  // classical Golden Dawn Hebrew-letter attribution — never more than one of the three. Minors
  // always have an element via their suit (shown through the Suit field instead), so this only
  // applies to majors: show "None" explicitly rather than silently omitting the row, so a major
  // with no elemental attribution reads as "checked, doesn't apply" rather than "data missing".
  if (data.arcana === 'major' && !entries.some(([k]) => k === 'element')) {
    entries.push(['element', 'None'])
  }

  if (!entries.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '8px 16px' }}>
      {entries.map(([key, value]) => (
        <React.Fragment key={key}>
          <span style={{ fontSize: '12px', color: 'var(--color-accent)', alignSelf: 'start', paddingTop: '2px' }}>
            {formatFieldLabel(key)}
          </span>
          <div style={{ fontSize: '13px', color: 'var(--color-text)', wordBreak: 'break-word' }}>
            {key === 'element' && value === 'None'
              ? <span style={{ color: 'var(--color-text-subtle)' }}>None</span>
              : <ExtendedValue value={value} linkedNames={linkedNames} onNavigate={onNavigate} />}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function ExtendedValue({
  value,
  linkedNames,
  onNavigate,
}: {
  value: unknown
  linkedNames: Map<string, string>
  onNavigate: (canonicalName: string) => void
}) {
  // Array: render each item separated by commas
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
    return (
      <span>
        {value.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: 'var(--color-text-subtle)' }}>, </span>}
            <ExtendedValue value={item} linkedNames={linkedNames} onNavigate={onNavigate} />
          </React.Fragment>
        ))}
      </span>
    )
  }

  // String: check if it's a resolved canonical name → render as link
  if (typeof value === 'string') {
    const displayName = looksLikeCanonicalName(value) ? linkedNames.get(value) : undefined
    if (displayName) {
      return (
        <button
          onClick={() => onNavigate(value)}
          title={value}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--color-text)', fontSize: '13px', textAlign: 'left',
            textDecoration: 'underline', textDecorationColor: 'var(--color-border)',
            fontFamily: 'inherit',
          }}
        >
          {displayName}
        </button>
      )
    }
    return <span>{value.charAt(0).toUpperCase() + value.slice(1)}</span>
  }

  // Boolean
  if (typeof value === 'boolean') {
    return <span style={{ color: 'var(--color-text-subtle)' }}>{value ? 'Yes' : 'No'}</span>
  }

  // null / undefined
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
  }

  // Plain object: render as nested key → value pairs
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
              {formatFieldLabel(k)}:{' '}
            </span>
            <ExtendedValue value={v} linkedNames={linkedNames} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
    )
  }

  // Number or other primitive
  return <span>{String(value)}</span>
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * "tradition.golden-dawn" → "Golden Dawn"
 * Strips any leading dot-separated namespace segments and formats the remainder.
 */
function formatTraditionScope(scope: string): string {
  const parts = scope.split('.')
  // Drop namespace prefixes (e.g. "tradition"), format the final slug
  return formatSlug(parts[parts.length - 1])
}

// ─── Link list ────────────────────────────────────────────────────────────────

function LinkList({ links, selfName, linkedNames, onNavigate, stripAttributedPrefix = false }: {
  links: Link[]
  selfName: string
  linkedNames: Map<string, string>
  onNavigate: (canonicalName: string) => void
  stripAttributedPrefix?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {links.map(link => {
        const isSource = link.sourceCanonicalName === selfName
        const otherCn = isSource ? link.targetCanonicalName : link.sourceCanonicalName
        const displayName = linkedNames.get(otherCn) ?? formatSlug(otherCn.split('.').pop() ?? otherCn)
        let rawLabel = formatSlug(link.label)
        if (stripAttributedPrefix) rawLabel = rawLabel.replace(/^Attributed /i, '')
        const label = isSource ? rawLabel : `↩ ${rawLabel}`
        return (
          <div key={link.id} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-accent)', minWidth: '140px', flexShrink: 0 }}>{label}</span>
            <button
              onClick={() => onNavigate(otherCn)}
              title={otherCn}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--color-text)', fontSize: '13px', textAlign: 'left',
                textDecoration: 'underline', textDecorationColor: 'var(--color-border)',
                fontFamily: 'inherit',
              }}
            >
              {displayName}
            </button>
            {link.note && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{link.note}</span>
            )}
            {link.traditionScope.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                ({link.traditionScope.map(formatTraditionScope).join(', ')})
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Personal annotation section ─────────────────────────────────────────────

function EntityAnnotationSection({ canonicalName }: { canonicalName: string }) {
  const [note, setNote]       = useState('')
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSaved(false)
    getEntityAnnotation(canonicalName)
      .then(n => { setNote(n); setLoading(false) })
      .catch(() => setLoading(false))
  }, [canonicalName])

  const handleBlur = async () => {
    try {
      await saveEntityAnnotation(canonicalName, note)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save annotation', e)
    }
  }

  if (loading) return null

  return (
    <Section
      title="My Notes"
      action={saved ? <span style={{ fontSize: '11px', color: 'var(--color-accent)', opacity: 0.8 }}>Saved</span> : undefined}
    >
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={handleBlur}
        placeholder="Personal notes, interpretations, associations…"
        rows={4}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
          borderRadius: '6px', padding: '10px 12px',
          fontSize: '13px', color: 'var(--color-text)', lineHeight: '1.6',
          fontFamily: 'inherit', resize: 'vertical',
          outline: 'none', transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      />
    </Section>
  )
}

// ─── Journal links section ────────────────────────────────────────────────────

function JournalLinksSection({ canonicalName }: { canonicalName: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [readings, setReadings] = useState<Reading[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    Promise.all([getEntriesForEntity(canonicalName), getReadingsForEntity(canonicalName)])
      .then(([es, rs]) => { setEntries(es); setReadings(rs); setLoaded(true) })
      .catch(console.error)
  }, [open, canonicalName, loaded])

  // Reset when canonicalName changes
  useEffect(() => {
    setOpen(false)
    setLoaded(false)
    setEntries([])
    setReadings([])
  }, [canonicalName])

  const total = entries.length + readings.length

  return (
    <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--color-text-subtle)', fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
          marginBottom: open ? '14px' : 0,
        }}
      >
        <BookMarked size={12} />
        Journal
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {open && (
        !loaded ? (
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : total === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No journal entries or readings linked to this entity yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {entries.map(entry => (
              <div
                key={entry.id}
                onClick={() => navigate({ to: '/journal' })}
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '6px', border: '1px solid var(--color-border)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-text)' }}>
                    {entry.title ?? 'Journal Entry'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{entry.entryDate}</span>
                </div>
                {entry.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                    {entry.notes.slice(0, 120)}{entry.notes.length > 120 ? '…' : ''}
                  </div>
                )}
              </div>
            ))}
            {readings.map(reading => (
              <div
                key={reading.id}
                onClick={() => navigate({ to: '/journal' })}
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '6px', border: '1px solid var(--color-border)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-text)' }}>
                    Reading
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{reading.readingDate}</span>
                </div>
                {reading.question && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{reading.question}"
                  </div>
                )}
                {reading.cards.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                    {reading.cards.length} card{reading.cards.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}


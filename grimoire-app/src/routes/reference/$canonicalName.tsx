import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState, useMemo } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity, Link, Reading } from '@grimoire/core'
import { ArrowLeft, Star, BookMarked, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { loadTraditionSettings, isLinkVisible, resolveDisplayName } from '@/lib/tradition-store'
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks-store'
import { formatEntityType, formatTag } from '@/lib/format'
import { getEntriesForEntity, getReadingsForEntity } from '@/lib/reading-db'
import type { JournalEntry } from '@/lib/reading-db'
import { getEntityAnnotation, saveEntityAnnotation } from '@/lib/custom-db'
import { recordRecentEntity } from '@/lib/recent-entities'
import { artGroupForEntityType, classicArtUrl } from '@/lib/art-store'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { useReadingStore } from '@/stores/reading'
import { TRADITION_DISPLAY_NAMES } from '@/lib/tradition-store'

export const Route = createFileRoute('/reference/$canonicalName')({
  component: EntityDetailPage,
})

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

        if (e.entityType === 'system.overview') {
          memberEntityType = typeof e.extendedData.memberEntityType === 'string' ? e.extendedData.memberEntityType : null
          memberTag = typeof e.extendedData.memberTag === 'string' ? e.extendedData.memberTag : null
        } else if (e.entityType.includes('deck')) {
          memberTag = canonicalName.split('.').pop() ?? null
        }

        if (memberEntityType || memberTag) {
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

  const hasTraditionalOrder = members.some(m => traditionalSortKey(m) < Infinity)
  const sortedMembers = useMemo(() => {
    if (sortMode === 'traditional' && hasTraditionalOrder) {
      return [...members].sort((a, b) => {
        const ka = traditionalSortKey(a), kb = traditionalSortKey(b)
        if (ka !== kb) return ka - kb
        return a.primaryDisplayName.localeCompare(b.primaryDisplayName)
      })
    }
    return [...members].sort((a, b) => a.primaryDisplayName.localeCompare(b.primaryDisplayName))
  }, [members, sortMode, hasTraditionalOrder])

  // Must be called before any early returns (Rules of Hooks)
  const readingDeck = useReadingStore(s => s.step !== 'deck' && s.step !== 'complete' ? s.selectedDeck : null)

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading…</div>
  }

  if (notFound || !entity) {
    const virtual = VIRTUAL_OVERVIEWS[canonicalName]
    const subItems = RELATED_OVERVIEWS[canonicalName]
    if (virtual) {
      return (
        <div style={{ maxWidth: '760px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/reference', search: { tag: undefined } })} style={{ marginBottom: '20px' }}>
            <ArrowLeft size={14} /> Reference
          </Button>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', marginBottom: '4px' }}>system.overview</div>
            <h1 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 6px', color: 'var(--color-text)' }}>{virtual.title}</h1>
            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', marginBottom: '14px' }}>{canonicalName}</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>{virtual.description}</p>
          </div>
          {subItems && (
            <Section title="Contents">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {subItems.map(item => (
                  <button
                    key={item.canonicalName}
                    onClick={() => navigate({ to: '/reference/$canonicalName', params: { canonicalName: item.canonicalName } })}
                    style={{
                      padding: '8px 14px', background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)', borderRadius: '6px',
                      cursor: 'pointer', color: 'var(--color-text)', fontSize: '13px',
                      fontFamily: 'inherit', fontWeight: 500, transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>
      )
    }
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
  // Incoming bidirectional: where we're the target and the link is symmetric — show in correspondences too
  const incomingBidi = visibleLinks.filter(l => l.targetCanonicalName === canonicalName && l.bidirectional)
  // Incoming non-bidirectional: "referenced by" section
  const incomingUnidi = visibleLinks.filter(l => l.targetCanonicalName === canonicalName && !l.bidirectional)

  const correspondences = [...outgoing, ...incomingBidi]

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
        <Section title="Author Notes">
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.7', margin: 0 }}>
            {entity.extendedData.authorNotes}
          </p>
        </Section>
      )}

      {/* Upright / Reversed meanings */}
      <MeaningsSection data={entity.extendedData} />

      {/* Extended data — type-specific fields */}
      {Object.keys(entity.extendedData).length > 0 && (
        <Section title="Attributes">
          <ExtendedDataTable data={entity.extendedData} linkedNames={linkedNames} onNavigate={navToEntity} />
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

      {/* Related overviews — sub-navigation for certain parent overview pages */}
      {RELATED_OVERVIEWS[canonicalName] && (
        <Section title="See Also">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {RELATED_OVERVIEWS[canonicalName].map(item => (
              <button
                key={item.canonicalName}
                onClick={() => navToEntity(item.canonicalName)}
                style={{
                  padding: '8px 14px', background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  cursor: 'pointer', color: 'var(--color-text)', fontSize: '13px',
                  fontFamily: 'inherit', fontWeight: 500, transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                {item.label}
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

// ─── Related overviews (sub-navigation shown on parent overview pages) ────────

// Virtual overview pages — rendered from app config when no seeded entity exists
const VIRTUAL_OVERVIEWS: Record<string, { title: string; description: string }> = {
  'system.overview.astrology': {
    title: 'Astrology',
    description: 'Planets, zodiac signs, fixed stars, and other celestial reference data.',
  },
  'system.overview.letters': {
    title: 'Letters & Sacred Alphabets',
    description: 'Alphabet systems, letter-number correspondences, and gematria traditions across cultures.',
  },
}

const RELATED_OVERVIEWS: Record<string, Array<{ canonicalName: string; label: string }>> = {
  // Tarot
  'system.overview.tarot-decks': [
    { canonicalName: 'system.overview.tarot-suit-cups',      label: 'Cups'      },
    { canonicalName: 'system.overview.tarot-suit-wands',     label: 'Wands'     },
    { canonicalName: 'system.overview.tarot-suit-swords',    label: 'Swords'    },
    { canonicalName: 'system.overview.tarot-suit-pentacles', label: 'Pentacles' },
  ],
  // Qabalah
  'system.overview.qabalah': [
    { canonicalName: 'system.overview.four-worlds',    label: 'Four Worlds'    },
    { canonicalName: 'system.overview.hebrew-letters', label: 'Hebrew Letters' },
    { canonicalName: 'system.overview.partzufim',      label: 'Partzufim'      },
  ],
  // Astrology
  'system.overview.astrology': [
    { canonicalName: 'system.overview.planets',       label: 'Planets'        },
    { canonicalName: 'system.overview.zodiac',        label: 'Zodiac Signs'   },
    { canonicalName: 'system.overview.fixed-stars',   label: 'Fixed Stars'    },
    { canonicalName: 'system.overview.lunar-mansions',label: 'Lunar Mansions' },
  ],
  'system.overview.zodiac': [
    { canonicalName: 'system.overview.decans', label: 'Decans' },
  ],
  'system.overview.planets': [
    { canonicalName: 'system.overview.kamea',             label: 'Planetary Kamea'   },
    { canonicalName: 'system.overview.planetary-spirits', label: 'Planetary Spirits' },
    { canonicalName: 'system.overview.olympic-spirits',   label: 'Olympic Spirits'   },
  ],
  'system.overview.nakshatras': [
    { canonicalName: 'system.overview.jyotish-dasha', label: 'Vimshottari Dasha' },
    { canonicalName: 'system.overview.navaratna',     label: 'Navaratna (9 Gems)' },
  ],
  // I Ching / Chinese cosmology
  'system.overview.iching': [
    { canonicalName: 'system.overview.iching-trigrams', label: 'Trigrams'     },
    { canonicalName: 'system.overview.yin-yang',        label: 'Yin & Yang'   },
    { canonicalName: 'system.overview.wuxing',          label: 'Five Phases'  },
  ],
  // Feng Shui
  'system.overview.feng-shui-directions': [
    { canonicalName: 'system.overview.feng-shui-flying-stars', label: 'Flying Stars' },
    { canonicalName: 'system.overview.feng-shui-mountains',    label: '24 Mountains' },
  ],
  // Enochian
  'system.overview.enochian-aethyrs': [
    { canonicalName: 'system.overview.enochian-watchtowers', label: 'Watchtowers'  },
    { canonicalName: 'system.overview.enochian-governors',   label: '91 Governors' },
  ],
  // Hindu / subtle body
  'system.overview.chakras': [
    { canonicalName: 'system.overview.pranas',     label: 'Five Pranas'        },
    { canonicalName: 'system.overview.koshas',     label: 'Five Koshas'        },
    { canonicalName: 'system.overview.doshas',     label: 'Doshas'             },
    { canonicalName: 'system.overview.mahabhutas', label: 'Five Great Elements'},
  ],
  // Letters (virtual)
  'system.overview.letters': [
    { canonicalName: 'system.overview.hebrew-letters',   label: 'Hebrew Letters'         },
    { canonicalName: 'system.overview.arabic-letters',   label: 'Arabic Letters'         },
    { canonicalName: 'system.overview.isopsephy',        label: 'Greek (Isopsephy)'      },
    { canonicalName: 'tradition.pythagorean-numerology', label: 'Pythagorean Numerology' },
    { canonicalName: 'tradition.chaldean-numerology',    label: 'Chaldean Numerology'    },
  ],
}

// ─── Entity art panel ─────────────────────────────────────────────────────────

/**
 * Floated art preview shown in the entity header when classic image art is available.
 * Uses an onError handler to silently hide itself if the image file doesn't exist
 * (e.g. for tarot decks that haven't been downloaded yet, or symbolic-only entities).
 */
function EntityArtPanel({ entity }: { entity: BaseEntity }) {
  const group = artGroupForEntityType(entity.entityType, entity.canonicalName)
  const [hidden, setHidden] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!group || hidden) return null

  const url = classicArtUrl(group, entity.canonicalName)

  // Cards (tarot / lenormand) use portrait aspect ratio; others (runes, geomancy, mahjong) square-ish
  const isCard = group === 'tarot' || group === 'lenormand'
  const w = isCard ? 108 : 80
  const h = isCard ? Math.round(w * 1.4) : 80

  return (
    <>
      <div
        onClick={() => setLightboxOpen(true)}
        title="Click to zoom"
        style={{ float: 'right', marginLeft: '20px', marginBottom: '12px', cursor: 'zoom-in' }}
      >
        <img
          src={url}
          alt={entity.primaryDisplayName}
          width={w}
          height={h}
          onError={() => setHidden(true)}
          style={{
            display: 'block',
            width: w,
            height: h,
            objectFit: 'contain',
            borderRadius: isCard ? '6px' : '4px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
          }}
        />
      </div>
      {lightboxOpen && (
        <ImageLightbox src={url} alt={entity.primaryDisplayName} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}

// ─── Member section helpers ───────────────────────────────────────────────────

function membersSectionTitle(entity: BaseEntity, count: number): string {
  if (entity.entityType === 'system.overview') return `Contents (${count})`
  if (entity.entityType.includes('deck')) return `Cards in this Deck (${count})`
  return `Members (${count})`
}

function MemberGrid({ members, onNavigate }: { members: BaseEntity[]; onNavigate: (cn: string) => void }) {
  // Check if the first member with an art group should drive a card-art layout
  const firstWithArt = members.find(m => artGroupForEntityType(m.entityType, m.canonicalName) !== null)
  const artGroup = firstWithArt ? artGroupForEntityType(firstWithArt.entityType, firstWithArt.canonicalName) : null
  const showArt = artGroup !== null
  const isCard = artGroup === 'tarot' || artGroup === 'lenormand'

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
  const group = artGroupForEntityType(member.entityType, member.canonicalName)
  const [imgFailed, setImgFailed] = useState(false)
  const url = group ? classicArtUrl(group, member.canonicalName) : null

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
      {url && !imgFailed ? (
        <img
          src={url}
          alt={member.primaryDisplayName}
          width={tileW}
          height={tileH}
          onError={() => setImgFailed(true)}
          style={{ display: 'block', width: tileW, height: tileH, objectFit: 'contain' }}
        />
      ) : (
        <div style={{
          width: tileW, height: tileH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', color: 'var(--color-text-subtle)', padding: '4px', textAlign: 'center',
        }}>
          {member.primaryDisplayName}
        </div>
      )}
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
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </div>
        {action}
      </div>
      <div style={{ padding: '16px', background: 'var(--color-surface-1)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        {children}
      </div>
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
  // Mahjong suits (offset to stay above tarot within suit-block)
  wan: 10, characters: 10,
  bamboo: 11,
  circles: 12,
  winds: 13,
  dragons: 14,
  flowers: 15,
  seasons: 16,
}

const WIND_ORDER: Record<string, number> = { east: 1, south: 2, west: 3, north: 4 }

function traditionalSortKey(entity: BaseEntity): number {
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
    else {
      const dir = typeof d.direction === 'string' ? d.direction.toLowerCase() : ''
      rank = WIND_ORDER[dir] ?? 99                                            // Mahjong winds
    }

    return 1000 + suitIdx * 100 + rank
  }

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

// ─── Canonical name helpers ───────────────────────────────────────────────────

/** Returns true if a string looks like a canonical name (≥3 dot-separated lowercase segments). */
function looksLikeCanonicalName(s: string): boolean {
  return /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/.test(s)
}

/** Recursively extract all string leaves from a value (handles arrays and nested objects). */
function flattenToStrings(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(flattenToStrings)
  if (typeof v === 'object' && v !== null) return Object.values(v as Record<string, unknown>).flatMap(flattenToStrings)
  return []
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

// ─── Extended data table ──────────────────────────────────────────────────────

function ExtendedDataTable({
  data,
  linkedNames,
  onNavigate,
}: {
  data: Record<string, unknown>
  linkedNames: Map<string, string>
  onNavigate: (canonicalName: string) => void
}) {
  const HIDDEN_KEYS = new Set(['authorNotes', 'uprightMeaning', 'reversedMeaning', 'uprightKeywords', 'reversedKeywords'])
  const entries = Object.entries(data).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== undefined && v !== '')
  if (!entries.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '8px 16px' }}>
      {entries.map(([key, value]) => (
        <React.Fragment key={key}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', alignSelf: 'start', paddingTop: '2px' }}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
          </span>
          <div style={{ fontSize: '13px', color: 'var(--color-text)', wordBreak: 'break-word' }}>
            <ExtendedValue value={value} linkedNames={linkedNames} onNavigate={onNavigate} />
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
    return <span>{value}</span>
  }

  // Boolean
  if (typeof value === 'boolean') {
    return <span style={{ color: 'var(--color-text-subtle)' }}>{value ? 'Yes' : 'No'}</span>
  }

  // null / undefined
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
  }

  // Number or other primitive
  return <span>{String(value)}</span>
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** "corresponds-to" → "Corresponds To" */
function formatSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

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

function LinkList({ links, selfName, linkedNames, onNavigate }: {
  links: Link[]
  selfName: string
  linkedNames: Map<string, string>
  onNavigate: (canonicalName: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {links.map(link => {
        const isSource = link.sourceCanonicalName === selfName
        const otherCn = isSource ? link.targetCanonicalName : link.sourceCanonicalName
        const displayName = linkedNames.get(otherCn) ?? formatSlug(otherCn.split('.').pop() ?? otherCn)
        const rawLabel = formatSlug(link.label)
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


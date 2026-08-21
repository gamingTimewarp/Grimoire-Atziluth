/**
 * PlanetVisibilityFilter.tsx
 * Collapsible-group planet visibility chips — split into Classical / Modern /
 * Asteroids & Minor Bodies / Nodes & Lilith, each individually collapsible with
 * a "Show/Hide all" shortcut. Originally built for the Animate page's planet
 * filter; pulled out here so the chart detail page and Current Sky can drive
 * the same WheelChart hiddenPlanets prop (and their own tables) with it.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export interface PlanetEntry { name: string; symbol: string; cn: string }
export interface PlanetGroup { id: string; label: string; planets: PlanetEntry[] }

export const PLANET_GROUPS: PlanetGroup[] = [
  {
    id: 'classical',
    label: 'Classical Planets',
    planets: [
      { name: 'Sol',     symbol: '☉', cn: 'astrology.planet.sol'     },
      { name: 'Luna',    symbol: '☽', cn: 'astrology.planet.luna'    },
      { name: 'Mercury', symbol: '☿', cn: 'astrology.planet.mercury' },
      { name: 'Venus',   symbol: '♀', cn: 'astrology.planet.venus'   },
      { name: 'Mars',    symbol: '♂', cn: 'astrology.planet.mars'    },
      { name: 'Jupiter', symbol: '♃', cn: 'astrology.planet.jupiter' },
      { name: 'Saturn',  symbol: '♄', cn: 'astrology.planet.saturn'  },
    ],
  },
  {
    id: 'modern',
    label: 'Modern Planets',
    planets: [
      { name: 'Uranus',  symbol: '♅', cn: 'astrology.planet.uranus'  },
      { name: 'Neptune', symbol: '♆', cn: 'astrology.planet.neptune' },
      { name: 'Pluto',   symbol: '♇', cn: 'astrology.planet.pluto'   },
    ],
  },
  {
    id: 'minor-bodies',
    label: 'Asteroids & Minor Bodies',
    planets: [
      { name: 'Chiron', symbol: '⚷', cn: 'astrology.minor-body.chiron' },
      { name: 'Ceres',  symbol: '⚳', cn: 'astrology.minor-body.ceres'  },
      { name: 'Pallas', symbol: '⚴', cn: 'astrology.minor-body.pallas' },
      { name: 'Juno',   symbol: '⚵', cn: 'astrology.minor-body.juno'   },
      { name: 'Vesta',  symbol: '⚶', cn: 'astrology.minor-body.vesta'  },
      { name: 'Eris',   symbol: '⯰', cn: 'astrology.minor-body.eris'   },
    ],
  },
  {
    id: 'nodes-lilith',
    label: 'Nodes & Lilith',
    planets: [
      { name: 'Rahu',    symbol: '☊', cn: 'astrology.node.rahu'                  },
      { name: 'Ketu',    symbol: '☋', cn: 'astrology.node.ketu'                  },
      { name: 'Lilith',  symbol: '⚸', cn: 'astrology.point.black-moon-lilith'    },
    ],
  },
]

/** Toggle a single value's membership in a Set, returning a new Set — used both for
 * a single planet's hidden state and for a group's collapsed state. */
export function toggleInSet(prev: Set<string>, value: string): Set<string> {
  const next = new Set(prev)
  if (next.has(value)) next.delete(value); else next.add(value)
  return next
}

/** Hide (or show) every planet in a group at once, returning a new Set. */
export function toggleGroupInSet(prev: Set<string>, group: PlanetGroup, hide: boolean): Set<string> {
  const next = new Set(prev)
  for (const p of group.planets) {
    if (hide) next.add(p.cn); else next.delete(p.cn)
  }
  return next
}

// ─── Group box ──────────────────────────────────────────────────────────────

export function PlanetGroupBox({
  group,
  hiddenPlanets,
  collapsed,
  onTogglePlanet,
  onToggleAll,
  onToggleCollapse,
}: {
  group: PlanetGroup
  hiddenPlanets: Set<string>
  collapsed: boolean
  onTogglePlanet: (cn: string) => void
  onToggleAll: (group: PlanetGroup, hide: boolean) => void
  onToggleCollapse: (id: string) => void
}) {
  const allVisible  = group.planets.every(p => !hiddenPlanets.has(p.cn))
  const noneVisible = group.planets.every(p => hiddenPlanets.has(p.cn))

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 10px',
        background: noneVisible ? 'transparent' : 'var(--color-surface-3)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
        onClick={() => onToggleCollapse(group.id)}
      >
        {collapsed
          ? <ChevronRight size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
          : <ChevronDown  size={11} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
        }
        <span style={{
          flex: 1, fontSize: '11px', fontWeight: 500,
          color: noneVisible ? 'var(--color-text-subtle)' : 'var(--color-text)',
          letterSpacing: '0.03em',
        }}>
          {group.label}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onToggleAll(group, allVisible) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '1px 6px',
            fontSize: '10px', color: 'var(--color-text-subtle)',
            fontFamily: 'inherit', borderRadius: '3px',
          }}
          title={allVisible ? 'Hide all' : 'Show all'}
        >
          {allVisible ? 'None' : 'All'}
        </button>
      </div>

      {/* Planet chips */}
      {!collapsed && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 10px' }}>
          {group.planets.map(p => {
            const hidden = hiddenPlanets.has(p.cn)
            return (
              <button
                key={p.cn}
                onClick={() => onTogglePlanet(p.cn)}
                title={hidden ? `Show ${p.name}` : `Hide ${p.name}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '3px 8px',
                  background: hidden ? 'transparent' : 'var(--color-surface-1)',
                  border: `1px solid ${hidden ? 'var(--color-border)' : 'var(--color-border)'}`,
                  borderRadius: '4px',
                  color: hidden ? 'var(--color-text-subtle)' : 'var(--color-text)',
                  opacity: hidden ? 0.45 : 1,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
                  textDecoration: hidden ? 'line-through' : 'none',
                }}
              >
                <span style={{ fontSize: '13px', lineHeight: 1 }}>{p.symbol}</span>
                {p.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── All groups, stacked ────────────────────────────────────────────────────

export function PlanetVisibilityFilter({ hiddenPlanets, onTogglePlanet, onToggleAll }: {
  hiddenPlanets: Set<string>
  onTogglePlanet: (cn: string) => void
  onToggleAll: (group: PlanetGroup, hide: boolean) => void
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const toggleCollapse = (id: string) => {
    setCollapsedGroups(prev => toggleInSet(prev, id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {PLANET_GROUPS.map(group => (
        <PlanetGroupBox
          key={group.id}
          group={group}
          hiddenPlanets={hiddenPlanets}
          collapsed={collapsedGroups.has(group.id)}
          onTogglePlanet={onTogglePlanet}
          onToggleAll={onToggleAll}
          onToggleCollapse={toggleCollapse}
        />
      ))}
    </div>
  )
}

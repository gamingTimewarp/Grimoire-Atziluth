/**
 * /astrology/animate
 * Animated sky wheel — watch planets move over a chosen date range.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { WheelChart, WheelChartTooltip } from '@/components/ui/WheelChart'
import { ZoomableSVGContainer } from '@/components/ui/ZoomableSVGContainer'
import {
  getPlanetPositions, getAspects, getNatalChart,
} from '@/lib/astro-engine'
import type { NatalChartData } from '@/lib/astro-engine'
import { loadTraditionSettings } from '@/lib/tradition-store'
import { listNatalCharts } from '@/lib/natal-db'

export const Route = createFileRoute('/astrology/animate')({
  component: AnimatePage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEEDS = [
  { label: '1h', days: 1/24,  title: '1 hour / frame — watch Moon rise & set'       },
  { label: '1d', days: 1,     title: '1 day / frame  — watch Moon & inner planets'   },
  { label: '1w', days: 7,     title: '1 week / frame — watch Sun & inner planets'    },
  { label: '1m', days: 30,    title: '1 month / frame — watch Jupiter & Saturn'      },
  { label: '1y', days: 365,   title: '1 year / frame — watch outer planets & Chiron' },
]

const FRAME_MS = 50  // 20 fps — smooth without thrashing the layout engine

interface PlanetEntry { name: string; symbol: string; cn: string }
interface PlanetGroup  { id: string; label: string; planets: PlanetEntry[] }

const PLANET_GROUPS: PlanetGroup[] = [
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(d: Date): string {
  // YYYY-MM-DD in local time
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromDateInput(s: string): Date | null {
  if (!s) return null
  const d = new Date(s + 'T12:00:00')
  return isNaN(d.getTime()) ? null : d
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

// ─── Planet filter group component ────────────────────────────────────────────

function PlanetGroupBox({
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

// ─── Main component ────────────────────────────────────────────────────────────

function AnimatePage() {
  const navigate = useNavigate()

  const now = useMemo(() => new Date(), [])
  const [startDate, setStartDate]     = useState<Date>(now)
  const [endDate,   setEndDate]       = useState<Date | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(now)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [speedDays,   setSpeedDays]   = useState(7)
  const [showHouses,  setShowHouses]  = useState(false)
  const [hoveredKey,  setHoveredKey]  = useState<string | null>(null)
  const [location, setLocation]       = useState<{ lat: number; lon: number } | null>(null)

  // Planet visibility
  const [hiddenPlanets,   setHiddenPlanets]   = useState<Set<string>>(() => new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())

  // Track whether animation was playing before a hover-pause so we can resume
  const wasPlayingOnHover = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load user's natal location for house calculations
  useEffect(() => {
    if (!showHouses || location) return
    listNatalCharts()
      .then(records => {
        const self = records.find(r => r.isSelf)
        setLocation({ lat: self?.birthLat ?? 51.5, lon: self?.birthLon ?? -0.1 })
      })
      .catch(() => setLocation({ lat: 51.5, lon: -0.1 }))
  }, [showHouses])

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying) return

    intervalRef.current = setInterval(() => {
      setCurrentDate(d => {
        const next = addDays(d, speedDays)
        if (endDate && next >= endDate) {
          setIsPlaying(false)
          return endDate
        }
        return next
      })
    }, FRAME_MS)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speedDays, endDate])

  const reset = () => {
    setIsPlaying(false)
    setCurrentDate(startDate)
  }

  // Pause on hover, resume when hover ends
  const handleHoverChange = (key: string | null) => {
    setHoveredKey(key)
    if (key && isPlaying) {
      wasPlayingOnHover.current = true
      setIsPlaying(false)
    } else if (!key && wasPlayingOnHover.current) {
      wasPlayingOnHover.current = false
      setIsPlaying(true)
    }
  }

  // Recompute chart on every tick — always show all bodies; filter chips are the control
  const chart: NatalChartData = useMemo(() => {
    const { astrologyMode, houseSystem } = loadTraditionSettings()
    const options = { showNodes: true, showModernPlanets: true }

    if (showHouses && location) {
      return getNatalChart(currentDate, location.lat, location.lon, houseSystem, astrologyMode, options)
    }
    const planets = getPlanetPositions(currentDate, astrologyMode, options)
    const aspects = getAspects(planets)
    return {
      planets,
      houses: { cusps: [], ascendant: 0, midheaven: 0, system: 'whole-sign' as const },
      aspects,
      lots: [],
    }
  }, [currentDate, showHouses, location])

  // Apply planet visibility filter
  const visibleChart: NatalChartData = useMemo(() => {
    if (hiddenPlanets.size === 0) return chart
    const planets = chart.planets.filter(p => !hiddenPlanets.has(p.planet.canonicalName))
    const visibleCNs = new Set(planets.map(p => p.planet.canonicalName))
    const aspects = chart.aspects.filter(a =>
      visibleCNs.has(a.planet1.canonicalName) && visibleCNs.has(a.planet2.canonicalName)
    )
    return { ...chart, planets, aspects }
  }, [chart, hiddenPlanets])

  const { astrologyMode } = loadTraditionSettings()

  const togglePlanet = (cn: string) => {
    setHiddenPlanets(prev => {
      const next = new Set(prev)
      if (next.has(cn)) next.delete(cn); else next.add(cn)
      return next
    })
  }

  const toggleAll = (group: PlanetGroup, currentlyAllVisible: boolean) => {
    setHiddenPlanets(prev => {
      const next = new Set(prev)
      for (const p of group.planets) {
        if (currentlyAllVisible) next.add(p.cn); else next.delete(p.cn)
      }
      return next
    })
  }

  const toggleCollapse = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const progress = endDate && endDate > startDate
    ? Math.min(1, (currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()))
    : null

  const goToRef = (cn: string) =>
    navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/astrology' })}>
          <ArrowLeft size={13} /> Astrology
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Sky Animation</h1>
      </div>

      {/* Controls panel */}
      <div style={{
        marginBottom: '12px', padding: '14px 16px',
        background: 'var(--color-surface-2)', borderRadius: '8px',
        border: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>

        {/* Date range */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 140px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Start
            </span>
            <DateInput
              value={toDateInput(startDate)}
              onChange={v => {
                const d = fromDateInput(v)
                if (d) { setStartDate(d); setCurrentDate(d) }
              }}
              style={dateInputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 140px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              End (optional)
            </span>
            <DateInput
              value={endDate ? toDateInput(endDate) : ''}
              onChange={v => setEndDate(fromDateInput(v))}
              style={dateInputStyle}
            />
          </label>
        </div>

        {/* Playback row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px',
              background: isPlaying ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
              border: `1px solid ${isPlaying ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: '4px',
              color: isPlaying ? 'var(--color-accent)' : 'var(--color-text)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
            }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          {/* Reset */}
          <button
            onClick={reset}
            title="Return to start date"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px',
              background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
              borderRadius: '4px', color: 'var(--color-text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
            }}
          >
            <RotateCcw size={11} /> Reset
          </button>

          {/* Step back / forward */}
          <button
            onClick={() => setCurrentDate(d => addDays(d, -speedDays))}
            title="Step back one increment"
            style={{
              display: 'flex', alignItems: 'center',
              padding: '5px 8px',
              background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
              borderRadius: '4px', color: 'var(--color-text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
            }}
          >
            <SkipBack size={11} />
          </button>
          <button
            onClick={() => setCurrentDate(d => addDays(d, speedDays))}
            title="Step forward one increment"
            style={{
              display: 'flex', alignItems: 'center',
              padding: '5px 8px',
              background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
              borderRadius: '4px', color: 'var(--color-text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
            }}
          >
            <SkipForward size={11} />
          </button>

          {/* Speed buttons */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {SPEEDS.map(s => (
              <button
                key={s.label}
                onClick={() => setSpeedDays(s.days)}
                title={s.title}
                style={{
                  padding: '4px 9px',
                  background: speedDays === s.days ? 'var(--color-accent-muted)' : 'var(--color-surface-1)',
                  border: `1px solid ${speedDays === s.days ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: '3px',
                  color: speedDays === s.days ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Houses toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginLeft: 'auto' }}>
            <span style={{ fontSize: '11px', color: showHouses ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
              Houses
            </span>
            <button
              onClick={() => setShowHouses(h => !h)}
              style={{
                width: '32px', height: '18px', borderRadius: '9px',
                border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                position: 'relative', transition: 'background 0.15s',
                background: showHouses ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px',
                left: showHouses ? '17px' : '3px',
                transition: 'left 0.15s',
              }} />
            </button>
          </label>
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: 'var(--color-accent)',
              borderRadius: '2px',
            }} />
          </div>
        )}
      </div>

      {/* Planet visibility filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
        {PLANET_GROUPS.map(group => (
            <PlanetGroupBox
              key={group.id}
              group={group}
              hiddenPlanets={hiddenPlanets}
              collapsed={collapsedGroups.has(group.id)}
              onTogglePlanet={togglePlanet}
              onToggleAll={toggleAll}
              onToggleCollapse={toggleCollapse}
            />
        ))}
      </div>

      {/* Current date */}
      <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px', minHeight: '20px' }}>
        {currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        {showHouses && !location && (
          <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px', fontSize: '11px' }}>
            (loading location…)
          </span>
        )}
        {showHouses && location && (
          <span style={{ color: 'var(--color-text-subtle)', marginLeft: '8px', fontSize: '11px' }}>
            {location.lat.toFixed(1)}°{location.lat >= 0 ? 'N' : 'S'}, {Math.abs(location.lon).toFixed(1)}°{location.lon >= 0 ? 'E' : 'W'}
          </span>
        )}
      </div>

      {/* Wheel */}
      <ZoomableSVGContainer style={{ borderRadius: '8px', marginBottom: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WheelChart
            chart={visibleChart}
            size={560}
            mode={astrologyMode}
            onNavigate={goToRef}
            showTooltip={false}
            onHoverChange={handleHoverChange}
            defaultLayout="rings"
          />
        </div>
      </ZoomableSVGContainer>

      {/* Tooltip panel — always rendered, visibility-toggled to prevent page height change on hover */}
      <div style={{ marginTop: '12px', minHeight: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ visibility: hoveredKey ? 'visible' : 'hidden' }}>
          {hoveredKey && (
            <WheelChartTooltip
              hoveredKey={hoveredKey}
              chart={visibleChart}
              mode={astrologyMode}
              onNavigate={goToRef}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const dateInputStyle: React.CSSProperties = {
  padding: '5px 8px',
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  color: 'var(--color-text)',
  fontSize: '12px',
  fontFamily: 'inherit',
}

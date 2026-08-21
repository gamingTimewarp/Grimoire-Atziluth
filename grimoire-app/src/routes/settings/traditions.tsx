import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { Tradition } from '@grimoire/core'
import {
  loadTraditionSettings, saveTraditionSettings,
  TRADITION_SYSTEMS, TRADITION_DISPLAY_NAMES, TRADITION_PRESETS,
  exportTraditionSettingsFile, pickAndImportTraditionSettingsFile,
} from '@/lib/tradition-store'
import type { TraditionSettings, AstrologyMode, HouseSystem, TraditionTab } from '@/lib/tradition-store'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ExternalLink, Search, Info, Download, Upload, X } from 'lucide-react'

export const Route = createFileRoute('/settings/traditions')({
  component: TraditionsPage,
})

function TraditionsPage() {
  const navigate   = useNavigate()
  const { engine } = useEngineStore()
  const [settings, setSettings] = useState<TraditionSettings>(() => loadTraditionSettings())
  const [traditions, setTraditions] = useState<Map<string, Tradition>>(new Map())
  const [saved, setSaved] = useState(false)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<TraditionTab>('western')
  const [ioBusy, setIoBusy] = useState(false)
  const [ioError, setIoError] = useState<string | null>(null)

  useEffect(() => {
    if (!engine) return
    engine.adapter.listTraditions().then(list => {
      setTraditions(new Map(list.map(t => [t.canonicalName, t])))
    }).catch(console.error)
  }, [engine])

  const save = (next: TraditionSettings) => {
    setSettings(next)
    saveTraditionSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const toggleActive = (cn: string) => {
    const active = settings.activeTraditions.includes(cn)
    const next = active
      ? settings.activeTraditions.filter(t => t !== cn)
      : [...settings.activeTraditions, cn]
    save({ ...settings, activeTraditions: next })
  }

  const setPrimary = (systemId: string, cn: string) => {
    // Primary implies active
    const next = settings.activeTraditions.includes(cn)
      ? settings.activeTraditions
      : [...settings.activeTraditions, cn]
    save({
      ...settings,
      activeTraditions: next,
      primaryBySystem: { ...settings.primaryBySystem, [systemId]: cn },
    })
  }

  const setAstrologyMode = (mode: AstrologyMode) => {
    save({ ...settings, astrologyMode: mode })
  }

  const setHouseSystem = (hs: HouseSystem) => {
    save({ ...settings, houseSystem: hs })
  }

  const applyPresetById = (presetId: string) => {
    const preset = TRADITION_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    save(preset.apply(settings))
  }

  const handleExport = async () => {
    setIoError(null)
    try {
      await exportTraditionSettingsFile(settings)
    } catch (err) {
      setIoError(err instanceof Error ? err.message : 'Failed to export tradition settings.')
    }
  }

  const handleImport = async () => {
    setIoError(null)
    setIoBusy(true)
    try {
      const imported = await pickAndImportTraditionSettingsFile()
      if (imported) setSettings(imported)
    } catch (err) {
      setIoError(err instanceof Error ? err.message : 'Failed to import tradition settings.')
    } finally {
      setIoBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Traditions</h1>
        {saved && <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: 'auto' }}>Saved</span>}
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
        Active traditions determine which correspondences and attribution links are shown
        throughout the app. The primary tradition for each system determines which names
        and romanisations are displayed.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Presets</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download size={12} /> Export
            </Button>
            <Button variant="ghost" size="sm" onClick={handleImport} disabled={ioBusy}>
              <Upload size={12} /> {ioBusy ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          Apply a curated bundle in one click, or export/import your current settings as a standalone JSON file.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TRADITION_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPresetById(p.id)}
              title={p.description}
              style={{
                padding: '7px 12px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text)',
                fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)'; e.currentTarget.style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {ioError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', padding: '10px 14px', background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.3)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-danger, #e06060)' }}>
            <div style={{ flex: 1 }}>{ioError}</div>
            <button onClick={() => setIoError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search traditions, house systems…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 12px 8px 32px',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
          }}
        />
      </div>

      {/* Tabs — hidden when searching */}
      {!query.trim() && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
          {([
            { id: 'western',   label: 'Western Esoteric' },
            { id: 'eastern',   label: 'Eastern' },
            { id: 'astrology', label: 'Astrology' },
            { id: 'custom',    label: 'Custom' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontFamily: 'inherit',
                color: tab === t.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--color-accent)' : 'transparent'}`,
                marginBottom: '-1px', transition: 'color 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>
      )}

      {/* Tradition systems */}
      {(() => {
        const q = query.trim().toLowerCase()
        const hit = (s: string) => s.toLowerCase().includes(q)
        const searching = !!q

        const filteredSystems = TRADITION_SYSTEMS.map(system => {
          if (!searching && system.tab !== tab) return null
          if (!q) return { system, cns: system.traditionCNs }
          const systemHit = hit(system.label) || hit(system.description)
          const matchingCNs = system.traditionCNs.filter(cn => {
            const name = traditions.get(cn)?.displayName ?? TRADITION_DISPLAY_NAMES[cn] ?? cn.split('.').pop() ?? cn
            return hit(name)
          })
          if (systemHit || matchingCNs.length > 0)
            return { system, cns: systemHit ? system.traditionCNs : matchingCNs }
          return null
        }).filter((x): x is { system: typeof TRADITION_SYSTEMS[number]; cns: string[] } => x !== null)

        const showAstrology = (searching || tab === 'astrology') &&
          (!q || hit('astrology') || hit('zodiac') ||
          ['Tropical', 'Sidereal', 'IAU', '13 signs', 'Vedic', 'Jyotish', 'Ophiuchus', 'Lahiri', 'nakshatra',
           'modern', 'outer planet', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'Ceres', 'Eris',
           'nodes', 'Rahu', 'Ketu', 'Lilith'].some(hit))
        const showHouse = (searching || tab === 'astrology') &&
          (!q || hit('house') ||
          ['Placidus', 'Koch', 'Regiomontanus', 'Campanus', 'Porphyry', 'Morinus', 'Whole Sign', 'Equal'].some(hit))
        const showCustom = (searching || tab === 'custom') && (!q || hit('custom'))

        const anyVisible = filteredSystems.length > 0 || showAstrology || showHouse || showCustom

        return (
          <>
            {!anyVisible && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)', padding: '24px 0', textAlign: 'center' }}>
                No results for "{query}"
              </div>
            )}

            {filteredSystems.map(({ system, cns }) => (
              <div key={system.id} style={{ marginBottom: '28px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>
                  {system.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  {system.description}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {system.id === 'qabalah' && !q && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>Show Da'ath</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          Display the hidden sephira Da'ath on the Tree of Life.
                        </div>
                      </div>
                      <button
                        onClick={() => save({ ...settings, showDaath: !settings.showDaath })}
                        style={{
                          width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          padding: 0, flexShrink: 0, position: 'relative', transition: 'background 0.15s',
                          background: settings.showDaath ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: '3px', left: settings.showDaath ? '19px' : '3px',
                          transition: 'left 0.15s',
                        }} />
                      </button>
                    </div>
                  )}
                  {cns.map(cn => {
              const tradition = traditions.get(cn)
              const displayName = tradition?.displayName ?? TRADITION_DISPLAY_NAMES[cn] ?? cn.split('.').pop() ?? cn
              const isActive  = settings.activeTraditions.includes(cn)
              const isPrimary = settings.primaryBySystem[system.id] === cn
              return (
                <div key={cn} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(cn)}
                    title={isActive ? 'Deactivate' : 'Activate'}
                    style={{
                      width: '32px', height: '18px', borderRadius: '9px', border: 'none',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      background: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                      position: 'relative', transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: '3px', left: isActive ? '17px' : '3px',
                      transition: 'left 0.15s',
                    }} />
                  </button>

                  {/* Name */}
                  <span style={{ flex: 1, fontSize: '13px', color: isActive ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                    {displayName}
                  </span>

                  {/* Primary radio — hidden for non-competing systems */}
                  {system.showPrimary !== false && (
                    <button
                      onClick={() => setPrimary(system.id, cn)}
                      title="Set as primary"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '11px', color: isPrimary ? 'var(--color-accent)' : 'var(--color-text-subtle)',
                        padding: '2px 6px', borderRadius: '4px', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isPrimary ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isPrimary ? 'var(--color-accent)' : 'transparent',
                      }} />
                      Primary
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

            {showAstrology && (
              <div style={{ marginBottom: '28px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>Astrology</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Zodiac system used for planetary positions and natal charts.
                  Sidereal uses the Lahiri ayanamsa. IAU enables Ophiuchus.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {([
                    { id: 'tropical' as AstrologyMode, label: 'Tropical',       desc: 'Standard Western astrology, aligned to the vernal equinox (0° Aries).',          canonicalName: 'system.tradition.tropical-astrology' },
                    { id: 'sidereal' as AstrologyMode, label: 'Sidereal',       desc: 'Star-aligned zodiac using the Lahiri ayanamsa (~24° offset from tropical).',      canonicalName: 'system.tradition.sidereal-astrology' },
                    { id: 'iau'      as AstrologyMode, label: 'IAU (13 signs)', desc: 'Astronomical constellation boundaries including Ophiuchus.',                       canonicalName: 'system.tradition.iau-astrology'      },
                    { id: 'vedic'    as AstrologyMode, label: 'Vedic (Jyotish)',desc: 'Sidereal zodiac with 27 nakshatra lunar mansions. Uses Lahiri ayanamsa.',          canonicalName: 'system.tradition.vedic-jyotish'      },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setAstrologyMode(opt.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px',
                        background: settings.astrologyMode === opt.id ? 'rgba(180,156,90,0.08)' : 'transparent',
                        border: `1px solid ${settings.astrologyMode === opt.id ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
                        borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                        border: `2px solid ${settings.astrologyMode === opt.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: settings.astrologyMode === opt.id ? 'var(--color-accent)' : 'transparent',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>{opt.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: opt.canonicalName } }) }}
                        title="Learn more"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-text-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
                      >
                        <Info size={13} />
                      </button>
                    </button>
                  ))}

                  {/* Modern Astrology toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>Modern Astrology</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Show outer planet rulerships (Uranus, Neptune, Pluto) and modern minor bodies (Chiron, Ceres, Eris…) alongside classical dignities.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const cn = 'tradition.modern-astrology'
                        const isOn = settings.activeTraditions.includes(cn)
                        save({ ...settings, activeTraditions: isOn ? settings.activeTraditions.filter(t => t !== cn) : [...settings.activeTraditions, cn] })
                      }}
                      style={{
                        width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        padding: 0, flexShrink: 0, position: 'relative', transition: 'background 0.15s',
                        background: settings.activeTraditions.includes('tradition.modern-astrology') ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '3px',
                        left: settings.activeTraditions.includes('tradition.modern-astrology') ? '19px' : '3px',
                        transition: 'left 0.15s',
                      }} />
                    </button>
                  </div>

                  {/* Show Lunar Nodes toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>Show Lunar Nodes &amp; Lilith (Rahu / Ketu / ⚸)</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Display the North Node ☊, South Node ☋, and Black Moon Lilith ⚸ in sky charts, natal wheels, and planet tables.
                      </div>
                    </div>
                    <button
                      onClick={() => save({ ...settings, showNodes: !settings.showNodes })}
                      style={{
                        width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        padding: 0, flexShrink: 0, position: 'relative', transition: 'background 0.15s',
                        background: settings.showNodes ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '3px', left: settings.showNodes ? '19px' : '3px',
                        transition: 'left 0.15s',
                      }} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showHouse && (
              <div style={{ marginBottom: '28px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>House System</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Method used to divide the sky into astrological houses.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([
                    { id: 'placidus'      as HouseSystem, label: 'Placidus',      desc: 'Semi-arc method. Most widely used in modern Western astrology. May be inaccurate above 66° latitude.',           canonicalName: 'system.tradition.house-system.placidus'      },
                    { id: 'koch'          as HouseSystem, label: 'Koch',          desc: 'Birthplace system. Uses the MC\'s diurnal semi-arc to divide the houses. Similar to Placidus in mid-latitudes.', canonicalName: 'system.tradition.house-system.koch'          },
                    { id: 'regiomontanus' as HouseSystem, label: 'Regiomontanus', desc: 'Divides the celestial equator into 12 equal parts from RAMC, projected via the Zenith to the ecliptic.',        canonicalName: 'system.tradition.house-system.regiomontanus' },
                    { id: 'campanus'      as HouseSystem, label: 'Campanus',      desc: 'Divides the prime vertical (East–Zenith–West–Nadir) into 12 equal arcs, projected to the ecliptic.',            canonicalName: 'system.tradition.house-system.campanus'      },
                    { id: 'porphyry'      as HouseSystem, label: 'Porphyry',      desc: 'Divides each quadrant arc (ASC–IC–DSC–MC) into three equal parts. Works at all latitudes.',                    canonicalName: 'system.tradition.house-system.porphyry'      },
                    { id: 'morinus'       as HouseSystem, label: 'Morinus',       desc: 'Divides the equator into 12 equal parts from RAMC, projected to the ecliptic without latitude. Latitude-independent.', canonicalName: 'system.tradition.house-system.morinus'  },
                    { id: 'whole-sign'    as HouseSystem, label: 'Whole Sign',    desc: 'Each house occupies an entire sign, starting from the Ascendant\'s sign. Works at all latitudes.',              canonicalName: 'system.tradition.house-system.whole-sign'    },
                    { id: 'equal'         as HouseSystem, label: 'Equal House',   desc: 'Houses are equal 30° arcs starting from the exact degree of the Ascendant.',                                    canonicalName: 'system.tradition.house-system.equal-house'   },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setHouseSystem(opt.id)}
                      style={{
                        padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '12px',
                        background: settings.houseSystem === opt.id ? 'rgba(180,156,90,0.08)' : 'transparent',
                        border: `1px solid ${settings.houseSystem === opt.id ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
                        borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                        border: `2px solid ${settings.houseSystem === opt.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: settings.houseSystem === opt.id ? 'var(--color-accent)' : 'transparent',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>{opt.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate({ to: '/reference/$canonicalName', params: { canonicalName: opt.canonicalName } }) }}
                        title="Learn more"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-text-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
                      >
                        <Info size={13} />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCustom && (
              <>
                <div style={{ marginBottom: '28px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Custom Traditions</div>
                    <button
                      onClick={() => navigate({ to: '/custom/traditions' })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', padding: 0 }}
                    >
                      <ExternalLink size={11} /> Manage
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                    User-defined traditions with custom relationship types and display names for existing entities.
                  </div>
                  {traditions.size > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[...traditions.values()].filter(t => !t.isBuiltIn).map(t => {
                        const cn = t.canonicalName
                        const isActive = settings.activeTraditions.includes(cn)
                        return (
                          <div key={cn} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                              onClick={() => toggleActive(cn)}
                              title={isActive ? 'Deactivate' : 'Activate'}
                              style={{
                                width: '32px', height: '18px', borderRadius: '9px', border: 'none',
                                cursor: 'pointer', padding: 0, flexShrink: 0,
                                background: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                                position: 'relative', transition: 'background 0.15s',
                              }}
                            >
                              <div style={{
                                width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: '3px', left: isActive ? '17px' : '3px',
                                transition: 'left 0.15s',
                              }} />
                            </button>
                            <span style={{ flex: 1, fontSize: '13px', color: isActive ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                              {t.displayName}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
                              {cn}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                      No custom traditions yet.{' '}
                      <button onClick={() => navigate({ to: '/custom/traditions' })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
                        Create one →
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '28px', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '16px' }}>Custom Content</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>Show custom entities</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Include user-created entities in reference search and study sessions.
                      </div>
                    </div>
                    <button
                      onClick={() => save({ ...settings, customEnabled: !settings.customEnabled })}
                      style={{
                        width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        padding: 0, flexShrink: 0, position: 'relative', transition: 'background 0.15s',
                        background: settings.customEnabled ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '3px', left: settings.customEnabled ? '19px' : '3px',
                        transition: 'left 0.15s',
                      }} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )
      })()}
    </div>
  )
}



import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { loadSettings, saveSettings } from '@/lib/settings-store'
import type { Settings, Location } from '@/lib/settings-store'
import {
  loadThemeSettings, saveThemeSettings, applyTheme, getEffectiveColors,
  THEME_PRESETS, COLOR_TOKEN_META,
} from '@/lib/theme-store'
import type { ThemeSettings, ThemeColors, ThemeColorKey } from '@/lib/theme-store'
import { applyCustomCss } from '../__root'
import { BUILT_IN_DECK_FILTERS } from '@/lib/built-in-data'
import { useSpreadById } from '@/lib/spread-hooks'
import { Button } from '@/components/ui/Button'
import { ColorSwatch } from '@/components/ui/HsvColorPicker'
import { DateTimeInput } from '@/components/ui/DateInput'
import { MapPin, Clock, Check, Layers, Sun, Palette, PanelLeft, HardDrive, Maximize2, Minimize2, ScrollText, ImageIcon, Eye, Moon, Code2, BookMarked, Keyboard, AlertCircle, Shield, BookOpen, CalendarDays } from 'lucide-react'
import { LocationInput } from '@/components/ui/LocationInput'
import type { LocationValue } from '@/components/ui/LocationInput'
import { loadAccessibilitySettings, applyAccessibilitySettings } from '@/lib/accessibility-store'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [saved, setSaved] = useState(false)

  const persist = (next: Settings) => {
    setSettings(next)
    saveSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '24px' }}>Settings</h1>

      <WindowSection />
      <ThemeSection />

      <LocationSection
        location={settings.homeLocation}
        onChange={loc => persist({ ...settings, homeLocation: loc })}
      />

      <DateTimeOverrideSection
        value={settings.dateTimeOverride}
        onChange={dt => persist({ ...settings, dateTimeOverride: dt })}
      />

      <DailyReadingSection
        deckId={settings.dailyDeckId}
        spreadId={settings.dailySpreadId}
        onDeckChange={id => persist({ ...settings, dailyDeckId: id })}
        onSpreadChange={id => persist({ ...settings, dailySpreadId: id })}
      />

      <DefaultReadingSpreadSection
        spreadId={settings.defaultReadingSpreadId}
        onChange={id => persist({ ...settings, defaultReadingSpreadId: id })}
      />

      <JournalSection
        compact={settings.defaultCompactJournal}
        onChange={v => persist({ ...settings, defaultCompactJournal: v })}
      />

      <CustomCssSection />
      <KeyboardShortcutsSection />

      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-accent)', marginTop: '16px' }}>
          <Check size={14} /> Saved
        </div>
      )}

      <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { to: '/settings/traditions',   icon: Layers,     label: 'Traditions',   desc: 'Toggle active traditions, set primary romanisation, and choose astrology mode.' },
          { to: '/settings/calendar',     icon: CalendarDays, label: 'Calendar Tabs', desc: 'Choose which lunar/lunisolar calendars appear as tabs on the Calendar page.' },
          { to: '/settings/art',          icon: ImageIcon,  label: 'Art Packs',    desc: 'Choose visual styles for tarot, runes, geomancy, mahjong, and more.' },
          { to: '/settings/nav',          icon: PanelLeft,  label: 'Navigation',   desc: 'Reorder and show/hide sidebar navigation items.' },
          { to: '/settings/accessibility',icon: Eye,        label: 'Accessibility',desc: 'Colour vision modes, dyslexia font, reduced motion, and card captions.' },
          { to: '/settings/data',         icon: HardDrive,  label: 'Data',         desc: 'Export a full backup or import a previously saved backup file.' },
          { to: '/settings/manual',       icon: BookOpen,   label: 'User Manual',  desc: 'How to use every feature in the app.' },
          { to: '/settings/credits',      icon: ScrollText, label: 'Credits',      desc: 'Art pack licences and third-party attributions.' },
          { to: '/settings/privacy',      icon: Shield,     label: 'Privacy Policy', desc: 'How your data is stored and why nothing leaves your device.' },
        ].map(({ to, icon: Icon, label, desc }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate({ to: to as '/settings/traditions' | '/settings/calendar' | '/settings/art' | '/settings/nav' | '/settings/accessibility' | '/settings/data' | '/settings/manual' | '/settings/credits' | '/settings/privacy' })}
            style={{ padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'border-color 0.15s', width: '100%', fontFamily: 'inherit', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          >
            <Icon size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{desc}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '16px', color: 'var(--color-text-subtle)' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Window section ───────────────────────────────────────────────────────────

function WindowSection() {
  const [fullscreen, setFullscreen] = useState(false)
  const [compact, setCompact] = useState(
    () => localStorage.getItem('grimoire:compact-window') === 'true'
  )

  useEffect(() => {
    getCurrentWindow().isFullscreen().then(setFullscreen).catch(() => {})
  }, [])

  const toggleFullscreen = async () => {
    const next = !fullscreen
    await getCurrentWindow().setFullscreen(next)
    setFullscreen(next)
  }

  const toggleCompact = async () => {
    const next = !compact
    setCompact(next)
    localStorage.setItem('grimoire:compact-window', String(next))
    try {
      if (next) {
        await getCurrentWindow().setMinSize(null)
      } else {
        await getCurrentWindow().setMinSize(new LogicalSize(900, 600))
      }
    } catch (e) {
      console.error('setMinSize failed:', e)
    }
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Maximize2 size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Window</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          </Button>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>F11 also toggles</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={compact}
            onChange={toggleCompact}
            style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Allow compact window (below 900 px)</span>
        </label>
      </div>
    </section>
  )
}

// ─── Theme section ────────────────────────────────────────────────────────────

function ThemeSection() {
  const [theme, setTheme] = useState<ThemeSettings>(() => loadThemeSettings())
  const [customOpen, setCustomOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const isNamedPreset = THEME_PRESETS.some(p => p.id === theme.presetId)
  const isHighContrast = loadAccessibilitySettings().colorblindMode === 'high-contrast'

  // After any theme change, re-assert accessibility settings so HC always wins.
  const reapplyAccessibility = () => applyAccessibilitySettings(loadAccessibilitySettings())

  const selectPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    const next: ThemeSettings = { presetId, colors: { ...preset.colors }, lightMode: theme.lightMode }
    setTheme(next)
    applyTheme(getEffectiveColors(next))
    saveThemeSettings(next)
    reapplyAccessibility()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const toggleLightMode = () => {
    if (!isNamedPreset || isHighContrast) return
    const next: ThemeSettings = { ...theme, lightMode: !theme.lightMode }
    setTheme(next)
    applyTheme(getEffectiveColors(next))
    saveThemeSettings(next)
  }

  const updateColor = (key: ThemeColorKey, value: string) => {
    const next: ThemeSettings = { presetId: 'custom', colors: { ...theme.colors, [key]: value }, lightMode: false }
    setTheme(next)
    applyTheme(next.colors)
    saveThemeSettings(next)
    reapplyAccessibility()
  }

  const groups = [
    { id: 'background', label: 'Background & Borders' },
    { id: 'accent',     label: 'Accent' },
    { id: 'text',       label: 'Text' },
  ] as const

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Palette size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Colour Theme</span>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-accent)', marginLeft: '8px' }}>
            <Check size={12} /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={toggleLightMode}
          disabled={!isNamedPreset || isHighContrast}
          title={isHighContrast ? 'Light mode is unavailable while High Contrast is active' : isNamedPreset ? (theme.lightMode ? 'Switch to dark mode' : 'Switch to light mode') : 'Light mode is not available for custom themes'}
          aria-pressed={theme.lightMode}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
            background: theme.lightMode ? 'rgba(196,146,42,0.1)' : 'var(--color-surface-2)',
            border: `1px solid ${theme.lightMode ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '5px', padding: '4px 10px', cursor: (isNamedPreset && !isHighContrast) ? 'pointer' : 'not-allowed',
            fontSize: '12px', color: theme.lightMode ? 'var(--color-accent)' : 'var(--color-text-muted)',
            opacity: (isNamedPreset && !isHighContrast) ? 1 : 0.4, fontFamily: 'inherit',
          }}
        >
          {theme.lightMode ? <Sun size={13} /> : <Moon size={13} />}
          {theme.lightMode ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Preset grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        {THEME_PRESETS.map(preset => {
          const active = theme.presetId === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset.id)}
              title={preset.description}
              style={{
                padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: active ? 'rgba(196,146,42,0.08)' : 'var(--color-surface-2)',
                display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {/* Colour swatch row */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {(['surface-0', 'surface-2', 'accent', 'text'] as ThemeColorKey[]).map(k => (
                  <div key={k} style={{ width: '12px', height: '12px', borderRadius: '2px', background: preset.colors[k], border: '1px solid rgba(255,255,255,0.08)' }} />
                ))}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>
                {preset.label}
              </div>
            </button>
          )
        })}
        {/* Custom indicator when customised */}
        {theme.presetId === 'custom' && (
          <button
            style={{
              padding: '10px 12px', borderRadius: '6px',
              border: '1px solid var(--color-accent)',
              background: 'rgba(196,146,42,0.08)',
              display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left',
              fontFamily: 'inherit', cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', gap: '3px' }}>
              {(['surface-0', 'surface-2', 'accent', 'text'] as ThemeColorKey[]).map(k => (
                <div key={k} style={{ width: '12px', height: '12px', borderRadius: '2px', background: theme.colors[k], border: '1px solid rgba(255,255,255,0.08)' }} />
              ))}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-accent)' }}>Custom</div>
          </button>
        )}
      </div>

      {/* Customise toggle */}
      <button
        onClick={() => setCustomOpen(o => !o)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <span style={{ display: 'inline-block', transform: customOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
        Customise colours
      </button>

      {customOpen && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groups.map(group => (
            <div key={group.id}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {COLOR_TOKEN_META.filter(m => m.group === group.id).map(meta => (
                  <ColorRow
                    key={meta.key}
                    label={meta.label}
                    value={theme.colors[meta.key]}
                    onChange={v => updateColor(meta.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const preset = THEME_PRESETS.find(p => p.id === 'atziluth')!
                const next: ThemeSettings = { presetId: 'atziluth', colors: { ...preset.colors }, lightMode: false }
                setTheme(next)
                applyTheme(next.colors)
                saveThemeSettings(next)
              }}
            >
              Reset to default
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function ColorRow({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <ColorSwatch value={value} onChange={onChange} />
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}

// ─── Location section ─────────────────────────────────────────────────────────

function LocationSection({ location, onChange }: {
  location: Location | null
  onChange: (loc: Location | null) => void
}) {
  const [locValue, setLocValue] = useState<LocationValue>({
    label:    location?.label    ?? '',
    lat:      location?.lat?.toString() ?? '',
    lon:      location?.lon?.toString() ?? '',
    timezone: location?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  const handleSave = () => {
    const latN = parseFloat(locValue.lat)
    const lonN = parseFloat(locValue.lon)
    if (isNaN(latN) || isNaN(lonN)) return
    onChange({ label: locValue.label.trim() || `${latN}, ${lonN}`, lat: latN, lon: lonN, timezone: locValue.timezone })
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <MapPin size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Home Location</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
        Used for house calculations and planetary positions on the calendar.
      </p>

      <LocationInput value={locValue} onChange={setLocValue} />

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
        <Button onClick={handleSave} size="sm">Save Location</Button>
        {location && (
          <Button variant="ghost" size="sm" onClick={() => { onChange(null); setLocValue({ label: '', lat: '', lon: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) }}>Clear</Button>
        )}
        {location && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            Current: {location.label}
          </span>
        )}
      </div>
    </section>
  )
}

// ─── Daily reading section ────────────────────────────────────────────────────

function DailyReadingSection({ deckId, spreadId, onDeckChange, onSpreadChange }: {
  deckId: string
  spreadId: string | null
  onDeckChange: (id: string) => void
  onSpreadChange: (id: string | null) => void
}) {
  const spreadById = useSpreadById()
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)', borderRadius: '6px',
    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
    colorScheme: 'dark',
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Sun size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Daily Reading</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
        A reading is drawn automatically each day when you open the app and shown on the home screen.
      </p>

      <div style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deck</label>
          <select value={deckId} onChange={e => onDeckChange(e.target.value)} style={selectStyle}>
            {BUILT_IN_DECK_FILTERS.map(d =>
              d.variants ? (
                <optgroup key={d.id} label={d.displayName}>
                  {d.variants.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </optgroup>
              ) : (
                <option key={d.id} value={d.id}>{d.displayName}</option>
              )
            )}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Spread</label>
          <select value={spreadId ?? ''} onChange={e => onSpreadChange(e.target.value || null)} style={selectStyle}>
            <option value="">Single card (default)</option>
            {[...spreadById.values()].filter(s => s.positions.length > 0).map(s => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}

// ─── Date/time override section ───────────────────────────────────────────────

function DateTimeOverrideSection({ value, onChange }: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [dt, setDt] = useState(value?.slice(0, 16) ?? '')

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)', borderRadius: '6px',
    color: 'var(--color-text)', fontSize: '14px', outline: 'none', colorScheme: 'dark',
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Clock size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Date / Time Override</span>
        {value && (
          <span style={{ fontSize: '11px', padding: '2px 7px', background: 'rgba(196,156,74,0.15)', border: '1px solid var(--color-accent-muted)', borderRadius: '3px', color: 'var(--color-accent)' }}>
            Active
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
        Override the current date and time used for astrological calculations. Useful for exploring past or future charts.
      </p>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <DateTimeInput
          value={dt}
          onChange={v => setDt(v)}
          style={inputStyle}
        />
        <Button size="sm" onClick={() => onChange(dt || null)}>
          {value ? 'Update' : 'Set Override'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => { onChange(null); setDt('') }}>
            Clear (use now)
          </Button>
        )}
      </div>
    </section>
  )
}

// ─── Journal section ──────────────────────────────────────────────────────────

function JournalSection({ compact, onChange }: { compact: boolean; onChange: (v: boolean) => void }) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BookMarked size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Journal</span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={compact}
          onChange={e => onChange(e.target.checked)}
          style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
        />
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Default to compact journal view</span>
      </label>
    </section>
  )
}

// ─── Custom CSS section ───────────────────────────────────────────────────────

/** Basic CSS structural validation. Returns an error string or null if clean. */
function validateCss(css: string): string | null {
  if (!css.trim()) return null

  // Injection guard
  if (/<\/style\s*>|<script/i.test(css)) {
    return 'CSS may not contain </style> or <script> tags.'
  }

  // Brace balance check — the most common cause of catastrophic breakage
  let depth = 0
  let inString: '"' | "'" | null = null
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (inString) {
      if (ch === inString && css[i - 1] !== '\\') inString = null
    } else if (ch === '"' || ch === "'") {
      inString = ch as '"' | "'"
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth < 0) return 'Unmatched } — check your braces.'
    }
  }
  if (depth !== 0) return `Unmatched { — ${depth} block${depth !== 1 ? 's' : ''} not closed.`

  // Best-effort CSS OM parse (silently swallows most errors, but catches @charset issues etc.)
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
  } catch (e) {
    return `CSS parse error: ${String(e).replace(/^Error:\s*/i, '')}`
  }

  return null
}

function CustomCssSection() {
  const [css,      setCss]      = useState(() => localStorage.getItem('grimoire:custom-css') ?? '')
  const [cssError, setCssError] = useState<string | null>(null)
  const [saved,    setSaved]    = useState(false)

  const handleChange = (value: string) => {
    setCss(value)
    setCssError(validateCss(value))
    setSaved(false)
  }

  const apply = () => {
    const err = validateCss(css)
    if (err) { setCssError(err); return }
    localStorage.setItem('grimoire:custom-css', css)
    applyCustomCss(css)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Code2 size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Custom CSS</span>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-accent)', marginLeft: '8px' }}>
            <Check size={12} /> Applied
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
        Injected into the app as a &lt;style&gt; element. Changes apply after clicking Apply. Use with caution.
      </p>
      <textarea
        value={css}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
        rows={8}
        placeholder="/* your custom CSS here */&#10;.my-class { color: red; }"
        style={{
          width: '100%', padding: '10px 12px', boxSizing: 'border-box',
          background: 'var(--color-surface-2)',
          border: `1px solid ${cssError ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: '6px', color: 'var(--color-text)', fontSize: '12px',
          fontFamily: 'monospace', outline: 'none', resize: 'vertical',
          lineHeight: 1.5,
        }}
      />
      {cssError && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-danger)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
          {cssError}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button size="sm" onClick={apply} disabled={!!cssError}>Apply</Button>
        {css && (
          <Button variant="ghost" size="sm" onClick={() => { handleChange(''); localStorage.removeItem('grimoire:custom-css'); applyCustomCss('') }}>
            Clear
          </Button>
        )}
      </div>
    </section>
  )
}

// ─── Default reading spread section ──────────────────────────────────────────

function DefaultReadingSpreadSection({ spreadId, onChange }: {
  spreadId: string | null
  onChange: (id: string | null) => void
}) {
  const spreadById = useSpreadById()
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)', borderRadius: '6px',
    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
    colorScheme: 'dark',
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Layers size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Default Spread</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
        Pre-select a spread when starting a new manual reading. You can still change it on the reading screen.
      </p>
      <select value={spreadId ?? ''} onChange={e => onChange(e.target.value || null)} style={selectStyle}>
        <option value="">No default (choose each time)</option>
        {[...spreadById.values()].filter(s => s.positions.length > 0).map(s => (
          <option key={s.id} value={s.id}>{s.displayName}</option>
        ))}
      </select>
    </section>
  )
}

// ─── Keyboard shortcuts section ───────────────────────────────────────────────

function KeyboardShortcutsSection() {
  const shortcuts: { key: string; description: string }[] = [
    { key: 'F11',       description: 'Toggle fullscreen' },
    { key: 'Escape',    description: 'Close overlay, lightbox, or search' },
    { key: '↑ / ↓',     description: 'Navigate search results' },
    { key: 'Enter',     description: 'Confirm selection in search / form' },
    { key: 'Space / Enter', description: 'Activate focused card in spread' },
    { key: 'Tab',       description: 'Move focus between interactive elements' },
  ]

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Keyboard size={15} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Keyboard Shortcuts</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {shortcuts.map(s => (
          <div
            key={s.key}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '8px 12px', background: 'var(--color-surface-2)',
              borderRadius: '4px',
            }}
          >
            <kbd style={{
              fontFamily: 'monospace', fontSize: '12px', padding: '2px 7px',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '4px', color: 'var(--color-text)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {s.key}
            </kbd>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{s.description}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

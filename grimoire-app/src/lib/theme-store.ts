/**
 * theme-store.ts
 * Theme presets and colour customisation.
 * Colours are applied by setting CSS custom properties on documentElement,
 * overriding the @theme defaults in index.css.
 *
 * Tree of Life / WheelChart SVG colours are intentionally NOT part of the theme
 * system — they carry fixed symbolic meaning.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeColorKey =
  | 'surface-0' | 'surface-1' | 'surface-2' | 'surface-3'
  | 'border'
  | 'accent' | 'accent-hover' | 'accent-muted'
  | 'text' | 'text-muted' | 'text-subtle'

export type ThemeColors = Record<ThemeColorKey, string>

export interface ThemeSettings {
  presetId: string
  colors: ThemeColors
  /** When true, apply lightColors instead of colors (only for named presets). */
  lightMode: boolean
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface ThemePreset {
  id: string
  label: string
  description: string
  colors: ThemeColors
  /** Light-mode equivalent palette — same accent character, light surfaces. */
  lightColors: ThemeColors
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'atziluth',
    label: 'Atziluth',
    description: 'Warm amber gold on deep black — the default.',
    colors: {
      'surface-0':    '#0d0d12',
      'surface-1':    '#13131a',
      'surface-2':    '#1c1c27',
      'surface-3':    '#252533',
      'border':       '#2e2e3f',
      'accent':       '#c4922a',
      'accent-hover': '#d9a33a',
      'accent-muted': '#7a5a1a',
      'text':         '#e8e4d6',
      'text-muted':   '#7a7a8f',
      'text-subtle':  '#4a4a60',
    },
    lightColors: {
      'surface-0':    '#f7f3eb',
      'surface-1':    '#f0eadb',
      'surface-2':    '#e8dfc8',
      'surface-3':    '#ddd2b5',
      'border':       '#c0b090',
      'accent':       '#8c5c10',
      'accent-hover': '#a06c18',
      'accent-muted': '#c4940a',
      'text':         '#1c1610',
      'text-muted':   '#5a4e38',
      'text-subtle':  '#8a7860',
    },
  },
  {
    id: 'lunar',
    label: 'Lunar',
    description: "Cool silver-blue — the Moon's light on still water.",
    colors: {
      'surface-0':    '#0a0c14',
      'surface-1':    '#10141e',
      'surface-2':    '#181d2a',
      'surface-3':    '#202636',
      'border':       '#2c3348',
      'accent':       '#7ab0d0',
      'accent-hover': '#90c4e4',
      'accent-muted': '#3a6a8a',
      'text':         '#d8dce8',
      'text-muted':   '#6a7090',
      'text-subtle':  '#3c4160',
    },
    lightColors: {
      'surface-0':    '#eef1f8',
      'surface-1':    '#e4e9f5',
      'surface-2':    '#d8e0f0',
      'surface-3':    '#ccd4ea',
      'border':       '#a8b4d4',
      'accent':       '#1a5e90',
      'accent-hover': '#2070a8',
      'accent-muted': '#5a90ba',
      'text':         '#080e20',
      'text-muted':   '#304468',
      'text-subtle':  '#6070a0',
    },
  },
  {
    id: 'void',
    label: 'Void',
    description: 'Near-pure black with amethyst — the Ain Soph.',
    colors: {
      'surface-0':    '#050507',
      'surface-1':    '#0a0a0e',
      'surface-2':    '#111116',
      'surface-3':    '#18181f',
      'border':       '#222228',
      'accent':       '#9a6ab0',
      'accent-hover': '#b080cc',
      'accent-muted': '#5a3a70',
      'text':         '#e0dde8',
      'text-muted':   '#68666f',
      'text-subtle':  '#3c3a42',
    },
    lightColors: {
      'surface-0':    '#f2f0f8',
      'surface-1':    '#eae8f5',
      'surface-2':    '#dfdaee',
      'surface-3':    '#d4cce5',
      'border':       '#b0a4d4',
      'accent':       '#5c2090',
      'accent-hover': '#6a2aaa',
      'accent-muted': '#8050b8',
      'text':         '#100818',
      'text-muted':   '#40305e',
      'text-subtle':  '#706090',
    },
  },
  {
    id: 'sepia',
    label: 'Sepia',
    description: 'Warm manuscript tones — ink on vellum.',
    colors: {
      'surface-0':    '#100d08',
      'surface-1':    '#181410',
      'surface-2':    '#211c16',
      'surface-3':    '#2a241c',
      'border':       '#3a3028',
      'accent':       '#c4822a',
      'accent-hover': '#d8963c',
      'accent-muted': '#7a4a16',
      'text':         '#e8ddc8',
      'text-muted':   '#8a7a60',
      'text-subtle':  '#5a4a38',
    },
    lightColors: {
      'surface-0':    '#f8f0e0',
      'surface-1':    '#f0e4cc',
      'surface-2':    '#e4d4b0',
      'surface-3':    '#d6c498',
      'border':       '#b89c6c',
      'accent':       '#7a3408',
      'accent-hover': '#8e4210',
      'accent-muted': '#b06830',
      'text':         '#1a0c04',
      'text-muted':   '#503c24',
      'text-subtle':  '#806040',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Dark earth and emerald — rooted in the natural world.',
    colors: {
      'surface-0':    '#080d0a',
      'surface-1':    '#0e1510',
      'surface-2':    '#151f17',
      'surface-3':    '#1d2b1f',
      'border':       '#263428',
      'accent':       '#5a9a6a',
      'accent-hover': '#6ab47a',
      'accent-muted': '#2e5a38',
      'text':         '#d8e4da',
      'text-muted':   '#608060',
      'text-subtle':  '#3a5040',
    },
    lightColors: {
      'surface-0':    '#f0f5f0',
      'surface-1':    '#e4ede4',
      'surface-2':    '#d4e2d4',
      'surface-3':    '#c4d5c4',
      'border':       '#96b896',
      'accent':       '#1e5a2c',
      'accent-hover': '#287038',
      'accent-muted': '#4a9060',
      'text':         '#080e08',
      'text-muted':   '#2e5030',
      'text-subtle':  '#4e6e50',
    },
  },
]

export const DEFAULT_PRESET = THEME_PRESETS[0]

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY = 'grimoire:theme'

export function loadThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { presetId: DEFAULT_PRESET.id, colors: { ...DEFAULT_PRESET.colors }, lightMode: false }
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    return {
      presetId:  parsed.presetId ?? DEFAULT_PRESET.id,
      colors:    { ...DEFAULT_PRESET.colors, ...parsed.colors },
      lightMode: parsed.lightMode ?? false,
    }
  } catch {
    return { presetId: DEFAULT_PRESET.id, colors: { ...DEFAULT_PRESET.colors }, lightMode: false }
  }
}

export function saveThemeSettings(settings: ThemeSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

// ─── CSS application ──────────────────────────────────────────────────────────

/**
 * Applies a colour map by setting CSS custom properties on documentElement.
 * This overrides the @theme defaults in index.css at runtime.
 */
export function applyTheme(colors: ThemeColors): void {
  const el = document.documentElement
  for (const [key, value] of Object.entries(colors) as [ThemeColorKey, string][]) {
    el.style.setProperty(`--color-${key}`, value)
  }
}

/** Loads the saved theme and immediately applies it (respecting lightMode). */
export function loadAndApplyTheme(): void {
  const settings = loadThemeSettings()
  const preset = THEME_PRESETS.find(p => p.id === settings.presetId)
  if (settings.lightMode && preset) {
    applyTheme(preset.lightColors)
  } else {
    applyTheme(settings.colors)
  }
}

/** Returns the effective colors for the current theme settings. */
export function getEffectiveColors(settings: ThemeSettings): ThemeColors {
  const preset = THEME_PRESETS.find(p => p.id === settings.presetId)
  if (settings.lightMode && preset) return preset.lightColors
  return settings.colors
}

// ─── Colour token metadata (for the settings UI) ──────────────────────────────

export interface ColorTokenMeta {
  key: ThemeColorKey
  label: string
  group: 'background' | 'accent' | 'text'
}

export const COLOR_TOKEN_META: ColorTokenMeta[] = [
  { key: 'surface-0',    label: 'Background (root)',  group: 'background' },
  { key: 'surface-1',    label: 'Surface 1 (sidebar)', group: 'background' },
  { key: 'surface-2',    label: 'Surface 2 (cards)',  group: 'background' },
  { key: 'surface-3',    label: 'Surface 3 (hover)',  group: 'background' },
  { key: 'border',       label: 'Border',              group: 'background' },
  { key: 'accent',       label: 'Accent',              group: 'accent'     },
  { key: 'accent-hover', label: 'Accent (hover)',      group: 'accent'     },
  { key: 'accent-muted', label: 'Accent (muted)',      group: 'accent'     },
  { key: 'text',         label: 'Text (primary)',      group: 'text'       },
  { key: 'text-muted',   label: 'Text (secondary)',    group: 'text'       },
  { key: 'text-subtle',  label: 'Text (subtle)',       group: 'text'       },
]

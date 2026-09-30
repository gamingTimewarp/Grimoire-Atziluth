/**
 * font-store.ts
 * Custom default font selection, applied by overriding --font-sans (the CSS
 * variable index.css defines the built-in Inter stack on) — sits alongside
 * theme-store.ts's colour customisation in Settings, but kept in its own
 * module/localStorage key since typography is an orthogonal concern to colour.
 *
 * Whatever the user picks is always prepended to the existing Noto fallback
 * chain rather than replacing it — those bundled subset fonts are what keep
 * planetary/rune/Ogham glyphs (e.g. Eris's ⯰) from rendering as tofu on fonts
 * that don't carry them, which has nothing to do with typographic preference.
 */

const NOTO_FALLBACK_CHAIN = '"Noto Symbols Fallback", "Noto Symbols 2 Fallback", "Noto Runic Fallback", "Noto Ogham Fallback"'

export interface FontPreset {
  id: string
  label: string
  /** Font-family value WITHOUT the Noto fallback chain — appended at apply time. */
  stack: string
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'inter',   label: 'Default (Inter)', stack: '"Inter", system-ui, sans-serif' },
  { id: 'system',  label: 'System UI',       stack: 'system-ui, -apple-system, sans-serif' },
  { id: 'serif',   label: 'Serif',           stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono',    label: 'Monospace',       stack: 'ui-monospace, "Courier New", monospace' },
  { id: 'rounded', label: 'Rounded',         stack: 'Verdana, "Trebuchet MS", sans-serif' },
  { id: 'comic',   label: 'Comic',           stack: '"Comic Sans MS", "Comic Sans", cursive' },
]

export const DEFAULT_FONT_PRESET_ID = 'inter'
const DEFAULT_PRESET = FONT_PRESETS.find(p => p.id === DEFAULT_FONT_PRESET_ID)!

export interface FontSettings {
  /** One of FONT_PRESETS' ids, or 'custom'. */
  presetId: string
  /** Only meaningful when presetId === 'custom' — a user-typed font-family value. */
  customStack: string
}

const KEY = 'grimoire:font'

export function loadFontSettings(): FontSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { presetId: DEFAULT_FONT_PRESET_ID, customStack: '' }
    const parsed = JSON.parse(raw) as Partial<FontSettings>
    return {
      presetId:    parsed.presetId ?? DEFAULT_FONT_PRESET_ID,
      customStack: parsed.customStack ?? '',
    }
  } catch {
    return { presetId: DEFAULT_FONT_PRESET_ID, customStack: '' }
  }
}

export function saveFontSettings(settings: FontSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

/** Resolves FontSettings to the actual font-family value, Noto fallback chain included. */
export function resolveFontStack(settings: FontSettings): string {
  const base = settings.presetId === 'custom'
    ? (settings.customStack.trim() || DEFAULT_PRESET.stack)
    : (FONT_PRESETS.find(p => p.id === settings.presetId)?.stack ?? DEFAULT_PRESET.stack)
  return `${base}, ${NOTO_FALLBACK_CHAIN}, system-ui, sans-serif`
}

/** Applies the font by setting --font-sans on documentElement, overriding index.css's default. */
export function applyFont(settings: FontSettings): void {
  document.documentElement.style.setProperty('--font-sans', resolveFontStack(settings))
}

/** Loads the saved font settings and immediately applies them. */
export function loadAndApplyFont(): void {
  applyFont(loadFontSettings())
}

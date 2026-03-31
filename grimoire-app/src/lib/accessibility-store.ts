/**
 * accessibility-store.ts
 * Persists and applies accessibility preferences.
 * Applies CSS classes on <html> for theme-level effects; SVG filters injected
 * into the DOM for colour-vision-deficiency simulation.
 */

import { applyTheme, loadAndApplyTheme } from './theme-store'
import type { ThemeColors } from './theme-store'

/**
 * High-contrast colour palette — applied as inline styles so they always take
 * precedence over the user's selected theme, regardless of application order.
 * Values mirror the `html.high-contrast` rule in index.css.
 */
const HIGH_CONTRAST_COLORS: ThemeColors = {
  'surface-0':    '#000000',
  'surface-1':    '#0a0a0a',
  'surface-2':    '#111111',
  'surface-3':    '#1a1a1a',
  'border':       '#555555',
  'accent':       '#ffcc00',
  'accent-hover': '#ffdd33',
  'accent-muted': '#997700',
  'text':         '#ffffff',
  'text-muted':   '#bbbbbb',
  'text-subtle':  '#888888',
}

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'high-contrast'

/** 100 = default, 115 = larger, 130 = largest */
export type TextScale = 100 | 115 | 130

/** How reversed cards are displayed in spread grids. */
export type ReversedDisplay = 'rotated' | 'badge'

/** Which side the mobile nav drawer (and hamburger button) appears on. */
export type NavSide = 'left' | 'right'

export interface AccessibilitySettings {
  colorblindMode: ColorblindMode
  dyslexiaFont: boolean
  reducedMotion: boolean
  /** Base font scale percentage. */
  textScale: TextScale
  cardCaptions: boolean
  /** Rotated = art rendered upside-down; badge = small ↓ Rev overlay only. */
  reversedDisplay: ReversedDisplay
  /** Side the mobile hamburger button and slide-out drawer appear on. */
  navSide: NavSide
}

const STORAGE_KEY = 'grimoire:accessibility'

const DEFAULTS: AccessibilitySettings = {
  colorblindMode: 'none',
  dyslexiaFont: false,
  reducedMotion: false,
  textScale: 100,
  cardCaptions: false,
  reversedDisplay: 'rotated',
  navSide: 'left',
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const stored = JSON.parse(raw) as Record<string, unknown>
    // Migrate legacy largerText boolean
    if ('largerText' in stored) {
      if (stored.largerText === true && !('textScale' in stored)) stored.textScale = 115
      delete stored.largerText
    }
    return { ...DEFAULTS, ...stored } as AccessibilitySettings
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveAccessibilitySettings(s: AccessibilitySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  window.dispatchEvent(new CustomEvent('grimoire:accessibility-changed'))
}

/** Inject hidden SVG containing CVD filter definitions (once). */
function ensureCvdFilters() {
  if (document.getElementById('grimoire-cvd-filters')) return
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.id = 'grimoire-cvd-filters'
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
  // Color matrices derived from Machado et al. 2009
  svg.innerHTML = `
    <defs>
      <filter id="cvd-deuteranopia" color-interpolation-filters="linearRGB">
        <feColorMatrix type="matrix" values="
          0.625 0.375 0     0 0
          0.7   0.3   0     0 0
          0     0.3   0.7   0 0
          0     0     0     1 0"/>
      </filter>
      <filter id="cvd-protanopia" color-interpolation-filters="linearRGB">
        <feColorMatrix type="matrix" values="
          0.567 0.433 0     0 0
          0.558 0.442 0     0 0
          0     0.242 0.758 0 0
          0     0     0     1 0"/>
      </filter>
      <filter id="cvd-tritanopia" color-interpolation-filters="linearRGB">
        <feColorMatrix type="matrix" values="
          0.95  0.05  0     0 0
          0     0.433 0.567 0 0
          0     0.475 0.525 0 0
          0     0     0     1 0"/>
      </filter>
    </defs>`
  document.body.prepend(svg)
}

export function applyAccessibilitySettings(s: AccessibilitySettings) {
  const root = document.documentElement

  // ── Colour-vision modes ───────────────────────────────────────────────────
  root.classList.remove('cvd-deuteranopia', 'cvd-protanopia', 'cvd-tritanopia', 'high-contrast')
  if (s.colorblindMode === 'high-contrast') {
    root.classList.add('high-contrast')
    // Apply HC colors as inline styles so they win over the theme (inline styles
    // have higher specificity than class rules — this resolves the 5.1 conflict).
    applyTheme(HIGH_CONTRAST_COLORS)
  } else {
    // Restore the current theme (handles coming out of high-contrast mode).
    loadAndApplyTheme()
    if (s.colorblindMode !== 'none') {
      ensureCvdFilters()
      root.classList.add(`cvd-${s.colorblindMode}`)
    }
  }

  // ── Dyslexia font ─────────────────────────────────────────────────────────
  root.classList.toggle('dyslexia-font', s.dyslexiaFont)

  // ── Reduced motion ────────────────────────────────────────────────────────
  root.classList.toggle('reduced-motion', s.reducedMotion)

  // ── Text scale (inline style so it cascades to rem/em consumers) ──────────
  root.style.fontSize = s.textScale === 100 ? '' : `${s.textScale}%`
}

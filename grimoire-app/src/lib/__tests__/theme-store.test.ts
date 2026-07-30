import { describe, it, expect } from 'vitest'
import { contrastTextColor, THEME_PRESETS } from '../theme-store'

describe('contrastTextColor', () => {
  it('picks near-black text against a bright/light background', () => {
    expect(contrastTextColor('#ffcc00')).toBe('#0d0d12')
    expect(contrastTextColor('#f5f5f5')).toBe('#0d0d12')
  })

  it('picks near-white text against a dark background', () => {
    expect(contrastTextColor('#0d0d12')).toBe('#f5f5f5')
    expect(contrastTextColor('#1a0a2a')).toBe('#f5f5f5')
  })

  it('picks readable text for every preset accent, in both dark and light mode', () => {
    // Regression guard for the light-theme bug: every preset's light-mode
    // accent is deliberately deep/rich (not pale), which previously broke
    // the hardcoded-black-text assumption baked into Button.tsx and friends.
    for (const preset of THEME_PRESETS) {
      for (const [mode, colors] of [['dark', preset.colors], ['light', preset.lightColors]] as const) {
        const text = contrastTextColor(colors.accent)
        expect(text, `${preset.id} ${mode} accent=${colors.accent}`).toMatch(/^#(0d0d12|f5f5f5)$/)
      }
    }
  })

  it('matches the known-correct choice for each shipped preset', () => {
    // Every dark-mode accent in this app is bright/mid-tone -> dark text reads
    // best. Every light-mode accent is deliberately deep -> light text reads
    // best. This pins that relationship so a future palette change that
    // breaks it fails loudly here instead of only being visible on screen.
    for (const preset of THEME_PRESETS) {
      expect(contrastTextColor(preset.colors.accent), preset.id).toBe('#0d0d12')
      expect(contrastTextColor(preset.lightColors.accent), preset.id).toBe('#f5f5f5')
    }
  })
})

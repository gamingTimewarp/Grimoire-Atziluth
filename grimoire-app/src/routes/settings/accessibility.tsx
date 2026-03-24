import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { Eye } from 'lucide-react'
import {
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  applyAccessibilitySettings,
} from '@/lib/accessibility-store'
import type { AccessibilitySettings, ColorblindMode, TextScale } from '@/lib/accessibility-store'

export const Route = createFileRoute('/settings/accessibility')({
  component: AccessibilityPage,
})

function AccessibilityPage() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => loadAccessibilitySettings())

  const update = (patch: Partial<AccessibilitySettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveAccessibilitySettings(next)
    applyAccessibilitySettings(next)
  }

  const toggle = (key: keyof Omit<AccessibilitySettings, 'colorblindMode' | 'textScale' | 'reversedDisplay'>) => {
    update({ [key]: !settings[key] })
  }

  const colorblindOptions: { value: ColorblindMode; label: string; desc: string }[] = [
    { value: 'none',          label: 'None (default)',    desc: 'No colour filter applied.' },
    { value: 'deuteranopia',  label: 'Deuteranopia',      desc: 'Red-green (most common, ~6% of men).' },
    { value: 'protanopia',    label: 'Protanopia',        desc: 'Red-blind (~1% of men).' },
    { value: 'tritanopia',    label: 'Tritanopia',        desc: 'Blue-yellow (very rare).' },
    { value: 'high-contrast', label: 'High Contrast',     desc: 'Maximise contrast for low-vision users.' },
  ]

  const textScaleOptions: { value: TextScale; label: string }[] = [
    { value: 100, label: '100%' },
    { value: 115, label: '115%' },
    { value: 130, label: '130%' },
  ]

  const ToggleRow = ({
    label, desc, checked, onToggle,
  }: { label: string; desc: string; checked: boolean; onToggle: () => void }) => (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '14px 16px', background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)', borderRadius: '6px',
      cursor: 'pointer', userSelect: 'none',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ accentColor: 'var(--color-accent)', width: '15px', height: '15px', marginTop: '2px', flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{desc}</div>
      </div>
    </label>
  )

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Eye size={18} style={{ color: 'var(--color-accent)' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Accessibility</h1>
      </div>

      {/* Colour vision */}
      <SectionLabel>Colour Vision</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '28px' }}>
        {colorblindOptions.map(opt => (
          <label
            key={opt.value}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '12px 16px', background: 'var(--color-surface-2)',
              border: `1px solid ${settings.colorblindMode === opt.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
              transition: 'border-color 0.15s',
            }}
          >
            <input
              type="radio"
              name="colorblind-mode"
              value={opt.value}
              checked={settings.colorblindMode === opt.value}
              onChange={() => update({ colorblindMode: opt.value })}
              style={{ accentColor: 'var(--color-accent)', width: '15px', height: '15px', marginTop: '2px', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '14px', color: settings.colorblindMode === opt.value ? 'var(--color-accent)' : 'var(--color-text)', marginBottom: '2px' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Text size */}
      <SectionLabel>Text Size</SectionLabel>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {textScaleOptions.map(opt => {
          const active = settings.textScale === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ textScale: opt.value })}
              style={{
                flex: 1, padding: '12px 0',
                background: active ? 'rgba(196,146,42,0.1)' : 'var(--color-surface-2)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: `${opt.value / 100 * 14}px`,
                color: active ? 'var(--color-accent)' : 'var(--color-text)',
                transition: 'border-color 0.15s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Reading & fonts */}
      <SectionLabel>Reading &amp; Fonts</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '28px' }}>
        <ToggleRow
          label="Dyslexia-friendly font"
          desc="Uses OpenDyslexic (if installed) with increased letter and word spacing."
          checked={settings.dyslexiaFont}
          onToggle={() => toggle('dyslexiaFont')}
        />
      </div>

      {/* Card display */}
      <SectionLabel>Card Display</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '28px' }}>
        {([
          { value: 'rotated', label: 'Rotate reversed cards (default)', desc: 'Reversed card art is rendered upside-down.' },
          { value: 'badge',   label: 'Badge only',                       desc: 'Reversed cards show a small ↓ Rev overlay instead.' },
        ] as { value: import('@/lib/accessibility-store').ReversedDisplay; label: string; desc: string }[]).map(opt => (
          <label
            key={opt.value}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '12px 16px', background: 'var(--color-surface-2)',
              border: `1px solid ${settings.reversedDisplay === opt.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
              transition: 'border-color 0.15s',
            }}
          >
            <input
              type="radio"
              name="reversed-display"
              value={opt.value}
              checked={settings.reversedDisplay === opt.value}
              onChange={() => update({ reversedDisplay: opt.value })}
              style={{ accentColor: 'var(--color-accent)', width: '15px', height: '15px', marginTop: '2px', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: '14px', color: settings.reversedDisplay === opt.value ? 'var(--color-accent)' : 'var(--color-text)', marginBottom: '2px' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
            </div>
          </label>
        ))}
        <ToggleRow
          label="Card captions &amp; screen reader announcements"
          desc="Shows card names overlaid on spread grid art and announces each draw to assistive technology."
          checked={settings.cardCaptions}
          onToggle={() => toggle('cardCaptions')}
        />
      </div>

      {/* Motion */}
      <SectionLabel>Motion</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '28px' }}>
        <ToggleRow
          label="Reduce motion"
          desc="Disables animations and transitions across the app."
          checked={settings.reducedMotion}
          onToggle={() => toggle('reducedMotion')}
        />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

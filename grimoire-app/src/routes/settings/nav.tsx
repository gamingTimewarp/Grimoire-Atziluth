import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { loadNavConfig, saveNavConfig, resetNavConfig, loadSidebarPinned, saveSidebarPinned } from '@/lib/nav-store'
import type { NavItemConfig } from '@/lib/nav-store'
import { PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/settings/nav')({
  component: NavSettingsPage,
})

const ITEM_LABELS: Record<string, string> = {
  '/':           'Home',
  '/read':       'Read',
  '/calendar':   'Calendar',
  '/astrology':  'Astrology',
  '/qabalah':    'Qabalah',
  '/study':      'Study',
  '/reference':  'Reference',
  '/journal':    'Journal',
  '/bookmarks':  'Bookmarks',
  '/custom':     'Custom Entities',
  '/settings':   'Settings',
}

// Items that cannot be hidden (always need access to navigate)
const ALWAYS_VISIBLE = new Set(['/', '/settings'])

function NavSettingsPage() {
  const [config, setConfig] = useState<NavItemConfig[]>(() => loadNavConfig())
  const [pinned, setPinned] = useState(() => loadSidebarPinned())

  const togglePinned = () => {
    const next = !pinned
    setPinned(next)
    saveSidebarPinned(next)
  }

  const persist = (next: NavItemConfig[]) => {
    setConfig(next)
    saveNavConfig(next)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...config]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    persist(next)
  }

  const moveDown = (index: number) => {
    if (index === config.length - 1) return
    const next = [...config]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    persist(next)
  }

  const toggleVisible = (index: number) => {
    const item = config[index]
    if (ALWAYS_VISIBLE.has(item.id)) return
    const next = config.map((c, i) => i === index ? { ...c, visible: !c.visible } : c)
    persist(next)
  }

  const handleReset = () => {
    setConfig(resetNavConfig())
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Navigation</h2>
        <button
          onClick={handleReset}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-subtle)', padding: '4px 0' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          <RotateCcw size={12} /> Reset to defaults
        </button>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Reorder and show/hide sidebar navigation items. Changes take effect immediately.
      </p>

      {/* Sidebar pin */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer', userSelect: 'none', padding: '12px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        <PanelLeftClose size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>Pin sidebar to icon-only on desktop</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Shows icons only regardless of window width. Gives more space to content.</div>
        </div>
        <input
          type="checkbox"
          checked={pinned}
          onChange={togglePinned}
          style={{ accentColor: 'var(--color-accent)', width: '15px', height: '15px', flexShrink: 0 }}
        />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {config.map((item, index) => {
          const label = ITEM_LABELS[item.id] ?? item.id
          const pinned = ALWAYS_VISIBLE.has(item.id)
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                background: item.visible ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                opacity: item.visible ? 1 : 0.5,
                transition: 'opacity 0.15s',
              }}
            >
              {/* Up/down */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  style={{ background: 'none', border: 'none', padding: '1px', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'var(--color-border)' : 'var(--color-text-subtle)', display: 'flex' }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === config.length - 1}
                  style={{ background: 'none', border: 'none', padding: '1px', cursor: index === config.length - 1 ? 'default' : 'pointer', color: index === config.length - 1 ? 'var(--color-border)' : 'var(--color-text-subtle)', display: 'flex' }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Label */}
              <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text)' }}>
                {label}
              </span>

              {/* Pinned badge */}
              {pinned && (
                <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', letterSpacing: '0.05em' }}>
                  always shown
                </span>
              )}

              {/* Visibility toggle */}
              {!pinned && (
                <button
                  onClick={() => toggleVisible(index)}
                  title={item.visible ? 'Hide from sidebar' : 'Show in sidebar'}
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', color: item.visible ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = item.visible ? 'var(--color-text)' : 'var(--color-accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = item.visible ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
                >
                  {item.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

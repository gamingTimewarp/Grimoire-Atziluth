import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw, ArrowLeft, Menu } from 'lucide-react'
import { loadNavConfig, saveNavConfig, resetNavConfig, loadSidebarPinned, saveSidebarPinned } from '@/lib/nav-store'
import type { NavItemConfig } from '@/lib/nav-store'
import { loadAccessibilitySettings, saveAccessibilitySettings, applyAccessibilitySettings } from '@/lib/accessibility-store'
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
  const navigate = useNavigate()
  const [config, setConfig] = useState<NavItemConfig[]>(() => loadNavConfig())
  const [pinned, setPinned] = useState(() => loadSidebarPinned())
  const [navSide, setNavSide] = useState(() => loadAccessibilitySettings().navSide ?? 'left')

  // Drag state
  const [dragging, setDragging]       = useState<number | null>(null)
  const [insertBefore, setInsertBefore] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const togglePinned = () => {
    const next = !pinned
    setPinned(next)
    saveSidebarPinned(next)
  }

  const toggleNavSide = () => {
    const next = navSide === 'left' ? 'right' : 'left'
    setNavSide(next)
    const a11y = loadAccessibilitySettings()
    saveAccessibilitySettings({ ...a11y, navSide: next })
    applyAccessibilitySettings({ ...a11y, navSide: next })
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

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onHandlePointerDown = (e: React.PointerEvent<HTMLElement>, index: number) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(index)
    setInsertBefore(index)
  }

  const onHandlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (dragging === null) return
    const y = e.clientY
    let insert = config.length
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i]
      if (!el) continue
      const { top, height } = el.getBoundingClientRect()
      if (y < top + height / 2) { insert = i; break }
    }
    setInsertBefore(insert)
  }

  const onHandlePointerUp = () => {
    if (dragging !== null && insertBefore !== null &&
        dragging !== insertBefore && dragging + 1 !== insertBefore) {
      const next = [...config]
      const [moved] = next.splice(dragging, 1)
      next.splice(insertBefore > dragging ? insertBefore - 1 : insertBefore, 0, moved)
      persist(next)
    }
    setDragging(null)
    setInsertBefore(null)
  }

  const dropLine = (
    <div style={{
      height: '2px', borderRadius: '1px',
      background: 'var(--color-accent)', margin: '1px 0',
    }} />
  )

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Navigation</h1>
        <button
          onClick={handleReset}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-subtle)', padding: '4px 0' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-subtle)' }}
        >
          <RotateCcw size={12} /> Reset to defaults
        </button>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        Drag to reorder, or show/hide sidebar items. Changes take effect immediately.
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

      {/* Mobile drawer side */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer', userSelect: 'none', padding: '12px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        <Menu size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>Mobile drawer on the right</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Moves the hamburger button and slide-out drawer to the right side of the screen.</div>
        </div>
        <input
          type="checkbox"
          checked={navSide === 'right'}
          onChange={toggleNavSide}
          style={{ accentColor: 'var(--color-accent)', width: '15px', height: '15px', flexShrink: 0 }}
        />
      </label>

      {/* Reorderable list */}
      <div style={{ display: 'flex', flexDirection: 'column', userSelect: dragging !== null ? 'none' : undefined }}>
        {config.map((item, index) => {
          const label = ITEM_LABELS[item.id] ?? item.id
          const alwaysOn = ALWAYS_VISIBLE.has(item.id)
          const isDragging = dragging === index
          return (
            <div key={item.id}>
              {dragging !== null && insertBefore === index && dropLine}
              <div
                ref={el => { rowRefs.current[index] = el }}
                onPointerDown={e => onHandlePointerDown(e, index)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', marginBottom: '4px',
                  background: item.visible ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  opacity: isDragging ? 0.35 : item.visible ? 1 : 0.5,
                  transition: dragging === null ? 'opacity 0.15s' : 'none',
                  cursor: dragging !== null ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
              >
                {/* Up/down buttons — stop propagation so they don't start a drag */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}
                  onPointerDown={e => e.stopPropagation()}
                >
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
                <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text)', pointerEvents: 'none' }}>
                  {label}
                </span>

                {/* Always-visible badge */}
                {alwaysOn && (
                  <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', letterSpacing: '0.05em', pointerEvents: 'none' }}>
                    always shown
                  </span>
                )}

                {/* Visibility toggle — stop propagation so it doesn't start a drag */}
                {!alwaysOn && (
                  <button
                    onClick={() => toggleVisible(index)}
                    onPointerDown={e => e.stopPropagation()}
                    title={item.visible ? 'Hide from sidebar' : 'Show in sidebar'}
                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', color: item.visible ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = item.visible ? 'var(--color-text)' : 'var(--color-accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = item.visible ? 'var(--color-accent)' : 'var(--color-text-subtle)' }}
                  >
                    {item.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {dragging !== null && insertBefore === config.length && dropLine}
      </div>
    </div>
  )
}

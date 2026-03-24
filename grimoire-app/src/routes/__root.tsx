import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useEngineStore } from '@/stores/engine'
import { initReadingDb } from '@/lib/reading-db'
import { initNatalDb } from '@/lib/natal-db'
import { initQuizDb } from '@/lib/quiz-db'
import { initCustomDb } from '@/lib/custom-db'
import { createDailyReadingIfAbsent } from '@/lib/daily-reading'
import { loadAndApplyTheme } from '@/lib/theme-store'
import { loadAccessibilitySettings, applyAccessibilitySettings } from '@/lib/accessibility-store'
import { migrateStoredCanonicalNames } from '@/lib/canonical-aliases'
import { loadSidebarPinned } from '@/lib/nav-store'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useFocusTrap } from '@/hooks/useFocusTrap'

/** Inject user custom CSS into <head>. Called on boot and when CSS changes. */
export function applyCustomCss(css: string) {
  let el = document.getElementById('grimoire-custom-css') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'grimoire-custom-css'
    document.head.appendChild(el)
  }
  el.textContent = css
}

function RootLayout() {
  const { status, error, initialize, engine } = useEngineStore()
  const breakpoint     = useBreakpoint()
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(() => loadSidebarPinned())
  const hamburgerRef   = useRef<HTMLButtonElement>(null)
  const drawerRef      = useRef<HTMLDivElement>(null)

  useFocusTrap(drawerRef)

  useEffect(() => {
    loadAndApplyTheme()
    applyAccessibilitySettings(loadAccessibilitySettings())
    migrateStoredCanonicalNames()
    initialize()
    initReadingDb().catch(console.error)
    initNatalDb().catch(console.error)
    initQuizDb().catch(console.error)
    initCustomDb().catch(console.error)

    // Apply compact window setting (removes Tauri's minWidth constraint if enabled)
    if (localStorage.getItem('grimoire:compact-window') === 'true') {
      getCurrentWindow().setMinSize(null).catch(() => {})
    }

    // Inject saved custom CSS
    const customCss = localStorage.getItem('grimoire:custom-css') ?? ''
    if (customCss.trim()) applyCustomCss(customCss)
  }, [initialize])

  // Re-read sidebar pin preference when it changes (e.g. from Settings)
  useEffect(() => {
    const handler = () => setSidebarPinned(loadSidebarPinned())
    window.addEventListener('grimoire:sidebar-pinned-changed', handler)
    return () => window.removeEventListener('grimoire:sidebar-pinned-changed', handler)
  }, [])

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        const win = getCurrentWindow()
        const fs = await win.isFullscreen()
        await win.setFullscreen(!fs)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close drawer on navigation to tablet/desktop (e.g. window resize)
  useEffect(() => {
    if (breakpoint !== 'mobile') setDrawerOpen(false)
  }, [breakpoint])

  // Focus management: move focus into drawer when it opens, return to hamburger when it closes
  useEffect(() => {
    if (drawerOpen) {
      const timer = setTimeout(() => {
        const first = drawerRef.current?.querySelector<HTMLElement>('button, a, input, [tabindex="0"]')
        first?.focus()
      }, 260)
      return () => clearTimeout(timer)
    } else {
      hamburgerRef.current?.focus()
    }
  }, [drawerOpen])

  useEffect(() => {
    if (status === 'ready' && engine) {
      createDailyReadingIfAbsent(engine).catch(console.error)
    }
  }, [status, engine])

  if (status === 'loading' || status === 'idle') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '32px', animation: 'spin 3s linear infinite' }}>⬡</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Loading grimoire data…</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ color: 'var(--color-danger)', fontSize: '16px' }}>Failed to load data</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', maxWidth: '400px', textAlign: 'center' }}>{error}</div>
      </div>
    )
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────────
  if (breakpoint === 'mobile') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>

        {/* Top bar */}
        <div style={{
          height: '48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--color-surface-1)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          zIndex: 10,
        }}>
          <div>
            <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 600 }}>Grimoire </span>
            <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 300, letterSpacing: '0.05em' }}>Atziluth</span>
          </div>
          <button
            ref={hamburgerRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px',
              borderRadius: '6px',
            }}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Backdrop */}
        <div
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(0,0,0,0.6)',
            opacity: drawerOpen ? 1 : 0,
            pointerEvents: drawerOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }}
        />

        {/* Drawer */}
        <div
          ref={drawerRef}
          id="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: '200px',
            zIndex: 999,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          }}
        >
          <Sidebar mode="drawer" onClose={() => setDrawerOpen(false)} />
        </div>

        {/* Content */}
        <main id="main-content" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <Outlet />
        </main>
      </div>
    )
  }

  // ── Tablet layout (icon sidebar) ──────────────────────────────────────────────
  if (breakpoint === 'tablet') {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Sidebar mode="icon" />
        <main id="main-content" style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '900px' }}>
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar mode={sidebarPinned ? 'icon' : 'full'} />
      <main id="main-content" style={{ flex: 1, overflow: 'auto', padding: '32px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })

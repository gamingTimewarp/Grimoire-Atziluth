import { Link, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Home, BookOpen, Search, BookMarked, CalendarDays, Star, Network, Library, Settings, Sparkles, Bookmark, X, HelpCircle } from 'lucide-react'
import { GlobalSearch } from './GlobalSearch'
import { loadNavConfig } from '@/lib/nav-store'
import { getLastViewedEntity } from '@/lib/recent-entities'
import { APP_VERSION } from '@/lib/app-version'

const ALL_NAV_ITEMS = [
  { to: '/',           icon: Home,         label: 'Home'      },
  { to: '/read',       icon: BookOpen,     label: 'Read'      },
  { to: '/calendar',   icon: CalendarDays, label: 'Calendar'  },
  { to: '/astrology',  icon: Star,         label: 'Astrology' },
  { to: '/qabalah',    icon: Network,      label: 'Qabalah'   },
  { to: '/study',      icon: Library,      label: 'Study'     },
  { to: '/reference',  icon: Search,       label: 'Reference' },
  { to: '/journal',    icon: BookMarked,   label: 'Journal'   },
  { to: '/bookmarks',  icon: Bookmark,     label: 'Bookmarks' },
  { to: '/custom',     icon: Sparkles,     label: 'Custom'    },
  { to: '/settings',   icon: Settings,     label: 'Settings'  },
] as const

type NavTo = (typeof ALL_NAV_ITEMS)[number]['to']
const NAV_MAP = new Map(ALL_NAV_ITEMS.map(item => [item.to as string, item]))

export type SidebarMode = 'full' | 'icon' | 'drawer'

interface SidebarProps {
  mode?: SidebarMode
  onClose?: () => void
}

export function Sidebar({ mode = 'full', onClose }: SidebarProps) {
  const [navConfig, setNavConfig] = useState(() => loadNavConfig())
  const pathname = useRouterState({ select: s => s.location.pathname })

  useEffect(() => {
    const handler = () => setNavConfig(loadNavConfig())
    window.addEventListener('grimoire:nav-config-changed', handler)
    return () => window.removeEventListener('grimoire:nav-config-changed', handler)
  }, [])

  const visibleItems = navConfig
    .filter(cfg => cfg.visible)
    .map(cfg => NAV_MAP.get(cfg.id))
    .filter((item): item is (typeof ALL_NAV_ITEMS)[number] => item !== undefined)

  // Reference has no natural "resume" URL of its own — a tab tap always goes to a
  // fixed `to`. Resolve it dynamically: jump back to the last entity you were
  // reading when arriving from elsewhere in the app, but land on the list itself
  // (the normal behavior) when you're already somewhere inside /reference — that
  // matches the in-page "← Reference" button and avoids ever trapping the list
  // behind an unreachable redirect.
  const lastEntity = pathname.startsWith('/reference') ? null : getLastViewedEntity()

  // ── Icon-only tablet sidebar ─────────────────────────────────────────────────
  if (mode === 'icon') {
    return (
      <nav
        aria-label="Primary navigation"
        style={{
          width: '52px',
          minHeight: '100vh',
          background: 'var(--color-surface-1)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0',
          flexShrink: 0,
          overflowX: 'hidden',
        }}
      >
        {/* Monogram — doubles as a Home shortcut */}
        <Link
          to="/"
          title="Home"
          style={{
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--color-border)',
            width: '100%',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '18px', color: 'var(--color-accent)', lineHeight: 1 }}>⬡</span>
        </Link>

        {/* Spotlight search */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <GlobalSearch spotlight />
        </div>

        {/* Nav icons */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0 4px', flex: 1, gap: '2px' }}>
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              {...(to === '/reference' && lastEntity
                ? { to: '/reference/$canonicalName' as const, params: { canonicalName: lastEntity.canonicalName } }
                : { to: to as NavTo })}
              title={label}
              style={{ textDecoration: 'none' }}
            >
              {({ isActive }) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    borderRadius: '6px',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    background: isActive ? 'var(--color-surface-3)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={18} />
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* User Manual quick link */}
        <div style={{ width: '100%', padding: '4px', flexShrink: 0 }}>
          <Link to="/settings/manual" title="User Manual" style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  borderRadius: '6px',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-surface-3)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <HelpCircle size={18} />
              </div>
            )}
          </Link>
        </div>
      </nav>
    )
  }

  // ── Full sidebar (desktop) or drawer (mobile) ─────────────────────────────────
  return (
    <nav
      aria-label="Primary navigation"
      style={{
        width: '200px',
        minHeight: '100vh',
        background: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}
    >
      {/* App name (doubles as a Home shortcut) + optional close button */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Link to="/" title="Home" style={{ textDecoration: 'none' }} onClick={mode === 'drawer' ? onClose : undefined}>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 600 }}>
            Grimoire
          </div>
          <div style={{ fontSize: '18px', color: 'var(--color-text)', fontWeight: 300, letterSpacing: '0.05em' }}>
            Atziluth
          </div>
        </Link>
        {mode === 'drawer' && onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              marginTop: '2px',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Global search */}
      <div style={{ paddingTop: '12px' }}>
        <GlobalSearch />
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px', flex: 1 }}>
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            {...(to === '/reference' && lastEntity
              ? { to: '/reference/$canonicalName' as const, params: { canonicalName: lastEntity.canonicalName } }
              : { to: to as NavTo })}
            style={{ textDecoration: 'none' }}
            onClick={mode === 'drawer' ? onClose : undefined}
          >
            {({ isActive }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  minHeight: '44px',
                  borderRadius: '6px',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-surface-3)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* User Manual quick link */}
      <div style={{ padding: '0 8px' }}>
        <Link
          to="/settings/manual"
          style={{ textDecoration: 'none' }}
          onClick={mode === 'drawer' ? onClose : undefined}
        >
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                minHeight: '44px',
                borderRadius: '6px',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <HelpCircle size={16} />
              <span>User Manual</span>
            </div>
          )}
        </Link>
      </div>

      {/* Version */}
      <div style={{ padding: '12px 20px', fontSize: '11px', color: 'var(--color-text-subtle)' }}>
        {APP_VERSION}
      </div>
    </nav>
  )
}

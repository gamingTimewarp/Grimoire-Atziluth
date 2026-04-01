import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TreeOfLife } from '@/components/ui/TreeOfLife'
import { Button } from '@/components/ui/Button'
import { Calculator, Hash } from 'lucide-react'
import { useState, useEffect } from 'react'
import { loadTraditionSettings } from '@/lib/tradition-store'

export const Route = createFileRoute('/qabalah/')({
  component: QabalahPage,
})

// SVG intrinsic aspect ratio: VW=500, VH=760
const TREE_ASPECT = 760 / 500

function computeTreeSize(): number {
  const isMobile = window.innerWidth < 600
  if (isMobile) {
    // Mobile: 48px top bar + 16px×2 main padding + ~80px page header
    const availH = window.innerHeight - 48 - 80 - 32
    const availW = window.innerWidth - 32 // 16px page padding each side
    const fromH = Math.floor(availH / TREE_ASPECT)
    return Math.min(Math.max(Math.min(fromH, availW), 220), 860)
  }
  // Desktop: no top bar, 64px vertical padding, ~60px page header
  const availH = window.innerHeight - 60 - 64
  return Math.min(Math.max(Math.floor(availH / TREE_ASPECT), 280), 860)
}

function QabalahPage() {
  const navigate  = useNavigate()
  const [mode, setMode] = useState<'sephiroth' | 'qliphoth'>('sephiroth')
  const [treeSize, setTreeSize] = useState(computeTreeSize)

  useEffect(() => {
    const onResize = () => setTreeSize(computeTreeSize())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Qabalah</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/qabalah/numerology' })}
          >
            <Hash size={13} /> Numerology
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/qabalah/gematria' })}
          >
            <Calculator size={13} /> Gematria
          </Button>
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={() => setMode('sephiroth')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                background: mode === 'sephiroth' ? 'var(--color-surface-3)' : 'transparent',
                color: mode === 'sephiroth' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: mode === 'sephiroth' ? 500 : 400,
                fontFamily: 'inherit',
              }}
            >
              Tree of Life
            </button>
            <button
              onClick={() => setMode('qliphoth')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                border: 'none',
                borderLeft: '1px solid var(--color-border)',
                cursor: 'pointer',
                background: mode === 'qliphoth' ? 'var(--color-surface-3)' : 'transparent',
                color: mode === 'qliphoth' ? 'var(--color-danger)' : 'var(--color-text-muted)',
                fontWeight: mode === 'qliphoth' ? 500 : 400,
                fontFamily: 'inherit',
              }}
            >
              Nightside Tree
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TreeOfLife
          mode={mode}
          onNavigate={cn => navigate({ to: '/reference/$canonicalName', params: { canonicalName: cn } })}
          size={treeSize}
          showDaath={loadTraditionSettings().showDaath}
        />
      </div>
    </div>
  )
}

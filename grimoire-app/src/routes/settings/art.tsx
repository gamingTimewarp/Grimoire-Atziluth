import React, { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  loadArtSettings, saveArtSettings, ART_GROUPS,
} from '@/lib/art-store'
import type { ArtSettings, ArtPackId, ArtGroup, ArtGroupConfig } from '@/lib/art-store'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, HelpCircle, FolderOpen, X } from 'lucide-react'
import { openPath } from '@tauri-apps/plugin-opener'
import { resourceDir, join } from '@tauri-apps/api/path'

export const Route = createFileRoute('/settings/art')({
  component: ArtPacksPage,
})

function ArtPacksPage() {
  const navigate    = useNavigate()
  const [artSettings, setArtSettings] = useState<ArtSettings>(() => loadArtSettings())
  const [saved, setSaved]             = useState(false)
  const [guideOpen, setGuideOpen]     = useState(false)

  const openArtDirectory = async () => {
    try {
      const resDir = await resourceDir()
      const artDir = await join(resDir, 'art')
      await openPath(artDir)
    } catch {
      // In dev mode resourceDir may not resolve to the expected path;
      // fall back to just showing the guide.
    }
    setGuideOpen(true)
  }

  const setArtPack = (groupId: ArtGroup, pack: ArtPackId) => {
    const next: ArtSettings = {
      packByGroup: { ...artSettings.packByGroup, [groupId]: pack },
    }
    setArtSettings(next)
    saveArtSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Art Packs</h1>
        {saved && (
          <span style={{ fontSize: '12px', color: 'var(--color-accent)', marginLeft: 'auto' }}>Saved</span>
        )}
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
        Choose a visual style for each entity group. Symbolic uses programmatic rendering
        (Unicode glyphs and geometric SVG) and works offline without additional files.
        Image packs use bundled or imported art assets, falling back to Symbolic when a
        file is absent.
      </p>

      {/* Import / Add packs button */}
      <div style={{ marginBottom: '28px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button variant="ghost" size="sm" onClick={openArtDirectory}>
          <FolderOpen size={13} />
          Import Art Pack…
        </Button>
        <button
          onClick={() => setGuideOpen(o => !o)}
          title="How to import art packs"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            color: guideOpen ? 'var(--color-accent)' : 'var(--color-text-subtle)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <HelpCircle size={15} />
        </button>
      </div>

      {/* Import guide panel */}
      {guideOpen && (
        <ImportGuide onClose={() => setGuideOpen(false)} />
      )}

      {/* Pack groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {ART_GROUPS.map(group => (
          <GroupSection
            key={group.id}
            group={group}
            current={artSettings.packByGroup[group.id] ?? 'symbolic'}
            onSelect={pack => setArtPack(group.id, pack)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Group section ────────────────────────────────────────────────────────────

function GroupSection({
  group,
  current,
  onSelect,
}: {
  group: ArtGroupConfig
  current: ArtPackId
  onSelect: (id: ArtPackId) => void
}) {
  return (
    <div>
      <div style={{
        fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px',
      }}>
        {group.label}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '12px' }}>
        {group.description}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${group.packs.length}, 1fr)`,
        gap: '10px',
      }}>
        {group.packs.map(pack => (
          <ArtPackCard
            key={pack.id}
            label={pack.label}
            description={pack.description}
            previewUrl={pack.previewUrl}
            isSymbolic={pack.isSymbolic}
            groupId={group.id}
            available={pack.available}
            selected={current === pack.id}
            onClick={() => pack.available && onSelect(pack.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Art pack card ────────────────────────────────────────────────────────────

function ArtPackCard({
  label, description, previewUrl, isSymbolic, groupId, available, selected, onClick,
}: {
  label: string
  description: string
  previewUrl?: string
  isSymbolic: boolean
  groupId: ArtGroup
  available: boolean
  selected: boolean
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showSymbolicPreview = isSymbolic || imgFailed || !previewUrl

  return (
    <button
      onClick={onClick}
      disabled={!available}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        background: selected ? 'rgba(180,156,90,0.08)' : 'var(--color-surface-2)',
        border: `1px solid ${selected ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        cursor: available ? 'pointer' : 'not-allowed',
        fontFamily: 'inherit',
        textAlign: 'left',
        opacity: available ? 1 : 0.45,
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        if (!selected && available) {
          e.currentTarget.style.borderColor = 'var(--color-accent-muted)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--color-border)'
        }
      }}
    >
      {/* Preview strip */}
      <div style={{
        height: '72px',
        background: selected ? 'rgba(180,156,90,0.05)' : 'var(--color-surface-3)',
        borderBottom: `1px solid ${selected ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {showSymbolicPreview ? (
          <SymbolicPreview groupId={groupId} />
        ) : (
          <img
            src={previewUrl}
            alt={label}
            onError={() => setImgFailed(true)}
            style={{ maxHeight: '68px', maxWidth: '90%', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Label + description */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          fontSize: '12px', fontWeight: 500, marginBottom: '3px',
          color: selected ? 'var(--color-accent)' : 'var(--color-text)',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          {selected && (
            <span style={{
              display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--color-accent)', flexShrink: 0,
            }} />
          )}
          {label}
          {!available && (
            <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: 400 }}>(pending)</span>
          )}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)', lineHeight: '1.4' }}>
          {description}
        </div>
      </div>
    </button>
  )
}

// ─── Symbolic preview thumbnails ──────────────────────────────────────────────

function SymbolicPreview({ groupId }: { groupId: ArtGroup }) {
  switch (groupId) {
    case 'tarot':         return <TarotSymbolicPreview />
    case 'runes':         return <RuneSymbolicPreview />
    case 'geomancy':      return <GeomancySymbolicPreview />
    case 'mahjong':       return <MahjongSymbolicPreview />
    case 'lenormand':     return <LenormandSymbolicPreview />
    case 'playing-cards': return <PlayingCardSymbolicPreview />
  }
}

const previewCard: React.CSSProperties = {
  width: '44px', height: '64px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'space-between',
  padding: '5px 4px',
  overflow: 'hidden',
}

function TarotSymbolicPreview() {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {/* Major arcana card */}
      <div style={previewCard}>
        <span style={{ fontSize: '8px', color: 'var(--color-accent)', opacity: 0.8, alignSelf: 'flex-start', lineHeight: 1 }}>IV</span>
        <span style={{ fontSize: '18px', opacity: 0.2, lineHeight: 1 }}>✦</span>
        <span style={{ fontSize: '6px', color: 'var(--color-text-muted)', lineHeight: 1.2, textAlign: 'center' }}>The Emperor</span>
      </div>
      {/* Minor arcana card */}
      <div style={previewCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', lineHeight: 1 }}>
          <span style={{ fontSize: '8px', color: '#c06030' }}>♣</span>
          <span style={{ fontSize: '7px', color: 'var(--color-text-muted)' }}>7</span>
        </div>
        <span style={{ fontSize: '18px', color: '#c06030', opacity: 0.3, lineHeight: 1 }}>♣</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', lineHeight: 1, transform: 'rotate(180deg)' }}>
          <span style={{ fontSize: '8px', color: '#c06030' }}>♣</span>
          <span style={{ fontSize: '7px', color: 'var(--color-text-muted)' }}>7</span>
        </div>
      </div>
    </div>
  )
}

function RuneSymbolicPreview() {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {['ᚠ', 'ᚢ', 'ᚦ'].map(g => (
        <div key={g} style={previewCard}>
          <span style={{ fontSize: '22px', lineHeight: 1, color: 'var(--color-text)' }}>{g}</span>
        </div>
      ))}
    </div>
  )
}

function GeomancySymbolicPreview() {
  // Show three figures side by side: Via [1,1,1,1], Acquisitio [0,0,1,0], Carcer [1,0,1,0]
  const figures: [number, number, number, number][] = [
    [1, 1, 1, 1],
    [0, 0, 1, 0],
    [1, 0, 1, 0],
  ]
  const dotR = 2.5, gap = 7, rowH = 10
  const svgW = 28, svgH = 46
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      {figures.map((pattern, fi) => (
        <svg key={fi} width={svgW} height={svgH}>
          {pattern.map((active, i) => {
            const cy = 6 + i * rowH
            const cx = svgW / 2
            if (active === 1) {
              return <circle key={i} cx={cx} cy={cy} r={dotR} fill="var(--color-text)" />
            }
            return (
              <g key={i}>
                <circle cx={cx - gap / 2} cy={cy} r={dotR} fill="var(--color-text)" />
                <circle cx={cx + gap / 2} cy={cy} r={dotR} fill="var(--color-text)" />
              </g>
            )
          })}
        </svg>
      ))}
    </div>
  )
}

function MahjongSymbolicPreview() {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {['🀇', '🀙', '🀐'].map(g => (
        <div key={g} style={previewCard}>
          <span style={{ fontSize: '22px', lineHeight: 1 }}>{g}</span>
        </div>
      ))}
    </div>
  )
}

function LenormandSymbolicPreview() {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {[{ n: '1', name: 'The Rider' }, { n: '7', name: 'The Snake' }].map(c => (
        <div key={c.n} style={{ ...previewCard, justifyContent: 'space-between' }}>
          <span style={{ fontSize: '8px', color: 'var(--color-accent)', opacity: 0.7, alignSelf: 'flex-start', lineHeight: 1 }}>{c.n}</span>
          <span style={{ fontSize: '14px', opacity: 0.15, lineHeight: 1 }}>✦</span>
          <span style={{ fontSize: '5.5px', color: 'var(--color-text-muted)', lineHeight: 1.2, textAlign: 'center' }}>{c.name}</span>
        </div>
      ))}
    </div>
  )
}

function PlayingCardSymbolicPreview() {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {[
        { rank: 'A', suit: '♥', color: '#c0404a' },
        { rank: 'K', suit: '♠', color: '#1a1a2e' },
      ].map(c => (
        <div key={c.suit} style={{ ...previewCard, background: '#fff', border: '1px solid #ddd', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, color: c.color, alignSelf: 'flex-start' }}>
            <span style={{ fontSize: '7px', fontWeight: 700 }}>{c.rank}</span>
            <span style={{ fontSize: '6px' }}>{c.suit}</span>
          </div>
          <span style={{ fontSize: '18px', color: c.color, opacity: 0.5, lineHeight: 1 }}>{c.suit}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1, color: c.color, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
            <span style={{ fontSize: '7px', fontWeight: 700 }}>{c.rank}</span>
            <span style={{ fontSize: '6px' }}>{c.suit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Import guide ─────────────────────────────────────────────────────────────

function ImportGuide({ onClose }: { onClose: () => void }) {
  const FILE_CONVENTIONS: { group: ArtGroup; ext: string; example: string }[] = [
    { group: 'tarot',         ext: 'jpg / svg', example: 'tarot-major-rws-the-fool.jpg' },
    { group: 'runes',         ext: 'svg',       example: 'rune-elder-futhark-fehu.svg' },
    { group: 'geomancy',      ext: 'svg',       example: 'geomancy-figure-via.svg' },
    { group: 'mahjong',       ext: 'svg',       example: 'divination-mahjong-tile-bamboo-1.svg' },
    { group: 'lenormand',     ext: 'svg',       example: 'playing-card-hearts-9.svg' },
    { group: 'playing-cards', ext: 'svg',       example: 'playing-card-spades-ace.svg' },
  ]

  return (
    <div style={{
      marginBottom: '28px', padding: '18px 20px',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-accent-muted)',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
          How to Import Art Packs
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', padding: '2px' }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
        Each art pack lives in its own subdirectory under <code style={codeStyle}>public/art/</code>,
        so multiple packs for the same group can coexist without filename conflicts.
        The path structure is <code style={codeStyle}>art/<em>group</em>/<em>pack-id</em>/<em>filename</em></code>.
        The app falls back to Symbolic rendering for any file that is absent.
      </div>

      {/* Directory structure example */}
      <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--color-surface-3)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--color-text-subtle)', lineHeight: '1.7' }}>
        art/<br/>
        {'  '}tarot/<br/>
        {'    '}<span style={{ color: 'var(--color-accent)' }}>classic</span>/tarot-major-rws-the-fool.jpg<br/>
        {'    '}<span style={{ color: 'var(--color-accent)' }}>my-new-pack</span>/tarot-major-rws-the-fool.jpg<br/>
        {'  '}runes/<br/>
        {'    '}<span style={{ color: 'var(--color-accent)' }}>classic</span>/rune-elder-futhark-fehu.svg<br/>
        {'  '}playing-cards/<br/>
        {'    '}<span style={{ color: 'var(--color-accent)' }}>classic</span>/playing-card-hearts-ace.svg
      </div>

      {/* Naming convention table */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
          Filename convention per group
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {FILE_CONVENTIONS.map(row => (
            <div key={row.group} style={{
              display: 'grid', gridTemplateColumns: '140px 1fr',
              gap: '8px', fontSize: '11px', alignItems: 'center',
              padding: '6px 10px',
              background: 'var(--color-surface-3)',
              borderRadius: '4px',
            }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                {ART_GROUPS.find(g => g.id === row.group)?.label ?? row.group}
              </span>
              <span style={{ color: 'var(--color-text-subtle)', fontFamily: 'monospace', fontSize: '10px' }}>
                <span style={{ color: 'var(--color-accent)' }}>{row.example}</span>
                <span style={{ opacity: 0.6 }}> ({row.ext})</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        Adding a new pack
      </div>
      <ol style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.7', paddingLeft: '18px', margin: 0 }}>
        <li>Obtain image files with a compatible open licence (Public Domain, CC0, or CC-BY).</li>
        <li>Choose a short pack id (e.g. <code style={codeStyle}>my-pack</code>). This becomes the subdirectory name.</li>
        <li>Rename each file using the entity canonical name with dots replaced by hyphens, and place them in <code style={codeStyle}>art/<em>group</em>/<em>pack-id</em>/</code>.</li>
        <li>Register the pack in <code style={codeStyle}>src/lib/art-store.ts</code> by adding an entry to the relevant group's <code style={codeStyle}>packs</code> array.</li>
      </ol>

      <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--color-text-subtle)', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
        Tip: canonical names are shown on every Reference page in monospace below the title.
        E.g. <code style={codeStyle}>tarot.major.rws.the-fool</code> → file <code style={codeStyle}>tarot-major-rws-the-fool.jpg</code>.
      </div>
    </div>
  )
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.95em',
  background: 'var(--color-surface-3)',
  padding: '1px 5px',
  borderRadius: '3px',
  color: 'var(--color-text)',
}

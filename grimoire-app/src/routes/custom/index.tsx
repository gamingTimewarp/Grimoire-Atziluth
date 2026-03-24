import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useEngineStore } from '@/stores/engine'
import type { BaseEntity } from '@grimoire/core'
import { Button } from '@/components/ui/Button'
import { Plus, Pencil, LayoutList, BookOpen, GitBranch } from 'lucide-react'
import { formatEntityType } from '@/lib/format'
import { getAllCustomSpreads, getAllCustomDecks, getAllCustomTraditions, type CustomSpreadRecord, type CustomDeckRecord, type CustomTraditionRecord } from '@/lib/custom-db'

export const Route = createFileRoute('/custom/')({
  component: CustomEntitiesPage,
})

function CustomEntitiesPage() {
  const { engine } = useEngineStore()
  const navigate   = useNavigate()
  const [entities, setEntities] = useState<BaseEntity[]>([])
  const [spreads,    setSpreads]    = useState<CustomSpreadRecord[]>([])
  const [decks,      setDecks]      = useState<CustomDeckRecord[]>([])
  const [traditions, setTraditions] = useState<CustomTraditionRecord[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!engine) return
    Promise.all([
      engine.adapter.listEntities({ isBuiltIn: false }, { offset: 0, limit: 500 }),
      getAllCustomSpreads(),
      getAllCustomDecks(),
      getAllCustomTraditions(),
    ]).then(([r, s, d, tr]) => {
      setEntities(r.items)
      setSpreads(s)
      setDecks(d)
      setTraditions(tr)
    }).finally(() => setLoading(false))
  }, [engine])

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Custom</h1>
        <Button onClick={() => navigate({ to: '/custom/new' })}>
          <Plus size={14} /> New Entity
        </Button>
      </div>

      {/* Custom traditions section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={14} /> Traditions
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/custom/traditions' })}>
            <Plus size={12} /> Manage traditions
          </Button>
        </div>
        {loading ? null : traditions.length === 0 ? (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No custom traditions yet.{' '}
            <button onClick={() => navigate({ to: '/custom/traditions' })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
              Create one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {traditions.map(t => (
              <div
                key={t.id}
                onClick={() => navigate({ to: '/custom/traditions' })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{t.displayName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '10px' }}>
                    {t.relTypes.length} rel type{t.relTypes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Pencil size={12} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom decks section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={14} /> Decks
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/decks' })}>
            <Plus size={12} /> Manage decks
          </Button>
        </div>
        {loading ? null : decks.length === 0 ? (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No custom decks yet.{' '}
            <button onClick={() => navigate({ to: '/read/decks' })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
              Create one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {decks.map(d => (
              <div
                key={d.id}
                onClick={() => navigate({ to: '/read/decks' })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{d.displayName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '10px' }}>
                    {d.cardCanonicalNames.length} cards{d.reversalEnabled ? ' · Reversals' : ''}
                  </span>
                </div>
                <Pencil size={12} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom spreads section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutList size={14} /> Spreads
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/read/spreads' })}>
            <Plus size={12} /> Manage spreads
          </Button>
        </div>
        {loading ? null : spreads.length === 0 ? (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-subtle)' }}>
            No custom spreads yet.{' '}
            <button onClick={() => navigate({ to: '/read/spreads' })} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', padding: 0 }}>
              Create one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {spreads.map(s => (
              <div
                key={s.id}
                onClick={() => navigate({ to: '/read/spreads' })}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{s.displayName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginLeft: '10px' }}>
                    {s.positions.length === 0 ? 'Free form' : `${s.positions.length} positions`}
                  </span>
                </div>
                <Pencil size={12} style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0 }}>Entities</h2>
      </div>

      {loading && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Loading…</div>
      )}

      {!loading && entities.length === 0 && (
        <div style={{ padding: '32px 24px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            No custom entities yet.
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Create your own entities — deities, herbs, crystals, oracle cards, or anything else you want to study or reference. They'll appear in search, reference, and study sessions.
          </div>
          <Button onClick={() => navigate({ to: '/custom/new' })}>
            <Plus size={14} /> Create First Entity
          </Button>
        </div>
      )}

      {entities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entities.map(e => (
            <EntityRow
              key={e.id}
              entity={e}
              onClick={() => navigate({ to: '/custom/$cn', params: { cn: e.canonicalName } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EntityRow({ entity, onClick }: { entity: BaseEntity; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', background: 'var(--color-surface-2)',
        borderRadius: '6px', border: '1px solid var(--color-border)',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent-muted)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
            {entity.primaryDisplayName}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', flexShrink: 0 }}>
            {formatEntityType(entity.entityType)}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
          {entity.canonicalName}
        </div>
        {entity.description && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {entity.description.slice(0, 120)}{entity.description.length > 120 ? '…' : ''}
          </div>
        )}
      </div>
      <Pencil size={14} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
    </div>
  )
}

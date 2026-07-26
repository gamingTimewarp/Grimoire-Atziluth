import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  LENORMAND_COMBINATIONS,
  LENORMAND_CARD_NAMES,
  type LenormandCombination,
} from '@/lib/lenormand-combinations'

export const Route = createFileRoute('/reference/lenormand-combinations')({
  component: LenormandCombinationsPage,
})

function LenormandCombinationsPage() {
  const [filterCardNum, setFilterCardNum] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo<LenormandCombination[]>(() => {
    let list = LENORMAND_COMBINATIONS
    if (filterCardNum !== null) {
      list = list.filter(c => c.a === filterCardNum || c.b === filterCardNum)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c =>
        LENORMAND_CARD_NAMES[c.a].toLowerCase().includes(q) ||
        LENORMAND_CARD_NAMES[c.b].toLowerCase().includes(q) ||
        c.meaning.toLowerCase().includes(q),
      )
    }
    return list
  }, [filterCardNum, search])

  return (
    <div style={{ maxWidth: '760px' }}>
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} style={{ marginBottom: '12px' }}>
        <ArrowLeft size={14} /> Back
      </Button>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', marginBottom: '4px' }}>
        Reference
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: 300, marginBottom: '6px' }}>
        Lenormand Combination Guide
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', marginTop: 0 }}>
        {LENORMAND_COMBINATIONS.length} pairings. Select a card to filter, or search by name or meaning.
      </p>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <select
          value={filterCardNum ?? ''}
          onChange={e => setFilterCardNum(e.target.value ? parseInt(e.target.value) : null)}
          style={{
            padding: '8px 10px', background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)', borderRadius: '6px',
            color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <option value="">All cards</option>
          {LENORMAND_CARD_NAMES.slice(1).map((name, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}. {name}</option>
          ))}
        </select>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cards or meanings…"
          style={{
            flex: 1, minWidth: '180px', padding: '8px 10px',
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: '6px', color: 'var(--color-text)', fontSize: '13px', outline: 'none',
          }}
        />

        {(filterCardNum !== null || search) && (
          <button
            onClick={() => { setFilterCardNum(null); setSearch('') }}
            style={{
              background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px',
              color: 'var(--color-text-subtle)', fontSize: '12px', cursor: 'pointer',
              padding: '8px 10px', fontFamily: 'inherit',
            }}
          >
            Clear
          </button>
        )}

        <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Combination list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.map((combo, idx) => (
          <CombinationRow key={idx} combo={combo} highlightCardNum={filterCardNum} />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No combinations match your filters.
          </div>
        )}
      </div>
    </div>
  )
}

function CombinationRow({
  combo,
  highlightCardNum,
}: {
  combo: LenormandCombination
  highlightCardNum: number | null
}) {
  const nameA = LENORMAND_CARD_NAMES[combo.a]
  const nameB = LENORMAND_CARD_NAMES[combo.b]
  const highlightA = highlightCardNum === combo.a
  const highlightB = highlightCardNum === combo.b

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 140px 1fr',
      gap: '12px',
      padding: '10px 14px',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      alignItems: 'center',
      fontSize: '13px',
    }}>
      <span style={{ fontWeight: highlightA ? 600 : 500, color: highlightA ? 'var(--color-accent)' : 'var(--color-text)' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginRight: '4px' }}>{combo.a}.</span>
        {nameA}
      </span>
      <span style={{ fontWeight: highlightB ? 600 : 500, color: highlightB ? 'var(--color-accent)' : 'var(--color-text)' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginRight: '4px' }}>{combo.b}.</span>
        {nameB}
      </span>
      <span style={{ color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
        {combo.meaning}
      </span>
    </div>
  )
}

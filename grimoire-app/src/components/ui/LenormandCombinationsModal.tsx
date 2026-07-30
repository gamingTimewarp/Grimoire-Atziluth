import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { LenormandCombinationsGuide } from '@/components/ui/LenormandCombinationsGuide'

interface LenormandCombinationsModalProps {
  onClose: () => void
  initialCardFilter?: number | null
}

export function LenormandCombinationsModal({ onClose, initialCardFilter = null }: LenormandCombinationsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)

  // Focus the dialog on mount so keyboard users are inside it
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Lenormand Combination Guide"
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          boxShadow: '0 8px 48px rgba(0, 0, 0, 0.6)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Lenormand Combination Guide</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: '6px', padding: '6px', cursor: 'pointer',
              color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <LenormandCombinationsGuide initialCardFilter={initialCardFilter} />
        </div>
      </div>
    </div>
  )
}

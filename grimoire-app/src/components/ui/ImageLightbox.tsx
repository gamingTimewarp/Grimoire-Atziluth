import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
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
      aria-label={alt}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Close button — keeps focus inside the trap */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px', padding: '6px', cursor: 'pointer',
          color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center',
        }}
      >
        <X size={16} />
      </button>
      <img
        src={src}
        alt={alt}
        style={{
          maxHeight: '85vh',
          maxWidth: '85vw',
          objectFit: 'contain',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 48px rgba(0, 0, 0, 0.6)',
          cursor: 'zoom-out',
        }}
        onClick={onClose}
      />
    </div>
  )
}

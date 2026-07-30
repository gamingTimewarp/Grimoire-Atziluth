import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LenormandCombinationsGuide } from '@/components/ui/LenormandCombinationsGuide'

export const Route = createFileRoute('/reference/lenormand-combinations')({
  component: LenormandCombinationsPage,
})

function LenormandCombinationsPage() {
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
      <LenormandCombinationsGuide />
    </div>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { openUrl } from '@tauri-apps/plugin-opener'

export const Route = createFileRoute('/settings/privacy')({
  component: PrivacyPage,
})

const POLICY_URL = 'https://tomaranai.pro/grimoire-atziluth-privacy.html'
const EFFECTIVE_DATE = '24 March 2026'

function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Privacy Policy</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
          Effective: {EFFECTIVE_DATE}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openUrl(POLICY_URL).catch(() => {})}
        >
          <ExternalLink size={12} /> View online
        </Button>
      </div>

      <P>
        Grimoire Atziluth is developed independently by gamingTimewarp.
        This policy describes what data the app handles and how.
      </P>

      <Callout>
        Grimoire Atziluth is a fully offline app. It stores your data locally on your
        device and never transmits anything to any server. There are no analytics, no
        telemetry, and no outbound network connections made by the app.
      </Callout>

      <Section label="Data stored on your device">
        <P>The following is saved to a local SQLite database on your device:</P>
        <ul style={{ paddingLeft: '20px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            'Divination readings — cards drawn, spread used, notes, timestamps, and the astrological sky snapshot at the time of the reading',
            'Daily readings',
            'Journal entries',
            'Natal chart profiles — name, birth date, time, and location as you enter them',
            'Custom entities, traditions, and decks you create',
            'Spaced-repetition (SRS) learning progress',
            'App preferences — theme, accessibility settings, tradition choices — stored in the device\'s local browser storage',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{item}</li>
          ))}
        </ul>
        <P>
          None of this data leaves your device unless you explicitly use the built-in export
          feature to create a backup file.
        </P>
      </Section>

      <Section label="What is not collected">
        <ul style={{ paddingLeft: '20px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            'No personal information',
            'No usage analytics or behavioural tracking',
            'No crash reports or error logs sent to any external service',
            'No advertising identifiers',
            'No location data beyond what you voluntarily enter into a natal chart profile',
            'No contact details of any kind',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section label="Third-party services">
        <P>
          The app makes no outbound network connections at runtime. All astronomical
          calculations are performed locally using a bundled offline ephemeris.
          All reference data is included with the app at install time. No internet
          connection is required for any feature.
        </P>
      </Section>

      <Section label="Your control over your data">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <DataControl
            label="Export"
            desc="Settings → Data → Export to save a portable backup of your readings and journal."
          />
          <DataControl
            label="Delete individual items"
            desc="Readings and journal entries can be deleted within the app."
          />
          <DataControl
            label="Delete everything"
            desc="Uninstalling the app removes all locally stored data from your device."
          />
        </div>
      </Section>

      <Section label="Children">
        <P>
          Grimoire Atziluth is not directed at children under 13. The app does not
          collect data from any user, including children.
        </P>
      </Section>

      <Section label="Changes to this policy">
        <P>
          If this policy is updated, the revised version will be published at the URL
          below and the effective date will be changed. Material changes will also be
          noted in the app's release notes.
        </P>
      </Section>

      <Section label="Contact">
        <P>Questions about this policy? Email <Mono>bumpywright03@gmail.com</Mono>.</P>
      </Section>

      <div style={{
        fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '24px',
        paddingTop: '16px', borderTop: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
        flexWrap: 'wrap',
      }}>
        <span>Canonical URL: <Mono>{POLICY_URL}</Mono></span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openUrl(POLICY_URL).catch(() => {})}
        >
          <ExternalLink size={12} /> Open in browser
        </Button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: '10px',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
      {children}
    </p>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--color-surface-2)',
      borderRadius: '6px',
      border: '1px solid var(--color-accent-muted)',
      fontSize: '13px',
      color: 'var(--color-text)',
      marginBottom: '28px',
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text)' }}>
      {children}
    </span>
  )
}

function DataControl({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--color-surface-2)',
      borderRadius: '6px',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{desc}</div>
    </div>
  )
}

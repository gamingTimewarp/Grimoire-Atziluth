import React, { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { APP_VERSION } from '@/lib/app-version'
import { unlockSecretTheme } from '@/lib/secret-themes'

const HINT_AT_CLICK = 7
const UNLOCK_AT_CLICK = 22

export const Route = createFileRoute('/settings/credits')({
  component: CreditsPage,
})

function CreditsPage() {
  const navigate = useNavigate()
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [versionClicks, setVersionClicks] = useState(0)
  const [hintToast, setHintToast] = useState(false)
  const [unlockToast, setUnlockToast] = useState(false)

  // Not tied to anything visible on the version string itself — resets if
  // you navigate away or reload, same as most "find it in one sitting" clicks.
  const handleVersionClick = () => {
    const next = versionClicks + 1
    setVersionClicks(next)
    if (next === HINT_AT_CLICK) {
      setHintToast(true)
      setTimeout(() => setHintToast(false), 2000)
    }
    if (next === UNLOCK_AT_CLICK) {
      unlockSecretTheme('ain')
      setUnlockToast(true)
      setTimeout(() => setUnlockToast(false), 3000)
    }
  }

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    setHighlightId(hash)
    const el = document.getElementById(hash)
    const scroller = document.getElementById('main-content')
    if (el && scroller) {
      const elTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
      scroller.scrollTo({ top: elTop - scroller.clientHeight / 2 + el.offsetHeight / 2, behavior: 'smooth' })
    }
    const timer = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Credits &amp; Licences</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
          Grimoire Atziluth uses artwork and data from the following open-licensed sources.
        </p>
        <button
          onClick={handleVersionClick}
          style={{
            fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', whiteSpace: 'nowrap', marginLeft: '16px',
            background: 'none', border: 'none', padding: 0, cursor: 'default',
          }}
        >
          {APP_VERSION}
        </button>
      </div>

      {/* Thanks */}
      <Section label="Thanks">
        <PersonEntry
          name="Kazmer"
          role="Windows Tester"
          note="Helped with Windows testing — the author avoids that foul OS like the plague, but Kaz is a much stronger and braver soul."
        />
      </Section>

      {/* Art Pack Sources */}
      <Section label="Art Packs">

        <SourceEntry
          title="Rider-Waite-Smith Tarot (1909)"
          licence="Public Domain"
          author="Pamela Colman Smith (artist), Arthur Edward Waite (author)"
          source="searge/tarot on GitHub"
          sourceUrl="https://github.com/searge/tarot"
          notes="Original deck first published 1909 by Rider &amp; Company. Copyright has expired in all jurisdictions."
        />

        <SourceEntry
          title="Tarot de Marseille — Jean Dodal (1701)"
          licence="Public Domain"
          author="Jean Dodal (Lyon, 1701)"
          source="Wikimedia Commons — Category:Jean Dodal Tarot"
          sourceUrl="https://commons.wikimedia.org/wiki/Category:Jean_Dodal_Tarot"
          notes="One of the earliest surviving examples of the standard Tarot de Marseille pattern. Digitised from a museum copy."
        />

        <SourceEntry
          title="Grand Etteilla ou Tarots Égyptiens (c. 1838)"
          licence="Etalab Open Licence 2.0"
          author="Lismon edition, c. 1838"
          source="Bibliothèque nationale de France (BnF) / Gallica"
          sourceUrl="https://gallica.bnf.fr/ark:/12148/btv1b10540366b"
          notes={
            <>
              Reproduced from the collections of the BnF under the{' '}
              <a
                href="https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-accent)' }}
              >
                Etalab Open Licence 2.0
              </a>
              . Attribution to the BnF is required by this licence.
            </>
          }
          required
        />

        <SourceEntry
          id="thoth-licence"
          highlighted={highlightId === 'thoth-licence'}
          title="Thoth Tarot — Generated Art (all 78 cards)"
          licence="Original work (CC0 / public domain dedication)"
          notes={
            <>
              All 78 Thoth card images in this app are unique SVG artworks generated specifically
              for Grimoire Atziluth. They were created through a manually directed generation
              process designed to accurately reflect the symbolism of the Thoth deck as defined
              by Aleister Crowley in <em>The Book of Thoth</em> — including Golden Dawn colour
              scales, Hebrew letter and astrological attributions, decanate assignments, and
              the key symbolic motifs of each card.
              <br/><br/>
              These generated images exist because Lady Frieda Harris's original paintings
              (1938–1942) remain under O.T.O. copyright, and no open-licensed alternative
              rendition of the Thoth deck exists. The generated art makes no claim to reproduce
              Harris's specific compositions, figures, or visual style.
              <br/><br/>
              Users are free to replace these images with their own personal scans of Harris's
              art by placing appropriately named files in the app's art directory. The generated
              images themselves are released as original works with no restrictions on use.
            </>
          }
        />

        <SourceEntry
          title="Geomantic Figure SVGs"
          licence="Public Domain"
          author="Various Wikimedia contributors"
          source="Wikimedia Commons"
          sourceUrl="https://commons.wikimedia.org"
          notes="16 SVG symbols representing the geomantic figures. All original sources pre-date copyright."
        />

        <SourceEntry
          title="Riichi Mahjong Tiles"
          licence="CC0 1.0 Universal (Public Domain Dedication)"
          author="FluffyStuff"
          source="FluffyStuff/riichi-mahjong-tiles on GitHub"
          sourceUrl="https://github.com/FluffyStuff/riichi-mahjong-tiles"
          notes="High-quality SVG tiles for all standard riichi mahjong tile types. Flower and season tiles are generated SVGs."
        />

        <SourceEntry
          title="Elder Futhark Runes"
          licence="Original work (generated)"
          notes="Stone-tablet SVG renders generated programmatically. The runic glyphs themselves (Unicode block U+16A0–U+16FF) are ancient and not subject to copyright."
        />

        <SourceEntry
          title="Playing Cards"
          licence="CC0 / Public Domain"
          author="nicubunu"
          source="Wikimedia Commons — Category:SVG playing cards (nicubunu)"
          sourceUrl="https://commons.wikimedia.org/wiki/Category:SVG_playing_cards"
          notes="Used for the Playing Cards art pack and as the Classic pack for Lenormand (displaying each card's traditional playing-card equivalent)."
        />

      </Section>

      {/* Reference data sources */}
      <Section label="Reference Data">

        <SourceEntry
          title="I Ching / Book of Changes"
          licence="Public Domain"
          notes="Hexagram data and interpretations drawn from traditional and public-domain scholarship."
        />

        <SourceEntry
          title="Astronomical Calculations"
          licence="MIT Licence"
          author="Don Cross"
          source="astronomy-engine"
          sourceUrl="https://github.com/cosinekitty/astronomy"
          notes="Used for all planetary position, transit, and aspect calculations. No internet connection required."
        />

        <SourceEntry
          title="GeoNames Geographical Database"
          licence="Creative Commons Attribution 4.0"
          author="GeoNames"
          source="geonames.org"
          sourceUrl="https://www.geonames.org"
          notes="Population-filtered city dataset (cities5000) used for offline location search and timezone lookup in natal charts and home location settings. No network connection is made at runtime — data is bundled with the app."
          required
        />

      </Section>

      {/* App framework */}
      <Section label="Application Framework">

        <SourceEntry
          title="Tauri 2.x"
          licence="MIT / Apache 2.0"
          source="tauri.app"
          sourceUrl="https://tauri.app"
          notes="Cross-platform application shell."
        />

        <SourceEntry
          title="React, TanStack Router, Zustand"
          licence="MIT"
          notes="UI framework and state management."
        />

      </Section>

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        All third-party assets are used in compliance with their respective licences. Where attribution
        is required (e.g. Etalab Open Licence), it is provided here. No modifications have been made
        to any licensed images.
      </div>

      {hintToast && <Toast message="Looking for something?" />}
      {unlockToast && <Toast message="Ain unlocked — the veil before the Void." />}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{
        fontSize: '11px', color: 'var(--color-text-subtle)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: '12px',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

function PersonEntry({ name, role, note }: { name: string; role: string; note: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--color-surface-2)',
      borderRadius: '6px',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>{name}</span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{role}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{note}</div>
    </div>
  )
}

interface SourceEntryProps {
  title: string
  licence: string
  author?: string
  source?: string
  sourceUrl?: string
  notes?: React.ReactNode
  required?: boolean  // true = legally required attribution
  id?: string
  highlighted?: boolean
}

function SourceEntry({ title, licence, author, source, sourceUrl, notes, required, id, highlighted }: SourceEntryProps) {
  return (
    <div
      id={id}
      style={{
        padding: '14px 16px',
        background: highlighted ? 'rgba(180,156,90,0.08)' : 'var(--color-surface-2)',
        borderRadius: '6px',
        border: `1px solid ${highlighted ? 'var(--color-accent)' : required ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
        transition: 'border-color 0.4s, background 0.4s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {required && (
            <span style={{
              fontSize: '10px', padding: '2px 6px',
              background: 'rgba(180,156,90,0.15)', border: '1px solid var(--color-accent-muted)',
              borderRadius: '3px', color: 'var(--color-accent)', letterSpacing: '0.05em',
            }}>
              ATTRIBUTION REQUIRED
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{licence}</span>
        </div>
      </div>
      {author && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
          {author}
        </div>
      )}
      {source && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: notes ? '6px' : 0 }}>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
            >
              {source}
            </a>
          ) : source}
        </div>
      )}
      {notes && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
          {notes}
        </div>
      )}
    </div>
  )
}

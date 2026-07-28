import React, { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { APP_VERSION } from '@/lib/app-version'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/settings/manual')({
  component: ManualPage,
})

function ManualPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>User Manual</h1>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '28px' }}>
        {APP_VERSION} — tap any section to expand it.
      </p>

      <Section title="1. Getting Around">
        <P>The app uses a three-tier responsive layout:</P>
        <Table rows={[
          ['Mobile (< 768 px)', 'Hamburger button opens a slide-out drawer'],
          ['Tablet (768–1024 px)', 'Icon sidebar on the left'],
          ['Desktop (> 1024 px)', 'Full sidebar with icons + labels; pin to icon-only in Settings → Navigation'],
        ]} />
        <P><Strong>Spotlight Search</Strong> — the search bar at the top of the sidebar searches the entire entity database in real time. Use ↑ / ↓ to move through results and Enter to open. Press Escape to dismiss.</P>
        <P>Reorder or hide sidebar sections in <Strong>Settings → Navigation</Strong>.</P>
      </Section>

      <Section title="2. Home Dashboard">
        <P>The home page gives you a live snapshot of the current moment and your activity today.</P>
        <P><Strong>Daily Context Bar</Strong> — planetary day ruler, Moon phase, Sun sign, Wu Xing phase, and void-of-course Moon indicator. Tap any item to navigate to its reference page.</P>
        <P><Strong>Daily Reading</Strong> — one reading performed automatically each day using your configured deck and spread (Settings → Daily Reading).</P>
        <P><Strong>Today's Activity</Strong> — readings saved and journal entries written today, listed for quick review.</P>
        <P><Strong>Bookmarks</Strong> — your most recently bookmarked entities as a quick-access row.</P>
      </Section>

      <Section title="3. Readings & Divination">
        <P>Navigate to <Strong>Read</Strong> in the sidebar. The flow has three steps:</P>
        <P><Strong>Step 1 — Choose a Deck.</Strong> Built-in decks include Rider-Waite-Smith, Thoth, Tarot de Marseille, Etteilla, Elder Futhark Runes, Lenormand, Ogham, Geomancy, Mahjong Oracle, Playing Cards, and Tea Leaf Symbols. Custom decks appear at the bottom of the list.</P>
        <P><Strong>Step 2 — Choose a Spread.</Strong> Built-in spreads: Free Reading, Single Card, Three Card, Celtic Cross, Horseshoe, Chakra, Tree of Life, Relationship, Year Ahead, Zodiac Year (13 positions in IAU mode), Grand Tableau, and any custom spreads you have defined.</P>
        <P><Strong>Step 3 — Draw Screen.</Strong> An optional intention field is available before the first draw. Tap <Strong>Draw Card</Strong> for each position. Use <Strong>Flip</Strong> to toggle reversals (if the deck supports them) and <Strong>Clarifier</Strong> to draw an additional card outside the layout. Tap any drawn card to open its keyword panel; tap again to go to its reference page.</P>
        <P><Strong>Notes Screen.</Strong> After all positions are filled, add or edit your intention, set a subject, and write notes in the rich text editor (headings, bold, italic, lists, blockquotes). Tap <Strong>Save Reading</Strong> to commit.</P>
        <P><Strong>After Saving.</Strong> The complete reading screen shows the spread, notes, and the astrological snapshot. From here you can export as Markdown (<code>.md</code>) or PNG image, or jump to the reading's journal entry.</P>
      </Section>

      <Section title="4. Journal">
        <P>The Journal combines all saved readings and standalone journal entries into a single reverse-chronological timeline.</P>
        <P><Strong>Timeline View.</Strong> Tap a row header or chevron to expand a reading or entry in place. Toggle the layout icon in the header to switch between standard and compact list views.</P>
        <P><Strong>Filter.</Strong> Type in the filter field to search readings by question, notes, or card names; and journal entries by title or content.</P>
        <P><Strong>Expanded Reading</Strong> shows a daily context bar, the full spread visualisation, clarifier cards, the astrological snapshot, and entity links. Export (Markdown / Image) and delete buttons appear in the header row.</P>
        <P><Strong>Soft-Delete.</Strong> Tap the trash icon, then Confirm. A toast with an <Strong>Undo</Strong> button appears for 5 seconds before the deletion is committed.</P>
        <P><Strong>Standalone Journal Entries.</Strong> Tap <Strong>New Entry</Strong> in the Journal header to write a freeform entry. Fill in title, date (can be backdated), notes, and entity links.</P>
        <P><Strong>Statistics.</Strong> Tap the bar-chart icon in the Journal header to view aggregate charts about your reading practice over time.</P>
      </Section>

      <Section title="5. Reference">
        <P>A searchable encyclopaedia of all esoteric entities in the database.</P>
        <P><Strong>Search.</Strong> Results filter in real time across names, descriptions, and tags. Use the Type, Tags, and Source filters to narrow results. Tap the dice icon for a random entity.</P>
        <P><Strong>Browse Grid.</Strong> Category tiles give an overview of every system — tarot, runes, sephiroth, paths, planets, zodiac, houses, aspects, lunar nodes, decans, deities, angels, demons, Hebrew letters, chakras, hexagrams, and more. Tap a category to jump to a filtered view.</P>
        <P><Strong>Entity Pages</Strong> show names, description, attributions by tradition, artwork, reversed meaning (for tarot), a personal annotation field, and a bookmark star. Click any linked entity in the attributions to navigate directly to it. Planets, lunar nodes, zodiac signs, and elements display a symbolic SVG art panel in the top-right corner; click to zoom, same as tarot and rune artwork.</P>
        <P><Strong>Etteilla Deck Attributions.</Strong> Etteilla Major Arcana cards 1–12 carry zodiac attributions (Aries through Pisces). Etteilla Coins pip and court cards carry classical planetary attributions (Mercury through Saturn), lunar nodes (☊/☋) for ranks 8 and 9, and Earth (⊕) for rank 10 and all courts. These are visible in the card's reference page under Attributions.</P>
        <P><Strong>Guides.</Strong> The Guides section (scroll to the bottom of the Reference index) contains interactive cross-reference tables:</P>
        <Table rows={[
          ['Lenormand Combinations', 'Full 36×36 combination matrix for the Lenormand deck'],
          ['I Ching Trigram Matrix', '8×8 grid of all 64 hexagrams indexed by upper and lower trigram; tap any cell to open that hexagram\'s reference page'],
          ['Astrological Dignities', 'Classical essential dignities (Rulership, Exaltation, Detriment, Fall) for each planet across the 12 signs'],
          ['Chinese Zodiac Compatibility', '12×12 grid of traditional compatibility between the animals; symmetric — a check in either direction means compatible'],
          ['Sephirothic Attributions', 'Cross-system matrix for the 10 Sephiroth: planet, Tarot trump, archangel, angelic order, divine name, chakra, and Queen Scale colour'],
          ['Planetary Attributions', 'Cross-system matrix for the 7 classical planets: Sephira, Tarot trump, metal, day of week, chakra, and intelligence/spirit'],
          ['Geomancy Shield Chart', 'Interactive calculator — pick the 4 Mother figures to derive daughters, nieces, witnesses, judge, and reconciler automatically'],
        ]} />
      </Section>

      <Section title="6. Astrology">
        <P><Strong>Natal Charts.</Strong> Go to <Strong>Astrology</Strong> in the sidebar and tap <Strong>New Chart</Strong>. Enter name, birth date + time, and birth location. Use the city search field to find a city by name (type 3 or more characters) — selecting a result fills the coordinates and timezone automatically. Coordinates can always be edited manually. Mark one chart as "Self" to enable transit-to-natal comparisons.</P>
        <P><Strong>Chart Detail</Strong> shows sect badge, SVG wheel chart (toggle Tropical / Sidereal / IAU), planet positions table, asteroids table, aspects table, mutual receptions, and Arabic parts/Lots.</P>
        <P><Strong>Current Sky</Strong> updates every five minutes with planet positions and (if a Self chart is saved) transit aspects to natal — each transit shows applying (→) or separating (←) status.</P>
        <P><Strong>Sky Animation.</Strong> Tap the play button on the Current Sky page to open the animated sky wheel. The wheel shows all visible planets orbiting in real time. Use the speed controls to slow down or accelerate time, and the play/pause button to stop. Hover or tap any planet glyph to see its current sign, degree, and retrograde status. The animation reflects your active zodiac mode (Tropical / Sidereal / IAU).</P>
        <P><Strong>Astrology Calendar</Strong> shows a month grid with Moon ingresses, planet ingresses, and eclipse markers. The <Strong>Retrograde tracker</Strong> toggle at the top adds a small strip to each day showing which of the eight visible planets (Mercury through Pluto) are retrograde that day; hover a coloured segment for that planet's current station — "Day 3 of 8", for example.</P>
        <P><Strong>Modes & House Systems</Strong> are configured in <Strong>Settings → Traditions</Strong>. Zodiac modes: Tropical, Sidereal, IAU 13-sign (includes Ophiuchus with accurate arc widths). House systems: Whole Sign, Equal, Placidus, Regiomontanus, Campanus, Koch.</P>
        <P><Strong>Lunar Nodes.</Strong> The Reference section includes a Lunar Nodes category (Rahu / North Node ☊ and Ketu / South Node ☋) with full Jyotish descriptions, Sanskrit names, Latin names (Caput/Cauda Draconis), and classical attributions. Navigate to them via Browse → Astrology → Lunar Nodes or by searching their names.</P>
      </Section>

      <Section title="7. Qabalah">
        <P><Strong>Tree of Life.</Strong> An interactive SVG scaled to fill the viewport. Switch between Tree of Life mode (Queen Scale colours, 22 Paths) and Nightside Tree (Qliphoth, Tunnels of Set). Toggle Daath visibility in <Strong>Settings → Traditions</Strong>. Tap any node to navigate to its reference page.</P>
        <P><Strong>Gematria Calculator.</Strong> Type Hebrew characters directly or use the letter table to build a word. The total updates in real time. Final forms (ך ם ן ף ץ) are handled automatically. Tap any value to look up entities linked to that number.</P>
        <P><Strong>Numerology Calculator.</Strong> Enter a full name to calculate Expression, Soul Urge / Heart's Desire, and Personality numbers. Enter a birth date to compute the Life Path number. Switch between Pythagorean and Chaldean systems. Master numbers (11, 22, 33) are highlighted.</P>
        <P><Strong>Sephirothic Attributions Matrix.</Strong> Available in <Strong>Reference → Guides</Strong>. Displays all 10 Sephiroth as columns with rows for GD planet, Tarot trump, archangel, angelic order, divine name, corresponding chakra, and Queen Scale (Briah) colour. Click any cell to navigate to that entity's reference page.</P>
      </Section>

      <Section title="8. Study">
        <P>Spaced repetition (SM-2 algorithm) to help you memorise entity meanings.</P>
        <P><Strong>Dashboard</Strong> shows cards due today, progress breakdown (New / Learning / Review / Mature), per-type bars, streak, and 14-day accuracy sparkline.</P>
        <P><Strong>Question Modes.</Strong></P>
        <Table rows={[
          ['Flashcard', 'See the entity; tap to flip and reveal the answer'],
          ['Multiple choice', 'Choose the correct answer from 4–8 options'],
          ['Fill in blank', 'Type the answer; fuzzy matching accepts near-correct spelling'],
          ['Image recognition', 'See the artwork and identify the entity'],
          ['Image choice', 'See the entity’s name and pick its artwork from several images'],
        ]} />
        <P>After answering, rate recall 0 (Blackout) to 5 (Perfect). Cards rated 0–1 return to the learning queue immediately.</P>
        <P><Strong>Study Settings.</Strong> Configure session size (1–500, default 20), which entity types to include, question modes per type, multiple-choice count, and whether to include custom entities.</P>
      </Section>

      <Section title="9. Bookmarks">
        <P>Tap the <Strong>★</Strong> star button on any entity reference page to bookmark it. Bookmarks appear in the sidebar and on the home dashboard. Tap the star again to remove, or use the remove button in the Bookmarks section.</P>
      </Section>

      <Section title="10. Custom Content">
        <P>The <Strong>Custom</Strong> section (sidebar) lets you extend the app with your own material.</P>
        <P><Strong>Custom Entities.</Strong> Set a canonical name (slug), entity type, display name, description, secondary names, tags, and extended key/value data. Custom entities appear in search, can be bookmarked, linked in journal entries, and included in study sessions.</P>
        <P><Strong>Custom Spreads.</Strong> Define named positions, draw order, position meanings, and an optional x/y grid for the spread visualisation.</P>
        <P><Strong>Custom Decks.</Strong> Build a deck from any combination of built-in or custom entities. Configure reversals and an optional source tradition.</P>
        <P><Strong>Custom Traditions.</Strong> Specify which link labels a tradition owns and how its attributions are displayed. Custom traditions appear in the Settings → Traditions toggles.</P>
      </Section>

      <Section title="11. Settings">
        <P><Strong>Window.</Strong> Toggle fullscreen (also F11) and compact window mode.</P>
        <P><Strong>Theme.</Strong> Choose from seven presets (Vesper, Midnight, Twilight, Silver, Amber, Mint, Copper) in light or dark mode. Expand the custom colour editor to edit any of 18 design tokens with live preview.</P>
        <P><Strong>Traditions.</Strong> Toggle active traditions on/off; set primary per-system where multiple traditions overlap; configure zodiac mode and house system; show/hide Daath.</P>
        <P><Strong>Art Packs.</Strong> Choose Symbolic or Classic visual style for Tarot, Runes, Geomancy, Mahjong, Lenormand, and Playing Cards. Classic packs require image assets in the <code>/art/</code> directory; missing files fall back to symbolic automatically.</P>
        <P><Strong>Navigation.</Strong> Drag to reorder sidebar sections; toggle visibility; pin to icon-only mode on desktop.</P>
        <P><Strong>Accessibility.</Strong> Colour vision modes (Normal / Deuteranopia / Protanopia / Tritanopia / Achromat / High Contrast), dyslexia-friendly font (OpenDyslexic), reduced motion, card captions for screen readers.</P>
        <P><Strong>Location.</Strong> Set your home city for house calculations and the calendar's planetary positions. Type 3 or more characters in the city search field to search from a database of 68,000+ cities — selecting a result fills the label, coordinates, and timezone automatically. All fields can be edited manually if you need a precise location. Data is stored locally only and is never transmitted.</P>
        <P><Strong>Date/Time Override.</Strong> Fix a date/time instead of the live clock — useful for studying historical charts. Leave blank to use the live clock.</P>
        <P><Strong>Daily Reading.</Strong> Configure which deck and spread are used for the automatic daily card.</P>
        <P><Strong>Custom CSS.</Strong> Inject arbitrary CSS. Styles are validated for balanced braces before being applied.</P>
      </Section>

      <Section title="12. Data & Backup">
        <P><Strong>Export Backup</Strong> (Settings → Data) saves a <code>.json</code> file of all readings, journal entries, natal charts, study states, and custom content. The file is human-readable JSON.</P>
        <P><Strong>Import Backup</Strong> merges a previously exported file with the current database. Existing records are preserved.</P>
        <P><Strong>Archive Old Data.</Strong> Enter a year threshold, preview affected records, then permanently delete entries older than that date (two-step confirmation).</P>
        <P><Strong>Export a Single Reading.</Strong> From any expanded reading in the Journal, use the <Strong>md</Strong> and <Strong>img</Strong> buttons to export just that reading as Markdown or PNG.</P>
      </Section>

      <Section title="13. Keyboard Shortcuts">
        <Table rows={[
          ['F11', 'Toggle fullscreen'],
          ['Escape', 'Close the active overlay, lightbox, or search panel'],
          ['↑ / ↓', 'Navigate search result lists'],
          ['Enter', 'Confirm the selected result or form action'],
          ['Space or Enter', 'Activate a focused card in a spread'],
          ['Tab', 'Move focus to the next interactive element'],
        ]} />
      </Section>

      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        Grimoire Atziluth {APP_VERSION}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', background: 'var(--color-surface-2)',
          borderRadius: open ? '6px 6px 0 0' : '6px',
          border: '1px solid var(--color-border)',
          borderBottom: open ? '1px solid var(--color-border)' : undefined,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'border-radius 0.1s',
        }}
      >
        {open
          ? <ChevronDown size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          : <ChevronRight size={13} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
        }
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
      </button>
      {open && (
        <div style={{
          padding: '14px 16px',
          background: 'var(--color-surface-2)',
          borderRadius: '0 0 6px 6px',
          border: '1px solid var(--color-border)',
          borderTop: 'none',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
      {children}
    </p>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{children}</span>
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', marginBottom: '4px' }}>
      {rows.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', gap: '12px', fontSize: '12px', alignItems: 'baseline' }}>
          <span style={{
            color: 'var(--color-text-subtle)', fontFamily: 'monospace',
            flexShrink: 0, minWidth: '140px',
          }}>
            {key}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>{val}</span>
        </div>
      ))}
    </div>
  )
}

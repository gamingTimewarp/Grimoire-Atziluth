# Grimoire Atziluth — User Manual

**Version 1.0.0-rc**

---

## Table of Contents

1. [Getting Around](#1-getting-around)
2. [Home Dashboard](#2-home-dashboard)
3. [Readings & Divination](#3-readings--divination)
4. [Journal](#4-journal)
5. [Reference](#5-reference)
6. [Astrology](#6-astrology)
7. [Qabalah](#7-qabalah)
8. [Study](#8-study)
9. [Bookmarks](#9-bookmarks)
10. [Custom Content](#10-custom-content)
11. [Settings](#11-settings)
12. [Data & Backup](#12-data--backup)
13. [Keyboard Shortcuts](#13-keyboard-shortcuts)

---

## 1. Getting Around

### Layout

The app uses a three-tier responsive layout:

| Screen width | Navigation |
|-------------|-----------|
| **Mobile** (< 768 px) | Hamburger button in the top bar opens a slide-out drawer |
| **Tablet** (768–1024 px) | Icon sidebar on the left — tap an icon to navigate |
| **Desktop** (> 1024 px) | Full sidebar with icons + labels; can be pinned to icon-only mode in **Settings → Navigation** |

### Spotlight Search

The search bar at the top of the sidebar searches the entire entity database in real time. Use **↑ / ↓** to move through results and **Enter** to open the selected entity. Press **Escape** to dismiss.

### Navigation Order

You can reorder, show, or hide sidebar sections in **Settings → Navigation**. Changes persist across sessions.

---

## 2. Home Dashboard

The home page gives you a live snapshot of the current moment and your activity today.

### Daily Context Bar

At the top, a row shows the active celestial context for the current day:

- **Planetary day ruler** — the classical planet ruling today (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn)
- **Moon phase** — emoji indicator, phase name, and illumination percentage
- **Sun sign** — current zodiac position of the Sun
- **Wu Xing phase** — the active Chinese five-element cycle phase
- **Void-of-course Moon** — when the Moon makes no more major aspects before leaving its current sign, a ☽ v/c notice appears both here and on the draw screen

Clicking any item that has a reference page navigates there directly.

### Daily Reading

One reading is performed automatically each day using your configured daily reading deck and spread (set in **Settings → Daily Reading**). It appears below the context bar with its name and orientation. Clicking on a card from it opens its reference page.

### Today's Activity

Any readings saved or journal entries written today are listed here for quick review. Clicking a reading expands it; clicking a journal entry opens it.

### Bookmarks

Up to your most recent bookmarked entities appear as a quick-access row. Click any to go to its reference page.

---

## 3. Readings & Divination

### Starting a Reading

Navigate to **Read** in the sidebar. The flow has three steps:

#### Step 1 — Choose a Deck

Scroll through the deck list and tap to select. Built-in decks include:

| Deck | Cards | Notes |
|------|-------|-------|
| Rider-Waite-Smith | 78 (or Major only) | Upright + reversed |
| Thoth | 78 (or Major only) | Upright only |
| Tarot de Marseille | 78 (or Major only) | Upright only |
| Etteilla | 78 (or Major only) | Upright + reversed |
| Elder Futhark Runes | 24 | Upright only |
| Lenormand | 36 | Upright only |
| Ogham | 20 core / 25 with Forfeda | Upright only |
| Geomancy | 16 figures | — |
| Mahjong Oracle | 42 tiles | — |
| Playing Cards | 52 / 54 (with Jokers) | — |
| Tea Leaf Symbols | ~90 symbols | — |

Any custom decks you have created appear at the bottom of the list.

#### Step 2 — Choose a Spread

Built-in spreads:

| Spread | Positions | Description |
|--------|-----------|-------------|
| Free Reading | Any | Draw as many cards as you like with no fixed positions |
| Single Card | 1 | A focused one-card draw |
| Three Card | 3 | Past / Present / Future |
| Celtic Cross | 10 | Classic ten-position cross |
| Horseshoe | 7 | Seven-position arc |
| Chakra | 7 | Root to Crown energy centres |
| Tree of Life | 10 | One card per sephira |
| Relationship | 6 | Two-person dynamics |
| Year Ahead | 12 | One card per month |
| Zodiac Year | 12 / 13 | One card per zodiac sign (13 with Ophiuchus in IAU mode) |
| Grand Tableau | 36 | Full Lenormand grid with house positions |
| Custom spreads | varies | Any spreads you have defined |

#### Step 3 — Draw Screen

**Setting your intention**: Before drawing the first card, an optional *"What are you asking?"* field is available. Your intention is stored with the reading and shown in the journal.

**Drawing cards**: Tap **Draw Card** to reveal each card. The current position name and its meaning are shown above the spread so you know what each position represents before you draw.

**Reversals**: If the deck supports reversals, a **Flip** button appears after each draw. Tap it to toggle the card between upright and reversed.

**Clarifier card**: After drawing a card, a **Clarifier** button lets you draw an additional card outside the formal layout to clarify the position.

**Card keyword panel**: Tap any drawn card to open a keyword panel below the spread showing the traditional upright or reversed meaning. Tap the same card again to navigate to its full reference page. Tap the **×** button or click elsewhere to close the panel.

**Grand Tableau**: The 36-card Lenormand layout has its own interaction. Tapping a card selects it and shows a panel below the grid listing the card's meaning and Lenormand house combination notes for its neighbours. Tap **View in Reference →** in the panel to go to the reference page.

### Notes Screen

After all positions are filled (or when you tap **Continue to Notes** for a free reading), you can:

- **Review** the spread at reduced scale — tap any card to see keywords
- **Add or edit your intention/question** (if not set during drawing)
- **Set the subject** — defaults to "self"; change this for readings done for another person
- **Write notes** using the rich text editor — supports headings, bold, italic, lists, blockquotes, and inline code
- **Discard** the reading entirely (two-step confirmation)

Tap **Save Reading** to commit everything to the journal.

### After Saving

The complete reading screen shows the full spread plus any notes and the astrological snapshot captured at the moment of saving. From here you can:

- **New Reading** — start fresh
- **View in Journal** — jump to the reading's journal entry
- **Markdown export** — save the reading as a `.md` file (spread name, question, cards, notes, astrological snapshot)
- **Image export** — save a PNG screenshot of the complete reading view

---

## 4. Journal

The Journal combines all saved readings and standalone journal entries into a single reverse-chronological timeline.

### Timeline View

Each entry in the timeline shows:
- **Reading**: spread name, deck, question (if set), and date
- **Journal entry**: title and date with a short text preview

Tap the chevron or the row header to expand a reading or entry in place.

**Compact mode**: Toggle the layout toggle in the header (double-line / single-line icon) to switch between the standard view and a more condensed list. This preference is saved as your default.

**Filter**: Type in the filter field to search readings by question, notes, or card names; and journal entries by title or content.

### Expanded Reading

An expanded reading shows:
- A **daily context bar** for the date the reading was done
- The full **spread visualisation** (spread grid, Tree of Life SVG, Chakra display, Year Ahead wheel, Grand Tableau, or Zodiac Year chart depending on the spread)
- **Clarifier cards** below the main spread
- The **astrological snapshot** captured at save time — a planet position table and an SVG wheel chart
- **Entity links** — a tagged list of reference entities associated with this reading

**Exporting**: When a reading is expanded, Markdown and Image export buttons appear in the header row (share icon + label).

**Deleting**: Tap the trash icon, then **Confirm**. The reading disappears from the list immediately and a toast notification appears at the bottom of the screen with an **Undo** button. You have 5 seconds to undo before the deletion is committed to the database.

### Standalone Journal Entries

Tap **New Entry** in the Journal header to write a freeform entry without a reading. Fill in:
- **Title** (optional)
- **Date** (defaults to today; can be changed to backdate an entry)
- **Notes** (rich text)
- **Entity links** — type in the entity search field to link reference entities

Entries support the same expand/collapse, entity linking, editing, and soft-delete with undo as readings.

### Entity Links

Both readings and entries can be linked to any entities in the reference database. In the expanded view, type in the entity search field to find an entity by name and add it as a chip. Tap the chip to navigate to the entity, or tap the **×** on the chip to remove the link.

### Journal Statistics

Tap **Statistics** (bar-chart icon) in the Journal header to view aggregate charts about your reading practice over time.

---

## 5. Reference

The Reference section is a searchable encyclopaedia of all esoteric entities in the database.

### Searching

Type in the search bar at the top of the Reference page. Results filter in real time across entity names, secondary names, descriptions, and tags.

**Filters** below the search bar:
- **Type** — narrow to a specific entity type (Tarot Card, Planet, Sephira, Rune, etc.)
- **Tags** — type to autocomplete and add tag filters (multiple tags narrow the results)
- **Source** — All / Built-in / Custom

Tap the **Random** button (dice icon) to navigate to a random entity.

### Browse Grid

Below the search, a grid of category tiles provides an overview of every system. Tap a category to jump to a filtered view of that entity type. Categories include:

*Tarot decks, Major Arcana, Minor Arcana suits, Runes, Ogham, Lenormand, Geomancy, Hexagrams, Trigrams, Sephiroth, Paths, Qliphoth, Worlds, Pillars, Planets, Zodiac Signs, Houses, Aspects, Decans, Fixed Stars, Lunar Mansions, Deities (Greek, Egyptian, Norse), Angels, Archangels, Goetic Demons, Hebrew Letters, Greek Letters, Chakras, Numerology, Alchemy, and more.*

### Recently Viewed

The Reference landing page shows your recently viewed entities as a quick-access strip. The list is maintained in order of last visit and persists across sessions.

### Entity Pages

Every entity has a dedicated page showing:

- **Name(s)** — primary display name plus all secondary names with their tradition or language labels
- **Description** — a concise writeup of the entity's nature and significance
- **Attributions** — organised by tradition, showing all linked entities (e.g. a Sephira page shows its planet, Hebrew letter, angel, divine name, tarot cards, and colour)
- **Art** — symbolic rendering or image (depending on your Art Pack settings)
- **Reversed meaning** — shown for tarot cards that have reversals data, toggleable between upright and reversed
- **Personal annotation** — a text field at the bottom of the page where you can write your own notes. These are stored locally and never leave your device.
- **Bookmark star** — tap to save/unsave this entity to your bookmarks

---

## 6. Astrology

### Natal Charts

Go to **Astrology** in the sidebar. Tap **New Chart** to create a natal chart:

- **Name** — label for this chart (a person's name, event name, etc.)
- **Birth date + time** — exact time improves house accuracy
- **Location** — city/place for birth coordinates (used to calculate houses and ascendant)
- **Self** — mark one chart as "Self" to enable transit-to-natal comparisons in the Current Sky panel

Saved charts appear in the chart list. Tap a chart to open the full detail view.

### Chart Detail View

The chart detail page shows:
- **Sect badge** — ☉ Day chart or ☽ Night chart (whether the Sun is above or below the horizon at birth)
- **Wheel chart** — SVG visualisation with houses, planets at their zodiacal positions, and aspect lines. Toggle between Tropical, Sidereal, and IAU (13-sign) views.
- **Planet positions table** — each planet with its exact degree, sign, house, and retrograde status
- **Asteroids table** — Chiron, Ceres, Pallas, Juno, and Vesta positions (visible when the *Modern Astrology* tradition is active in Settings → Traditions)
- **Aspects table** — all major aspects in the chart
- **Mutual receptions** — highlighted pairs where two planets are each in the other's sign of rulership
- **Arabic parts/Lots** — Part of Fortune, Part of Spirit, and others (with the *Hermetic Lots* tradition active)

Click any planet, sign, or aspect to navigate to its Reference page.

### Current Sky

The current sky panel (below the chart list on the Astrology index page) updates every five minutes and shows:

- Planet positions, retrograde markers, and sign positions right now
- **Transit aspects to natal** — if a Self chart is saved, a toggle appears showing every current transit that aspects a natal planet. Each transit shows the transiting body, the natal body, the aspect type, and whether it is applying (→) or separating (←).

### Astrology Calendar

The **Calendar** page (separate sidebar entry) shows:

- Month grid with astrological events
- **Moon ingresses** — when the Moon moves into a new sign
- **Planet ingresses** — when an outer planet changes signs
- **Retrograde stations** — retrograde and direct stations for all planets
- **Eclipse markers**

Tap any event to open details.

### Modes & House Systems

These are configured globally in **Settings → Traditions**:

**Zodiac mode**:
- *Tropical* — the standard Western system (Aries always at 0° of vernal equinox)
- *Sidereal* — fixed-star reference frame
- *IAU (13-sign)* — uses IAU constellation boundary data; Ophiuchus is included with accurate unequal arc widths

**House systems**: Whole Sign, Equal, Placidus, Regiomontanus, Campanus, Koch.

---

## 7. Qabalah

### Tree of Life

The **Qabalah** page displays an interactive SVG Tree of Life scaled to fit your screen.

- **Tree of Life mode** — the ten Sephiroth in Queen Scale colours, connected by the 22 Paths. Each node shows the Sephira name, Hebrew letter on its path, and (if a tarot tradition is active) the corresponding card abbreviation.
- **Nightside Tree mode** — the Qliphoth and the 22 Tunnels of Set in dark colouring.
- **Daath** — the hidden sphere between Binah and Chesed; toggle its visibility in **Settings → Traditions**.
- Clicking any Sephira or Qliphah node navigates to its reference page.

World bands (Atziluth, Briah, Yetzirah, Assiah) are drawn as subtle coloured bands behind the tree. Pillar labels (Severity, Equilibrium, Mercy) run vertically.

The tree automatically scales to fill the available viewport height so the full diagram is visible without scrolling.

### Gematria Calculator

The Gematria calculator is accessible from the **Gematria** button in the Qabalah header.

- Type Hebrew characters directly (e.g., א ב ג) or use the letter table below the field to build the word
- The total gematria value updates in real time
- Latin transliteration input is also supported (aleph, beth, etc.)
- Final forms (ך ם ן ף ץ) are handled automatically
- Click any value in the letter table to look up entities linked to that number

### Numerology Calculator

The Numerology calculator is accessible from the **Numerology** button.

**Name analysis** — enter a full name to calculate:
- **Expression number** (full name, all letters)
- **Soul Urge / Heart's Desire** (vowels only)
- **Personality number** (consonants only)

**Life Path** — enter a birth date to compute the Life Path number with a reduction step display.

**System**: Switch between *Pythagorean* (A=1 … Z=8, cyclic) and *Chaldean* (no 9; different letter assignments) using the toggle at the top.

Master numbers (11, 22, 33) are highlighted and not further reduced.

---

## 8. Study

The Study section implements spaced repetition (SM-2 algorithm) to help you memorise entity meanings.

### Dashboard

The Study home page shows:
- **Cards due** — how many cards are scheduled for review today
- **Progress breakdown** — a stacked bar chart showing New / Learning / Review / Mature counts across all active entity types
- **Per-type bars** — individual progress for each entity type you have enabled
- **Streak** — consecutive days on which you have completed a study session
- **14-day accuracy sparkline** — a small chart showing your recent performance

Tap **Start Session** to begin.

### Study Session

Each question presents an entity and asks you to recall something about it. The question mode depends on your settings:

| Mode | Description |
|------|-------------|
| **Flashcard** | See the entity name/image; tap to flip and see the answer |
| **Multiple choice** | Choose the correct answer from 4–8 options |
| **Fill in blank** | Type the answer; fuzzy matching accepts near-correct spelling |
| **Image recognition** | See the entity's artwork and identify it |

After answering, rate your recall on a 0–5 scale:
- **0 — Blackout** — complete blank
- **1 — Fail** — wrong, but the answer felt familiar
- **2 — Hard** — correct with significant effort
- **3 — OK** — correct after hesitation
- **4 — Good** — correct with minor hesitation
- **5 — Perfect** — instant, effortless recall

The SM-2 algorithm uses your rating to calculate the next review interval. Cards rated 0–1 return to the learning queue immediately.

### Study Settings

Tap **Settings** (gear icon) on the Study page to configure:

- **Session size** — number of cards per session (1–500; default 20)
- **Entity types** — toggle which types to include (Tarot, Runes, Planets, Sephiroth, Zodiac Signs, and more)
- **Question modes per type** — choose which modes are used for each entity type
- **Multiple choice count** — how many options to show (4–8)
- **Include custom entities** — toggle your own added entities into the study pool

---

## 9. Bookmarks

Tap the **★** star button on any entity reference page to bookmark it. Bookmarks appear in the **Bookmarks** section of the sidebar and on the home dashboard.

To remove a bookmark, tap the star again on the entity's reference page, or use the remove button in the Bookmarks section.

---

## 10. Custom Content

The **Custom** section (accessible from the sidebar) lets you extend the app with your own material.

### Custom Entities

Tap **New Entity** to create an entity with:
- **Canonical name** — a unique slug identifier (e.g. `custom.card.my-card`)
- **Entity type** — any existing type, or a new type string you define
- **Display name**, description, secondary names, and tags
- **Extended data** — arbitrary key/value pairs for tradition attributions

Custom entities appear in Reference search results, can be bookmarked, linked in journal entries, and included in the Study system.

### Custom Spreads

Define your own spread layout with named positions, draw order, position meanings, and an optional x/y grid for the SpreadGrid visualisation.

### Custom Decks

Build a deck from any combination of entities (built-in or custom), configure whether reversals are enabled, and optionally set a source tradition.

### Custom Traditions

Define a new tradition by specifying which `linkLabel`s it owns and how its attributions should be displayed. Custom traditions appear in the tradition toggles in Settings.

---

## 11. Settings

Open **Settings** from the bottom of the sidebar. Settings are organised into sections:

### Window

- **Fullscreen** — toggle fullscreen mode (also via **F11**)
- **Compact window** — allows the window to resize below 900 px (useful on smaller screens or for floating windows)

### Theme

- **Preset** — choose from seven built-in themes: Vesper (default), Midnight, Twilight, Silver, Amber, Mint, Copper
- **Light / Dark mode** — toggle between light and dark variants of the active theme
- **Custom colour editor** — expand to edit any of the 18 design token colours directly (hex values). Changes preview live.

### Traditions

The Traditions page controls which esoteric frameworks are active and how attributions are displayed.

- **Active traditions** — toggle any tradition on or off. When a tradition is off, its attributions are hidden throughout the app.
- **Primary per system** — where multiple traditions cover the same symbolic system (e.g. Golden Dawn vs Thoth for tarot), choose which one takes precedence in display.
- **Zodiac mode** — Tropical / Sidereal / IAU (13-sign)
- **House system** — Whole Sign / Equal / Placidus / Regiomontanus / Campanus / Koch
- **Show Daath** — include or hide the hidden sphere in the Tree of Life

### Art Packs

Choose the visual style for six entity groups:

| Group | Symbolic | Classic |
|-------|----------|---------|
| Tarot | Geometric card layout with suit symbols | Scanned/vector card images |
| Runes | Unicode runic characters (ᚠᚢᚦ…) | Stone-carved SVG |
| Geomancy | Dot-pattern SVG | Historical Wikimedia figures |
| Mahjong | Unicode tile characters | Illustrated SVG tiles |
| Lenormand | Layout placeholder | Playing card equivalents |
| Playing Cards | Suit symbol text | nicubunu CC0 SVG |

Classic art packs require the image assets to be present in the `/art/` directory. If an image file is missing, the app falls back to the symbolic renderer automatically.

### Navigation

- **Reorder sections** — drag sidebar items into your preferred order
- **Show / hide sections** — toggle visibility for any section
- **Pin sidebar** — on desktop, toggle between always-visible full sidebar and icon-only mode

### Accessibility

- **Colour vision mode** — Normal / Deuteranopia / Protanopia / Tritanopia / Achromat / High Contrast
- **Dyslexia-friendly font** — replaces the interface font with OpenDyslexic
- **Reduced motion** — disables transitions and animations throughout the app
- **Card captions** — displays entity names as labels beneath each card in the spread view and announces drawn cards to screen readers

### Location

Enter your home city or coordinates for accurate house calculations in natal charts and the current sky snapshot. Location data is stored locally only.

### Date/Time Override

Set a fixed date and time for the app to use instead of the system clock. Useful for studying historical charts or testing. Leave blank to use the live clock.

### Daily Reading

- **Deck** — which deck to use for the automatic daily card
- **Spread** — which spread to use (Single Card is the default)

### Default Spread

Pre-select a spread that will be highlighted when you start a new reading.

### Journal Layout

Toggle compact mode as the default for the Journal page.

### Custom CSS

A text area for injecting arbitrary CSS into the app. Styles are validated for balanced braces and screened for potentially unsafe selectors before being applied. The Apply button is disabled if a syntax error is detected.

---

## 12. Data & Backup

Open **Settings → Data** to manage your data.

### Backup

Tap **Export Backup** to save a `.json` file containing:
- All readings and reading cards
- All journal entries and entity links
- All natal charts
- All study card states and session history
- All custom entities, spreads, decks, and traditions

The file is human-readable JSON. A timestamp is stored in the app so the Data page can show when you last backed up.

### Restore

Tap **Import Backup** and select a previously exported `.json` file. The restore merges the backup data with the current database (existing records are preserved).

### Archive Old Data

In the **Archive** section, enter a year threshold. Tap **Preview** to see how many readings and journal entries predate that year, then **Archive** to permanently delete records older than the specified date. A two-step confirmation is required.

### Export a Single Reading

While viewing any reading in the Journal (or on the post-save complete screen), use the **md** and **img** buttons in the reading header to export just that reading:

- **Markdown export** — a `.md` file with the spread name, question, card list (with positions and orientations), notes, and astrological snapshot table
- **Image export** — a 2× PNG screenshot of the complete reading view

---

## 13. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F11** | Toggle fullscreen |
| **Escape** | Close the active overlay, lightbox, or search panel |
| **↑ / ↓** | Navigate search result lists |
| **Enter** | Confirm the selected search result or form action |
| **Space** or **Enter** | Activate a focused card in a spread |
| **Tab** | Move focus to the next interactive element |

A read-only shortcut reference is also available inside the app at **Settings → Keyboard Shortcuts**.

---

*Grimoire Atziluth v1.0.0*

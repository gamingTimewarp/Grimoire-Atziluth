# Grimoire Atziluth — User Manual

**Version 1.0.0**

---

## Table of Contents

1. [Getting Around](#1-getting-around)
2. [Home Dashboard](#2-home-dashboard)
3. [Readings & Divination](#3-readings--divination)
4. [Practice](#4-practice)
5. [Journal](#5-journal)
6. [Reference](#6-reference)
7. [Astrology](#7-astrology)
8. [Qabalah](#8-qabalah)
9. [Study](#9-study)
10. [Bookmarks](#10-bookmarks)
11. [Custom Content](#11-custom-content)
12. [Settings](#12-settings)
13. [Data & Backup](#13-data--backup)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)

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

The home page gives you a live snapshot of the current moment and your activity today, built from a set of independent, reorderable widgets. Go to **Settings → Home Widgets** to show/hide widgets, reorder them (▲/▼), or **Reset to defaults**. Changes apply immediately. A few widgets (Today's Activity, Bookmarks, Natal Transits, On This Day, Recently Viewed) only appear on Home when they actually have something to show — hiding them in settings isn't the only way they can be absent.

Widgets shown by default:

### Today

A row of chips for the active celestial context for the current day: **planetary day ruler** (the classical planet ruling today), **moon phase** (emoji, name, illumination %), **sun sign**, **Wu Xing phase** (the active Chinese five-element cycle phase), a **☽ v/c** chip when the Moon is void-of-course (making no more major aspects before leaving its current sign), and — for each Sabbat or calendar holiday currently in progress (e.g. "🌿 Sukkot — Day 4 of 7") — a holiday chip. Clicking any chip with a reference page navigates there directly.

### Daily Reading

One reading is performed automatically each day using your configured daily reading deck and spread (set in **Settings → Daily Reading**, including any custom deck sub-deck). It appears with its name and orientation. Clicking on a card from it opens its reference page.

### Today's Activity

Any readings saved or journal entries written today are listed here for quick review (the automatic daily reading itself is excluded, since it has its own widget). Clicking a reading expands it; clicking a journal entry opens it.

### Bookmarks

Up to your most recent bookmarked entities appear as a quick-access row. Click any to go to its reference page.

### Moon

An at-a-glance current Moon phase, linking through to the full Moon calendar page (phases, size/brightness, position, aspects, eclipses, full moon names).

### Retrograde

A small list of any planets currently retrograde.

### Other available widgets (hidden by default)

Enable these from **Settings → Home Widgets**:

- **Statistics** — this month's reading count, linking to the full Journal Statistics page
- **Study** — cards due today and your current streak, linking to the Study page
- **Upcoming Holidays, Sabbats & Astro Events** — the next few upcoming Sabbats, calendar holidays, meteor shower peaks, and eclipses (start dates only — a holiday already in progress, like a Sukkot you're partway through, shows on the **Today** widget instead, not here)
- **Natal Transits** — current transit aspects to your saved "Self" natal chart (silently absent if you haven't saved one)
- **On This Day** — readings and journal entries you made on this same month and day in past years (an ⓘ icon explains this); shows "Nothing on this day in past years" once you have no history yet, rather than disappearing
- **Recently Viewed** — your last few visited reference entities
- **Discover** — spotlights one random entity from the dataset each visit

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

Any custom decks you have created appear at the bottom of the list. If a deck (built-in or custom) defines variants — e.g. Full 78 vs Major Arcana Only, or a custom deck's own sub-decks (see [Custom Decks](#11-custom-content)) — tapping it opens a row of variant buttons; pick one, including **All**, to continue.

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

### Recording a Physical Reading

If you did a reading offline with a physical deck, tap **Record Physical** (next to New Reading, in the Read or Journal header) to log it with the same data shape as a digital reading:

1. Choose a deck and spread (built-in or custom, including any sub-decks) — same as the digital flow.
2. Assign each drawn card to a position manually: pick the entity, then set upright/reversed.
3. For a free-reading deck, add cards freely instead of filling fixed positions; a **Clarifier** section is always available regardless of spread.
4. Set the reading's date and time (defaults to now — backdate it if you're logging a past reading).
5. Optionally attach an astrological snapshot for the reading's date/time.
6. Add a question, subject, and notes, exactly as in the digital flow.

Saved physical readings appear in the Journal alongside digital ones, with no distinction in how they're displayed.

---

## 4. Practice

The **Practice** page is a workspace for actively running a ritual: reference entities kept at hand, a circular correspondence board, a handful of small live tools, and a notes field — all of it persisting between visits until you clear it.

### Pinned References

A bar across the top lets you "pin" any reference entity for quick access during a ritual — tap the dashed **+** box to search for and add one. Pinned entities share the bar's width evenly (two pinned entities each take half, three take a third, and so on); once there are enough that they'd get too narrow, they wrap onto additional rows instead of continuing to shrink. Tap a pinned entity to open its reference page, or its **×** to unpin it. A **Clear all** link removes every pin at once.

### Ritual Space

A circular board with 13 correspondence slots: the 8 compass points (cardinal and intercardinal), a centre slot, and 4 corner slots labelled with the Tetragrammaton (Yod, Heh, Vav, Heh, reading clockwise). Tap any empty slot to open a picker grouped by category (the five Wu Xing phases, the four Western elements, Yin/Yang, and Masculine/Feminine polarity); picking one fills the slot with that correspondence's colour and symbol.

Once a slot is filled, two small badges appear on it:

- **×** (top-left) — clears that one slot
- **↗** (top-right) — opens the Reference page filtered to every entity sharing that correspondence's tag

A **Clear all** link above the board clears every slot and widget at once. A **Ritual settings** link next to it jumps straight to the Ritual section of **Settings → Traditions**, where you can show English captions alongside the Hebrew corner letters, and independently show or hide the cardinal, intercardinal, centre, and corner slot groups.

On narrow (mobile-width) screens, the ritual space and its side widgets don't reflow to fit — they keep their full desktop layout and become pannable/pinch-zoomable instead, the same touch interaction used for diagrams elsewhere in the app. A reset button appears once you've panned or zoomed away from the default view.

### Widgets

Four square slots — two on each side of the ritual space — each hold one small live tool. Tap a slot's **+** to choose one:

- **Timer / Stopwatch** — toggles between stopwatch (counts up) and a countdown timer (set a minutes/seconds duration while paused); both show a milliseconds digit, and the countdown stops itself automatically at zero.
- **Magic Circle** — pick any magic circle, pentagram, hexagram, or kamea entity from a searchable list and display its full diagram at a larger, more legible size than the slot itself.
- **Reading** — pick a deck (built-in or custom, including deck variants), then tap **Draw** to pull a single random card with orientation if the deck supports reversals. The card links through to its own reference page; **Draw Again** re-rolls, **Change deck** returns to deck selection.
- **Numerology** — switch between Pythagorean, Chaldean, and Gematria, type a word or phrase, and see its value: the reduced single-digit (or master) number for Pythagorean/Chaldean, or the raw unreduced sum for Gematria (which accepts Hebrew text or space-separated Hebrew letter names).
- **Sky Wheel** — the current moment's planetary positions as a wheel chart (classical planets and zodiac only, concentric-rings layout, no aspects or house/lot clutter), refreshing every few minutes. Links through to the full Astrology page.
- **Natal Chart** — pick any saved natal chart (not just your own "Self" chart) from a searchable list and display it the same stripped-down way. Links through to that chart's full detail page.

A widget's **×** badge removes it from its slot entirely (distinct from the picker's own "change selection" options, which keep the widget but let you pick something else).

### Notes

A free-text box at the bottom of the page for notes on the current ritual.

### Saving and Loading a Ritual

Two buttons in the page header manage the whole ritual's state (pinned references, every slot pick, all four widgets, and your notes) as a unit:

- **Save** — name the ritual, then either **Export as JSON…** (saves a file you can back up or share) or **Save as Custom Entity** (stores it in the app, browsable from the Custom page under the "Ritual" folder).
- **Load** — either **Import from JSON…** to bring in an exported file, or pick from a list of rituals you've previously saved as custom entities. Loading always asks for confirmation first, since it replaces everything currently on the page.

---

## 5. Journal

The Journal combines all saved readings and journal entries into a single reverse-chronological timeline. A journal entry is more than a freeform note — it's an overarching, titled container that can group one or more readings, each still keeping its own question, subject, cards, and notes. Use it to document a single sitting that covered several questions, a recurring practice you want to narrate over time, or just a quick note with nothing attached.

### Timeline View

Each top-level row shows:
- **Reading** (not attached to any entry): spread name, deck, question (if set), and date
- **Journal entry**: title, date, a short text preview, and a reading count (e.g. "· 3 readings") when it has readings attached

A reading that's attached to an entry does **not** get its own row in the timeline — it only appears nested inside that entry's expanded view (see below).

Tap the chevron or the row header to expand a reading or entry in place.

**Compact mode**: Toggle the layout toggle in the header (double-line / single-line icon) to switch between the standard view and a more condensed list. This preference is saved as your default.

**Filter**: Type in the filter field to search readings by question, notes, or card names, and entries by title, notes, or the content of any reading attached to them.

### Expanded Reading

An expanded reading (standalone or nested inside an entry) shows:
- A **daily context bar** for the date the reading was done
- The full **spread visualisation** (spread grid, Tree of Life SVG, Chakra display, Year Ahead wheel, Grand Tableau, or Zodiac Year chart depending on the spread)
- **Clarifier cards** below the main spread
- The **astrological snapshot** captured at save time — a planet position table and an SVG wheel chart
- **Entity links** — a tagged list of reference entities associated with this reading

**Exporting**: When a reading is expanded, Markdown and Image export buttons appear in the header row (share icon + label).

**Deleting a standalone (top-level) reading**: Tap the trash icon, then **Confirm**. The reading disappears from the list immediately and a toast notification appears at the bottom of the screen with an **Undo** button. You have 5 seconds to undo before the deletion is committed to the database.

**Deleting a reading nested inside an entry**: Tap the trash icon, then **Confirm** — this removes it immediately with no Undo toast. Use the **unlink** icon instead (see below) if you want to keep the reading, just not grouped under this entry.

### Journal Entries

Tap **New Entry** in the Journal header to write an entry. Fill in:
- **Title** (optional)
- **Date** (defaults to today; can be changed to backdate an entry)
- **Notes** (rich text)
- **Entity links** — type in the entity search field to link reference entities

**Editing**: Expand an entry and tap the pencil icon to edit its title, date, and notes in place, then **Save** or **Cancel**. (Reference-database links and attached readings are managed separately, as below, and remain in place while editing.)

**Adding readings to an entry**: Expand an entry to see its **Readings** section:
- **New Reading Here** — starts the normal reading flow (deck → spread → draw → notes); the finished reading is automatically attached to this entry.
- **Attach Existing Reading** — search your standalone (unattached) readings by question, subject, or deck, and click one to add it to this entry.
- Each attached reading shows an **unlink** icon alongside delete — unlinking removes it from the entry without deleting it; it becomes a standalone reading again, reappearing in the top-level timeline.

**Deleting an entry**: Tap the trash icon, then **Confirm** — same 5-second Undo toast as a standalone reading. Deleting an entry does **not** delete the readings attached to it; they're detached and become standalone instead.

**Exporting/importing a single entry**: Expand an entry and tap the export icon (next to Edit) to save that entry, plus every reading attached to it, as one `.json` file. Use **Import Entry** in the Journal header to restore one — importing a file whose entry was already present here changes nothing (no duplicates). See also [Data & Backup](#13-data--backup).

### Entity Links

Both readings and entries can be linked to any entities in the reference database. In the expanded view, type in the entity search field to find an entity by name and add it as a chip. Tap the chip to navigate to the entity, or tap the **×** on the chip to remove the link.

You can also start a new entry directly from an entity: on any reference page, the **Journal** section (see [Reference → Entity Pages](#6-reference)) has a **+** button that opens the New Entry form with that entity already added as a link.

### Journal Statistics

Tap **Statistics** (bar-chart icon) in the Journal header to view aggregate charts about your reading practice over time.

---

## 6. Reference

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
- **Journal** — a collapsible section listing every journal entry and reading linked to this entity; tap one to jump to it in the Journal. Tap the **+** in its top-right corner to start a new journal entry with this entity already attached as a link (see [Journal → Entity Links](#5-journal))

---

## 7. Astrology

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
- **Sabbats and holidays** — the Wheel of the Year plus every tracked calendar holiday, same as the native-calendar tabs
- **Meteor shower peaks** — the 8 major annual showers (Quadrantids, Lyrids, Eta Aquariids, Perseids, Orionids, Leonids, Geminids, Ursids), each landing on its real solar-longitude-calculated peak date every year
- **Eclipses** — every total or partial lunar and solar eclipse (penumbral lunar eclipses, too faint to notice without instruments, are omitted), computed directly rather than taken from a fixed list, with its kind labelled (e.g. "Total Lunar Eclipse"). An ⓘ icon next to each gives its approximate visibility: lunar eclipses are visible from the entire night-side hemisphere of Earth; total/annular solar eclipses name the approximate coordinates their narrow path of totality/annularity crosses at peak (with a much wider surrounding region seeing a partial eclipse); solar eclipses that never reach total or annular anywhere note that there's no single peak location to name.

Tap any event badge to open its Reference page — meteor showers each have their own entry (radiant, parent comet/asteroid, typical rate); eclipses link to one of two general "Lunar Eclipse"/"Solar Eclipse" explainer pages, since the specific date/kind is shown right on the calendar itself rather than needing its own entity.

On the day an eclipse or meteor shower peak actually falls, the Astrology page also shows a dismissable notice at the top linking straight to it.

### Modes & House Systems

These are configured globally in **Settings → Traditions**:

**Zodiac mode**:
- *Tropical* — the standard Western system (Aries always at 0° of vernal equinox)
- *Sidereal* — fixed-star reference frame
- *IAU (13-sign)* — uses IAU constellation boundary data; Ophiuchus is included with accurate unequal arc widths

**House systems**: Whole Sign, Equal, Placidus, Regiomontanus, Campanus, Koch.

---

## 8. Qabalah

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

## 9. Study

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

## 10. Bookmarks

Tap the **★** star button on any entity reference page to bookmark it. Bookmarks appear in the **Bookmarks** section of the sidebar and on the home dashboard.

To remove a bookmark, tap the star again on the entity's reference page, or use the remove button in the Bookmarks section.

---

## 11. Custom Content

The **Custom** section (accessible from the sidebar) lets you extend the app with your own material.

### Custom Entities

Tap **New Entity** to create an entity with:
- **Canonical name** — a unique slug identifier (e.g. `custom.card.my-card`)
- **Entity type** — any existing type, or a new type string you define
- **Display name**, description, secondary names, and tags
- **Extended data** — arbitrary key/value pairs for tradition attributions

Custom entities appear in Reference search results, can be bookmarked, linked in journal entries, and included in the Study system.

On the Custom page, your entities are grouped into folders by entity type — one folder level per dot-separated segment (e.g. an entity typed `calendar.meteor-shower` sits in folder **Calendar** → subfolder **Meteor Shower**; a flat type like `herb` is just a top-level folder with no subfolder). Tap a folder to expand or collapse it. Above the list, a search box matches display name, canonical name, secondary names, description, and your own notes as you type, and a tag filter — the same chip-based multi-select the main Reference page uses — narrows the list to entities carrying every selected tag. Both combine, and a **Clear** link appears whenever either is active.

### Custom Spreads

Define your own spread layout with named positions, draw order, position meanings, and an optional x/y grid for the SpreadGrid visualisation.

### Custom Decks

Build a deck from any combination of entities (built-in or custom) and configure whether reversals are enabled.

**Sub-decks**: Group a deck's own cards into named, selectable subsets — the same idea as a built-in Tarot deck's "Full 78" vs "Major Arcana Only". In the deck editor, add a sub-deck by name, then tick which of the deck's cards belong to it; you can define as many as you like. A deck with sub-decks defined shows a variant picker (an automatic **All** option plus each sub-deck) wherever you choose it — the main Read flow, physical-reading recording, and the daily-reading deck setting — exactly like the built-in deck variants.

### Custom Traditions

Define a new tradition by specifying which `linkLabel`s it owns and how its attributions should be displayed. Custom traditions appear in the tradition toggles in Settings.

---

## 12. Settings

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

## 13. Data & Backup

Open **Settings → Data** to manage your data.

### Backup

Tap **Export Backup** to save a `.json` file containing:
- All readings and reading cards
- All journal entries and entity links
- All natal charts
- All custom entities and entity links
- Your app settings (localStorage)

The file is human-readable JSON. A timestamp is stored in the app so the Data page can show when you last backed up.

**Not included in the backup**: Study/SRS card progress and session history (intentionally excluded — it's large and rebuilds naturally from continued use), and custom spreads, custom decks, and custom traditions. From the [Custom Content](#11-custom-content) page you can export any of these individually or all-at-once as JSON; custom spreads and traditions can also be re-imported from an exported file, but there is currently no way to import an exported custom deck back in.

### Restore

Tap **Import Backup** and select a previously exported `.json` file. The restore merges the backup data with the current database (existing records are preserved).

### Archive Old Data

In the **Archive** section, enter a year threshold. Tap **Preview** to see how many readings and journal entries predate that year, then **Archive** to permanently delete records older than the specified date. A two-step confirmation is required.

### Export a Single Reading

While viewing any reading in the Journal (or on the post-save complete screen), use the **md** and **img** buttons in the reading header to export just that reading:

- **Markdown export** — a `.md` file with the spread name, question, card list (with positions and orientations), notes, and astrological snapshot table
- **Image export** — a 2× PNG screenshot of the complete reading view

### Export/Import a Single Journal Entry

Expand any entry in the Journal and tap **Export entry** to save a `.md` (Markdown) file containing that entry's title, date, and notes, plus a readable section for every reading attached to it (spread, cards, positions, orientations, question, and its own notes) — the same rendering as a reading's own "Export as Markdown" button. The exact data is also embedded invisibly in the file, so re-importing it is lossless.

Tap **Import Entry** in the Journal toolbar to bring a file back in:

- **A file this app exported** (or an old `.json`-format export) restores the entry and its readings exactly, keeping their original IDs — re-importing a file you already have does nothing (it's reported as already existing rather than duplicated).
- **Any other Markdown file** — a hand-edited copy, a single reading's own bare "Export as Markdown" file, or a note written from scratch — is reconstructed best-effort from its visible text: the first heading becomes the title, `**Date:**` becomes the date, and any `## Cards` section has its deck/spread/card names matched by name against your built-in and custom data. A card that can't be matched is skipped (reported in the import summary) rather than failing the whole import; an unmatched deck or spread falls back to a free reading.

This is a good way to move a single entry between devices, share one, or hand-write a journal entry as plain Markdown and bring it in.

---

## 14. Keyboard Shortcuts

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


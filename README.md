# Grimoire Atziluth

**Grimoire Atziluth** is an offline-first esoteric reference and divination application for desktop and tablet. It combines an interactive divination journal, a comprehensive occult knowledge base, spaced-repetition study tools, and live astrological calculations — all running entirely on-device with no cloud dependency.

The name comes from *Atziluth* — the highest of the Four Worlds in Qabalah, the world of pure emanation.

---

## Features at a Glance

| Area | Highlights |
|------|-----------|
| **Divination** | 12 decks, 14 spreads, reversals, clarifier cards, reading question/intention field |
| **Journal** | Combined reading + journal timeline, rich text, entity linking, astrological snapshot per entry |
| **Reference** | 24+ entity types, 36+ browse categories, full-text search, multi-tradition attributions, personal annotations; SVG art panels for planets, elements, zodiac signs, and lunar nodes |
| **Astrology** | Natal charts, current sky, transit-to-natal aspects, Chiron + major asteroids, tropical/sidereal/IAU modes, 6 house systems; Lunar Nodes (Rahu/Ketu) in reference with full Jyotish descriptions |
| **Qabalah** | Interactive Tree of Life + Nightside Tree, gematria calculator, numerology (Pythagorean + Chaldean) |
| **Study** | SM-2 spaced repetition, 4 question modes, 14-day accuracy sparkline, per-type progress tracking |
| **Customisation** | Custom entities/spreads/decks/traditions, 7 theme presets + full colour editor, 6 accessibility modes, custom CSS |
| **Export** | Readings as Markdown or PNG image, full data backup/restore |

---

## Supported Decks

Rider-Waite-Smith · Thoth · Tarot de Marseille · Etteilla · Elder Futhark Runes · Lenormand · Ogham · Geomancy · Mahjong Oracle · Playing Cards · Tea Leaf Symbols — plus custom decks.

## Supported Spreads

Single Card · Three Card · Celtic Cross · Horseshoe · Year Ahead · Zodiac Year · Chakra · Tree of Life · Grand Tableau · Relationship · custom spreads.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | Tauri 2.x (Rust + WebView) |
| Frontend | React 19, TypeScript, Vite |
| Routing | TanStack Router v1 (file-based) |
| State | Zustand v5 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Persistence | `@tauri-apps/plugin-sql` (SQLite) for readings/journals/charts; localStorage for settings |
| Entity engine | `grimoire-core/` — platform-agnostic TypeScript library |
| Data | `grimoire-data/` — bundled entity + link JSON, loaded via Vite virtual module |
| Testing | Vitest (123 unit tests across grimoire-core) |

Targets: **Linux**, **Windows**, **Android** (desktop builds primary).

---

## Repository Layout

```
Grimoire-Atziluth/
├── grimoire-app/          # Tauri 2 application
│   ├── src/
│   │   ├── routes/        # TanStack Router pages
│   │   ├── components/    # Shared React components
│   │   ├── lib/           # Engine wrappers, DB layer, utilities
│   │   └── stores/        # Zustand stores
│   └── src-tauri/         # Rust + Tauri config
├── grimoire-core/         # Platform-agnostic core library
│   └── src/               # Engine, adapters, types, algorithms
├── grimoire-data/         # Bundled entity + link JSON
│   ├── entities/          # Entities by category
│   ├── links/             # Attribute + structural links
│   └── traditions/        # Tradition definition files
└── 1.1_Spec.md            # Feature audit / pre-release checklist
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- [Rust](https://rustup.rs) (stable toolchain)
- Tauri system dependencies for your platform — see [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/)

### Install & Run (Development)

```bash
# From the repo root
npm install

# Start the Tauri dev window
cd grimoire-app
npm run tauri dev
```

### Build

```bash
cd grimoire-app
npm run tauri build
```

Produces a native installer in `grimoire-app/src-tauri/target/release/bundle/`.

### Run Core Tests

```bash
cd grimoire-core
npm test
```

---

## Architecture Notes

**Entity storage** uses an `InMemoryAdapter` seeded from the bundled JSON at startup. Entities are immutable reference data; user annotations are stored separately in localStorage alongside the canonical name.

**Readings** and **journal entries** are persisted in SQLite via `@tauri-apps/plugin-sql`. Each saved reading captures a full astrological snapshot at the moment of drawing.

**Traditions** act as attribution scopes. A link between two entities carries a `traditionScope[]`; an empty scope means universal. The active tradition set filters which attributions are shown on reference pages.

**Canonical names** are namespaced slugs (`tarot.major.rws.the-fool`, `qabalah.sephira.kether`). The alias system (`canonical-aliases.ts`) resolves renamed entities transparently across bookmarks, history, and imports.

---

## Licence

Source code: MIT.
Bundled artwork is used under separate open licences (CC0, CC BY) — see **Settings → Credits** within the app for full attributions.

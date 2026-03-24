/**
 * reading-export.ts
 *
 * Export a single reading as:
 *  - Markdown (.md)  — structured text with spread, cards, notes, astro snapshot
 *  - PNG image (.png) — html-to-image render of the reading content element
 */

import type { Reading } from '@grimoire/core'
import type { NatalChartData } from './astro-engine'
import { getSignsForMode } from './astro-engine'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { toPng } from 'html-to-image'

// ─── Markdown ─────────────────────────────────────────────────────────────────

/**
 * Generate a Markdown string for the given reading.
 *
 * @param reading       The reading record.
 * @param spreadName    Display name of the spread, or null for free readings.
 * @param deckName      Display name of the deck.
 * @param positionNames Map of position id → position name (from spread definition).
 * @param entityNames   Map of canonical name → display name for drawn cards.
 */
export function readingToMarkdown(
  reading: Reading,
  spreadName: string | null,
  deckName: string | null,
  positionNames: Map<string, string>,
  entityNames: Map<string, string>,
): string {
  const lines: string[] = []

  // Title
  const title = [spreadName ?? 'Free Reading', deckName].filter(Boolean).join(' — ')
  lines.push(`# ${title}`)
  lines.push('')

  // Question
  if (reading.question?.trim()) {
    lines.push(`*"${reading.question.trim()}"*`)
    lines.push('')
  }

  // Date
  const date = new Date(reading.readingDate).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  lines.push(`**Date:** ${date}`)
  lines.push('')

  // Cards
  lines.push('## Cards')
  lines.push('')
  const sortedCards = [...reading.cards].sort((a, b) => a.drawOrder - b.drawOrder)
  for (const card of sortedCards) {
    const name = entityNames.get(card.cardCanonicalName)
      ?? card.cardCanonicalName.split('.').pop()?.replace(/-/g, ' ')
      ?? card.cardCanonicalName
    const position = card.positionId ? positionNames.get(card.positionId) : null
    const rev = card.orientation === 'reversed' ? ' *(reversed)*' : ''
    lines.push(position ? `- **${position}** — ${name}${rev}` : `- ${name}${rev}`)
  }
  lines.push('')

  // Notes
  if (reading.notes?.trim()) {
    lines.push('## Notes')
    lines.push('')
    lines.push(reading.notes.trim())
    lines.push('')
  }

  // Astrological snapshot
  if (reading.astroSnapshot) {
    try {
      const chart = reading.astroSnapshot as NatalChartData
      if (chart.planets?.length) {
        lines.push('---')
        lines.push('')
        lines.push('## Astrological Snapshot')
        lines.push('')
        const signs = getSignsForMode('tropical')
        lines.push('| Planet | Position | |')
        lines.push('|--------|----------|-|')
        for (const pos of chart.planets) {
          const sign = signs[pos.signIndex]
          const deg  = `${pos.degree}°${String(pos.minutes).padStart(2, '0')}′`
          const retro = pos.retrograde ? ' ℞' : ''
          lines.push(`| ${pos.planet.symbol} ${pos.planet.name} | ${deg} ${sign?.symbol ?? ''} ${sign?.name ?? ''} | ${retro} |`)
        }
        lines.push('')
      }
    } catch { /* malformed snapshot — skip */ }
  }

  return lines.join('\n')
}

// ─── Save helpers ─────────────────────────────────────────────────────────────

export async function exportReadingAsMarkdown(
  reading: Reading,
  spreadName: string | null,
  deckName: string | null,
  positionNames: Map<string, string>,
  entityNames: Map<string, string>,
): Promise<void> {
  const markdown = readingToMarkdown(reading, spreadName, deckName, positionNames, entityNames)
  const date = reading.readingDate.slice(0, 10)
  const path = await save({
    defaultPath: `reading-${date}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })
  if (!path) return
  await writeTextFile(path, markdown)
}

/**
 * Capture an HTMLElement as a 2× PNG and open a Save dialog.
 * The element should contain the full reading content to export.
 */
export async function exportReadingAsImage(element: HTMLElement): Promise<void> {
  // Resolve CSS custom property for background so html-to-image can fill it correctly
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-surface-1').trim() || '#0d0d12'

  // Pre-fetch all <img> src values as data URLs before handing to html-to-image.
  // html-to-image fetches images with crossOrigin='anonymous', which triggers CORS
  // checks that Tauri's local asset server doesn't satisfy — images appear blank.
  const imgs = Array.from(element.querySelectorAll('img'))
  const restored = new Map<HTMLImageElement, string>()
  await Promise.all(imgs.map(async img => {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:')) return
    try {
      const blob = await fetch(src).then(r => r.blob())
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      restored.set(img, src)
      img.src = dataUrl
    } catch { /* leave as-is; symbolic fallback will render */ }
  }))

  let dataUrl: string
  try {
    dataUrl = await toPng(element, {
      backgroundColor: bg,
      pixelRatio: 2,
      includeQueryParams: true,
    })
  } finally {
    // Restore original src so the live UI is unaffected
    for (const [img, src] of restored) img.src = src
  }

  // data URL → Uint8Array
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const path = await save({
    defaultPath: 'reading.png',
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  })
  if (!path) return
  await writeFile(path, bytes)
}

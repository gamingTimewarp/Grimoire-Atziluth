/**
 * custom-art.ts
 * Stores user-uploaded images for custom entities in the app config directory
 * (same folder as grimoire.db) under `custom-art/`, served back to <img> tags via
 * Tauri's asset protocol. The chosen filename is stored on the entity's
 * extendedData bag under CUSTOM_IMAGE_KEY — no grimoire-core schema changes needed.
 */

import { useEffect, useState } from 'react'
import { appConfigDir, join } from '@tauri-apps/api/path'
import { mkdir, copyFile, exists, remove, writeFile } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import { convertFileSrc } from '@tauri-apps/api/core'
import type { BaseEntity } from '@grimoire/core'

const ART_DIR = 'custom-art'

/** Reserved extendedData key used to store a custom entity's uploaded image filename. */
export const CUSTOM_IMAGE_KEY = 'customImageFileName'

export function getCustomImageFileName(entity: Pick<BaseEntity, 'extendedData'>): string | undefined {
  const v = entity.extendedData?.[CUSTOM_IMAGE_KEY]
  return typeof v === 'string' && v ? v : undefined
}

let artDirPromise: Promise<string> | null = null

async function getArtDir(): Promise<string> {
  if (!artDirPromise) {
    artDirPromise = (async () => {
      const base = await appConfigDir()
      const dir = await join(base, ART_DIR)
      if (!(await exists(dir))) await mkdir(dir, { recursive: true })
      return dir
    })()
  }
  return artDirPromise
}

const urlCache = new Map<string, string>()

/** Resolves a stored custom image filename to a displayable asset:// URL, cached per filename. */
export async function resolveCustomImageUrl(fileName: string): Promise<string> {
  const cached = urlCache.get(fileName)
  if (cached) return cached
  const dir = await getArtDir()
  const path = await join(dir, fileName)
  const url = convertFileSrc(path)
  urlCache.set(fileName, url)
  return url
}

/** React hook: resolves a stored filename to a displayable URL, or null while loading/absent. */
export function useCustomImageUrl(fileName: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!fileName) { setUrl(null); return }
    let cancelled = false
    resolveCustomImageUrl(fileName).then(u => { if (!cancelled) setUrl(u) }).catch(() => { if (!cancelled) setUrl(null) })
    return () => { cancelled = true }
  }, [fileName])
  return url
}

/**
 * Opens a native file picker and copies the chosen image into the app's custom-art
 * directory under a freshly generated filename (decoupled from canonical name, so
 * renaming an entity never orphans its image). Returns null if the user cancelled.
 */
export async function pickAndStoreCustomImage(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }],
  })
  if (!picked || Array.isArray(picked)) return null

  const ext = picked.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${crypto.randomUUID()}.${ext}`
  const dir = await getArtDir()
  const dest = await join(dir, fileName)
  await copyFile(picked, dest)
  return fileName
}

/** Removes a previously stored custom image, if present. Safe to call on already-removed files. */
export async function removeCustomImage(fileName: string): Promise<void> {
  urlCache.delete(fileName)
  try {
    const dir = await getArtDir()
    const path = await join(dir, fileName)
    if (await exists(path)) await remove(path)
  } catch {
    // Best-effort cleanup — don't block the caller's own save/delete flow on this.
  }
}

// ─── Custom art packs ────────────────────────────────────────────────────────
// Bulk-imported per-group art packs, stored under custom-art/packs/<packId>/.
// The pack registry and per-card filename mapping live in SQLite (custom-db.ts);
// this section only deals with the on-disk files themselves.

const packDirPromises = new Map<string, Promise<string>>()

async function getPackDir(packId: string): Promise<string> {
  let p = packDirPromises.get(packId)
  if (!p) {
    p = (async () => {
      const base = await getArtDir()
      const dir = await join(base, 'packs', packId)
      if (!(await exists(dir))) await mkdir(dir, { recursive: true })
      return dir
    })()
    packDirPromises.set(packId, p)
  }
  return p
}

/** Resolves a file within a custom art pack to a displayable asset:// URL, cached per (pack, file). */
export async function resolvePackFileUrl(packId: string, fileName: string): Promise<string> {
  const key = `${packId}/${fileName}`
  const cached = urlCache.get(key)
  if (cached) return cached
  const dir = await getPackDir(packId)
  const path = await join(dir, fileName)
  const url = convertFileSrc(path)
  urlCache.set(key, url)
  return url
}

/** Writes in-memory bytes (e.g. a decompressed zip entry) into a pack's folder under the given filename. */
export async function writeFileIntoPack(packId: string, fileName: string, data: Uint8Array): Promise<void> {
  const dir = await getPackDir(packId)
  const dest = await join(dir, fileName)
  await writeFile(dest, data)
}

/** Removes an entire pack's folder and all its files. */
export async function removePackDir(packId: string): Promise<void> {
  packDirPromises.delete(packId)
  try {
    const base = await getArtDir()
    const dir = await join(base, 'packs', packId)
    if (await exists(dir)) await remove(dir, { recursive: true })
  } catch {
    // Best-effort cleanup.
  }
}

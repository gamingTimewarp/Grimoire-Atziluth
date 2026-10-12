/**
 * identification-photos.ts
 * Open-licensed identification photos for gemstone/herb entities, sourced from
 * Wikimedia Commons — backed by /identification/manifest.json and the image
 * files under /identification/{group}/, both generated offline (see
 * scripts referenced in CONTRIBUTING, not shipped at runtime).
 *
 * No network requests are made at runtime; the manifest is loaded once on
 * first lookup and then cached in memory, same pattern as geocoder.ts.
 */

export interface IdentificationPhotoInfo {
  /** Public-relative path to the bundled image, e.g. "/identification/gemstone/gemstone-gemstone-ruby.jpg". */
  file: string
  /** The image's title/caption on Wikimedia Commons. */
  title: string
  /** The photographer/author as credited on Commons ("Unknown" if Commons itself has no machine-readable author). */
  author: string
  /** Short license name, e.g. "CC BY-SA 3.0", "CC0", "Public domain". */
  license: string
  /** Canonical license URL, or null for licenses with none (e.g. public domain). */
  licenseUrl: string | null
  /** The Wikimedia Commons file page, for full attribution/verification. */
  sourceUrl: string
}

type Manifest = Record<string, IdentificationPhotoInfo>

let _manifest: Manifest | null = null
let _loading: Promise<Manifest | null> | null = null

async function getManifest(): Promise<Manifest | null> {
  if (_manifest) return _manifest
  if (_loading) return _loading
  _loading = fetch('/identification/manifest.json')
    .then(r => { if (!r.ok) return null; return r.json() as Promise<Manifest> })
    .then(data => { if (data) _manifest = data; return data })
    .catch(err => { console.warn('[identification-photos] failed to load manifest.json:', err); return null })
  return _loading
}

/** The identification photo for an entity, or null if none has been sourced yet. */
export async function getIdentificationPhoto(canonicalName: string): Promise<IdentificationPhotoInfo | null> {
  const manifest = await getManifest()
  return manifest?.[canonicalName] ?? null
}

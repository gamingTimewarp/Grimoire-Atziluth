/**
 * Typed error classes for Grimoire Core.
 * All errors carry a machine-readable `code` for programmatic handling.
 */

export class GrimoireError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

// ── Entity errors ──────────────────────────────────────────────────────────────

export class EntityNotFoundError extends GrimoireError {
  constructor(canonicalNameOrId: string) {
    super(`Entity not found: "${canonicalNameOrId}"`, 'ENTITY_NOT_FOUND')
  }
}

export class CanonicalNameConflictError extends GrimoireError {
  constructor(canonicalName: string) {
    super(`Canonical name already in use: "${canonicalName}"`, 'CANONICAL_NAME_CONFLICT')
  }
}

export class HasIncomingLinksError extends GrimoireError {
  constructor(canonicalName: string, linkCount: number) {
    super(
      `Cannot rename or delete "${canonicalName}": ${linkCount} incoming link(s) exist. ` +
      `Remove them first, or pass { force: true } to override for non-built-in entities.`,
      'HAS_INCOMING_LINKS'
    )
  }
}

export class ImmutableEntityError extends GrimoireError {
  constructor(canonicalName: string, operation: string) {
    super(
      `Cannot ${operation} built-in entity "${canonicalName}". Fork it first to create an editable copy.`,
      'IMMUTABLE_ENTITY'
    )
  }
}

export class InvalidCanonicalNameError extends GrimoireError {
  constructor(name: string, reason: string) {
    super(`Invalid canonical name "${name}": ${reason}`, 'INVALID_CANONICAL_NAME')
  }
}

// ── Link errors ────────────────────────────────────────────────────────────────

export class LinkNotFoundError extends GrimoireError {
  constructor(id: string) {
    super(`Link not found: "${id}"`, 'LINK_NOT_FOUND')
  }
}

export class DuplicateLinkError extends GrimoireError {
  constructor(source: string, target: string, label: string) {
    super(
      `A link "${source}" --[${label}]--> "${target}" already exists.`,
      'DUPLICATE_LINK'
    )
  }
}

export class ImmutableLinkError extends GrimoireError {
  constructor(id: string, operation: string) {
    super(`Cannot ${operation} built-in link "${id}".`, 'IMMUTABLE_LINK')
  }
}

// ── Tradition errors ───────────────────────────────────────────────────────────

export class TraditionNotFoundError extends GrimoireError {
  constructor(canonicalNameOrId: string) {
    super(`Tradition not found: "${canonicalNameOrId}"`, 'TRADITION_NOT_FOUND')
  }
}

export class ImmutableTraditionError extends GrimoireError {
  constructor(canonicalName: string, operation: string) {
    super(
      `Cannot ${operation} built-in tradition "${canonicalName}". Fork it first.`,
      'IMMUTABLE_TRADITION'
    )
  }
}

// ── Storage errors ─────────────────────────────────────────────────────────────

export class StorageError extends GrimoireError {
  constructor(message: string, cause?: unknown) {
    super(`Storage error: ${message}`, 'STORAGE_ERROR')
    if (cause instanceof Error) this.cause = cause
  }
}

export class NotInitializedError extends GrimoireError {
  constructor() {
    super('GrimoireEngine has not been initialized. Call initialize() first.', 'NOT_INITIALIZED')
  }
}

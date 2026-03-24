import { v4 as uuidv4 } from 'uuid'

/** Generate a new UUID v4 */
export function newId(): string {
  return uuidv4()
}

/** Current timestamp as an ISO 8601 string */
export function nowIso(): string {
  return new Date().toISOString()
}

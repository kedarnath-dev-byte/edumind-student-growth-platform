/**
 * Asia/Kolkata (IST) display helpers for API timestamps.
 *
 * Backend stores naive UTC (datetime.utcnow) and historically serialized
 * without a Z suffix. JS Date parses naive ISO as *local* time, which
 * shifts student-visible upload/log times by ~5.5h on IST devices.
 *
 * Always parse API datetimes as UTC, then format in Asia/Kolkata.
 */

export const IST_TIME_ZONE = 'Asia/Kolkata'

const HAS_TZ_SUFFIX = /(?:[zZ]|[+-]\d{2}:?\d{2})$/

/**
 * Parse an API datetime (ISO string, epoch ms, or Date) as UTC.
 * Naive strings like "2026-09-28T12:00:00" are treated as UTC.
 */
export function parseApiUtc(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const raw = String(value).trim()
  if (!raw) return null

  // Date-only YYYY-MM-DD → calendar day in IST (noon UTC avoids DST edge cases)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00+05:30`)
    return Number.isNaN(d.getTime()) ? null : d
  }

  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  // Trim fractional seconds longer than ms for broader Date parse support
  normalized = normalized.replace(/(\.\d{3})\d+/, '$1')

  if (!HAS_TZ_SUFFIX.test(normalized)) {
    normalized = `${normalized}Z`
  }

  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

const DEFAULT_DATE_TIME_OPTS = {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
}

/**
 * Absolute timestamp for Learning Log / revision / parent views (IST).
 */
export function formatIstDateTime(value, fallback = 'Unknown date') {
  const d = parseApiUtc(value)
  if (!d) return fallback
  try {
    return new Intl.DateTimeFormat('en-IN', DEFAULT_DATE_TIME_OPTS).format(d)
  } catch {
    return d.toLocaleString('en-IN', DEFAULT_DATE_TIME_OPTS)
  }
}

/**
 * Date-only label in IST (e.g. dashboard next-due).
 */
export function formatIstDate(value, fallback = '') {
  const d = parseApiUtc(value)
  if (!d) return fallback
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Relative label ("just now", "5m ago") based on correct UTC instant.
 */
export function formatIstRelative(value) {
  const d = parseApiUtc(value)
  if (!d) return ''
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return formatIstDate(d)
}

/**
 * YYYY-MM-DD calendar key in Asia/Kolkata for due-today bucketing.
 */
export function istDateKey(value = new Date()) {
  const d = value instanceof Date ? value : parseApiUtc(value)
  if (!d || Number.isNaN(d.getTime())) return ''
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Start of the current IST calendar day as a Date (instant).
 */
export function startOfIstDay(reference = new Date()) {
  const key = istDateKey(reference)
  if (!key) return new Date(NaN)
  return new Date(`${key}T00:00:00+05:30`)
}

export default {
  IST_TIME_ZONE,
  parseApiUtc,
  formatIstDateTime,
  formatIstDate,
  formatIstRelative,
  istDateKey,
  startOfIstDay,
}

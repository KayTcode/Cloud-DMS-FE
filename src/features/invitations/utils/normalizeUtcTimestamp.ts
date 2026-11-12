// A trailing Z, or a +hh:mm / -hh:mm (or +hhmm) offset.
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * The backend serialises some DateTime values without a zone designator even
 * though they are UTC; `new Date()` would then read them as local time.
 * Appends `Z` when no designator is present; otherwise returns the value as is.
 */
export function normalizeUtcTimestamp(value: string | null): string | null {
  if (value === null || value === '') return value;
  return HAS_ZONE.test(value) ? value : `${value}Z`;
}

import { describe, it, expect } from 'vitest';
import { normalizeUtcTimestamp } from './normalizeUtcTimestamp';

describe('normalizeUtcTimestamp', () => {
  it('leaves a value that already ends in Z unchanged', () => {
    expect(normalizeUtcTimestamp('2026-11-13T10:00:00Z')).toBe('2026-11-13T10:00:00Z');
  });
  it('leaves a +hh:mm offset unchanged', () => {
    expect(normalizeUtcTimestamp('2026-11-13T10:00:00+07:00')).toBe('2026-11-13T10:00:00+07:00');
  });
  it('leaves a -hh:mm offset unchanged', () => {
    expect(normalizeUtcTimestamp('2026-11-13T10:00:00-05:00')).toBe('2026-11-13T10:00:00-05:00');
  });
  it('appends Z when there is no designator', () => {
    expect(normalizeUtcTimestamp('2026-11-13T10:00:00')).toBe('2026-11-13T10:00:00Z');
    expect(normalizeUtcTimestamp('2026-11-13T10:00:00.123')).toBe('2026-11-13T10:00:00.123Z');
  });
  it('passes null through', () => {
    expect(normalizeUtcTimestamp(null)).toBeNull();
  });
  it('returns an empty string unchanged', () => {
    expect(normalizeUtcTimestamp('')).toBe('');
  });
});

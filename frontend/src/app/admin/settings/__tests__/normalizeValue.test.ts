import { describe, it, expect } from 'vitest';
import { normalizeValue } from '../page';

describe('normalizeValue', () => {
  it('preserves spaces in text values (announcement banner)', () => {
    expect(normalizeValue('FLAT 20% OFF TODAY')).toBe('FLAT 20% OFF TODAY');
    expect(normalizeValue('a space ')).toBe('a space ');
    expect(normalizeValue(' leading')).toBe(' leading');
  });

  it('still converts numeric and boolean strings', () => {
    expect(normalizeValue('100')).toBe(100);
    expect(normalizeValue('9.99')).toBe(9.99);
    expect(normalizeValue('true')).toBe(true);
    expect(normalizeValue('false')).toBe(false);
  });

  it('handles empty, null and undefined', () => {
    expect(normalizeValue('')).toBe('');
    expect(normalizeValue(null)).toBe('');
    expect(normalizeValue(undefined)).toBe('');
  });
});

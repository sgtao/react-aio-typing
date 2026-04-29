import { describe, it, expect } from 'vitest';
import { normalize } from '../useSpeechInput';

describe('normalize', () => {
  it('lowercases and strips non-alphanumeric', () => {
    expect(normalize("He said, 'Hello!'")).toBe('hesaidhello');
  });
  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });
  it('preserves numbers', () => {
    expect(normalize('Room 101!')).toBe('room101');
  });
  it('strips spaces', () => {
    expect(normalize('hello world')).toBe('helloworld');
  });
});

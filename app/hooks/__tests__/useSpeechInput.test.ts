import { describe, it, expect } from 'vitest';
import { normalize, computeWordMatches } from '../useSpeechInput';

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

describe('computeWordMatches', () => {
  it('matches words case-insensitively ignoring punctuation', () => {
    const result = computeWordMatches("there is a crack", "There's a small crack");
    expect(result).toEqual([
      { word: "There's", matched: false },
      { word: 'a', matched: true },
      { word: 'small', matched: false },
      { word: 'crack', matched: true },
    ]);
  });
  it('returns all matched when transcript equals target words', () => {
    const result = computeWordMatches("hello world", "Hello world");
    expect(result).toEqual([
      { word: 'Hello', matched: true },
      { word: 'world', matched: true },
    ]);
  });
  it('returns all unmatched for empty accumulated text', () => {
    const result = computeWordMatches("", "Hello world");
    expect(result).toEqual([
      { word: 'Hello', matched: false },
      { word: 'world', matched: false },
    ]);
  });
  it('handles empty target text', () => {
    const result = computeWordMatches("hello", "");
    expect(result).toEqual([]);
  });
});

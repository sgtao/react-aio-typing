import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypingEngine, generateHint, buildPendingMask } from '../typingEngine';

// ---------------------------------------------------------------------------
// TypingEngine - basic input
// ---------------------------------------------------------------------------

describe('TypingEngine - basic input', () => {
  it('advances position on correct key', () => {
    const engine = new TypingEngine('Hello');
    engine.handleKey('H');
    expect(engine.getDisplayState().position).toBe(1);
  });

  it('returns complete: true when last char typed', () => {
    const engine = new TypingEngine('Hi');
    engine.handleKey('H');
    const result = engine.handleKey('i');
    expect(result.complete).toBe(true);
    expect(engine.isComplete()).toBe(true);
  });

  it('ignores multi-char keys such as ArrowLeft', () => {
    const engine = new TypingEngine('Hi');
    const result = engine.handleKey('ArrowLeft');
    expect(result.ignored).toBe(true);
    expect(engine.getDisplayState().position).toBe(0);
  });

  it('returns complete immediately when already finished', () => {
    const engine = new TypingEngine('Hi');
    engine.handleKey('H');
    engine.handleKey('i');
    const result = engine.handleKey('x');
    expect(result.complete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TypingEngine - auto-skip (non-alphanumeric)
// ---------------------------------------------------------------------------

describe('TypingEngine - auto-skip', () => {
  it('skips leading non-alphanumeric at construction', () => {
    // target starts with " (non-alnum)
    const engine = new TypingEngine('"Hello"');
    expect(engine.getDisplayState().position).toBe(1);
  });

  it('marks auto-skipped chars with auto: true', () => {
    const engine = new TypingEngine('"Hello"');
    const { typed } = engine.getDisplayState();
    expect(typed[0].auto).toBe(true);
  });

  it('skips space between words automatically after each word', () => {
    const engine = new TypingEngine('Hi there');
    engine.handleKey('H');
    engine.handleKey('i');
    // space is auto-skipped; cursor lands on 't' at index 3
    expect(engine.getDisplayState().position).toBe(3);
  });

  it('auto-skips trailing punctuation and marks word complete', () => {
    const engine = new TypingEngine('Hi.');
    engine.handleKey('H');
    const result = engine.handleKey('i');
    expect(result.complete).toBe(true);
  });

  it('Backspace also removes preceding auto-skip chars', () => {
    // After "Hi" space is auto-skipped → typed=[H, i, ' '(auto)], position=3
    // Backspace should remove ' '(auto) then 'i' → position=1
    const engine = new TypingEngine('Hi there', 'free');
    engine.handleKey('H');
    engine.handleKey('i');
    const result = engine.handleKey('Backspace');
    expect(result.backspace).toBe(true);
    expect(engine.getDisplayState().position).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TypingEngine - strict mode
// ---------------------------------------------------------------------------

describe('TypingEngine - strict mode', () => {
  it('returns blocked: true on wrong key', () => {
    const engine = new TypingEngine('Hello', 'strict');
    const result = engine.handleKey('x');
    expect(result.blocked).toBe(true);
    expect(result.correct).toBe(false);
  });

  it('does not advance position on blocked key', () => {
    const engine = new TypingEngine('Hello', 'strict');
    engine.handleKey('x');
    expect(engine.getDisplayState().position).toBe(0);
  });

  it('accumulates blocked keys in mistypeCount', () => {
    const engine = new TypingEngine('Hello', 'strict');
    engine.handleKey('x');
    engine.handleKey('y');
    expect(engine.getTotalMistypeCount()).toBe(2);
  });

  it('ignores Backspace in strict mode', () => {
    const engine = new TypingEngine('Hello', 'strict');
    engine.handleKey('H');
    const result = engine.handleKey('Backspace');
    expect(result.ignored).toBe(true);
    expect(engine.getDisplayState().position).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TypingEngine - free mode
// ---------------------------------------------------------------------------

describe('TypingEngine - free mode', () => {
  it('accepts wrong key and advances position', () => {
    const engine = new TypingEngine('Hello', 'free');
    const result = engine.handleKey('x');
    expect(result.blocked).toBeUndefined();
    expect(result.correct).toBe(false);
    expect(engine.getDisplayState().position).toBe(1);
  });

  it('records wrong char with correct: false in typed', () => {
    const engine = new TypingEngine('Hello', 'free');
    engine.handleKey('x');
    const { typed } = engine.getDisplayState();
    expect(typed[0].correct).toBe(false);
    expect(typed[0].char).toBe('x');
    expect(typed[0].expected).toBe('H');
  });

  it('Backspace rewinds position by 1', () => {
    const engine = new TypingEngine('Hello', 'free');
    engine.handleKey('H');
    engine.handleKey('e');
    const result = engine.handleKey('Backspace');
    expect(result.backspace).toBe(true);
    expect(engine.getDisplayState().position).toBe(1);
  });

  it('Backspace at position 0 stays at 0', () => {
    const engine = new TypingEngine('Hello', 'free');
    engine.handleKey('Backspace');
    expect(engine.getDisplayState().position).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TypingEngine - case sensitivity
// ---------------------------------------------------------------------------

describe('TypingEngine - case sensitivity', () => {
  it('caseInsensitive=true: lowercase matches uppercase target', () => {
    const engine = new TypingEngine('Hello', 'strict', true);
    const result = engine.handleKey('h');
    expect(result.correct).toBe(true);
    expect(result.blocked).toBeUndefined();
  });

  it('caseInsensitive=false: lowercase does not match uppercase target', () => {
    const engine = new TypingEngine('Hello', 'strict', false);
    const result = engine.handleKey('h');
    expect(result.blocked).toBe(true);
  });

  it('caseInsensitive=true: uppercase matches lowercase target', () => {
    const engine = new TypingEngine('hello', 'strict', true);
    const result = engine.handleKey('H');
    expect(result.correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TypingEngine - WPM
// ---------------------------------------------------------------------------

describe('TypingEngine - WPM', () => {
  beforeEach(() => { vi.useFakeTimers({ now: 0 }); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns 0 before 500ms have elapsed', () => {
    const engine = new TypingEngine('hello');
    engine.handleKey('h'); // startTime = 0
    vi.setSystemTime(499);
    expect(engine.getWPM()).toBe(0);
  });

  it('calculates 1 WPM for 5 chars in 60 seconds', () => {
    const engine = new TypingEngine('hello world', 'free', true);
    for (const ch of 'hello') engine.handleKey(ch); // startTime = 0
    vi.setSystemTime(60000); // 1 minute later
    // 5 manual chars / 5 = 1 word, 1 min → WPM = 1
    expect(engine.getWPM()).toBe(1);
  });

  it('excludes auto-skip chars from WPM numerator', () => {
    // "hi world": typing only "hi" (2 chars), space is auto-skipped
    // If auto chars counted: (3/5)/1 = 0.6 → rounds to 1
    // Correct (auto excluded):  (2/5)/1 = 0.4 → rounds to 0
    const engine = new TypingEngine('hi world', 'free', true);
    engine.handleKey('h');
    engine.handleKey('i'); // space auto-skipped
    vi.setSystemTime(60000);
    expect(engine.getWPM()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TypingEngine - accuracy
// ---------------------------------------------------------------------------

describe('TypingEngine - accuracy', () => {
  it('returns 100 before any input', () => {
    const engine = new TypingEngine('hello');
    expect(engine.getAccuracy()).toBe(100);
  });

  it('returns 100 after all correct input', () => {
    const engine = new TypingEngine('hi', 'strict', true);
    engine.handleKey('h');
    engine.handleKey('i');
    expect(engine.getAccuracy()).toBe(100);
  });

  it('returns 50 after half wrong in free mode', () => {
    const engine = new TypingEngine('hi', 'free');
    engine.handleKey('x'); // wrong
    engine.handleKey('i'); // correct
    expect(engine.getAccuracy()).toBe(50);
  });

  it('excludes auto-skip chars from accuracy denominator', () => {
    // "h." — '.' is auto; only 'h' is manual → accuracy = 100
    const engine = new TypingEngine('h.', 'free');
    engine.handleKey('h');
    expect(engine.getAccuracy()).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// generateHint
// ---------------------------------------------------------------------------

describe('generateHint', () => {
  it('shows first letter of each word, rest as underscores', () => {
    expect(generateHint('She is a teacher.')).toBe('S__ i_ a t______.');
  });

  it('preserves spaces and punctuation', () => {
    expect(generateHint('Hi.')).toBe('H_.');
  });

  it('single-char word stays as-is', () => {
    expect(generateHint('I am here.')).toBe('I a_ h___.');
  });
});

// ---------------------------------------------------------------------------
// buildPendingMask
// ---------------------------------------------------------------------------

describe('buildPendingMask', () => {
  it('returns null for hintLevel 1', () => {
    expect(buildPendingMask('Hello world.', 1)).toBeNull();
  });

  it('Lv.2: first letter visible, rest underscored per word', () => {
    expect(buildPendingMask('He said.', 2)).toEqual(
      ['H', '_', ' ', 's', '_', '_', '_', '.']
    );
  });

  it('Lv.3: all alphanumeric chars replaced with underscore', () => {
    expect(buildPendingMask('He said.', 3)).toEqual(
      ['_', '_', ' ', '_', '_', '_', '_', '.']
    );
  });

  it('preserves non-alphanumeric chars in both levels', () => {
    expect(buildPendingMask('Hi!', 2)).toEqual(['H', '_', '!']);
    expect(buildPendingMask('Hi!', 3)).toEqual(['_', '_', '!']);
  });
});

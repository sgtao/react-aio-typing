export type MistypeMode = 'strict' | 'free';

export interface TypedChar {
  char: string;
  expected: string;
  correct: boolean;
  auto?: boolean;
}

export interface TypingDisplayState {
  target: string;
  typed: TypedChar[];
  position: number;
  wpm: number;
  accuracy: number;
  elapsed: number;
}

export interface TypingResults {
  wpm: number;
  accuracy: number;
  elapsed: number;
  typed: TypedChar[];
  target: string;
  mistypeCount: number;
}

export interface HandleKeyResult {
  complete?: boolean;
  correct?: boolean;
  blocked?: boolean;
  backspace?: boolean;
  ignored?: boolean;
  position?: number;
}

export class TypingEngine {
  private target: string;
  private mode: MistypeMode;
  private caseInsensitive: boolean;
  private typed: TypedChar[];
  private position: number;
  private startTime: number | null;
  private endTime: number | null;
  private strictMistypeCount: number;

  constructor(target: string, mode: MistypeMode = 'strict', caseInsensitive = false) {
    this.target = target;
    this.mode = mode;
    this.caseInsensitive = caseInsensitive;
    this.typed = [];
    this.position = 0;
    this.startTime = null;
    this.endTime = null;
    this.strictMistypeCount = 0;
    this._autoSkip();
  }

  private _isSkippable(ch: string): boolean {
    return !/[A-Za-z0-9]/.test(ch);
  }

  private _autoSkip(): void {
    while (
      this.position < this.target.length &&
      this._isSkippable(this.target[this.position])
    ) {
      this.typed.push({
        char: this.target[this.position],
        expected: this.target[this.position],
        correct: true,
        auto: true,
      });
      this.position++;
    }
  }

  start(): void {
    if (this.startTime === null) this.startTime = Date.now();
  }

  handleKey(key: string): HandleKeyResult {
    if (this.isComplete()) return { complete: true };

    this.start();

    if (key === 'Backspace') return this._handleBackspace();
    if (key.length !== 1) return { ignored: true };

    const expected = this.target[this.position];
    const correct = this.caseInsensitive
      ? key.toLowerCase() === expected.toLowerCase()
      : key === expected;

    if (this.mode === 'strict' && !correct) {
      this.strictMistypeCount++;
      return { correct: false, blocked: true };
    }

    this.typed.push({ char: key, expected, correct });
    this.position++;
    this._autoSkip();

    if (this.position >= this.target.length) {
      this.endTime = Date.now();
      return { complete: true, correct };
    }

    return { correct, position: this.position };
  }

  private _handleBackspace(): HandleKeyResult {
    if (this.mode === 'strict') return { ignored: true };
    while (this.position > 0 && this.typed[this.position - 1]?.auto) {
      this.typed.pop();
      this.position--;
    }
    if (this.position > 0) {
      this.typed.pop();
      this.position--;
    }
    return { backspace: true, position: this.position };
  }

  isComplete(): boolean {
    return this.position >= this.target.length;
  }

  getElapsed(): number {
    if (this.startTime === null) return 0;
    return (this.endTime ?? Date.now()) - this.startTime;
  }

  getWPM(): number {
    const elapsed = this.getElapsed();
    if (elapsed < 500) return 0;
    const manualCount = this.typed.filter((t) => !t.auto).length;
    return Math.round((manualCount / 5) / (elapsed / 60000));
  }

  getAccuracy(): number {
    const manual = this.typed.filter((t) => !t.auto);
    if (manual.length === 0) return 100;
    const correct = manual.filter((t) => t.correct).length;
    return Math.round((correct / manual.length) * 100);
  }

  getTotalMistypeCount(): number {
    return (
      this.strictMistypeCount +
      this.typed.filter((t) => !t.auto && !t.correct).length
    );
  }

  getDisplayState(): TypingDisplayState {
    return {
      target: this.target,
      typed: [...this.typed],
      position: this.position,
      wpm: this.getWPM(),
      accuracy: this.getAccuracy(),
      elapsed: this.getElapsed(),
    };
  }

  getResults(): TypingResults {
    return {
      wpm: this.getWPM(),
      accuracy: this.getAccuracy(),
      elapsed: this.getElapsed(),
      typed: [...this.typed],
      target: this.target,
      mistypeCount: this.getTotalMistypeCount(),
    };
  }
}

/** Lv.2 hint: each word's first letter visible, rest replaced with '_' */
export function generateHint(text: string): string {
  return text.replace(/[A-Za-z0-9']+/g, (word) => word[0] + '_'.repeat(word.length - 1));
}

/**
 * Build per-character pending mask for composition mode.
 * null = show full text (Lv.1 or typing mode).
 */
export function buildPendingMask(target: string, hintLevel: number): string[] | null {
  if (hintLevel === 1) return null;

  const mask: string[] = [];
  let wordStart = true;

  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    const isAlnum = /[A-Za-z0-9]/.test(ch);
    if (!isAlnum) {
      mask.push(ch);
      wordStart = true;
    } else if (hintLevel === 2) {
      mask.push(wordStart ? ch : '_');
      wordStart = false;
    } else {
      mask.push('_');
      wordStart = false;
    }
  }

  return mask;
}

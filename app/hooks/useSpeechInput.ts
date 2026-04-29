export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// hook 本体は Task 2 で実装
export function useSpeechInput(): never {
  throw new Error('not implemented');
}

export interface ContentItem {
  index: string;
  word: string;
  translate: string;         // slashed translation
  translateNatural: string;  // natural translation
}

export interface GameResource {
  category: string;
  contents: ContentItem[];
}

interface RawContentItem {
  index: string;
  englishText: string;
  translation: { slashed: string; natural: string };
}

export async function loadResource(file: string): Promise<GameResource> {
  const response = await fetch(file);
  const data: { category: string; contents: RawContentItem[] } = await response.json();
  return {
    category: data.category,
    contents: data.contents.map((item) => ({
      index: item.index,
      word: item.englishText,
      translate: item.translation.slashed,
      translateNatural: item.translation.natural,
    })),
  };
}

export async function checkFileExist(filePath: string): Promise<boolean> {
  try {
    const response = await fetch(filePath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

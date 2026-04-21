import type { ChapterData, ChapterSummary, ContentMeta, LexiconLookup } from "../types";

function assetPath(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath}`;
}

async function fetchJson<T>(relativePath: string): Promise<T> {
  const response = await fetch(assetPath(relativePath));
  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}`);
  }
  return (await response.json()) as T;
}

export function loadMeta(): Promise<ContentMeta> {
  return fetchJson<ContentMeta>("data/meta.json");
}

export function loadChapters(): Promise<ChapterSummary[]> {
  return fetchJson<ChapterSummary[]>("data/chapters.json");
}

export function loadLexicon(): Promise<LexiconLookup> {
  return fetchJson<LexiconLookup>("data/lexicon.json");
}

export function loadChapterData(book: number, chapter: number): Promise<ChapterData> {
  const fileName = `data/chapter-${String(book).padStart(2, "0")}-${String(chapter).padStart(2, "0")}.json`;
  return fetchJson<ChapterData>(fileName);
}

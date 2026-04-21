import type { ReaderProgress } from "../types";

const STORAGE_KEY = "lms-reader-progress:v1";

export function defaultProgress(contentVersion: string): ReaderProgress {
  return {
    contentVersion,
    lastBook: null,
    lastChapter: null,
    lastStoryId: null,
    lastSentenceIndex: 1,
    showEnglish: false,
    perChapterProgress: {},
    perStoryProgress: {},
  };
}

export function loadProgress(contentVersion: string): ReaderProgress {
  if (typeof window === "undefined") {
    return defaultProgress(contentVersion);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultProgress(contentVersion);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReaderProgress>;
    return {
      contentVersion,
      lastBook: parsed.lastBook ?? null,
      lastChapter: parsed.lastChapter ?? null,
      lastStoryId: parsed.lastStoryId ?? null,
      lastSentenceIndex: parsed.lastSentenceIndex ?? 1,
      showEnglish: parsed.showEnglish ?? false,
      perChapterProgress: parsed.perChapterProgress ?? {},
      perStoryProgress: parsed.perStoryProgress ?? {},
    };
  } catch {
    return defaultProgress(contentVersion);
  }
}

export function saveProgress(progress: ReaderProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export type TokenStatus = "known" | "new" | "prep" | "fixed";

export type TokenRecord = {
  text: string;
  lexiconWord: string;
  highlighted: boolean;
  pinyin: string;
  gloss: string;
  status: TokenStatus;
};

export type SentenceRecord = {
  id: string;
  book: number;
  chapter: number;
  sentenceIndex: number;
  chinese: string;
  englishHelper: string;
  tokens: TokenRecord[];
  sourceChunkId: string;
};

export type StoryNewWord = {
  word: string;
  pinyin: string;
  gloss: string;
};

export type StorySentence = {
  sentence_id: string;
  chinese: string;
  english_helper: string;
};

export type StoryRecord = {
  story_id: string;
  title: string;
  source_inspiration: string;
  book: number;
  chapter: number;
  source_range: string;
  target_level_note: string;
  estimated_known_coverage: number;
  new_word_count: number;
  new_words: StoryNewWord[];
  sentences: StorySentence[];
};

export type StoryLibrary = {
  stories: StoryRecord[];
};

export type ChapterData = {
  id: string;
  title: string;
  book: number;
  chapter: number;
  sentenceCount: number;
  contentVersion: string;
  sentences: SentenceRecord[];
};

export type ChapterSummary = {
  id: string;
  book: number;
  chapter: number;
  title: string;
  availability: "available" | "coming_soon";
  sentenceCount: number;
  englishWordEstimate: number;
  sourceParagraphCount: number;
  dataPath: string;
};

export type ContentMeta = {
  contentVersion: string;
  availableChapterIds: string[];
};

export type LexiconEntry = {
  word: string;
  pinyin: string;
  gloss: string;
  status: TokenStatus;
  bucket: string;
};

export type LexiconLookup = Record<string, LexiconEntry>;

export type ChapterProgress = {
  sentenceIndex: number;
  furthestSentenceIndex: number;
  updatedAt: string;
};

export type ReaderProgress = {
  contentVersion: string;
  lastBook: number | null;
  lastChapter: number | null;
  lastStoryId: string | null;
  lastSentenceIndex: number;
  showEnglish: boolean;
  perChapterProgress: Record<string, ChapterProgress>;
  perStoryProgress: Record<string, ChapterProgress>;
};

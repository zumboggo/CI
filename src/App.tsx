import { startTransition, useEffect, useState } from "react";
import storyLibraryBaseData from "../config/story_library.json";
import storyLibraryBook1Ch6To10Data from "../config/story_library_book1_ch6_10.json";
import "./styles.css";
import { loadChapters, loadLexicon, loadMeta } from "./lib/reader-data";
import { loadProgress, saveProgress } from "./lib/storage";
import type {
  ChapterSummary,
  ContentMeta,
  LexiconEntry,
  LexiconLookup,
  ReaderProgress,
  StoryLibrary,
  StoryNewWord,
  StoryRecord,
  StorySentence,
  TokenRecord,
} from "./types";

type ReaderSession = {
  story: StoryRecord;
  sentenceIndex: number;
};

type StoryProgress = {
  sentenceIndex: number;
  furthestSentenceIndex: number;
  updatedAt: string;
};

const PUNCTUATION_RE = /^[，。！？；：、“”‘’（）《》〈〉「」『』—…,.!?;:()[\]"'-]+$/;

const mergedStories = [
  ...(storyLibraryBaseData as StoryLibrary).stories,
  ...(storyLibraryBook1Ch6To10Data as StoryLibrary).stories,
];

const storyLibrary: StoryLibrary = {
  stories: [...new Map(mergedStories.map((story) => [story.story_id, story])).values()].sort(
    (left, right) =>
      left.book - right.book ||
      left.chapter - right.chapter ||
      left.story_id.localeCompare(right.story_id),
  ),
};

function clampSentenceIndex(index: number, count: number): number {
  if (count <= 0) {
    return 1;
  }
  return Math.min(Math.max(index, 1), count);
}

function chapterKey(book: number, chapter: number): string {
  return `B${String(book).padStart(2, "0")}C${String(chapter).padStart(2, "0")}`;
}

function prettyStatus(status: TokenRecord["status"]): string {
  if (status === "prep") return "Prep";
  if (status === "fixed") return "Fixed";
  if (status === "new") return "New";
  return "Known";
}

function groupByBook(chapters: ChapterSummary[]): Map<number, ChapterSummary[]> {
  const grouped = new Map<number, ChapterSummary[]>();
  for (const chapter of chapters) {
    const existing = grouped.get(chapter.book) ?? [];
    existing.push(chapter);
    grouped.set(chapter.book, existing);
  }
  return grouped;
}

function isPunctuation(text: string): boolean {
  return PUNCTUATION_RE.test(text);
}

function buildStoryLexicon(story: StoryRecord, lexicon: LexiconLookup): Map<string, LexiconEntry | StoryNewWord> {
  const combined = new Map<string, LexiconEntry | StoryNewWord>();

  for (const [word, entry] of Object.entries(lexicon)) {
    combined.set(word, entry);
  }

  for (const word of story.new_words) {
    combined.set(word.word, word);
  }

  return combined;
}

function tokenizeSentence(
  sentence: StorySentence,
  story: StoryRecord,
  lexicon: LexiconLookup,
): TokenRecord[] {
  const combinedLexicon = buildStoryLexicon(story, lexicon);
  const entries = [...combinedLexicon.keys()];
  const maxWordLength = entries.reduce((currentMax, word) => Math.max(currentMax, word.length), 1);
  const tokens: TokenRecord[] = [];
  let index = 0;

  while (index < sentence.chinese.length) {
    const currentChar = sentence.chinese[index];

    if (/\s/.test(currentChar)) {
      index += 1;
      continue;
    }

    if (isPunctuation(currentChar)) {
      tokens.push({
        text: currentChar,
        lexiconWord: "",
        highlighted: false,
        pinyin: "",
        gloss: "",
        status: "known",
      });
      index += 1;
      continue;
    }

    let matchedWord = "";
    for (let size = Math.min(maxWordLength, sentence.chinese.length - index); size > 0; size -= 1) {
      const candidate = sentence.chinese.slice(index, index + size);
      if (combinedLexicon.has(candidate)) {
        matchedWord = candidate;
        break;
      }
    }

    if (!matchedWord) {
      matchedWord = currentChar;
    }

    const entry = combinedLexicon.get(matchedWord);
    const fallbackLexiconEntry = lexicon[matchedWord];
    const pinyin = "pinyin" in (entry ?? {}) ? entry?.pinyin ?? "" : fallbackLexiconEntry?.pinyin ?? "";
    const gloss = "gloss" in (entry ?? {}) ? entry?.gloss ?? "" : fallbackLexiconEntry?.gloss ?? "";
    const status =
      fallbackLexiconEntry?.status ??
      (story.new_words.some((word) => word.word === matchedWord) ? "new" : "known");

    tokens.push({
      text: matchedWord,
      lexiconWord: matchedWord,
      highlighted: Boolean(pinyin || gloss),
      pinyin,
      gloss,
      status,
    });

    index += matchedWord.length;
  }

  return tokens;
}

function buildPerStoryProgress(progress: ReaderProgress, storyId: string, sentenceIndex: number): Record<string, StoryProgress> {
  const previous = progress.perStoryProgress[storyId];
  return {
    ...progress.perStoryProgress,
    [storyId]: {
      sentenceIndex,
      furthestSentenceIndex: Math.max(previous?.furthestSentenceIndex ?? 1, sentenceIndex),
      updatedAt: new Date().toISOString(),
    },
  };
}

export default function App() {
  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [lexicon, setLexicon] = useState<LexiconLookup>({});
  const [progress, setProgress] = useState<ReaderProgress | null>(null);
  const [session, setSession] = useState<ReaderSession | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenRecord | null>(null);
  const [loadingStoryId, setLoadingStoryId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let active = true;

    Promise.all([loadMeta(), loadChapters(), loadLexicon()])
      .then(([metaData, chapterData, lexiconData]) => {
        if (!active) {
          return;
        }
        setMeta(metaData);
        setChapters(chapterData);
        setLexicon(lexiconData);
        setProgress(loadProgress(metaData.contentVersion));
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Failed to load reader data.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!progress) {
      return;
    }
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!session) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToSentence(session.sentenceIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToSentence(session.sentenceIndex - 1);
      } else if (event.key === "Escape") {
        setSelectedToken(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session]);

  function openStory(story: StoryRecord, preferredSentenceIndex?: number) {
    if (!progress) {
      return;
    }

    setErrorMessage("");
    setLoadingStoryId(story.story_id);
    setSelectedToken(null);

    const chapterId = chapterKey(story.book, story.chapter);
    const savedStoryProgress = progress.perStoryProgress[story.story_id];
    const sentenceIndex = clampSentenceIndex(
      preferredSentenceIndex ?? savedStoryProgress?.sentenceIndex ?? 1,
      story.sentences.length,
    );

    startTransition(() => {
      setSession({ story, sentenceIndex });
      setLoadingStoryId("");
    });

    setProgress({
      ...progress,
      lastBook: story.book,
      lastChapter: story.chapter,
      lastStoryId: story.story_id,
      lastSentenceIndex: sentenceIndex,
      perChapterProgress: {
        ...progress.perChapterProgress,
        [chapterId]: {
          sentenceIndex,
          furthestSentenceIndex: Math.max(progress.perChapterProgress[chapterId]?.furthestSentenceIndex ?? 1, sentenceIndex),
          updatedAt: new Date().toISOString(),
        },
      },
      perStoryProgress: buildPerStoryProgress(progress, story.story_id, sentenceIndex),
    });
  }

  function goToSentence(nextIndex: number) {
    if (!session || !progress) {
      return;
    }

    const sentenceIndex = clampSentenceIndex(nextIndex, session.story.sentences.length);
    if (sentenceIndex === session.sentenceIndex) {
      return;
    }

    const chapterId = chapterKey(session.story.book, session.story.chapter);
    const nextProgress: ReaderProgress = {
      ...progress,
      lastBook: session.story.book,
      lastChapter: session.story.chapter,
      lastStoryId: session.story.story_id,
      lastSentenceIndex: sentenceIndex,
      perChapterProgress: {
        ...progress.perChapterProgress,
        [chapterId]: {
          sentenceIndex,
          furthestSentenceIndex: Math.max(progress.perChapterProgress[chapterId]?.furthestSentenceIndex ?? 1, sentenceIndex),
          updatedAt: new Date().toISOString(),
        },
      },
      perStoryProgress: buildPerStoryProgress(progress, session.story.story_id, sentenceIndex),
    };

    setSelectedToken(null);
    setSession({ ...session, sentenceIndex });
    setProgress(nextProgress);
  }

  function toggleEnglish() {
    if (!progress) {
      return;
    }
    setProgress({ ...progress, showEnglish: !progress.showEnglish });
  }

  function goHome() {
    setSession(null);
    setSelectedToken(null);
  }

  const currentSentence = session ? session.story.sentences[session.sentenceIndex - 1] ?? null : null;
  const currentTokens =
    currentSentence && session ? tokenizeSentence(currentSentence, session.story, lexicon) : [];
  const groupedChapters = groupByBook(chapters);
  const stories = storyLibrary.stories;
  const storiesByChapter = new Map<string, StoryRecord[]>();
  for (const story of stories) {
    const id = chapterKey(story.book, story.chapter);
    const existing = storiesByChapter.get(id) ?? [];
    existing.push(story);
    storiesByChapter.set(id, existing);
  }

  const availableStoryChapterIds = new Set(stories.map((story) => chapterKey(story.book, story.chapter)));
  const availableChapters = chapters.filter((chapter) => availableStoryChapterIds.has(chapter.id));
  const resumeStory = stories.find((story) => story.story_id === progress?.lastStoryId) ?? null;
  const resumeSentenceIndex = progress?.lastSentenceIndex ?? 1;
  const currentChapterStories = session
    ? stories.filter((story) => story.book === session.story.book && story.chapter === session.story.chapter)
    : [];

  if (errorMessage) {
    return (
      <main className="page-shell">
        <section className="message-card">
          <p className="eyebrow">Reader Error</p>
          <h1>Something stopped the reader from loading.</h1>
          <p>{errorMessage}</p>
        </section>
      </main>
    );
  }

  if (!meta || !progress) {
    return (
      <main className="page-shell">
        <section className="message-card loading-card">
          <p className="eyebrow">Loading</p>
          <h1>Preparing your reading shelf...</h1>
          <p>The chapter index, story library, and gloss data are loading.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      {!session ? (
        <section className="library-layout">
          <header className="hero-card">
            <p className="eyebrow">LMS Reader</p>
            <h1>Sentence-by-sentence Chinese stories with quick gloss support.</h1>
            <p className="hero-copy">
              Browse stories by chapter, open one self-contained episode at a time, reveal learner-friendly English
              only when needed, and keep your place automatically on this device.
            </p>
            <div className="hero-stats">
              <div>
                <span className="hero-label">Available stories</span>
                <strong>{stories.length}</strong>
              </div>
              <div>
                <span className="hero-label">Story chapters</span>
                <strong>{availableChapters.length}</strong>
              </div>
              <div>
                <span className="hero-label">Content version</span>
                <strong>{meta.contentVersion}</strong>
              </div>
            </div>
          </header>

          {resumeStory ? (
            <section className="resume-card">
              <p className="eyebrow">Resume</p>
              <h2>{resumeStory.title}</h2>
              <p>
                Continue from sentence {resumeSentenceIndex} of {resumeStory.sentences.length}
                {" "}in Book {resumeStory.book} Chapter {resumeStory.chapter}.
              </p>
              <button
                className="primary-button"
                onClick={() => openStory(resumeStory, resumeSentenceIndex)}
                disabled={loadingStoryId === resumeStory.story_id}
              >
                {loadingStoryId === resumeStory.story_id ? "Opening..." : "Resume Reading"}
              </button>
            </section>
          ) : null}

          {[...groupedChapters.entries()].map(([book, bookChapters]) => (
            <section key={book} className="chapter-group">
              <div className="section-heading">
                <p className="eyebrow">Book {book}</p>
                <h2>Chapter shelf</h2>
              </div>
              <div className="chapter-grid">
                {bookChapters.map((chapter) => {
                  const chapterStories = storiesByChapter.get(chapter.id) ?? [];

                  return (
                    <article
                      key={chapter.id}
                      className={`chapter-card ${
                        chapterStories.length > 0 ? "chapter-card-available" : "chapter-card-locked"
                      }`}
                    >
                      <div className="chapter-card-header">
                        <span className="chapter-chip">{chapter.id}</span>
                        <span className="chapter-status">
                          {chapterStories.length > 0 ? `${chapterStories.length} stories` : "Coming soon"}
                        </span>
                      </div>
                      <h3>{chapter.title}</h3>
                      <p className="chapter-meta">
                        {chapterStories.length > 0
                          ? "Choose a self-contained story from this chapter."
                          : `${chapter.englishWordEstimate.toLocaleString()} source words indexed for later adaptation`}
                      </p>
                      {chapterStories.length > 0 ? (
                        <div className="story-list">
                          {chapterStories.map((story) => {
                            const storyProgress = progress.perStoryProgress[story.story_id];
                            return (
                              <button
                                key={story.story_id}
                                className="story-button"
                                onClick={() => openStory(story)}
                                disabled={loadingStoryId === story.story_id}
                              >
                                <span className="story-button-title">{story.title}</span>
                                <span className="story-button-meta">
                                  {story.sentences.length} sentences
                                  {storyProgress
                                    ? ` • resumed at ${storyProgress.furthestSentenceIndex}`
                                    : ` • ${story.new_word_count} new words`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="coming-soon-copy">
                          This chapter is indexed, but no app-ready self-contained story is stored yet.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      ) : currentSentence ? (
        <section className="reader-layout">
          <header className="reader-topbar">
            <button className="ghost-button" onClick={goHome}>
              Back to stories
            </button>
            <div className="reader-title">
              <p className="eyebrow">
                Book {session.story.book} Chapter {session.story.chapter}
              </p>
              <h1>{session.story.title}</h1>
            </div>
            <div className="reader-jump-group">
              <label className="chapter-jump">
                <span>Jump chapter</span>
                <select
                  value={chapterKey(session.story.book, session.story.chapter)}
                  onChange={(event) => {
                    const nextStories = storiesByChapter.get(event.target.value) ?? [];
                    if (nextStories[0]) {
                      openStory(nextStories[0]);
                    }
                  }}
                >
                  {availableChapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="chapter-jump">
                <span>Jump story</span>
                <select
                  value={session.story.story_id}
                  onChange={(event) => {
                    const nextStory = stories.find((story) => story.story_id === event.target.value);
                    if (nextStory) {
                      openStory(nextStory);
                    }
                  }}
                >
                  {currentChapterStories.map((story) => (
                    <option key={story.story_id} value={story.story_id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          <section className="reader-main-card">
            <div className="reader-status-row reader-status-row-compact">
              <div>
                <p className="eyebrow">Sentence</p>
                <strong>
                  {session.sentenceIndex} / {session.story.sentences.length}
                </strong>
              </div>
              <div>
                <p className="eyebrow">Known coverage</p>
                <strong>{Math.round(session.story.estimated_known_coverage * 100)}%</strong>
              </div>
              <div>
                <p className="eyebrow">New words</p>
                <strong>{session.story.new_word_count}</strong>
              </div>
              <div>
                <p className="eyebrow">English reveal</p>
                <strong>{progress.showEnglish ? "On" : "Off"}</strong>
              </div>
            </div>

            <div className="reader-body-grid">
              <div className="reader-content-column">
                <div className="sentence-panel">
                  <p className="sentence-label">Chinese</p>
                  <div className="sentence-line" lang="zh-Hans">
                    {currentTokens.map((token, index) =>
                      token.highlighted ? (
                        <button
                          key={`${currentSentence.sentence_id}-${index}`}
                          className={`token token-${token.status} ${isPunctuation(token.text) ? "token-punctuation" : ""}`}
                          onClick={() => setSelectedToken(token)}
                        >
                          {token.text}
                        </button>
                      ) : (
                        <span
                          key={`${currentSentence.sentence_id}-${index}`}
                          className={`token token-plain ${isPunctuation(token.text) ? "token-punctuation" : ""}`}
                        >
                          {token.text}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="reader-actions">
                    <button className="secondary-button" onClick={toggleEnglish}>
                      {progress.showEnglish ? "Hide English" : "Show English"}
                    </button>
                  </div>
                  {progress.showEnglish ? (
                    <div className="english-panel">
                      <p className="sentence-label">Helper English</p>
                      <p>{currentSentence.english_helper}</p>
                    </div>
                  ) : null}
                </div>

                <footer className="reader-footer">
                  <button
                    className="secondary-button"
                    onClick={() => goToSentence(session.sentenceIndex - 1)}
                    disabled={session.sentenceIndex <= 1}
                  >
                    Previous
                  </button>
                  <div className="reader-footer-copy">
                    <p>
                      Progress is saved locally. Keyboard: <kbd>←</kbd> <kbd>→</kbd> to move, <kbd>Esc</kbd> to close glosses.
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => goToSentence(session.sentenceIndex + 1)}
                    disabled={session.sentenceIndex >= session.story.sentences.length}
                  >
                    {session.sentenceIndex >= session.story.sentences.length ? "End of story" : "Next"}
                  </button>
                </footer>
              </div>

              {selectedToken ? (
                <aside className="gloss-panel gloss-panel-sidebar">
                  <div className="gloss-heading">
                    <div>
                      <p className="eyebrow">Word gloss</p>
                      <h2>{selectedToken.lexiconWord || selectedToken.text}</h2>
                    </div>
                    <button className="ghost-button" onClick={() => setSelectedToken(null)}>
                      Close
                    </button>
                  </div>
                  <dl className="gloss-grid gloss-grid-sidebar">
                    <div>
                      <dt>Pinyin</dt>
                      <dd>{selectedToken.pinyin || "—"}</dd>
                    </div>
                    <div>
                      <dt>English</dt>
                      <dd>{selectedToken.gloss || lexicon[selectedToken.lexiconWord]?.gloss || "—"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{prettyStatus(selectedToken.status)}</dd>
                    </div>
                  </dl>
                </aside>
              ) : (
                <aside className="gloss-panel gloss-panel-empty gloss-panel-sidebar">
                  <p className="eyebrow">Tap a highlighted word</p>
                  <p>Highlighted words open a gloss card here, so you can read and check meaning without scrolling.</p>
                </aside>
              )}
            </div>
          </section>
        </section>
      ) : null}
    </main>
  );
}

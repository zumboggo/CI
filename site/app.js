const STORAGE_KEY = "ci-reader-progress:v1";
const TITLE = "LMS Reader";

async function loadContent() {
  const response = await fetch("./data/content.json");
  if (!response.ok) {
    throw new Error("Failed to load content.json");
  }
  return response.json();
}

function defaultProgress() {
  return {
    lastChapterId: null,
    lastSentenceIndex: 1,
    showEnglish: false,
    perChapter: {},
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return {
      lastChapterId: parsed.lastChapterId ?? null,
      lastSentenceIndex: parsed.lastSentenceIndex ?? 1,
      showEnglish: Boolean(parsed.showEnglish),
      perChapter: parsed.perChapter ?? {},
    };
  } catch {
    return defaultProgress();
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function chapterSentenceCount(chapter) {
  return chapter.sentences.length;
}

function clampSentence(index, chapter) {
  return Math.min(Math.max(index, 1), chapterSentenceCount(chapter));
}

function prettyStatus(status) {
  if (status === "fixed") return "Fixed";
  if (status === "prep") return "Prep";
  if (status === "new") return "New";
  return "Known";
}

function createTokenHtml(sentence) {
  return sentence.text.split(" ").map((token) => {
    const gloss = sentence.glosses[token];
    if (!gloss) {
      return `<span class="token">${escapeHtml(token)}</span>`;
    }
    return `<button class="token-button status-${gloss.status || "known"}" data-token="${encodeURIComponent(token)}">${escapeHtml(token)}</button>`;
  }).join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appState(content) {
  return {
    content,
    progress: loadProgress(),
    activeChapterId: null,
    activeSentenceIndex: 1,
    selectedGlossToken: null,
  };
}

function getChapterMap(content) {
  return new Map(content.chapters.map((chapter) => [chapter.id, chapter]));
}

function updateChapterProgress(state) {
  if (!state.activeChapterId) return;
  const chapter = getChapterMap(state.content).get(state.activeChapterId);
  if (!chapter) return;
  const current = state.progress.perChapter[state.activeChapterId] || { furthestSentenceIndex: 1 };
  state.progress.lastChapterId = state.activeChapterId;
  state.progress.lastSentenceIndex = state.activeSentenceIndex;
  state.progress.perChapter[state.activeChapterId] = {
    sentenceIndex: state.activeSentenceIndex,
    furthestSentenceIndex: Math.max(current.furthestSentenceIndex || 1, state.activeSentenceIndex),
  };
  saveProgress(state.progress);
}

function openChapter(state, chapterId, preferredSentenceIndex) {
  const chapter = getChapterMap(state.content).get(chapterId);
  if (!chapter) return;
  const saved = state.progress.perChapter[chapterId];
  state.activeChapterId = chapterId;
  state.activeSentenceIndex = clampSentence(preferredSentenceIndex ?? saved?.sentenceIndex ?? 1, chapter);
  state.selectedGlossToken = null;
  updateChapterProgress(state);
  render(state);
}

function moveSentence(state, delta) {
  if (!state.activeChapterId) return;
  const chapter = getChapterMap(state.content).get(state.activeChapterId);
  if (!chapter) return;
  const next = clampSentence(state.activeSentenceIndex + delta, chapter);
  if (next === state.activeSentenceIndex) return;
  state.activeSentenceIndex = next;
  state.selectedGlossToken = null;
  updateChapterProgress(state);
  render(state);
}

function renderHome(state) {
  const chapters = state.content.chapters;
  const resumeChapter = chapters.find((chapter) => chapter.id === state.progress.lastChapterId) || null;

  return `
    <section class="hero">
      <p class="eyebrow">${TITLE}</p>
      <h1>Sentence-by-sentence Chinese reading with tap-to-gloss support.</h1>
      <p>Read the pilot chapters one sentence at a time, reveal helper English when needed, and keep your place automatically on this device.</p>
    </section>
    ${resumeChapter ? `
      <section class="card resume-card">
        <p class="eyebrow">Resume</p>
        <h2>${escapeHtml(resumeChapter.title)}</h2>
        <p>Continue from sentence ${state.progress.lastSentenceIndex} of ${chapterSentenceCount(resumeChapter)}.</p>
        <div class="button-row">
          <button class="primary-button" data-action="resume">Resume Reading</button>
        </div>
      </section>
    ` : ""}
    <section class="card">
      <p class="eyebrow">Available Chapters</p>
      <div class="chapter-grid">
        ${chapters.map((chapter) => {
          const saved = state.progress.perChapter[chapter.id];
          const progressCopy = saved
            ? `Furthest progress: sentence ${saved.furthestSentenceIndex}`
            : "Not started yet";
          return `
            <article class="chapter-card">
              <p class="eyebrow">${chapter.id}</p>
              <h3>${escapeHtml(chapter.title)}</h3>
              <p>${chapterSentenceCount(chapter)} learner sentences</p>
              <p>${progressCopy}</p>
              <div class="button-row">
                <button class="secondary-button" data-action="open-chapter" data-chapter-id="${chapter.id}">Open chapter</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderReader(state) {
  const chapter = getChapterMap(state.content).get(state.activeChapterId);
  if (!chapter) return renderHome(state);
  const sentence = chapter.sentences[state.activeSentenceIndex - 1];
  const selected = state.selectedGlossToken ? sentence.glosses[state.selectedGlossToken] : null;

  return `
    <section class="reader-card">
      <div class="reader-header">
        <div>
          <p class="eyebrow">${chapter.id}</p>
          <h1>${escapeHtml(chapter.title)}</h1>
        </div>
        <div class="button-row">
          <button class="ghost-button" data-action="back-home">Back to chapters</button>
          <select data-action="jump-chapter">
            ${state.content.chapters.map((item) => `<option value="${item.id}" ${item.id === chapter.id ? "selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="reader-meta">
        <div class="card"><p class="eyebrow">Sentence</p><strong>${state.activeSentenceIndex} / ${chapterSentenceCount(chapter)}</strong></div>
        <div class="card"><p class="eyebrow">English</p><strong>${state.progress.showEnglish ? "Visible" : "Hidden"}</strong></div>
        <div class="card"><p class="eyebrow">Progress</p><strong>Saved locally</strong></div>
      </div>

      <div class="sentence-panel">
        <p class="sentence-label">Chinese</p>
        <div class="sentence-line">${createTokenHtml(sentence)}</div>
        <div class="button-row" style="margin-top:18px;">
          <button class="secondary-button" data-action="toggle-english">${state.progress.showEnglish ? "Hide English" : "Show English"}</button>
        </div>
        ${state.progress.showEnglish ? `
          <div class="card english-panel">
            <p class="sentence-label">Helper English</p>
            <p>${escapeHtml(sentence.english)}</p>
          </div>
        ` : ""}
      </div>

      <div class="gloss-card">
        ${selected ? `
          <p class="eyebrow">Word gloss</p>
          <h2>${escapeHtml(selected.word)}</h2>
          <dl class="gloss-grid">
            <div><dt>Pinyin</dt><dd>${escapeHtml(selected.pinyin || "—")}</dd></div>
            <div><dt>English</dt><dd>${escapeHtml(selected.gloss || "—")}</dd></div>
            <div><dt>Status</dt><dd>${prettyStatus(selected.status)}</dd></div>
          </dl>
        ` : `
          <p class="eyebrow">Tap a highlighted word</p>
          <h2>Quick gloss panel</h2>
          <p>Highlighted words show pinyin and an English gloss here.</p>
        `}
      </div>

      <div class="footer-row">
        <button class="secondary-button" data-action="prev-sentence" ${state.activeSentenceIndex <= 1 ? "disabled" : ""}>Previous</button>
        <p class="footer-copy">Progress is saved automatically in this browser. Use the chapter picker any time.</p>
        <button class="primary-button" data-action="next-sentence" ${state.activeSentenceIndex >= chapterSentenceCount(chapter) ? "disabled" : ""}>${state.activeSentenceIndex >= chapterSentenceCount(chapter) ? "End of chapter" : "Next"}</button>
      </div>
    </section>
  `;
}

function bindEvents(state) {
  const app = document.getElementById("app");
  if (!app) return;

  app.querySelectorAll("[data-action='open-chapter']").forEach((button) => {
    button.addEventListener("click", () => openChapter(state, button.getAttribute("data-chapter-id")));
  });

  const resume = app.querySelector("[data-action='resume']");
  if (resume) {
    resume.addEventListener("click", () => openChapter(state, state.progress.lastChapterId, state.progress.lastSentenceIndex));
  }

  const back = app.querySelector("[data-action='back-home']");
  if (back) {
    back.addEventListener("click", () => {
      state.activeChapterId = null;
      state.selectedGlossToken = null;
      render(state);
    });
  }

  const prev = app.querySelector("[data-action='prev-sentence']");
  if (prev) prev.addEventListener("click", () => moveSentence(state, -1));

  const next = app.querySelector("[data-action='next-sentence']");
  if (next) next.addEventListener("click", () => moveSentence(state, 1));

  const toggleEnglish = app.querySelector("[data-action='toggle-english']");
  if (toggleEnglish) {
    toggleEnglish.addEventListener("click", () => {
      state.progress.showEnglish = !state.progress.showEnglish;
      saveProgress(state.progress);
      render(state);
    });
  }

  const jump = app.querySelector("[data-action='jump-chapter']");
  if (jump) {
    jump.addEventListener("change", (event) => openChapter(state, event.target.value));
  }

  app.querySelectorAll("[data-token]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedGlossToken = decodeURIComponent(button.getAttribute("data-token"));
      render(state);
    });
  });
}

function render(state) {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = state.activeChapterId ? renderReader(state) : renderHome(state);
  bindEvents(state);
}

window.addEventListener("keydown", (event) => {
  if (!window.__readerState || !window.__readerState.activeChapterId) return;
  if (event.key === "ArrowRight") moveSentence(window.__readerState, 1);
  if (event.key === "ArrowLeft") moveSentence(window.__readerState, -1);
  if (event.key === "Escape") {
    window.__readerState.selectedGlossToken = null;
    render(window.__readerState);
  }
});

loadContent()
  .then((content) => {
    const state = appState(content);
    window.__readerState = state;
    render(state);
  })
  .catch((error) => {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = `<div class="card loading-card"><p class="eyebrow">Error</p><h1>Reader failed to load.</h1><p>${escapeHtml(error.message || "Unknown error")}</p></div>`;
  });

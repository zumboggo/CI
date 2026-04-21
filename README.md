# LMS Controlled-Vocabulary Retelling

This workspace turns `The Legendary Moonlight Sculptor` into a controlled-vocabulary Chinese reading project.

## Web Reader

The workspace now also includes a static React reader webapp for the pilot chapters.

- One Chinese sentence at a time
- Clickable highlighted words with pinyin and English gloss
- Optional helper-English reveal for the full sentence
- Chapter picker with available vs. coming-soon chapters
- Local progress saving in the browser
- Story-based navigation within each chapter
- A desktop sidebar gloss panel to reduce scrolling on smaller laptops

### Run the reader

```powershell
npm.cmd install
npm.cmd run dev
```

### Build the reader

```powershell
npm.cmd run build
```

The repo includes prebuilt reader data in `public/data/`, so deployment does not depend on regenerating content first.

If you want to rebuild the sentence-level data locally, use:

```powershell
npm.cmd run build:content
```

This emits static browser-ready assets into `public/data/`. The production site bundle is emitted into `dist/`.

## What This Builds

- A normalized known-word baseline from `Known.txt`
- A locked master lexicon with:
  - 467 imported known words
  - 500 chosen target words
  - 33 reserve slots
- A chapter/chunk manifest extracted from the EPUB
- Pilot graded-Chinese chunks for Book 1 Chapters 1-3
- Self-contained mini-stories for easier 95%-coverage reading
- Coverage and vocabulary audit reports

## Project Layout

- `config/story_generation_instructions.md`
  - Default brief for future story creation
- `config/story_library.json`
  - Structured self-contained story data for the app
- `Story Text Files/`
  - Plain text story exports for LingQ or other platforms
- `src/`
  - React reader app source
- `public/data/`
  - Reader JSON assets
- `scripts/build_lms_project.py`
  - Main build script
- `scripts/build-reader-content.mjs`
  - Builds sentence-level JSON assets for the web reader
- `output/`
  - Generated manifests, lexicon tables, reports, and pilot exports

## Notes

- Imported known words keep their normalized Chinese form, but most of their metadata is intentionally blank for now.
- New target words are the controlled-vocabulary layer for the graded retelling.
- Reserve slots are left empty on purpose so late-book vocabulary pressure can be handled without changing the project structure.

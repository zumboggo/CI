# LMS Reader

This project turns *The Legendary Moonlight Sculptor* into a Chinese reading app built around short, easier, self-contained stories.

The current focus is:

- sentence-by-sentence reading
- clickable glosses
- self-contained LMS-based mini-stories
- plain text exports for other reading platforms

## Start Here

- Web app source: `src/`
- Story instructions: `config/story_generation_instructions.md`
- Structured story data: `config/story_library.json`
- Plain text story exports: `Story Text Files/`
- Reader data used by the site: `public/data/`

## Reader Features

- One Chinese sentence at a time
- Click highlighted words for pinyin and English gloss
- Toggle helper English for the current sentence
- Choose stories by chapter
- Resume where you left off on the same device
- Desktop sidebar gloss panel to avoid extra scrolling

## Local Run

```powershell
npm.cmd install
npm.cmd run dev
```

## Production Build

```powershell
npm.cmd run build
```

The production site is built into `dist/`.

## Content Workflow

### Add or revise stories

1. Follow `config/story_generation_instructions.md`
2. Store structured story data in `config/story_library.json`
3. Optionally export a plain text version into `Story Text Files/`

### Rebuild reader data

```powershell
npm.cmd run build:content
```

This refreshes the browser-ready JSON in `public/data/`.

## Main Folders

- `src/`
  React reader app
- `public/data/`
  chapter data, lexicon data, and reader metadata
- `config/`
  story rules, story library, and older vocabulary project inputs
- `Story Text Files/`
  plain text story exports for LingQ or similar tools
- `scripts/`
  build scripts for reader data and earlier lexicon/chunk pipelines
- `output/`
  generated reports and older controlled-vocabulary pipeline outputs

## Notes

- The repo still contains the older lexicon/chunk pipeline because it is part of the project history and can still be useful for future content work.
- The reader app is now the main entry point.
- GitHub Pages builds the site directly from the source app and `public/data/`.

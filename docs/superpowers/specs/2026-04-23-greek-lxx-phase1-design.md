# Greek LXX Phase 1 — Design Spec
_Date: 2026-04-23_

## Goal
Add original Greek LXX text to the Ethiopian Bible app as a toggleable translation row, displayed in GFS Didot font. Phase 1 is plain text only; Phase 2 (word chips) is out of scope here.

## Data Model
- Add `translations.grk` (string) to verse objects in `public/data/chapters/{book}/{chapter}.json`
- Same shape as existing `.lxx`, `.kjv`, `.ron` fields
- No other schema changes

## Import Pipeline
- Script: `scripts/import-lxx-greek.mjs`
- Source: OpenScriptures LXX JSON (GitHub: `jonathanrobie/ccat-lxx` or equivalent structured JSON by book/chapter/verse)
- Writes `translations.grk` into existing chapter JSON files
- Skips verses/books with no matching JSON file (same pattern as Romanian importers)
- Coverage: all OT canonical + deuterocanonical books the app already has chapter data for

## Settings
- New field: `showGrk: boolean` in `ReaderSettings` (default `false`)
- New toggle: "Greek LXX" in the settings panel, same row pattern as LXX/KJV/Romanian
- Persisted in localStorage alongside existing settings

## UI — VerseView.tsx
- Greek row rendered in `TranslationBlock` and `CompareModeBlock` when `showGrk` is on and `verse.translations?.grk` exists
- Same bordered label pattern: `border-l border-grk-border/60 pl-3`, label "Greek LXX" in accent colour
- Font: GFS Didot via Google Fonts (`@import` or `<link>` in index.html), applied via `font-grk` Tailwind utility or inline `fontFamily`
- Font size: same scale as other translation rows (`fontSize * 0.85`), but `line-height: 1.65` (Greek polytonic needs more breathing room)
- Colour token: `--color-grk` (teal-green accent, close to `#6b9e8a`) added to Tailwind theme

## Phase 2 (out of scope)
- `grk_words: Array<{ word, transliteration, gloss }>` per verse
- Rendered as word chips in Study mode, matching Ge'ez word cards
- Driven by CATSS morphology data
- Nothing in Phase 1 blocks this addition

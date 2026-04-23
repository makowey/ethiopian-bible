# Greek LXX Phase 1 — Plain Text Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable Greek LXX plain-text row to every verse that has LXX coverage, displayed in GFS Didot font, imported via a one-time script from a public structured dataset.

**Architecture:** Add `translations.grk` as a new string field alongside the existing `lxx`/`kjv`/`ron` fields. The import script downloads a CSV from `scrollmapper/bible_databases` and writes Greek text into the existing chapter JSON files. The UI follows the same bordered-label pattern as other translation rows, guarded by a new `showGrk` setting.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS v4 + Vite; Node.js ESM import script; GFS Didot from Google Fonts.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/bible.ts` | Modify | Add `grk` to `Translations`; add `showGrk` to `ReaderSettings` + `DEFAULT_SETTINGS` |
| `src/index.css` | Modify | Add `--color-grk*` tokens; add `--font-grk` declaration |
| `index.html` | Modify | Add GFS Didot Google Fonts `<link>` |
| `src/components/Settings.tsx` | Modify | Add "Greek LXX" checkbox toggle |
| `src/components/VerseView.tsx` | Modify | Render Greek row in `TranslationBlock` and `CompareModeBlock` |
| `scripts/import-lxx-greek.mjs` | Create | Download + parse LXX CSV; write `translations.grk` into chapter JSON files |

---

## Task 1: Types, settings, color tokens

**Files:**
- Modify: `src/types/bible.ts`
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Add `grk` to the `Translations` interface**

In `src/types/bible.ts`, update the `Translations` interface:

```ts
export interface Translations {
  lxx?: string
  kjv?: string
  ron?: string
  'geez-source'?: string
  ai?: TranslationEntry
  grk?: string             // ← add this line
}
```

- [ ] **Step 2: Add `showGrk` to `ReaderSettings` and `DEFAULT_SETTINGS`**

In `src/types/bible.ts`, update both the interface and defaults:

```ts
export interface ReaderSettings {
  readingMode: ReadingMode
  showTransliteration: boolean
  showLxx: boolean
  showKjv: boolean
  showRon: boolean
  showGeezSource: boolean
  showAiTranslation: boolean
  showGrk: boolean          // ← add this line
  fontSize: number
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  readingMode: 'read',
  showTransliteration: true,
  showLxx: true,
  showKjv: true,
  showRon: true,
  showGeezSource: true,
  showAiTranslation: true,
  showGrk: false,           // ← add this line (off by default)
  fontSize: 20,
}
```

- [ ] **Step 3: Add Greek color tokens and font variable to `src/index.css`**

Add these lines inside the `@theme { }` block, after the `--color-ai-border` line:

```css
  --color-grk:             #3d6b5a;
  --color-grk-bg:          rgba(61, 107, 90, 0.07);
  --color-grk-border:      rgba(61, 107, 90, 0.30);
  --font-grk:              "GFS Didot", "Palatino Linotype", Palatino, Georgia, serif;
```

- [ ] **Step 4: Add GFS Didot to Google Fonts in `index.html`**

Add a `<link>` tag inside `<head>`, after the existing `<title>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=GFS+Didot&display=swap" rel="stylesheet">
```

- [ ] **Step 5: Commit**

```bash
git add src/types/bible.ts src/index.css index.html
git commit -m "feat: add grk type field, showGrk setting, GFS Didot font tokens"
```

---

## Task 2: Settings panel toggle

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Add the Greek LXX checkbox to the Translation Sources fieldset**

In `src/components/Settings.tsx`, inside the `Translation Sources` fieldset `<div className="space-y-2.5">`, add a new `<label>` after the existing "Ge'ez source" label:

```tsx
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    checked={settings.showGrk}
    onChange={e => onUpdate({ showGrk: e.target.checked })}
    className="w-4 h-4 rounded border-border accent-accent"
  />
  <span className="w-1.5 h-1.5 rounded-full bg-grk flex-shrink-0" aria-hidden="true" />
  <span className="text-sm font-body text-text">Greek LXX</span>
</label>
```

Place it **before** the existing "AI draft translations" label so the order is: Septuagint → KJV → Romanian → Ge'ez source → Greek LXX → AI draft.

- [ ] **Step 2: Verify in the browser**

Run `npm run dev` (if not already running). Open the app → settings panel → confirm "Greek LXX" checkbox appears with a teal dot, toggles without error, and the TypeScript compiler shows no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Settings.tsx
git commit -m "feat: add Greek LXX toggle to settings panel"
```

---

## Task 3: Greek row in VerseView

**Files:**
- Modify: `src/components/VerseView.tsx`

- [ ] **Step 1: Destructure `showGrk` from settings in the main `VerseView` component**

Find the destructuring line at the top of `VerseView`:

```tsx
const { readingMode, showTransliteration, showLxx, showKjv, showRon, showAiTranslation, fontSize } = settings
```

Replace it with:

```tsx
const { readingMode, showTransliteration, showLxx, showKjv, showRon, showAiTranslation, showGrk, fontSize } = settings
```

- [ ] **Step 2: Include `hasGrk` in the `hasDual` check**

Find these lines:

```tsx
const hasLxx = showLxx && verse.translations?.lxx
const hasKjv = showKjv && verse.translations?.kjv
const hasRon = showRon && verse.translations?.ron
const hasDual = !!(hasLxx || hasKjv || hasRon)
```

Replace with:

```tsx
const hasLxx = showLxx && verse.translations?.lxx
const hasKjv = showKjv && verse.translations?.kjv
const hasRon = showRon && verse.translations?.ron
const hasGrk = showGrk && verse.translations?.grk
const hasDual = !!(hasLxx || hasKjv || hasRon || hasGrk)
```

- [ ] **Step 3: Pass `showGrk` into `TranslationBlock` and `CompareModeBlock`**

Find where `TranslationBlock` is rendered and add the prop:

```tsx
{readingMode === 'study' && (
  <TranslationBlock
    verse={verse}
    hasDual={!!hasDual}
    showLxx={showLxx}
    showKjv={showKjv}
    showRon={showRon}
    showGrk={showGrk}
    showAiTranslation={showAiTranslation}
    fontSize={fontSize}
  />
)}
```

And for `CompareModeBlock`:

```tsx
{readingMode === 'compare' && (
  <CompareModeBlock
    verse={verse}
    hasDual={!!hasDual}
    showLxx={showLxx}
    showKjv={showKjv}
    showRon={showRon}
    showGrk={showGrk}
    showAiTranslation={showAiTranslation}
    fontSize={fontSize}
  />
)}
```

- [ ] **Step 4: Add `showGrk` to `TranslationBlock`'s props interface and render**

Find the `TranslationBlock` function signature:

```tsx
function TranslationBlock({
  verse,
  hasDual,
  showLxx,
  showKjv,
  showRon,
  showAiTranslation,
  fontSize,
}: {
  verse: Verse
  hasDual: boolean
  showLxx: boolean
  showKjv: boolean
  showRon: boolean
  showAiTranslation: boolean
  fontSize: number
})
```

Replace with:

```tsx
function TranslationBlock({
  verse,
  hasDual,
  showLxx,
  showKjv,
  showRon,
  showGrk,
  showAiTranslation,
  fontSize,
}: {
  verse: Verse
  hasDual: boolean
  showLxx: boolean
  showKjv: boolean
  showRon: boolean
  showGrk: boolean
  showAiTranslation: boolean
  fontSize: number
})
```

Inside the `return` block of `TranslationBlock`, after the `showRon` block and before the `showAiTranslation` block, add:

```tsx
{showGrk && verse.translations?.grk && (
  <div className="border-l border-grk-border/60 pl-3">
    <span className="text-grk/60 text-[0.65rem] font-body italic tracking-wide">
      Greek LXX
    </span>
    <p
      className="verse-text text-text mt-0.5"
      style={{ fontSize: fontSize * 0.85, fontFamily: 'var(--font-grk)', lineHeight: 1.65 }}
    >
      {verse.translations.grk}
    </p>
  </div>
)}
```

Also update the fallback condition at the bottom to include `showGrk`:

```tsx
{!showLxx && !showKjv && !showRon && !showGrk && !showAiTranslation && verse.translation && (
  <p className="verse-text text-text" style={{ fontSize: fontSize * 0.85 }}>
    {verse.translation}
  </p>
)}
```

- [ ] **Step 5: Add `showGrk` to `CompareModeBlock`'s props interface and render**

Find the `CompareModeBlock` function signature and update it exactly as done for `TranslationBlock` — add `showGrk: boolean` to both destructuring and the type annotation.

Inside the grid `return` block of `CompareModeBlock`, after the `showRon` block and before `showAiTranslation`, add:

```tsx
{showGrk && verse.translations?.grk && (
  <div className="border-l border-grk-border/60 pl-3">
    <span className="text-grk/60 text-[0.65rem] font-body italic tracking-wide">
      Greek LXX
    </span>
    <p
      className="verse-text text-text mt-0.5"
      style={{ fontSize: fontSize * 0.85, fontFamily: 'var(--font-grk)', lineHeight: 1.65 }}
    >
      {verse.translations.grk}
    </p>
  </div>
)}
```

- [ ] **Step 6: Verify in the browser**

With `npm run dev` running:
1. Toggle "Greek LXX" on in Settings
2. Confirm no Greek rows appear yet (no data imported yet) and no errors in the console
3. TypeScript compiler should show no errors (`npm run build` or check Vite output)

- [ ] **Step 7: Commit**

```bash
git add src/components/VerseView.tsx
git commit -m "feat: render Greek LXX translation row in study and compare modes"
```

---

## Task 4: Import script — download and populate `translations.grk`

**Files:**
- Create: `scripts/import-lxx-greek.mjs`

The data source is the `scrollmapper/bible_databases` GitHub repository, which provides the LXX (Rahlfs) as a CSV with columns `id, b, c, v, t` where `b` is a 1-based book number, `c` is chapter, `v` is verse, and `t` is the Greek text (Unicode polytonic).

Download URL:
```
https://raw.githubusercontent.com/scrollmapper/bible_databases/master/csv_format/t_LXX.csv
```

- [ ] **Step 1: Download the LXX CSV**

```bash
curl -L "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/csv_format/t_LXX.csv" \
  -o /tmp/t_LXX.csv
head -5 /tmp/t_LXX.csv
```

Expected output (first few lines):
```
id,b,c,v,t
1001001,1,1,1,Ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.
1001002,1,1,2,...
```

- [ ] **Step 2: Create the import script**

Create `scripts/import-lxx-greek.mjs`:

```js
#!/usr/bin/env node
/**
 * Imports Greek LXX plain text (Rahlfs) from the scrollmapper CSV into
 * public/data/chapters/{book}/{chapter}.json as translations.grk.
 *
 * CSV format: id,b,c,v,t  (b = 1-based book number, t = Greek Unicode text)
 *
 * Usage:
 *   node scripts/import-lxx-greek.mjs /tmp/t_LXX.csv
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data/chapters')

const csvPath = process.argv[2] ?? '/tmp/t_LXX.csv'

// ── Book number → app abbreviation mapping ────────────────────────────────────
// Scrollmapper uses the standard 66-book Protestant order for OT (1-39),
// but the LXX CSV extends into deuterocanonical books.
// Only books present in the app's chapter data are mapped.
const BOOK_MAP = {
   1: 'Gen',   2: 'Exod',  3: 'Lev',   4: 'Num',   5: 'Deut',
   6: 'Josh',  7: 'Judg',  8: 'Ruth',  9: '1Sam', 10: '2Sam',
  11: '1Kgs', 12: '2Kgs', 13: '1Chr', 14: '2Chr', 15: 'Ezra',
  16: 'Neh',  17: 'EsthGk',18: 'Job',  19: 'Ps',   20: 'Prov',
  21: 'Eccl', 22: 'Song', 23: 'Isa',  24: 'Jer',  25: 'Lam',
  26: 'Ezek', 27: 'Dan',  28: 'Hos',  29: 'Joel', 30: 'Amos',
  31: 'Obad', 32: 'Jonah',33: 'Mic',  34: 'Nah',  35: 'Hab',
  36: 'Zeph', 37: 'Hag',  38: 'Zech', 39: 'Mal',
  // Deuterocanonical (LXX-only books in scrollmapper):
  67: 'Tob',  68: 'Jdt',  69: '1Macc',70: '2Macc',
  71: 'Wis',  72: 'Sir',  73: 'Bar',  74: '1Esd',
}

// ── Parse CSV into nested map: book → chapter → verse → text ─────────────────
console.log(`Reading ${csvPath}...`)
const raw = fs.readFileSync(csvPath, 'utf8')
const lines = raw.split('\n')

/** @type {Map<string, Map<number, Map<number, string>>>} bookAbbrev → ch → v → text */
const data = new Map()

let parsed = 0, skipped = 0

for (let i = 1; i < lines.length; i++) {   // skip header
  const line = lines[i].trim()
  if (!line) continue

  // CSV may have quoted fields with commas inside — but the Greek text doesn't
  // contain commas, so a simple split(,) with a limit of 5 is safe.
  const comma1 = line.indexOf(',')
  const comma2 = line.indexOf(',', comma1 + 1)
  const comma3 = line.indexOf(',', comma2 + 1)
  const comma4 = line.indexOf(',', comma3 + 1)
  if (comma4 === -1) { skipped++; continue }

  const b = parseInt(line.slice(comma1 + 1, comma2), 10)
  const c = parseInt(line.slice(comma2 + 1, comma3), 10)
  const v = parseInt(line.slice(comma3 + 1, comma4), 10)
  const t = line.slice(comma4 + 1).trim().replace(/^"|"$/g, '')

  if (!b || !c || !v || !t) { skipped++; continue }

  const abbrev = BOOK_MAP[b]
  if (!abbrev) { skipped++; continue }

  if (!data.has(abbrev)) data.set(abbrev, new Map())
  const bookMap = data.get(abbrev)
  if (!bookMap.has(c)) bookMap.set(c, new Map())
  bookMap.get(c).set(v, t)
  parsed++
}

console.log(`Parsed ${parsed} verses, skipped ${skipped} lines.`)

// ── Write into JSON files ─────────────────────────────────────────────────────
let updated = 0, unchanged = 0, missing = 0

for (const [bookAbbrev, chapMap] of data) {
  for (const [chNum, verseMap] of chapMap) {
    const jsonPath = path.join(DATA_DIR, bookAbbrev, `${chNum}.json`)
    if (!fs.existsSync(jsonPath)) { missing++; continue }

    const chData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    if (!chData.verses?.length) { unchanged++; continue }

    let changed = false
    for (const verse of chData.verses) {
      const grk = verseMap.get(verse.num)
      if (grk) {
        verse.translations = verse.translations ?? {}
        if (verse.translations.grk !== grk) {
          verse.translations.grk = grk
          changed = true
        }
      }
    }

    if (changed) {
      fs.writeFileSync(jsonPath, JSON.stringify(chData, null, 2), 'utf8')
      updated++
    } else {
      unchanged++
    }
  }
}

console.log(`Done. Updated: ${updated} chapters, Unchanged: ${unchanged}, Missing: ${missing}`)
```

- [ ] **Step 3: Run the import script**

```bash
cd /Users/makowey/Projects/ethiopian-bible
node scripts/import-lxx-greek.mjs /tmp/t_LXX.csv
```

Expected output:
```
Reading /tmp/t_LXX.csv...
Parsed NNNNN verses, skipped NNN lines.
Done. Updated: NNN chapters, Unchanged: NNN, Missing: NNN
```

- [ ] **Step 4: Spot-check the data**

```bash
node -e "
const d = JSON.parse(require('fs').readFileSync('public/data/chapters/Gen/1.json','utf8'))
const v1 = d.verses.find(v => v.num === 1)
console.log('Gen 1:1 grk:', v1.translations?.grk)
"
```

Expected: `Ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.`

Also check a Psalm:
```bash
node -e "
const d = JSON.parse(require('fs').readFileSync('public/data/chapters/Ps/23.json','utf8'))
const v1 = d.verses.find(v => v.num === 1)
console.log('Ps 23:1 grk:', v1?.translations?.grk)
"
```

- [ ] **Step 5: Verify in the browser**

With `npm run dev` running:
1. Open Genesis chapter 1
2. Toggle "Greek LXX" on in Settings → Study mode: Greek row should appear under word cards with polytonic Greek in GFS Didot font
3. Switch to Compare mode: Greek column appears alongside other translations
4. Check Psalms, Isaiah, 1 Maccabees to confirm deuterocanonical coverage

- [ ] **Step 6: Commit**

```bash
git add scripts/import-lxx-greek.mjs
git commit -m "feat: add LXX Greek import script (scrollmapper Rahlfs CSV)"
```

Then commit the updated chapter data:

```bash
cd /Users/makowey/Projects/ethiopian-bible
git add public/data/chapters/
git commit -m "data: import Greek LXX (Rahlfs) plain text into translations.grk"
```

---

## Task 5: Push and verify build

- [ ] **Step 1: Run production build to check for type errors**

```bash
cd /Users/makowey/Projects/ethiopian-bible
npm run build
```

Expected: build completes with no TypeScript errors. The output will list bundle sizes.

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Final browser check**

Open the app in production preview (`npm run preview`) or dev:
1. Toggle Greek LXX on in a book with dense LXX coverage (Genesis, Psalms)
2. Toggle it off — Greek row disappears
3. Toggle it with Compare mode — Greek appears as its own column
4. Verify font renders properly (polytonic accents, breathings all present)
5. Check localStorage preserves the `showGrk` setting across page reload

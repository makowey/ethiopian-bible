#!/usr/bin/env node
/**
 * Parses the Romanian Jubilees text file and injects translations.ron
 * into each public/data/chapters/Jub/N.json file.
 *
 * The text uses Roman numeral chapter headers (II., III., ..., L.) with
 * verse numbers embedded inline ("2.", "3." etc.). Since the existing JSON
 * stores all chapter content in verse 1 as one block, we store the full
 * cleaned chapter text in verse 1 as well.
 *
 * Usage:
 *   node scripts/import-romanian-jubilees.mjs \
 *     "/Users/makowey/Downloads/696296636-Cartea-jubileelor.txt"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data/chapters/Jub')

const srcFile = process.argv[2] ?? '/Users/makowey/Downloads/696296636-Cartea-jubileelor.txt'
const rawText = fs.readFileSync(srcFile, 'utf8')

// ── Roman numeral → Arabic ──────────────────────────────────────────────────
function fromRoman(str) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  let result = 0
  const s = str.toUpperCase()
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] ?? 0
    const next = map[s[i + 1]] ?? 0
    result += cur < next ? -cur : cur
  }
  return result
}

// ── Line-level filters ───────────────────────────────────────────────────────

function isJunkLine(line) {
  const t = line.trim()
  if (!t) return true
  // Page headers/footers
  if (/^Pag\s+\d+\s+din\s+\d+$/.test(t)) return true
  if (/^Cartea jubileelor$/.test(t)) return true
  // Footnote paragraphs: "NN:N text" pattern
  if (/^\d+:\d+\s/.test(t)) return true
  // "Subsol" section header
  if (/^Subsol$/.test(t)) return true
  // Standalone year numbers like "1317" or "1317-" at start of column layout
  if (/^\d{3,4}[-–]?$/.test(t)) return true
  // "A.M." column artifact
  if (/^A\.M\.$/.test(t)) return true
  // Italic section titles that introduce chapter content (centred lines with
  // bibliographic references like "(cf. Gen. …)" or ending with a period and
  // Roman numerals) — detected heuristically
  if (/^\(cf\.\s+[A-Z]/.test(t)) return true
  // Pure page-reference inline "p. XX" on its own line
  if (/^p\.\s+\d+$/.test(t)) return true
  return false
}

function cleanLine(line) {
  let t = line
  // Remove inline "p. XX" page cross-refs
  t = t.replace(/\bp\.\s+\d+\b/g, '')
  // Remove inline column-layout year numbers (preceded by whitespace and
  // surrounded by at least 5 spaces on each side, or at end of line after
  // large gap) — crude but effective
  t = t.replace(/\s{5,}\d{3,4}\s*$/g, '')
  t = t.replace(/^\s{5,}\d{3,4}\s*/g, '')
  // Collapse whitespace
  t = t.replace(/[ \t]{2,}/g, ' ').trim()
  return t
}

// ── Split file into chapter blocks ───────────────────────────────────────────

// Detect chapter-header lines. Patterns:
//   "II. text"          → chapter 2 (Roman numeral followed by period + space + text)
//   "V1. text"          → chapter 6 (OCR artifact: I → 1)
//   "VII. text"         → chapter 7 (standard)
//   "A.M.     VII. …"  → chapter in column layout line — handled by regex
//
// We match: optional leading whitespace + year/A.M. crud, then Roman numeral
// (possibly with digit '1' in place of 'I'), then period.

// Matches Roman numeral chapter headers, including column-layout variants:
//   "II. Și"                → chapter 2
//   "A.M.     VII. Și"     → chapter 7 (with year-column prefix)
//   "2050)   XXI. Și"      → chapter 21 (with year+paren prefix)
//   "V1. Și"               → chapter 6 (OCR artifact I→1)
//   "X. 1 Și"              → chapter 10 (footnote number after header)
const ROMAN_RE = /(?:^|A\.M\.\s+|\d{3,4}[)]\s+)((?:[IVXLCDM]|1(?=[IVX.]))+)\.\s+(?:\d+\s+)?[A-ZȘȚĂÎÂ]/

// Map OCR artifacts: "V1" → "VI", "V11" → "VII", "X1" → "XI" etc.
function fixOcr(roman) {
  return roman
    .replace(/1/g, 'I')   // digit 1 → Roman I
}

const lines = rawText.split('\n')

// Locate chapter 1 start: first line matching "^1\. " (verse 1 of chapter 1,
// which has no Roman numeral header)
const ch1Start = lines.findIndex(l => /^1\.\s+Și s-a întâmplat/.test(l.trim()))

/** @type {Array<{chapter: number, startLine: number}>} */
const chapterBoundaries = []

if (ch1Start >= 0) {
  chapterBoundaries.push({ chapter: 1, startLine: ch1Start })
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const m = line.match(ROMAN_RE)
  if (!m) continue

  const romanRaw = m[1]
  const roman = fixOcr(romanRaw)
  const chNum = fromRoman(roman)

  // Sanity check: must be in 2-50 range and follow sensible progression
  if (chNum < 2 || chNum > 50) continue

  // Exclude footnote-style matches: the line after the boundary should be
  // narrative (starts with uppercase letter or continues the story)
  // A quick heuristic: line length > 20 chars
  const cleaned = cleanLine(line)
  if (cleaned.length < 15) continue

  // Require the detected text to be substantial narrative (≥40 chars),
  // excluding short footnote refs like "XII. Patriarhi)."
  if (cleaned.length < 40) continue

  // Prefer the occurrence that appears in chronological order
  const existing = chapterBoundaries.find(b => b.chapter === chNum)
  if (existing) {
    // Keep whichever occurrence appears after more preceding chapters
    // (i.e., trust higher line number if it's more "in order")
    const prevCh = chapterBoundaries.filter(b => b.chapter < chNum)
    const lastPrevLine = prevCh.length ? Math.max(...prevCh.map(b => b.startLine)) : 0
    if (i > lastPrevLine) {
      existing.startLine = i  // update to the in-order occurrence
    }
    continue
  }

  chapterBoundaries.push({ chapter: chNum, startLine: i })
}

chapterBoundaries.sort((a, b) => a.chapter - b.chapter)

// ── Extract text for each chapter ────────────────────────────────────────────

/**
 * Returns cleaned chapter body text between startLine and the next chapter's
 * startLine (or end of file).
 */
function extractChapter(startLine, endLine) {
  const block = lines.slice(startLine, endLine)
  const cleaned = []
  for (const raw of block) {
    if (isJunkLine(raw)) continue
    const line = cleanLine(raw)
    if (line) cleaned.push(line)
  }
  // Join into a single string, collapsing excess whitespace
  return cleaned.join(' ').replace(/\s{2,}/g, ' ').trim()
}

// ── Split chapter text into individual verses ────────────────────────────────

/**
 * Given cleaned chapter prose, split into a Map<verseNum, text>.
 *
 * Verse boundaries appear as ". N. " (sometimes with an inline footnote number
 * before the verse number: ". 6 2. " → verse 2).
 * Verse 1 text starts right at the beginning (after stripping any chapter header).
 */
function splitVerses(text) {
  /** @type {Map<number, string>} */
  const result = new Map()

  // Strip chapter header artifact at the start (Roman numeral / "A.M. VII." etc.)
  // These are left over from the chapter boundary detection
  const stripped = text
    .replace(/^(?:A\.M\.\s+)?(?:[IVXLCDM]|[0-9]){1,5}\.\s+/, '')
    .replace(/^\d{3,4}[)\s]+(?:[IVXLCDM]|[0-9]){1,5}\.\s+/, '')
    .trim()

  // The verse separator regex: `. [footnote?] N. [footnote?] UPPERCASE`
  // Footnote numbers can appear both before and after the verse number.
  const sepRE = /\.\s+(?:\d+\s+)?(\d+)\.\s+(?:\d+\s+)?(?=[A-ZȘȚĂÎÂ"„])/g
  const breaks = []
  let m
  while ((m = sepRE.exec(stripped)) !== null) {
    const vNum = parseInt(m[1], 10)
    if (vNum >= 2 && vNum <= 100) {
      breaks.push({ pos: m.index + m[0].length, num: vNum, matchStart: m.index })
    }
  }

  if (breaks.length === 0) {
    // No internal verses found — store as verse 1
    if (stripped.length > 5) result.set(1, stripped)
    return result
  }

  // Verse 1 is from the start to the first break's matchStart
  const v1text = stripped.slice(0, breaks[0].matchStart).trim()
  if (v1text.length > 3) result.set(1, v1text)

  // Each subsequent verse
  for (let i = 0; i < breaks.length; i++) {
    const { pos, num } = breaks[i]
    const end = i + 1 < breaks.length ? breaks[i + 1].matchStart : stripped.length
    const vtext = stripped.slice(pos, end).trim()
    if (vtext.length > 3) result.set(num, vtext)
  }

  return result
}

// ── Build chapter data ────────────────────────────────────────────────────────

/** @type {Map<number, Map<number, string>>} chapter → verse → text */
const chapVerses = new Map()

for (let idx = 0; idx < chapterBoundaries.length; idx++) {
  const { chapter, startLine } = chapterBoundaries[idx]
  const nextBoundary = chapterBoundaries[idx + 1]
  const endLine = nextBoundary ? nextBoundary.startLine : lines.length
  const text = extractChapter(startLine, endLine)
  if (text.length > 20) chapVerses.set(chapter, splitVerses(text))
}

// ── Write into JSON files ─────────────────────────────────────────────────────

let updated = 0, skipped = 0, missing = 0

for (const [chNum, verseMap] of chapVerses) {
  const jsonPath = path.join(DATA_DIR, `${chNum}.json`)
  if (!fs.existsSync(jsonPath)) { missing++; continue }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  if (!data.verses?.length) { skipped++; continue }

  let changed = false
  for (const verse of data.verses) {
    const ron = verseMap.get(verse.num)
    if (ron) {
      verse.translations = verse.translations ?? {}
      if (verse.translations.ron !== ron) {
        verse.translations.ron = ron
        changed = true
      }
    }
  }

  if (changed) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8')
    updated++
  } else {
    skipped++
  }
}

console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Missing JSON: ${missing}`)
console.log(`Chapters found: ${[...chapVerses.keys()].sort((a,b)=>a-b).join(', ')}`)
const totalV = [...chapVerses.values()].reduce((s, m) => s + m.size, 0)
console.log(`Total verses parsed: ${totalV}`)

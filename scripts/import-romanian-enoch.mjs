#!/usr/bin/env node
/**
 * Parses the Romanian Enoch PDF text (extracted via pdftotext) and injects
 * translations.ron into each public/data/chapters/1En/N.json file.
 *
 * Usage:
 *   node scripts/import-romanian-enoch.mjs /tmp/enoch_ron.txt
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data/chapters/1En')

const rawText = fs.readFileSync(process.argv[2] ?? '/tmp/enoch_ron.txt', 'utf8')

// ── 1. Split into chapters ──────────────────────────────────────────────────

// Chapter headers appear as:
//   "Capitolul N" (most), "Capitolul N]" (ch 95), or bare "84"
// We normalise all of them to just the chapter number.

const lines = rawText.split('\n')

/** @type {Map<number, string[]>} */
const chapterLines = new Map()
let currentChapter = null

for (const raw of lines) {
  const line = raw.trim()

  // Skip page headers like "Cartea lui Enoch   N din 63"
  if (/^Cartea lui Enoch\s+\d+ din \d+$/.test(line)) continue
  // Skip "CARTEA LUI ENOH -7- …" section titles
  if (/^CARTEA LUI ENOH/.test(line)) continue

  // Detect chapter start: "Capitolul N" or bare number on its own line
  const chapMatch =
    line.match(/^Capitolul\s+(\d+)\]?$/) ||
    line.match(/^(\d{1,3})$/)  // bare number — only if plausible chapter number

  if (chapMatch) {
    const num = parseInt(chapMatch[1], 10)
    if (num >= 1 && num <= 108) {
      // Bare number: only accept if we haven't seen this chapter yet (avoids
      // matching verse numbers like "1" that happen to stand alone)
      if (!line.startsWith('Capitolul') && chapterLines.has(num)) continue

      currentChapter = num
      if (!chapterLines.has(num)) chapterLines.set(num, [])
      continue
    }
  }

  if (currentChapter !== null) {
    chapterLines.get(currentChapter).push(line)
  }
}

// ── 2. Parse verses from each chapter's lines ───────────────────────────────

/**
 * Joins continuation lines: a verse starts with "N." or "N.text" at the
 * beginning of a line, and continues on subsequent lines until the next verse
 * or a blank line that precedes the next verse.
 *
 * @param {string[]} lines
 * @returns {Map<number, string>} verseNum → text
 */
function parseVerses(lines) {
  /** @type {Map<number, string>} */
  const verses = new Map()

  // Merge all non-empty lines into a single stream, collapsing whitespace
  const joined = []
  let buf = ''
  for (const l of lines) {
    if (!l) {
      if (buf) { joined.push(buf); buf = '' }
      continue
    }
    // Does this line start a new verse?
    const startsVerse = /^\d+[.)]\s/.test(l) || /^\d+\.\S/.test(l)
    if (startsVerse && buf) {
      joined.push(buf)
      buf = l
    } else if (buf) {
      buf += ' ' + l
    } else {
      buf = l
    }
  }
  if (buf) joined.push(buf)

  for (const segment of joined) {
    // Match verse number at the start: "1. text", "1.text", "1) text"
    const m = segment.match(/^(\d+)[.)]\s*(.+)/)
    if (m) {
      const num = parseInt(m[1], 10)
      const text = m[2].trim().replace(/\s+/g, ' ')
      if (!verses.has(num)) verses.set(num, text)
    }
  }

  return verses
}

// ── 3. Handle single-paragraph chapters (no verse numbers) ──────────────────

/**
 * For chapters where pdftotext found zero numbered verses, treat the entire
 * text block as verse 1.
 */
function paragraphAsVerse1(lines) {
  const text = lines.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return text ? new Map([[1, text]]) : new Map()
}

// ── 4. Write into JSON files ─────────────────────────────────────────────────

let updated = 0
let skipped = 0
let missing = 0

for (let ch = 1; ch <= 108; ch++) {
  const jsonPath = path.join(DATA_DIR, `${ch}.json`)
  if (!fs.existsSync(jsonPath)) { missing++; continue }

  const chLines = chapterLines.get(ch) ?? []
  let versesMap = parseVerses(chLines)

  // Fall back to paragraph-as-verse-1 when no numbered verses found
  if (versesMap.size === 0) versesMap = paragraphAsVerse1(chLines)

  if (versesMap.size === 0) { skipped++; continue }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  let changed = false
  for (const verse of data.verses) {
    const ron = versesMap.get(verse.num)
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

console.log(`Done. Updated: ${updated}, Skipped/unchanged: ${skipped}, Missing JSON: ${missing}`)

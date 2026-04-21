#!/usr/bin/env node
/**
 * Parses the two-column Romanian "Toate Cărțile lui Enoh" text file and
 * injects translations.ron into public/data/chapters/1En/N.json files.
 *
 * The PDF was extracted as two columns side by side on each line, e.g.:
 *   "1.1  Left col text ...           2.1 Right col text ..."
 *
 * Strategy: scan each line for verse references (N.N) that appear either
 * at the start or after ≥5 spaces, split the line at those positions, and
 * associate each text fragment with the preceding verse number.
 *
 * Usage:
 *   node scripts/import-romanian-enoch-all.mjs \
 *     "/Users/makowey/Downloads/822510142-ToateCărțileLuiEnoh-pdf.txt"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data/chapters/1En')

const srcFile = process.argv[2] ??
  '/Users/makowey/Downloads/822510142-ToateCărțileLuiEnoh-pdf.txt'
const rawText = fs.readFileSync(srcFile, 'utf8')

// ── Limit to 1 Enoch section ─────────────────────────────────────────────────
// 2 Enoch starts after "A doua carte a lui Enoh" header
const end2En = rawText.indexOf('A doua carte a lui Enoh')
const enochText = end2En > 0 ? rawText.slice(0, end2En) : rawText

const SPLIT_COL = 44   // column boundary between left and right PDF columns
const lines = enochText.split('\n')

// ── Split each line into left/right column halves ─────────────────────────────

/**
 * Returns [leftHalf, rightHalf] by splitting at SPLIT_COL.
 * Right half is undefined if the line is shorter than SPLIT_COL.
 */
function splitColumns(line) {
  // Pad with spaces to ensure we can split
  const padded = line.padEnd(SPLIT_COL + 1, ' ')
  const left = padded.slice(0, SPLIT_COL).trimEnd()
  const right = padded.slice(SPLIT_COL).trim()
  return [left, right || undefined]
}

// ── Verse segment extractor (for one column half) ─────────────────────────────
const VERSE_REF = /^(\d{1,3})\.(\d{1,3})\s+(.*)/

/**
 * If `halfLine` starts with a verse reference "N.N text…", return
 * {ch, v, text}; otherwise undefined (it's a continuation).
 */
function parseVerseStart(halfLine) {
  if (!halfLine) return undefined
  const m = halfLine.trim().match(VERSE_REF)
  if (!m) return undefined
  const ch = parseInt(m[1], 10)
  const v = parseInt(m[2], 10)
  if (ch < 1 || ch > 108) return undefined
  return { ch, v, text: m[3].trim() }
}

// ── Build verse map ───────────────────────────────────────────────────────────

/** @type {Map<string, string[]>} "ch:v" → text fragments */
const verseFragments = new Map()

// Two independent "current verse" trackers for left and right columns
let leftKey = null
let rightKey = null

for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed) { leftKey = null; rightKey = null; continue }
  if (/^\d+$/.test(trimmed)) continue          // standalone page numbers
  if (/^[-–—]+$/.test(trimmed)) continue      // separators

  const [left, right] = splitColumns(line)

  // Process left column
  if (left) {
    const ref = parseVerseStart(left)
    if (ref) {
      const key = `${ref.ch}:${ref.v}`
      if (!verseFragments.has(key)) verseFragments.set(key, [])
      if (ref.text) verseFragments.get(key).push(ref.text)
      leftKey = key
    } else if (leftKey && left.trim()) {
      verseFragments.get(leftKey)?.push(left.trim())
    }
  }

  // Process right column
  if (right) {
    const ref = parseVerseStart(right)
    if (ref) {
      const key = `${ref.ch}:${ref.v}`
      if (!verseFragments.has(key)) verseFragments.set(key, [])
      if (ref.text) verseFragments.get(key).push(ref.text)
      rightKey = key
    } else if (rightKey && right.trim()) {
      verseFragments.get(rightKey)?.push(right.trim())
    }
  }
}

// ── Assemble verse texts ──────────────────────────────────────────────────────

/** @type {Map<string, string>} "ch:v" → cleaned text */
const verses = new Map()
for (const [key, frags] of verseFragments) {
  const text = frags.join(' ').replace(/\s{2,}/g, ' ').trim()
  if (text.length > 3) verses.set(key, text)
}

// ── Group by chapter ──────────────────────────────────────────────────────────

/** @type {Map<number, Map<number, string>>} ch → (v → text) */
const chapters = new Map()
for (const [key, text] of verses) {
  const [ch, v] = key.split(':').map(Number)
  if (!chapters.has(ch)) chapters.set(ch, new Map())
  chapters.get(ch).set(v, text)
}

// ── Write into JSON files ─────────────────────────────────────────────────────

let updated = 0, skipped = 0, missing = 0

for (const [chNum, verseMap] of chapters) {
  const jsonPath = path.join(DATA_DIR, `${chNum}.json`)
  if (!fs.existsSync(jsonPath)) { missing++; continue }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
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
console.log(`Chapters parsed: ${[...chapters.keys()].sort((a,b)=>a-b).join(', ')}`)
console.log(`Total verses parsed: ${verses.size}`)

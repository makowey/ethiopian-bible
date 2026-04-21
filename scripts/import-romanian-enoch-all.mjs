#!/usr/bin/env node
/**
 * Parses the Romanian "Toate Cărțile lui Enoh" PDF and injects translations.ron
 * into public/data/chapters/1En/N.json files.
 *
 * The PDF is extracted in reading order (pdftotext without -layout), which gives
 * a clean continuous text stream where verse refs appear as "N.N text".
 *
 * Usage:
 *   node scripts/import-romanian-enoch-all.mjs \
 *     "/Users/makowey/Downloads/822510142-ToateCărțileLuiEnoh-pdf.pdf"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data/chapters/1En')

const srcArg = process.argv[2] ??
  '/Users/makowey/Downloads/822510142-ToateCărțileLuiEnoh-pdf.pdf'

// Accept either PDF or pre-extracted txt
let rawText
if (srcArg.endsWith('.pdf')) {
  rawText = execSync(`pdftotext "${srcArg}" -`, { maxBuffer: 50 * 1024 * 1024 }).toString()
} else {
  rawText = fs.readFileSync(srcArg, 'utf8')
}

// ── Limit to 1 Enoch section (before 2 Enoch intro) ─────────────────────────
const end1En = rawText.indexOf('Cartea Secretelor lui Enoh')
const enochText = end1En > 0 ? rawText.slice(0, end1En) : rawText

// ── Tokenise: split the full text at every verse reference ───────────────────
// A verse ref looks like "N.N" where both parts are integers in range.
// We match it when preceded by whitespace/start and followed by whitespace or
// end-of-string, to avoid matching e.g. "108.15" inside a word.
//
// We build a flat array of tokens: { ch, v, text } where text is everything
// from this verse ref up to (but not including) the next one.

/** @type {Map<string, string>} "ch:v" → text */
const verses = new Map()

// Replace page numbers (standalone digits on their own line) with spaces
const cleaned = enochText
  .replace(/\n\d{1,3}\n/g, '\n')   // page numbers between blank-ish lines
  .replace(/^\d{1,3}$/gm, '')       // standalone numbers on a line
  .replace(/\n{3,}/g, '\n\n')

// Split at verse boundaries. The verse ref regex captures (ch)(v) followed by
// the rest of text until the next verse ref.
// We scan the whole text for verse ref positions.

const VERSE_RE = /\b(\d{1,3})\.(\d{1,3})\s+/g
const tokens = []
let lastMatch = null

for (const m of cleaned.matchAll(VERSE_RE)) {
  const ch = parseInt(m[1], 10)
  const v = parseInt(m[2], 10)
  if (ch < 1 || ch > 108 || v < 1 || v > 200) continue

  if (lastMatch) {
    const text = cleaned.slice(lastMatch.end, m.index).replace(/\s+/g, ' ').trim()
    if (text.length > 3) tokens.push({ ch: lastMatch.ch, v: lastMatch.v, text })
  }
  lastMatch = { ch, v, end: m.index + m[0].length }
}
// Last token
if (lastMatch) {
  const text = cleaned.slice(lastMatch.end).replace(/\s+/g, ' ').trim()
  if (text.length > 3) tokens.push({ ch: lastMatch.ch, v: lastMatch.v, text })
}

for (const { ch, v, text } of tokens) {
  const key = `${ch}:${v}`
  if (!verses.has(key)) verses.set(key, text)
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

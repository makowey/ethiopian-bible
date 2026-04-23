#!/usr/bin/env node
/**
 * Imports Greek LXX plain text (Brenton Septuagint, polytonic Greek) from the
 * eBible corpus into public/data/chapters/{book}/{chapter}.json as translations.grk.
 *
 * Data source:
 *   Text:         https://raw.githubusercontent.com/BibleNLP/ebible/main/corpus/grc-grcbrent.txt
 *   Verse refs:   https://raw.githubusercontent.com/BibleNLP/ebible/main/metadata/vref.txt
 *
 * Both files have one entry per line in the same order. vref.txt gives the
 * USFM book/chapter/verse reference; grc-grcbrent.txt gives the Greek text.
 *
 * Note: The original scrollmapper t_LXX.csv (referenced in the task spec) is
 * no longer available at the expected URL. This script uses the eBible
 * Brenton Septuagint (public domain) which provides the same polytonic Greek text.
 *
 * Usage:
 *   node scripts/import-lxx-greek.mjs
 *   node scripts/import-lxx-greek.mjs /tmp/vref.txt /tmp/grcbrent.txt
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data/chapters')

const VREF_URL = 'https://raw.githubusercontent.com/BibleNLP/ebible/main/metadata/vref.txt'
const TEXT_URL = 'https://raw.githubusercontent.com/BibleNLP/ebible/main/corpus/grc-grcbrent.txt'

const vrefPath = process.argv[2] ?? '/tmp/vref.txt'
const textPath = process.argv[3] ?? '/tmp/grcbrent.txt'

// ── USFM book code → app folder abbreviation ─────────────────────────────────
const BOOK_MAP = {
  // OT
  GEN: 'Gen',   EXO: 'Exod',  LEV: 'Lev',   NUM: 'Num',   DEU: 'Deut',
  JOS: 'Josh',  JDG: 'Judg',  RUT: 'Ruth',  '1SA': '1Sam','2SA': '2Sam',
  '1KI': '1Kgs','2KI': 'Kings','1CH': '1Chr','2CH': '2Chr',EZR: 'Ezra',
  NEH: 'Neh',   ESG: 'EsthGk',EST: 'EsthGk',JOB: 'Job',   PSA: 'Ps',
  PRO: 'Prov',  ECC: 'Eccl',  SNG: 'Song',  ISA: 'Isa',   JER: 'Jer',
  LAM: 'Lam',   EZK: 'Ezek',  DAN: 'Dan',   HOS: 'Hos',   JOL: 'Joel',
  AMO: 'Amos',  OBA: 'Obad',  JON: 'Jonah', MIC: 'Mic',   NAM: 'Nah',
  HAB: 'Hab',   ZEP: 'Zeph',  HAG: 'Hag',   ZEC: 'Zech',  MAL: 'Mal',
  // NT
  MAT: 'Matt',  MRK: 'Mark',  LUK: 'Luke',  JHN: 'John',  ACT: 'Acts',
  ROM: 'Rom',   '1CO': '1Cor','2CO': '2Cor',GAL: 'Gal',   EPH: 'Eph',
  PHP: 'Phil',  COL: 'Col',   '1TH': '1Thess','2TH': '2Thess',
  '1TI': '1Tim','2TI': '2Tim',TIT: 'Titus', PHM: 'Phlm',  HEB: 'Heb',
  JAS: 'Jas',   '1PE': '1Pet','2PE': '2Pet','1JN': '1John','2JN': '2John',
  '3JN': '3John',JUD: 'Jude', REV: 'Rev',
  // Deuterocanonical
  TOB: 'Tob',   JDT: 'Jdt',   '1MA': '1Macc','2MA': '2Macc','3MA': '3Macc',
  '4MA': '4Macc',WIS: 'Wis',  SIR: 'Sir',   BAR: 'Bar',   '1ES': '1Esd',
  MAN: 'PrMan', SUS: 'Sus',   BEL: 'Bel',   LJE: 'EpJer',
}

// ── Download helper ───────────────────────────────────────────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  Using cached ${dest}`)
      return resolve()
    }
    console.log(`  Downloading ${url} -> ${dest}`)
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Step 1: Ensuring source files are available...')
await download(VREF_URL, vrefPath)
await download(TEXT_URL, textPath)

console.log(`\nStep 2: Parsing ${vrefPath} + ${textPath}...`)
const vrefs = fs.readFileSync(vrefPath, 'utf8').split('\n')
const texts = fs.readFileSync(textPath, 'utf8').split('\n')

if (vrefs.length !== texts.length) {
  console.warn(`Warning: vref lines (${vrefs.length}) !== text lines (${texts.length}). Proceeding with min.`)
}

/** @type {Map<string, Map<number, Map<number, string>>>} bookAbbrev → ch → v → text */
const data = new Map()

let parsed = 0, skipped = 0
const total = Math.min(vrefs.length, texts.length)

for (let i = 0; i < total; i++) {
  const ref = vrefs[i]?.trim()
  const text = texts[i]?.trim()
  if (!ref || !text) { skipped++; continue }

  // vref format: "GEN 1:1"
  const spaceIdx = ref.indexOf(' ')
  if (spaceIdx === -1) { skipped++; continue }
  const usfmBook = ref.slice(0, spaceIdx)
  const colonIdx = ref.indexOf(':')
  if (colonIdx === -1) { skipped++; continue }
  const c = parseInt(ref.slice(spaceIdx + 1, colonIdx), 10)
  const v = parseInt(ref.slice(colonIdx + 1), 10)

  if (!c || !v) { skipped++; continue }

  const abbrev = BOOK_MAP[usfmBook]
  if (!abbrev) { skipped++; continue }

  if (!data.has(abbrev)) data.set(abbrev, new Map())
  const bookMap = data.get(abbrev)
  if (!bookMap.has(c)) bookMap.set(c, new Map())
  bookMap.get(c).set(v, text)
  parsed++
}

console.log(`Parsed ${parsed} verses, skipped ${skipped} lines.`)

// ── Write into JSON files ─────────────────────────────────────────────────────
console.log('\nStep 3: Writing into chapter JSON files...')
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

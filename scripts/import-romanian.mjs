/**
 * Fetches Romanian Orthodox Bible text from bibliaortodoxa.ro and injects
 * it as translations.ron into existing chapter JSON files.
 *
 * Source: Biblia Ortodoxă (bibliaortodoxa.ro) — based on LXX tradition.
 *
 * Usage:
 *   node scripts/import-romanian.mjs              # all books
 *   node scripts/import-romanian.mjs Gen Exod     # specific books
 *   node scripts/import-romanian.mjs --force      # overwrite existing ron entries
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CHAPTERS_DIR = join(ROOT, 'public/data/chapters')

// Mapping: app folder → { siteId, maxChapters }
// siteId = carte.php?id= value on bibliaortodoxa.ro
const BOOK_MAP = [
  { folder: 'Gen',    siteId: 25, maxCh: 50 },
  { folder: 'Exod',  siteId: 32, maxCh: 40 },
  { folder: 'Lev',   siteId: 47, maxCh: 27 },
  { folder: 'Num',   siteId: 59, maxCh: 36 },
  { folder: 'Deut',  siteId: 17, maxCh: 34 },
  { folder: 'Josh',  siteId: 41, maxCh: 24 },
  { folder: 'Judg',  siteId: 46, maxCh: 21 },
  { folder: 'Ruth',  siteId: 71, maxCh: 4  },
  { folder: '1Sam',  siteId: 66, maxCh: 31 },
  { folder: '2Sam',  siteId: 67, maxCh: 24 },
  { folder: '1Kgs',  siteId: 68, maxCh: 22 },
  { folder: 'Kings', siteId: 69, maxCh: 25 },
  { folder: '1Chr',  siteId: 14, maxCh: 29 },
  { folder: '2Chr',  siteId: 15, maxCh: 36 },
  { folder: '1Esd',  siteId: 23, maxCh: 13 },
  { folder: 'Ezra',  siteId: 23, maxCh: 13 },
  { folder: 'Neh',   siteId: 58, maxCh: 13 },
  { folder: 'Job',   siteId: 42, maxCh: 42 },
  { folder: 'Ps',    siteId: 65, maxCh: 151 },
  { folder: 'Prov',  siteId: 63, maxCh: 31 },
  { folder: 'Eccl',  siteId: 18, maxCh: 12 },
  { folder: 'Song',  siteId: 9,  maxCh: 8  },
  { folder: 'Isa',   siteId: 43, maxCh: 66 },
  { folder: 'Jer',   siteId: 31, maxCh: 52 },
  { folder: 'Lam',   siteId: 64, maxCh: 5  },
  { folder: 'Ezek',  siteId: 33, maxCh: 48 },
  { folder: 'Dan',   siteId: 16, maxCh: 14 },
  { folder: 'Hos',   siteId: 60, maxCh: 14 },
  { folder: 'Joel',  siteId: 39, maxCh: 3  },
  { folder: 'Amos',  siteId: 3,  maxCh: 9  },
  { folder: 'Obad',  siteId: 6,  maxCh: 1  },
  { folder: 'Jonah', siteId: 40, maxCh: 4  },
  { folder: 'Mic',   siteId: 56, maxCh: 7  },
  { folder: 'Nah',   siteId: 57, maxCh: 3  },
  { folder: 'Hab',   siteId: 5,  maxCh: 3  },
  { folder: 'Zeph',  siteId: 73, maxCh: 3  },
  { folder: 'Hag',   siteId: 2,  maxCh: 2  },
  { folder: 'Zech',  siteId: 82, maxCh: 14 },
  { folder: 'Mal',   siteId: 52, maxCh: 4  },
  { folder: 'Tob',   siteId: 81, maxCh: 14 },
  { folder: 'Jdt',   siteId: 45, maxCh: 16 },
  { folder: 'Bar',   siteId: 8,  maxCh: 5  },
  { folder: 'EpJer', siteId: 20, maxCh: 1  },
  { folder: 'Sus',   siteId: 75, maxCh: 1  },
  { folder: 'Bel',   siteId: 7,  maxCh: 1  },
  { folder: '1Macc', siteId: 49, maxCh: 16 },
  { folder: '2Macc', siteId: 50, maxCh: 15 },
  { folder: '3Macc', siteId: 51, maxCh: 7  },
  { folder: 'Wis',   siteId: 74, maxCh: 19 },
  { folder: 'Sir',   siteId: 72, maxCh: 51 },
  { folder: 'PrMan', siteId: 54, maxCh: 1  },
  { folder: '4Macc', siteId: 51, maxCh: 7  }, // approximate
  { folder: 'EsthGk', siteId: 21, maxCh: 10 },
]

const DELAY_MS = 300 // polite delay between requests

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&[a-zA-Z]+;/g, ' ')
}

async function fetchVerseMap(siteId, chapter) {
  const url = `https://bibliaortodoxa.ro/carte.php?id=${siteId}&cap=${chapter}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()

  // Verses are in: <tr id=verset{N}> ... <td>TEXT</td> ... </tr>
  // Row has two cells: first has the verse number span, second has the text.
  const map = new Map()
  const pattern = /<tr id=verset(\d+)>([\s\S]*?)<\/tr>/gi
  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi
  let match
  while ((match = pattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10)
    const row = match[2]
    // Collect all <td> cells and take the last one (verse text)
    const cells = []
    let tdMatch
    tdPattern.lastIndex = 0
    while ((tdMatch = tdPattern.exec(row)) !== null) {
      cells.push(tdMatch[1])
    }
    if (cells.length === 0) continue
    let text = cells[cells.length - 1]
    text = text.replace(/<[^>]+>/g, ' ')
    text = decodeEntities(text)
    text = text.trim().replace(/\s+/g, ' ')
    if (text) map.set(num, text)
  }
  return map
}

// Parse CLI args
const args = process.argv.slice(2)
const force = args.includes('--force')
const bookFilter = args.filter(a => !a.startsWith('--'))

const books = bookFilter.length > 0
  ? BOOK_MAP.filter(b => bookFilter.includes(b.folder))
  : BOOK_MAP

if (bookFilter.length > 0 && books.length === 0) {
  console.error(`No matching books found for: ${bookFilter.join(', ')}`)
  console.error(`Available: ${BOOK_MAP.map(b => b.folder).join(', ')}`)
  process.exit(1)
}

let totalBooks = 0, totalChapters = 0, totalVerses = 0

for (const entry of books) {
  const folderPath = join(CHAPTERS_DIR, entry.folder)
  if (!existsSync(folderPath)) {
    console.warn(`⚠️  Folder not found: ${entry.folder} — skipping`)
    continue
  }

  let chapsFilled = 0, versesFilled = 0

  for (let ch = 1; ch <= entry.maxCh; ch++) {
    const jsonFile = join(folderPath, `${ch}.json`)
    if (!existsSync(jsonFile)) continue

    const chData = JSON.parse(readFileSync(jsonFile, 'utf-8'))

    // Skip if already has ron translations (unless --force)
    if (!force && chData.verses?.some(v => v.translations?.ron)) continue

    let verseMap
    try {
      verseMap = await fetchVerseMap(entry.siteId, ch)
    } catch (err) {
      console.warn(`  ⚠️  ${entry.folder} ch${ch}: ${err.message}`)
      await sleep(DELAY_MS * 3)
      continue
    }

    if (verseMap.size === 0) continue

    let filled = 0
    for (const verse of chData.verses ?? []) {
      const ronText = verseMap.get(verse.num)
      if (ronText) {
        if (!verse.translations) verse.translations = {}
        verse.translations.ron = ronText
        filled++
      }
    }

    if (filled > 0) {
      writeFileSync(jsonFile, JSON.stringify(chData, null, 2))
      chapsFilled++
      versesFilled += filled
    }

    await sleep(DELAY_MS)
  }

  if (chapsFilled > 0) {
    console.log(`✅ ${entry.folder}: ${versesFilled} verses across ${chapsFilled} chapters`)
    totalBooks++
    totalChapters += chapsFilled
    totalVerses += versesFilled
  } else {
    console.log(`⏭️  ${entry.folder}: nothing new`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`Done: ${totalBooks} books, ${totalChapters} chapters, ${totalVerses} verses.`)

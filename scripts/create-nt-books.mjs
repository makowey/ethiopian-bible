/**
 * Creates New Testament book entries in books.json and populates chapter JSON
 * files with Romanian Orthodox text from bibliaortodoxa.ro.
 *
 * NT books have no Ge'ez data — verses are created with empty geez/words fields
 * and Romanian text in translations.ron.
 *
 * Usage:
 *   node scripts/create-nt-books.mjs          # all NT books
 *   node scripts/create-nt-books.mjs Matt Rev  # specific books
 *   node scripts/create-nt-books.mjs --force   # re-fetch existing chapters
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CHAPTERS_DIR = join(ROOT, 'public/data/chapters')
const BOOKS_FILE = join(ROOT, 'public/data/books.json')

const DELAY_MS = 300

const NT_BOOKS = [
  { abbrev: 'Matt',    name: 'Matthew',           short: 'Matthew',     siteId: 55, chapters: 28 },
  { abbrev: 'Mark',    name: 'Mark',               short: 'Mark',        siteId: 53, chapters: 16 },
  { abbrev: 'Luke',    name: 'Luke',               short: 'Luke',        siteId: 48, chapters: 24 },
  { abbrev: 'John',    name: 'John',               short: 'John',        siteId: 35, chapters: 21 },
  { abbrev: 'Acts',    name: 'Acts',               short: 'Acts',        siteId: 26, chapters: 28 },
  { abbrev: 'Rom',     name: 'Romans',             short: 'Romans',      siteId: 70, chapters: 16 },
  { abbrev: '1Cor',    name: '1 Corinthians',      short: '1 Cor',       siteId: 12, chapters: 16 },
  { abbrev: '2Cor',    name: '2 Corinthians',      short: '2 Cor',       siteId: 13, chapters: 13 },
  { abbrev: 'Gal',     name: 'Galatians',          short: 'Galatians',   siteId: 29, chapters: 6  },
  { abbrev: 'Eph',     name: 'Ephesians',          short: 'Ephesians',   siteId: 19, chapters: 6  },
  { abbrev: 'Phil',    name: 'Philippians',        short: 'Philippians', siteId: 28, chapters: 4  },
  { abbrev: 'Col',     name: 'Colossians',         short: 'Colossians',  siteId: 10, chapters: 4  },
  { abbrev: '1Thess',  name: '1 Thessalonians',    short: '1 Thess',     siteId: 76, chapters: 5  },
  { abbrev: '2Thess',  name: '2 Thessalonians',    short: '2 Thess',     siteId: 77, chapters: 3  },
  { abbrev: '1Tim',    name: '1 Timothy',          short: '1 Timothy',   siteId: 78, chapters: 6  },
  { abbrev: '2Tim',    name: '2 Timothy',          short: '2 Timothy',   siteId: 79, chapters: 4  },
  { abbrev: 'Titus',   name: 'Titus',              short: 'Titus',       siteId: 80, chapters: 3  },
  { abbrev: 'Phlm',    name: 'Philemon',           short: 'Philemon',    siteId: 27, chapters: 1  },
  { abbrev: 'Heb',     name: 'Hebrews',            short: 'Hebrews',     siteId: 22, chapters: 13 },
  { abbrev: 'Jas',     name: 'James',              short: 'James',       siteId: 30, chapters: 5  },
  { abbrev: '1Pet',    name: '1 Peter',            short: '1 Peter',     siteId: 61, chapters: 5  },
  { abbrev: '2Pet',    name: '2 Peter',            short: '2 Peter',     siteId: 62, chapters: 3  },
  { abbrev: '1John',   name: '1 John',             short: '1 John',      siteId: 36, chapters: 5  },
  { abbrev: '2John',   name: '2 John',             short: '2 John',      siteId: 37, chapters: 1  },
  { abbrev: '3John',   name: '3 John',             short: '3 John',      siteId: 38, chapters: 1  },
  { abbrev: 'Jude',    name: 'Jude',               short: 'Jude',        siteId: 44, chapters: 1  },
  { abbrev: 'Rev',     name: 'Revelation',         short: 'Revelation',  siteId: 4,  chapters: 22 },
]

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

  const map = new Map()
  const pattern = /<tr id=verset(\d+)>([\s\S]*?)<\/tr>/gi
  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi
  let match
  while ((match = pattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10)
    const row = match[2]
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
  ? NT_BOOKS.filter(b => bookFilter.includes(b.abbrev))
  : NT_BOOKS

if (bookFilter.length > 0 && books.length === 0) {
  console.error(`No matching NT books: ${bookFilter.join(', ')}`)
  process.exit(1)
}

// Update books.json — add NT books if not already present
const booksJson = JSON.parse(readFileSync(BOOKS_FILE, 'utf-8'))
let booksUpdated = 0
for (const book of NT_BOOKS) {
  if (!booksJson.find(b => b.abbrev === book.abbrev)) {
    booksJson.push({
      abbrev: book.abbrev,
      name: book.name,
      section: 'New Testament',
      chapters: book.chapters,
      source_id: book.abbrev.toLowerCase(),
      short: book.short,
      hasTranslation: true,
    })
    booksUpdated++
  }
}
if (booksUpdated > 0) {
  writeFileSync(BOOKS_FILE, JSON.stringify(booksJson, null, 2))
  console.log(`📚 books.json: added ${booksUpdated} NT books`)
}

// Fetch and create chapter files
let totalBooks = 0, totalChapters = 0, totalVerses = 0

for (const book of books) {
  const folderPath = join(CHAPTERS_DIR, book.abbrev)
  if (!existsSync(folderPath)) mkdirSync(folderPath)

  let chapsFilled = 0, versesFilled = 0

  for (let ch = 1; ch <= book.chapters; ch++) {
    const jsonFile = join(folderPath, `${ch}.json`)

    // Skip if exists and not forced
    if (!force && existsSync(jsonFile)) {
      const existing = JSON.parse(readFileSync(jsonFile, 'utf-8'))
      if (existing.verses?.some(v => v.translations?.ron)) continue
    }

    let verseMap
    try {
      verseMap = await fetchVerseMap(book.siteId, ch)
    } catch (err) {
      console.warn(`  ⚠️  ${book.abbrev} ch${ch}: ${err.message}`)
      await sleep(DELAY_MS * 3)
      continue
    }

    if (verseMap.size === 0) continue

    const verses = Array.from(verseMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, ron]) => ({
        num,
        geez: '',
        translation: '',
        words: [],
        translations: { ron },
      }))

    const chapterData = {
      book: book.abbrev,
      chapter: ch,
      verses,
    }

    writeFileSync(jsonFile, JSON.stringify(chapterData, null, 2))
    chapsFilled++
    versesFilled += verses.length
    await sleep(DELAY_MS)
  }

  if (chapsFilled > 0) {
    console.log(`✅ ${book.abbrev} (${book.name}): ${versesFilled} verses across ${chapsFilled} chapters`)
    totalBooks++
    totalChapters += chapsFilled
    totalVerses += versesFilled
  } else {
    console.log(`⏭️  ${book.abbrev}: nothing new`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`Done: ${totalBooks} books, ${totalChapters} chapters, ${totalVerses} verses.`)

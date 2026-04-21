import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HTML_DIR = join(ROOT, 'docs/eng-Brenton_html')
const CHAPTERS_DIR = join(ROOT, 'public/data/chapters')
const BOOKS_FILE = join(ROOT, 'public/data/books.json')

// Map: HTML prefix → { abbrev, name, section, folder, chapters }
// chapters: array of numbers to import (null = auto-detect from files)
const BOOK_MAP = [
  // --- Already in app (skip) ---
  // Gen, Exod, Lev, Num, Deut, Josh, Judg, Ruth, Job, Prov, Eccl, Song, Isa, Joel, Jonah,
  // Lam, Tob, Jdt, Sir, Wis, Kings(=2KI), Ezra, Ps → all exist

  // --- New: Historical ---
  { html: '1SA', abbrev: '1Sam', name: '1 Samuel',      section: 'Other',            folder: '1Sam',  chCount: 31 },
  { html: '2SA', abbrev: '2Sam', name: '2 Samuel',      section: 'Other',            folder: '2Sam',  chCount: 24 },
  { html: '1KI', abbrev: '1Kgs', name: '1 Kings',       section: 'Other',            folder: '1Kgs',  chCount: 22 },
  { html: '1CH', abbrev: '1Chr', name: '1 Chronicles',  section: 'Other',            folder: '1Chr',  chCount: 29 },
  { html: '2CH', abbrev: '2Chr', name: '2 Chronicles',  section: 'Other',            folder: '2Chr',  chCount: 36 },
  { html: 'NEH', abbrev: 'Neh',  name: 'Nehemiah',      section: 'Other',            folder: 'Neh',   chCount: 13 },
  { html: '1ES', abbrev: '1Esd', name: '1 Esdras',      section: 'Deuterocanonical', folder: '1Esd',  chCount: 9  },

  // --- New: Major Prophets ---
  { html: 'JER', abbrev: 'Jer',  name: 'Jeremiah',      section: 'Other',            folder: 'Jer',   chCount: 52 },
  { html: 'EZK', abbrev: 'Ezek', name: 'Ezekiel',       section: 'Other',            folder: 'Ezek',  chCount: 48 },
  { html: 'DAG', abbrev: 'Dan',  name: 'Daniel',        section: 'Deuterocanonical', folder: 'Dan',   chCount: 12 },

  // --- New: Minor Prophets ---
  { html: 'HOS', abbrev: 'Hos',  name: 'Hosea',         section: 'Other',            folder: 'Hos',   chCount: 14 },
  { html: 'AMO', abbrev: 'Amos', name: 'Amos',          section: 'Other',            folder: 'Amos',  chCount: 9  },
  { html: 'OBA', abbrev: 'Obad', name: 'Obadiah',       section: 'Other',            folder: 'Obad',  chCount: 1  },
  { html: 'MIC', abbrev: 'Mic',  name: 'Micah',         section: 'Other',            folder: 'Mic',   chCount: 7  },
  { html: 'NAM', abbrev: 'Nah',  name: 'Nahum',         section: 'Other',            folder: 'Nah',   chCount: 3  },
  { html: 'HAB', abbrev: 'Hab',  name: 'Habakkuk',      section: 'Other',            folder: 'Hab',   chCount: 3  },
  { html: 'ZEP', abbrev: 'Zeph', name: 'Zephaniah',     section: 'Other',            folder: 'Zeph',  chCount: 3  },
  { html: 'HAG', abbrev: 'Hag',  name: 'Haggai',        section: 'Other',            folder: 'Hag',   chCount: 2  },
  { html: 'ZEC', abbrev: 'Zech', name: 'Zechariah',     section: 'Other',            folder: 'Zech',  chCount: 14 },
  { html: 'MAL', abbrev: 'Mal',  name: 'Malachi',       section: 'Other',            folder: 'Mal',   chCount: 3  },

  // --- New: Deuterocanonical ---
  { html: 'BAR', abbrev: 'Bar',  name: 'Baruch',        section: 'Deuterocanonical', folder: 'Bar',   chCount: 5  },
  { html: 'LJE', abbrev: 'EpJer',name: 'Epistle of Jeremiah', section: 'Deuterocanonical', folder: 'EpJer', chCount: 1 },
  { html: 'SUS', abbrev: 'Sus',  name: 'Susanna',       section: 'Deuterocanonical', folder: 'Sus',   chCount: 1  },
  { html: 'BEL', abbrev: 'Bel',  name: 'Bel & the Dragon', section: 'Deuterocanonical', folder: 'Bel', chCount: 1 },
  { html: 'ESG', abbrev: 'EsthGk',name: 'Esther (Greek)', section: 'Deuterocanonical', folder: 'EsthGk', chCount: 10 },
  { html: 'MAN', abbrev: 'PrMan',name: 'Prayer of Manasseh', section: 'Deuterocanonical', folder: 'PrMan', chCount: 1 },
  { html: '1MA', abbrev: '1Macc',name: '1 Maccabees',   section: 'Deuterocanonical', folder: '1Macc', chCount: 16 },
  { html: '2MA', abbrev: '2Macc',name: '2 Maccabees',   section: 'Deuterocanonical', folder: '2Macc', chCount: 15 },
  { html: '3MA', abbrev: '3Macc',name: '3 Maccabees',   section: 'Deuterocanonical', folder: '3Macc', chCount: 7  },
  { html: '4MA', abbrev: '4Macc',name: '4 Maccabees',   section: 'Deuterocanonical', folder: '4Macc', chCount: 18 },
]

function decodeEntities(text) {
  return text
    .replace(/&#160;/g, ' ')
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
}

function parseVerses(html) {
  const verses = []
  const versePattern = /<span[^>]*class="verse"[^>]*id="V(\d+)"[^>]*>[\s\S]*?<\/span>([\s\S]*?)(?=<span[^>]*class="verse"|<ul class='tnav'|$)/g

  let match
  while ((match = versePattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10)
    if (num === 0) continue

    let text = match[2]
    // Remove footnote popups
    text = text.replace(/<a[^>]*class="notemark"[^>]*>[\s\S]*?<\/a>/g, '')
    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, '')
    text = decodeEntities(text)
    text = text.trim().replace(/\s+/g, ' ')

    if (text) {
      verses.push({ num, geez: '', translation: text, words: [] })
    }
  }

  return verses
}

function htmlFilename(prefix, chapter) {
  return join(HTML_DIR, `${prefix}${String(chapter).padStart(2, '0')}.htm`)
}

let totalBooks = 0
let totalChapters = 0
let totalFailed = 0

const books = JSON.parse(readFileSync(BOOKS_FILE, 'utf-8'))
const existingAbbrevs = new Set(books.map(b => b.abbrev))

for (const book of BOOK_MAP) {
  if (existsSync(join(CHAPTERS_DIR, book.folder))) {
    console.log(`⏭️  ${book.name} — folder already exists, skipping`)
    continue
  }

  const outDir = join(CHAPTERS_DIR, book.folder)
  mkdirSync(outDir, { recursive: true })

  let chaptersWritten = 0
  let chapsFailed = 0

  for (let ch = 1; ch <= book.chCount; ch++) {
    const htmlFile = htmlFilename(book.html, ch)
    if (!existsSync(htmlFile)) {
      console.warn(`  ⚠️  ${book.name} ch${ch}: file not found (${htmlFile})`)
      chapsFailed++
      continue
    }

    const html = readFileSync(htmlFile, 'utf-8')
    const verses = parseVerses(html)

    if (verses.length === 0) {
      console.warn(`  ⚠️  ${book.name} ch${ch}: no verses parsed`)
      chapsFailed++
      continue
    }

    const chapter = { book: book.abbrev, chapter: ch, verses }
    writeFileSync(join(outDir, `${ch}.json`), JSON.stringify(chapter, null, 2))
    chaptersWritten++
  }

  console.log(`✅ ${book.name}: ${chaptersWritten} chapters written${chapsFailed ? `, ${chapsFailed} failed` : ''}`)
  totalBooks++
  totalChapters += chaptersWritten
  totalFailed += chapsFailed

  // Add to books.json if not already there
  if (!existingAbbrevs.has(book.abbrev)) {
    books.push({
      abbrev: book.abbrev,
      name: book.name,
      section: book.section,
      chapters: book.chCount,
      source_id: book.abbrev.toLowerCase(),
      short: book.name,
    })
    existingAbbrevs.add(book.abbrev)
    console.log(`   ↳ Added to books.json`)
  }
}

writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2))

console.log(`\n${'='.repeat(50)}`)
console.log(`Done: ${totalBooks} books, ${totalChapters} chapters written, ${totalFailed} failed.`)

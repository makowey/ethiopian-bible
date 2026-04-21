/**
 * Fills English translations into existing Geez-only chapter JSON files
 * from Brenton LXX HTML sources, then updates books.json with hasTranslation flag.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HTML_DIR = join(ROOT, 'docs/eng-Brenton_html')
const CHAPTERS_DIR = join(ROOT, 'public/data/chapters')
const BOOKS_FILE = join(ROOT, 'public/data/books.json')

// Mapping: app folder → { htmlPrefix, maxChapters }
// maxChapters = how many HTML chapters to use (capped at app's actual chapter count)
const FILL_MAP = [
  { folder: 'Deut',  html: 'DEU', maxCh: 34 },
  { folder: 'Eccl',  html: 'ECC', maxCh: 12 },
  { folder: 'Exod',  html: 'EXO', maxCh: 40 },
  { folder: 'Gen',   html: 'GEN', maxCh: 50 },
  { folder: 'Isa',   html: 'ISA', maxCh: 66 },
  { folder: 'Jdt',   html: 'JDT', maxCh: 16 },
  { folder: 'Job',   html: 'JOB', maxCh: 42 },
  { folder: 'Joel',  html: 'JOL', maxCh: 3  }, // app has 3 ch (LXX has 4)
  { folder: 'Jonah', html: 'JON', maxCh: 4  },
  { folder: 'Josh',  html: 'JOS', maxCh: 24 },
  { folder: 'Judg',  html: 'JDG', maxCh: 21 },
  { folder: 'Kings', html: '2KI', maxCh: 25 },
  { folder: 'Lam',   html: 'LAM', maxCh: 5  },
  { folder: 'Lev',   html: 'LEV', maxCh: 27 },
  { folder: 'Num',   html: 'NUM', maxCh: 36 },
  { folder: 'Prov',  html: 'PRO', maxCh: 31 },
  { folder: 'Ruth',  html: 'RUT', maxCh: 4  },
  { folder: 'Sir',   html: 'SIR', maxCh: 51 },
  { folder: 'Song',  html: 'SNG', maxCh: 8  },
  { folder: 'Tob',   html: 'TOB', maxCh: 14 },
  { folder: 'Wis',   html: 'WIS', maxCh: 19 },
  { folder: 'Ezra',  html: 'EZR', maxCh: 13 }, // app has 13 chapters
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

function parseVerseMap(html) {
  const map = new Map() // verseNum → translation text
  const versePattern = /<span[^>]*class="verse"[^>]*id="V(\d+)"[^>]*>[\s\S]*?<\/span>([\s\S]*?)(?=<span[^>]*class="verse"|<ul class='tnav'|$)/g

  let match
  while ((match = versePattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10)
    if (num === 0) continue

    let text = match[2]
    text = text.replace(/<a[^>]*class="notemark"[^>]*>[\s\S]*?<\/a>/g, '')
    text = text.replace(/<[^>]+>/g, '')
    text = decodeEntities(text)
    text = text.trim().replace(/\s+/g, ' ')

    if (text) map.set(num, text)
  }

  return map
}

let totalBooks = 0
let totalChapters = 0
let totalVersesFilled = 0

for (const entry of FILL_MAP) {
  const folderPath = join(CHAPTERS_DIR, entry.folder)
  if (!existsSync(folderPath)) {
    console.warn(`⚠️  Folder not found: ${entry.folder}`)
    continue
  }

  let chapsFilled = 0
  let versesFilled = 0

  for (let ch = 1; ch <= entry.maxCh; ch++) {
    const jsonFile = join(folderPath, `${ch}.json`)
    const htmlFile = join(HTML_DIR, `${entry.html}${String(ch).padStart(2, '0')}.htm`)

    if (!existsSync(jsonFile) || !existsSync(htmlFile)) continue

    const chData = JSON.parse(readFileSync(jsonFile, 'utf-8'))

    // Skip if already translated
    const hasTranslation = chData.verses?.some(v => v.translation?.trim())
    if (hasTranslation) continue

    const html = readFileSync(htmlFile, 'utf-8')
    const verseMap = parseVerseMap(html)
    if (verseMap.size === 0) continue

    let filled = 0
    for (const verse of chData.verses ?? []) {
      if (!verse.translation?.trim() && verseMap.has(verse.num)) {
        verse.translation = verseMap.get(verse.num)
        filled++
      }
    }

    if (filled > 0) {
      writeFileSync(jsonFile, JSON.stringify(chData, null, 2))
      chapsFilled++
      versesFilled += filled
    }
  }

  if (chapsFilled > 0) {
    console.log(`✅ ${entry.folder}: filled ${versesFilled} verses across ${chapsFilled} chapters`)
    totalBooks++
    totalChapters += chapsFilled
    totalVersesFilled += versesFilled
  } else {
    console.log(`⏭️  ${entry.folder}: nothing to fill (already translated or no match)`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`Done: ${totalBooks} books, ${totalChapters} chapters, ${totalVersesFilled} verses filled.\n`)

// --- Update books.json with hasTranslation flag ---
console.log('Updating books.json with hasTranslation flags...')
const books = JSON.parse(readFileSync(BOOKS_FILE, 'utf-8'))

for (const book of books) {
  const folderPath = join(CHAPTERS_DIR, book.abbrev)
  if (!existsSync(folderPath)) {
    book.hasTranslation = false
    continue
  }

  // Sample chapter 1 to check for translation
  const ch1 = join(folderPath, '1.json')
  if (!existsSync(ch1)) {
    book.hasTranslation = false
    continue
  }

  const chData = JSON.parse(readFileSync(ch1, 'utf-8'))
  const hasAny = chData.verses?.some(v => v.translation?.trim())
  book.hasTranslation = !!hasAny
}

writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2))
const withTranslation = books.filter(b => b.hasTranslation).length
const withoutTranslation = books.filter(b => !b.hasTranslation).length
console.log(`✅ books.json updated: ${withTranslation} with translation, ${withoutTranslation} without`)

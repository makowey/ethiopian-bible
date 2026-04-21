import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HTML_DIR = join(ROOT, 'docs/eng-Brenton_html')
const OUT_DIR = join(ROOT, 'public/data/chapters/Ps')
const BOOKS_FILE = join(ROOT, 'public/data/books.json')

mkdirSync(OUT_DIR, { recursive: true })

function parseVerses(html) {
  const verses = []

  // Extract all verse spans with their ids: <span class="verse" id="V1">1&#160;</span>
  const versePattern = /<span[^>]*class="verse"[^>]*id="V(\d+)"[^>]*>[\s\S]*?<\/span>([\s\S]*?)(?=<span[^>]*class="verse"|<ul class='tnav'|$)/g

  let match
  while ((match = versePattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10)
    if (num === 0) continue // skip chapter label verse

    let text = match[2]

    // Remove footnote popup links but keep surrounding text clean
    text = text.replace(/<a[^>]*class="notemark"[^>]*>[\s\S]*?<\/a>/g, '')

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '')

    // Decode HTML entities
    text = text.replace(/&#160;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&mdash;/g, '—')
    text = text.replace(/&ldquo;/g, '\u201C')
    text = text.replace(/&rdquo;/g, '\u201D')
    text = text.replace(/&lsquo;/g, '\u2018')
    text = text.replace(/&rsquo;/g, '\u2019')

    // Collapse whitespace
    text = text.trim().replace(/\s+/g, ' ')

    if (text) {
      verses.push({ num, geez: '', translation: text, words: [] })
    }
  }

  return verses
}

let successCount = 0
let failCount = 0

for (let i = 1; i <= 151; i++) {
  const padded = String(i).padStart(3, '0')
  const htmlFile = join(HTML_DIR, `PSA${padded}.htm`)

  try {
    const html = readFileSync(htmlFile, 'utf-8')
    const verses = parseVerses(html)

    if (verses.length === 0) {
      console.warn(`⚠️  Psalm ${i}: no verses found`)
      failCount++
      continue
    }

    const chapter = { book: 'Ps', chapter: i, verses }
    const outFile = join(OUT_DIR, `${i}.json`)
    writeFileSync(outFile, JSON.stringify(chapter, null, 2))
    console.log(`✅ Psalm ${i}: ${verses.length} verses → ${outFile}`)
    successCount++
  } catch (err) {
    console.error(`❌ Psalm ${i}: ${err.message}`)
    failCount++
  }
}

console.log(`\nDone: ${successCount} chapters written, ${failCount} failed.\n`)

// --- Update books.json ---
const books = JSON.parse(readFileSync(BOOKS_FILE, 'utf-8'))

const alreadyExists = books.some(b => b.abbrev === 'Ps')
if (alreadyExists) {
  console.log('ℹ️  books.json already has Psalms entry — skipping.')
} else {
  // Insert after "Wisdom" section books (after Song of Songs / Prov / Ecc etc.)
  // Find index of "Ecclesiastes" or end of the "Other" section and insert there
  const prov = books.findIndex(b => b.abbrev === 'Prov')
  const insertAt = prov !== -1 ? prov + 1 : books.length

  const psalmsEntry = {
    abbrev: 'Ps',
    name: 'Psalms',
    geez_name: 'መዝሙር፡',
    section: 'Wisdom',
    chapters: 151,
    source_id: 'ps',
    short: 'Psalms'
  }

  books.splice(insertAt, 0, psalmsEntry)
  writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2))
  console.log(`✅ Added Psalms entry to books.json at position ${insertAt}`)
}

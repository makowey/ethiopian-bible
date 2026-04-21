import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Book, Chapter } from '../types/bible'
import { loadBooks, loadChapter } from '../lib/data'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { loadHistory } from '../lib/storage'

/* ── Reference parser ────────────────────────────────────────
   Handles patterns like:
     "Gen 1:3"   "Genesis 1:3"   "Psalm 23"   "Ps 23:1"
     "1 Enoch 7" "Rev 22:20"
──────────────────────────────────────────────────────────── */

// Short-name → abbrev map (covers common aliases)
const NAME_TO_ABBREV: Record<string, string> = {
  genesis: 'Gen', gen: 'Gen',
  exodus: 'Exod', exod: 'Exod', exo: 'Exod',
  leviticus: 'Lev', lev: 'Lev',
  numbers: 'Num', num: 'Num',
  deuteronomy: 'Deut', deut: 'Deut', deu: 'Deut',
  joshua: 'Josh', josh: 'Josh', jos: 'Josh',
  judges: 'Judg', judg: 'Judg', jdg: 'Judg',
  ruth: 'Ruth', rut: 'Ruth',
  '1samuel': '1Sam', '1sam': '1Sam', '1sa': '1Sam',
  '2samuel': '2Sam', '2sam': '2Sam', '2sa': '2Sam',
  '1kings': '1Kgs', '1kgs': '1Kgs', '1ki': '1Kgs', '1kng': '1Kgs',
  '2kings': 'Kings', '2kgs': 'Kings', '2ki': 'Kings',
  kings: 'Kings',
  '1chronicles': '1Chr', '1chr': '1Chr', '1ch': '1Chr',
  '2chronicles': '2Chr', '2chr': '2Chr', '2ch': '2Chr',
  ezra: 'Ezra',
  nehemiah: 'Neh', neh: 'Neh',
  job: 'Job',
  psalms: 'Ps', psalm: 'Ps', psa: 'Ps', ps: 'Ps',
  proverbs: 'Prov', prov: 'Prov', pro: 'Prov',
  ecclesiastes: 'Eccl', eccl: 'Eccl', ecc: 'Eccl',
  'songofsolomon': 'Song', 'songofsongs': 'Song', song: 'Song', sng: 'Song',
  isaiah: 'Isa', isa: 'Isa',
  jeremiah: 'Jer', jer: 'Jer',
  lamentations: 'Lam', lam: 'Lam',
  ezekiel: 'Ezek', ezek: 'Ezek', ezk: 'Ezek',
  daniel: 'Dan', dan: 'Dan',
  hosea: 'Hos', hos: 'Hos',
  joel: 'Joel', jol: 'Joel',
  amos: 'Amos', amo: 'Amos',
  obadiah: 'Obad', obad: 'Obad', oba: 'Obad',
  jonah: 'Jonah', jon: 'Jonah',
  micah: 'Mic', mic: 'Mic',
  nahum: 'Nah', nah: 'Nah',
  habakkuk: 'Hab', hab: 'Hab',
  zephaniah: 'Zeph', zeph: 'Zeph', zep: 'Zeph',
  haggai: 'Hag', hag: 'Hag',
  zechariah: 'Zech', zech: 'Zech', zec: 'Zech',
  malachi: 'Mal', mal: 'Mal',
  tobit: 'Tob', tob: 'Tob',
  judith: 'Jdt', jdt: 'Jdt',
  sirach: 'Sir', sir: 'Sir',
  'wisdomofsolomon': 'Wis', wisdom: 'Wis', wis: 'Wis',
  baruch: 'Bar', bar: 'Bar',
  '1maccabees': '1Macc', '1macc': '1Macc', '1mac': '1Macc',
  '2maccabees': '2Macc', '2macc': '2Macc', '2mac': '2Macc',
  '3maccabees': '3Macc', '3macc': '3Macc',
  '4maccabees': '4Macc', '4macc': '4Macc',
  '1enoch': '1En', enoch: '1En', '1en': '1En',
  jubilees: 'Jub', jub: 'Jub',
  '1meqabyan': '1Meq', '1meq': '1Meq',
  '3meqabyan': '3Meq', '3meq': '3Meq',
  '4baruch': '4Bar', '4bar': '4Bar',
  kebranagast: 'KN', kebra: 'KN', kn: 'KN',
  esther: 'EsthGk', est: 'EsthGk', esth: 'EsthGk', esthgk: 'EsthGk', 'esther(greek)': 'EsthGk',
  susanna: 'Sus', sus: 'Sus',
  daniel2: 'Dan', bel: 'Bel',
  '1esdras': '1Esd', '1esd': '1Esd',
  prayerofmanasseh: 'PrMan', prman: 'PrMan', 'prayerofmanasses': 'PrMan',
  nehemiah2: 'Neh',
}

interface ParsedRef {
  abbrev: string
  chapter?: number
  verse?: number
  display: string
}

function parseReference(q: string): ParsedRef | null {
  // Strip punctuation and normalise spaces
  const clean = q.trim().replace(/[.,;]/g, '')

  // Pattern: optional-number book chapter:verse  (e.g. "1 Samuel 3:5", "Gen 1:3", "Ps 23")
  const match = clean.match(
    /^(\d\s)?([a-zA-Z]+(?:\s[a-zA-Z]+)*)\s+(\d+)(?:[:\s](\d+))?$/
  )
  if (!match) return null

  const prefix = (match[1] || '').trim() // e.g. "1"
  const bookRaw = match[2].trim()        // e.g. "Samuel" or "Genesis"
  const chapter = parseInt(match[3], 10)
  const verse = match[4] ? parseInt(match[4], 10) : undefined

  const key = (prefix + bookRaw).toLowerCase().replace(/\s/g, '')
  const abbrev = NAME_TO_ABBREV[key] ?? NAME_TO_ABBREV[bookRaw.toLowerCase()]
  if (!abbrev) return null

  const display = `${abbrev} ${chapter}${verse !== undefined ? `:${verse}` : ''}`
  return { abbrev, chapter, verse, display }
}

/* ── Types ──────────────────────────────────────────────────── */
interface SearchResult {
  book: string
  bookName: string
  chapter: number
  verse: number
  field: string
  text: string
}

interface BookMatch {
  book: Book
  score: number
}

interface SearchPanelProps {
  open: boolean
  onClose: () => void
}

/* ── Component ──────────────────────────────────────────────── */
export function SearchPanel({ open, onClose }: SearchPanelProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [progress, setProgress] = useState('')
  const [searched, setSearched] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const trapRef = useFocusTrap(open, onClose)

  // Load books list once
  useEffect(() => {
    loadBooks().then(setBooks).catch(() => {})
  }, [])

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setQuery('')
      setResults([])
      setSearched(false)
      setProgress('')
      setActiveIdx(0)
    }
  }, [open])

  /* ── Parsed reference ─────────────────────────────────────── */
  const parsedRef = useMemo(() => (query.trim().length >= 3 ? parseReference(query) : null), [query])

  /* ── Book name matches (fuzzy prefix) ────────────────────── */
  const bookMatches = useMemo<BookMatch[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return books
      .filter(b => b.hasTranslation !== false)
      .map(b => {
        const name = b.name.toLowerCase()
        const abbrev = b.abbrev.toLowerCase()
        let score = 0
        if (name === q || abbrev === q) score = 100
        else if (name.startsWith(q)) score = 80
        else if (abbrev.startsWith(q)) score = 70
        else if (name.includes(q)) score = 40
        return { book: b, score }
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [query, books])

  /* ── Recent history ──────────────────────────────────────── */
  const recentHistory = useMemo(() => {
    if (query.trim()) return []
    try {
      const hist = loadHistory().slice(0, 5)
      return hist.map(h => {
        const book = books.find(b => b.abbrev === h.book)
        return book ? { ...h, bookName: book.name } : null
      }).filter(Boolean) as Array<{ book: string; bookName: string; chapter: number }>
    } catch {
      return []
    }
  }, [query, books])

  /* ── Full-text search ────────────────────────────────────── */
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setSearched(false)
      setProgress('')
      if (abortRef.current) abortRef.current.abort()
      return
    }

    const timeout = setTimeout(() => runSearch(query.trim()), 350)
    return () => clearTimeout(timeout)
  }, [query])

  const runSearch = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSearching(true)
    setResults([])
    setSearched(false)

    const lowerQ = q.toLowerCase()
    const found: SearchResult[] = []

    try {
      const allBooks = await loadBooks()
      // Prioritise books with translations
      const sortedBooks = allBooks.filter(b => b.hasTranslation !== false)
      const total = sortedBooks.length

      for (let i = 0; i < sortedBooks.length; i++) {
        if (controller.signal.aborted) return
        const book = sortedBooks[i]
        setProgress(`${book.name} (${i + 1}/${total})`)

        for (let ch = 1; ch <= book.chapters; ch++) {
          if (controller.signal.aborted) return
          if (found.length >= 60) break
          try {
            const chapter = await loadChapter(book.abbrev, ch)
            searchChapter(chapter, book, lowerQ, found)
          } catch { /* skip */ }
          if (found.length >= 60) break
        }
        if (found.length >= 60) break
      }
    } catch { /* loadBooks failed */ }

    if (!controller.signal.aborted) {
      setResults(found)
      setSearching(false)
      setSearched(true)
      setProgress('')
      setActiveIdx(0)
    }
  }, [])

  function searchChapter(chapter: Chapter, book: Book, lowerQ: string, found: SearchResult[]) {
    for (const verse of chapter.verses) {
      if (found.length >= 60) return
      const fields = [
        { key: 'lxx', text: verse.translations?.lxx },
        { key: 'kjv', text: verse.translations?.kjv },
        { key: 'translation', text: verse.translation },
      ]
      for (const { key, text } of fields) {
        if (text && text.toLowerCase().includes(lowerQ)) {
          found.push({ book: book.abbrev, bookName: book.name, chapter: chapter.chapter, verse: verse.num, field: key, text })
          break
        }
      }
    }
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function goTo(path: string) {
    onClose()
    navigate(path)
  }

  /* ── Keyboard navigation ─────────────────────────────────── */
  function handleKeyDown(e: React.KeyboardEvent) {
    const totalItems = (parsedRef ? 1 : 0) + bookMatches.length + results.length + recentHistory.length
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, totalItems - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      // Fire the active item
      let idx = 0
      if (parsedRef) {
        if (activeIdx === 0) {
          const path = parsedRef.verse !== undefined
            ? `/read/${parsedRef.abbrev}/${parsedRef.chapter}/${parsedRef.verse}`
            : `/read/${parsedRef.abbrev}/${parsedRef.chapter}`
          goTo(path); return
        }
        idx++
      }
      for (const bm of bookMatches) {
        if (activeIdx === idx) { goTo(`/read/${bm.book.abbrev}/1`); return }
        idx++
      }
      for (const r of results) {
        if (activeIdx === idx) { goTo(`/read/${r.book}/${r.chapter}/${r.verse}`); return }
        idx++
      }
      for (const h of recentHistory) {
        if (activeIdx === idx) { goTo(`/read/${h.book}/${h.chapter}`); return }
        idx++
      }
    }
  }

  /* ── Highlight helper ────────────────────────────────────── */
  function highlight(text: string, q: string): React.ReactNode {
    const lc = text.toLowerCase()
    const lq = q.toLowerCase()
    const idx = lc.indexOf(lq)
    if (idx === -1) return text
    const start = Math.max(0, idx - 40)
    const end = Math.min(text.length, idx + q.length + 80)
    return (
      <>
        {start > 0 && '…'}
        {text.slice(start, idx)}
        <mark className="text-accent-bright font-semibold bg-accent/10 rounded px-0.5 not-italic">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length, end)}
        {end < text.length && '…'}
      </>
    )
  }

  if (!open) return null

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(19,15,10,0.97)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Search the Bible"
    >
      {/* ── Search input bar ─────────────────────────────────── */}
      <div className="flex-shrink-0 max-w-2xl mx-auto w-full px-4 pt-8 pb-4">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid rgba(200,149,42,0.18)',
            boxShadow: '0 0 40px rgba(200,149,42,0.06), inset 0 1px 0 rgba(200,149,42,0.06)',
          }}
        >
          <svg className="w-5 h-5 text-accent/40 flex-shrink-0" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder='Search text, or try "Gen 1:3", "Psalm 23"…'
            className="flex-1 bg-transparent text-text text-base outline-none placeholder:text-text-faint font-body"
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-text-faint hover:text-text-muted transition-colors cursor-pointer flex-shrink-0"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <kbd className="hidden sm:flex items-center gap-1 text-text-faint text-[0.6rem] font-ui flex-shrink-0 opacity-40">
            ESC
          </kbd>

          <button
            onClick={onClose}
            className="sm:hidden text-text-muted hover:text-text transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Results area ─────────────────────────────────────── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 pb-8"
        aria-live="polite"
      >
        {/* ── Searching progress ──────────────────────────── */}
        {searching && (
          <div className="flex items-center gap-3 py-4 text-text-faint text-xs font-ui" role="status">
            <svg className="w-3.5 h-3.5 animate-spin text-accent/40 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="truncate">{progress || 'Searching…'}</span>
          </div>
        )}

        {/* ── Reference jump ──────────────────────────────── */}
        {parsedRef && (() => {
          const idx = 0
          const active = activeIdx === idx
          const path = parsedRef.verse !== undefined
            ? `/read/${parsedRef.abbrev}/${parsedRef.chapter}/${parsedRef.verse}`
            : `/read/${parsedRef.abbrev}/${parsedRef.chapter}`
          return (
            <Section label="Jump to reference">
              <ResultRow
                active={active}
                onClick={() => goTo(path)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                  </svg>
                }
              >
                <span className="font-body font-semibold text-text">{parsedRef.display}</span>
                <span className="text-text-faint text-xs font-ui ml-2">Go to verse</span>
              </ResultRow>
            </Section>
          )
        })()}

        {/* ── Book name matches ───────────────────────────── */}
        {bookMatches.length > 0 && (
          <Section label="Books">
            {bookMatches.map((bm, i) => {
              const idx = (parsedRef ? 1 : 0) + i
              return (
                <ResultRow
                  key={bm.book.abbrev}
                  active={activeIdx === idx}
                  onClick={() => goTo(`/read/${bm.book.abbrev}/1`)}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                    </svg>
                  }
                >
                  <span className="font-body font-medium text-text">{bm.book.name}</span>
                  {bm.book.geez_name && (
                    <span className="font-geez text-accent/50 text-sm ml-2" lang="gez">{bm.book.geez_name}</span>
                  )}
                  <span className="text-text-faint text-xs font-ui ml-auto flex-shrink-0">{bm.book.chapters} ch</span>
                </ResultRow>
              )
            })}
          </Section>
        )}

        {/* ── Full-text results ───────────────────────────── */}
        {results.length > 0 && (
          <Section
            label={`Verses ${results.length >= 60 ? '(60+ found)' : `(${results.length})`}`}
          >
            {results.map((result, i) => {
              const idx = (parsedRef ? 1 : 0) + bookMatches.length + i
              return (
                <ResultRow
                  key={`${result.book}-${result.chapter}-${result.verse}-${i}`}
                  active={activeIdx === idx}
                  onClick={() => goTo(`/read/${result.book}/${result.chapter}/${result.verse}`)}
                  icon={
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/>
                    </svg>
                  }
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-accent font-ui text-xs font-medium flex-shrink-0">
                        {result.bookName} {result.chapter}:{result.verse}
                      </span>
                      {result.field !== 'translation' && (
                        <span className="text-text-faint text-[0.6rem] font-ui uppercase tracking-wider">
                          {result.field === 'lxx' ? 'Septuagint' : 'KJV'}
                        </span>
                      )}
                    </div>
                    <p className="font-body text-text-muted text-sm leading-relaxed">
                      {highlight(result.text, query)}
                    </p>
                  </div>
                </ResultRow>
              )
            })}
          </Section>
        )}

        {/* ── Recent history (idle state) ──────────────────── */}
        {recentHistory.length > 0 && !query.trim() && (
          <Section label="Recently read">
            {recentHistory.map((h, i) => (
              <ResultRow
                key={`${h.book}-${h.chapter}`}
                active={activeIdx === i}
                onClick={() => goTo(`/read/${h.book}/${h.chapter}`)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
              >
                <span className="font-body text-text">{h.bookName}</span>
                <span className="text-text-faint text-xs font-ui ml-1.5">Ch. {h.chapter}</span>
              </ResultRow>
            ))}
          </Section>
        )}

        {/* ── Empty state ──────────────────────────────────── */}
        {searched && !searching && results.length === 0 && bookMatches.length === 0 && !parsedRef && (
          <div className="text-center py-16 text-text-muted">
            <svg className="w-8 h-8 mx-auto mb-3 text-text-faint opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <p className="text-sm font-body italic">No results for "{query}"</p>
            <p className="text-xs text-text-faint mt-1 font-ui">Try a different word or a reference like "Ps 23"</p>
          </div>
        )}

        {/* ── Idle state ───────────────────────────────────── */}
        {!searching && !searched && !query.trim() && recentHistory.length === 0 && (
          <div className="text-center py-16 text-text-faint">
            <p className="text-sm font-ui">Search verses, or jump to a reference</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Gen 1:1', 'Psalm 23', '1 Enoch 1', 'Isaiah 53'].map(ex => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="px-3 py-1 rounded-sm font-ui text-xs cursor-pointer transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(200,160,80,0.10)',
                    color: 'var(--color-text-muted)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,149,42,0.25)'; e.currentTarget.style.color = 'var(--color-accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,160,80,0.10)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Section wrapper ────────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="font-ui text-[0.58rem] uppercase tracking-[0.18em] text-text-faint mb-2 px-1">
        {label}
      </p>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}

/* ── Result row ─────────────────────────────────────────────── */
function ResultRow({
  children, onClick, icon, active,
}: {
  children: React.ReactNode
  onClick: () => void
  icon: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-sm transition-all cursor-pointer"
      style={{
        background: active ? 'rgba(200,149,42,0.08)' : 'transparent',
        border: `1px solid ${active ? 'rgba(200,149,42,0.20)' : 'transparent'}`,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(200,149,42,0.05)'
          e.currentTarget.style.borderColor = 'rgba(200,149,42,0.10)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
        }
      }}
    >
      <span className="text-accent/35 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
        {children}
      </div>
    </button>
  )
}

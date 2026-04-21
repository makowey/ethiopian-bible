import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Book } from '../types/bible'
import { loadBooks, getBookSections } from '../lib/data'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface BookPickerProps {
  open: boolean
  onClose: () => void
  /** When provided, the picker opens with this book's section expanded */
  currentBook?: string
}

export function BookPicker({ open, onClose, currentBook }: BookPickerProps) {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const trapRef = useFocusTrap(open, onClose)

  useEffect(() => {
    if (open) {
      loadBooks().then(setBooks).catch(console.error)
    }
  }, [open])

  // When opening, if currentBook is set, auto-select it to show chapter grid
  useEffect(() => {
    if (!open) {
      setSelectedBook(null)
      return
    }
    if (currentBook && books.length > 0) {
      const match = books.find(b => b.abbrev === currentBook)
      if (match && match.chapters > 1) {
        setSelectedBook(match)
      }
    }
  }, [open, currentBook, books])

  if (!open) return null

  const sections = getBookSections(books)

  function handleBookClick(book: Book) {
    if (book.hasTranslation === false) return
    if (book.chapters === 1) {
      navigate(`/read/${book.abbrev}/1`)
      onClose()
    } else {
      setSelectedBook(book)
    }
  }

  function handleChapterClick(chapter: number) {
    if (!selectedBook) return
    navigate(`/read/${selectedBook.abbrev}/${chapter}`)
    onClose()
  }

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-40 flex flex-col bg-bg/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a book"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {selectedBook && (
            <button
              onClick={() => setSelectedBook(null)}
              className="text-text-muted hover:text-text transition-colors cursor-pointer"
              aria-label="Back to book list"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold text-text">
            {selectedBook ? selectedBook.name : 'Choose a Book'}
          </h2>
          {selectedBook?.geez_name && (
            <span className="font-geez text-accent text-sm" lang="gez">{selectedBook.geez_name}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text transition-colors cursor-pointer"
          aria-label="Close book picker"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!selectedBook ? (
          <div className="space-y-8 max-w-2xl mx-auto">
            {sections.map(section => (
              <div key={section.label}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, rgba(200,149,42,0.3), transparent)' }} />
                  <h3 className="font-ui text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-accent/60 flex-shrink-0">
                    {section.label}
                  </h3>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, rgba(200,149,42,0.3), transparent)' }} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.books.map(book => {
                    const disabled = book.hasTranslation === false
                    return (
                      <button
                        key={book.abbrev}
                        onClick={() => handleBookClick(book)}
                        disabled={disabled}
                        title={disabled ? 'No English translation available yet' : undefined}
                        className={[
                          'flex items-center justify-between gap-3 px-4 py-3 rounded-sm',
                          'border transition-all text-left group',
                          disabled
                            ? 'opacity-35 cursor-not-allowed'
                            : 'cursor-pointer hover:scale-[1.01]',
                        ].join(' ')}
                        style={disabled ? {
                          background: 'var(--color-surface)',
                          borderColor: 'rgba(200,160,80,0.06)',
                        } : {
                          background: 'var(--color-surface)',
                          borderColor: 'rgba(200,160,80,0.09)',
                          boxShadow: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          if (!disabled) {
                            e.currentTarget.style.borderColor = 'rgba(200,149,42,0.25)'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(200,149,42,0.08) inset'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!disabled) {
                            e.currentTarget.style.borderColor = 'rgba(200,160,80,0.09)'
                            e.currentTarget.style.boxShadow = 'none'
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <p className="font-body font-medium text-text group-hover:text-accent-bright transition-colors truncate">
                            {book.name}
                          </p>
                          {book.geez_name && (
                            <p className="font-geez text-accent/50 text-sm truncate mt-0.5" lang="gez">
                              {book.geez_name}
                            </p>
                          )}
                        </div>
                        <span className="font-ui text-text-faint text-xs flex-shrink-0 tabular-nums">
                          {disabled ? <span className="italic opacity-60">soon</span> : `${book.chapters} ch`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <p className="font-ui text-text-faint text-xs uppercase tracking-widest mb-5">
              {selectedBook.chapters} chapters
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                <button
                  key={ch}
                  onClick={() => handleChapterClick(ch)}
                  className="aspect-square flex items-center justify-center rounded-sm
                             font-ui text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(200,160,80,0.09)',
                    color: 'var(--color-text-muted)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(200,149,42,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(200,149,42,0.30)'
                    e.currentTarget.style.color = 'var(--color-accent-bright)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--color-surface)'
                    e.currentTarget.style.borderColor = 'rgba(200,160,80,0.09)'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                  }}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

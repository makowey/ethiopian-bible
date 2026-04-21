import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseKeyboardNavOptions {
  book: string
  chapter: number
  totalChapters: number
  closeModals: () => void
  openSearch: () => void
  toggleBookmark: (verseNum: number) => void
  onVerseChange?: (verseNum: number) => void
}

/**
 * Keyboard navigation for the Ethiopian Bible reader.
 *
 *   Up Arrow    — previous verse
 *   Down Arrow  — next verse
 *   Left Arrow  — previous chapter
 *   Right Arrow — next chapter
 *   Escape      — close any open modal
 *   / or Ctrl+K — open search
 *   b           — toggle bookmark on the currently focused verse
 */
export function useKeyboardNav({
  book,
  chapter,
  totalChapters,
  closeModals,
  openSearch,
  toggleBookmark,
  onVerseChange,
}: UseKeyboardNavOptions) {
  const navigate = useNavigate()
  const visibleVerseRef = useRef<number>(1)

  // Returns sorted list of verse numbers currently in the DOM
  function getVerseNumbers(): number[] {
    const els = document.querySelectorAll<HTMLElement>('[id^="verse-"]')
    return Array.from(els)
      .map(el => parseInt(el.id.replace('verse-', ''), 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b)
  }

  function scrollToVerse(num: number) {
    const el = document.getElementById(`verse-${num}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    visibleVerseRef.current = num
    onVerseChange?.(num)
  }

  // IntersectionObserver keeps visibleVerseRef current while user scrolls freely
  useEffect(() => {
    const verseElements = document.querySelectorAll<HTMLElement>('[id^="verse-"]')
    if (verseElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry
            }
          }
        }
        if (bestEntry) {
          const num = parseInt(bestEntry.target.id.replace('verse-', ''), 10)
          if (!isNaN(num)) {
            visibleVerseRef.current = num
            onVerseChange?.(num)
          }
        }
      },
      { rootMargin: '0px 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    verseElements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [book, chapter])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault()
          const nums = getVerseNumbers()
          const idx = nums.indexOf(visibleVerseRef.current)
          if (idx > 0) {
            scrollToVerse(nums[idx - 1])
          } else if (chapter > 1) {
            // At first verse — go to previous chapter (will land at top)
            navigate(`/read/${book}/${chapter - 1}`)
          }
          break
        }

        case 'ArrowDown': {
          e.preventDefault()
          const nums = getVerseNumbers()
          const idx = nums.indexOf(visibleVerseRef.current)
          if (idx !== -1 && idx < nums.length - 1) {
            scrollToVerse(nums[idx + 1])
          } else if (chapter < totalChapters) {
            // At last verse — go to next chapter
            navigate(`/read/${book}/${chapter + 1}`)
          }
          break
        }

        case 'ArrowLeft':
          if (chapter > 1) {
            e.preventDefault()
            navigate(`/read/${book}/${chapter - 1}`)
          }
          break

        case 'ArrowRight':
          if (chapter < totalChapters) {
            e.preventDefault()
            navigate(`/read/${book}/${chapter + 1}`)
          }
          break

        case 'Escape':
          e.preventDefault()
          closeModals()
          break

        case '/':
          e.preventDefault()
          openSearch()
          break

        case 'k':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            openSearch()
          }
          break

        case 'b':
          e.preventDefault()
          toggleBookmark(visibleVerseRef.current)
          break
      }
    },
    [book, chapter, totalChapters, navigate, closeModals, openSearch, toggleBookmark]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

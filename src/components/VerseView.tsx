import { useState, useCallback, memo, useRef } from 'react'
import type { Verse, ReaderSettings, TranslationEntry } from '../types/bible'
import { WordCard } from './WordCard'
import { ShareVerse } from './ShareVerse'
import { AnnotationEditor } from './AnnotationEditor'
import { VariantIndicator } from './VariantIndicator'
import { ConfidenceBadge, ConfidencePill } from './ConfidenceBadge'

interface VerseViewProps {
  verse: Verse
  settings: ReaderSettings
  bookAbbrev: string
  bookName?: string
  chapter: number
  isBookmarked: boolean
  onToggleBookmark: (verseNum: number) => void
  isFocused?: boolean
}

export const VerseView = memo(function VerseView({
  verse,
  settings,
  bookAbbrev,
  bookName,
  chapter,
  isBookmarked,
  onToggleBookmark,
  isFocused = false,
}: VerseViewProps) {
  const { readingMode, showTransliteration, showLxx, showKjv, showRon, showAiTranslation, fontSize } = settings
  const hasLxx = showLxx && verse.translations?.lxx
  const hasKjv = showKjv && verse.translations?.kjv
  const hasRon = showRon && verse.translations?.ron
  const hasDual = !!(hasLxx || hasKjv || hasRon)
  const [, setAnnotationKey] = useState(0)
  const handleAnnotationChange = useCallback(() => setAnnotationKey(k => k + 1), [])
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(() => {
    const text = verse.translations?.ron
      || verse.translations?.lxx
      || verse.translations?.kjv
      || verse.translation
      || ''
    const label = `${bookAbbrev} ${chapter}:${verse.num}  ${text}`
    navigator.clipboard.writeText(label).then(() => {
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800)
    })
  }, [verse, bookAbbrev, chapter])

  return (
    <div
      id={`verse-${verse.num}`}
      className={`verse-row group py-4 px-2 scroll-mt-20 rounded transition-colors duration-300 ${
        isFocused ? 'bg-accent-dim' : ''
      }`}
      style={{ fontSize }}
    >
      {/* Verse number + bookmark + variant + actions */}
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 flex items-center gap-1 mt-1 w-8 justify-end">
          <button
            onClick={() => onToggleBookmark(verse.num)}
            className="flex items-center gap-0.5 cursor-pointer select-none"
            aria-label={isBookmarked ? `Remove bookmark from verse ${verse.num}` : `Bookmark verse ${verse.num}`}
          >
            <span className="text-accent/50 text-xs tabular-nums font-body italic">
              {verse.num}
            </span>
            {isBookmarked && (
              <svg
                className="w-3 h-3 text-accent fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" />
              </svg>
            )}
          </button>
          <VariantIndicator book={bookAbbrev} chapter={chapter} verse={verse.num} />
        </div>

        <div className="flex-1 space-y-3">
          {/* Study mode: word cards */}
          {readingMode === 'study' && verse.words.length > 0 && (
            <div className="flex flex-wrap gap-1 items-baseline">
              {verse.words.map((word, i) => (
                <WordCard
                  key={i}
                  word={word}
                  showTransliteration={showTransliteration}
                  fontSize={fontSize}
                />
              ))}
            </div>
          )}

          {/* Translation lines */}
          {readingMode === 'study' && (
            <TranslationBlock
              verse={verse}
              hasDual={!!hasDual}
              showLxx={showLxx}
              showKjv={showKjv}
              showRon={showRon}
              showAiTranslation={showAiTranslation}
              fontSize={fontSize}
            />
          )}

          {readingMode === 'read' && (
            <ReadModeBlock verse={verse} showRon={showRon} showAiTranslation={showAiTranslation} fontSize={fontSize} />
          )}

          {readingMode === 'compare' && (
            <CompareModeBlock
              verse={verse}
              hasDual={!!hasDual}
              showLxx={showLxx}
              showKjv={showKjv}
              showRon={showRon}
              showAiTranslation={showAiTranslation}
              fontSize={fontSize}
            />
          )}

          {/* Hover actions: copy + share + annotate */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded text-text-faint hover:text-accent transition-colors cursor-pointer"
              aria-label={copied ? 'Copied!' : `Copy verse ${verse.num}`}
              title={copied ? 'Copied!' : 'Copy verse'}
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <ShareVerse
              verse={verse}
              bookAbbrev={bookAbbrev}
              bookName={bookName}
              chapter={chapter}
            />
            <AnnotationEditor
              book={bookAbbrev}
              chapter={chapter}
              verse={verse.num}
              onAnnotationChange={handleAnnotationChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

/* ---- Sub-blocks ---- */

function TranslationBlock({
  verse,
  hasDual,
  showLxx,
  showKjv,
  showRon,
  showAiTranslation,
  fontSize,
}: {
  verse: Verse
  hasDual: boolean
  showLxx: boolean
  showKjv: boolean
  showRon: boolean
  showAiTranslation: boolean
  fontSize: number
}) {
  const aiEntry = verse.translations?.ai

  if (!hasDual) {
    // Single-source book (e.g., 1 Enoch)
    return (
      <div className="space-y-2">
        <p className="verse-text text-text" style={{ fontSize: fontSize * 0.85 }}>
          {verse.translation}
        </p>
        {showAiTranslation && aiEntry && (
          <AiTranslationBlock aiEntry={aiEntry} fontSize={fontSize} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-1">
      {showLxx && verse.translations?.lxx && (
        <div className="border-l border-lxx-border/60 pl-3">
          <span className="text-lxx/60 text-[0.65rem] font-body italic tracking-wide">
            Septuagint
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {verse.translations.lxx}
          </p>
        </div>
      )}
      {showKjv && verse.translations?.kjv && (
        <div className="border-l border-mt-border/60 pl-3">
          <span className="text-mt/60 text-[0.65rem] font-body italic tracking-wide">
            King James
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {verse.translations.kjv}
          </p>
        </div>
      )}
      {showRon && verse.translations?.ron && (
        <div className="border-l border-ron-border/60 pl-3">
          <span className="text-ron/60 text-[0.65rem] font-body italic tracking-wide">
            Română Ortodoxă
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {verse.translations.ron}
          </p>
        </div>
      )}
      {showAiTranslation && aiEntry && (
        <AiTranslationBlock aiEntry={aiEntry} fontSize={fontSize} />
      )}
      {/* Fallback if no source toggled on but we have the generic translation */}
      {!showLxx && !showKjv && !showRon && !showAiTranslation && verse.translation && (
        <p className="verse-text text-text" style={{ fontSize: fontSize * 0.85 }}>
          {verse.translation}
        </p>
      )}
    </div>
  )
}

function ReadModeBlock({ verse, showRon, showAiTranslation, fontSize }: { verse: Verse; showRon: boolean; showAiTranslation: boolean; fontSize: number }) {
  // Clean reading: Romanian is primary when available and toggled on; fall back to LXX/KJV
  const ronText = showRon ? verse.translations?.ron : undefined
  const scholarlyText = ronText || verse.translations?.lxx || verse.translations?.kjv || verse.translation
  const aiEntry = verse.translations?.ai

  // Use AI as fallback when no scholarly translation exists
  if (!scholarlyText && showAiTranslation && aiEntry) {
    return (
      <div className="flex items-start gap-2">
        <p className="verse-text text-text" style={{ fontSize: fontSize * 0.9 }}>
          {aiEntry.text}
        </p>
        <ConfidencePill confidence={aiEntry.confidence ?? 0} />
      </div>
    )
  }

  return (
    <p className="verse-text text-text" style={{ fontSize: fontSize * 0.9 }}>
      {scholarlyText}
    </p>
  )
}

function CompareModeBlock({
  verse,
  hasDual,
  showLxx,
  showKjv,
  showRon,
  showAiTranslation,
  fontSize,
}: {
  verse: Verse
  hasDual: boolean
  showLxx: boolean
  showKjv: boolean
  showRon: boolean
  showAiTranslation: boolean
  fontSize: number
}) {
  const aiEntry = verse.translations?.ai

  if (!hasDual) {
    // No scholarly dual sources — show generic + AI fallback
    return (
      <div className="space-y-2">
        <p className="text-text leading-relaxed" style={{ fontSize: fontSize * 0.85 }}>
          {verse.translation}
        </p>
        {showAiTranslation && aiEntry && !verse.translation && (
          <div className="flex items-start gap-2">
            <p className="text-text leading-relaxed" style={{ fontSize: fontSize * 0.85 }}>
              {aiEntry.text}
            </p>
            <ConfidencePill confidence={aiEntry.confidence ?? 0} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {showLxx && verse.translations?.lxx && (
        <div className="border-l border-lxx-border/60 pl-3">
          <span className="text-lxx/60 text-[0.65rem] font-body italic tracking-wide">
            Septuagint
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {verse.translations.lxx}
          </p>
        </div>
      )}
      {showKjv && verse.translations?.kjv && (
        <div className="border-l border-mt-border/60 pl-3">
          <span className="text-mt/60 text-[0.65rem] font-body italic tracking-wide">
            King James
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {verse.translations.kjv}
          </p>
        </div>
      )}
      {showRon && verse.translations?.ron && (
        <div className="border-l border-ron-border/60 pl-3">
          <span className="text-ron/60 text-[0.65rem] font-body italic tracking-wide">
            Română Ortodoxă
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {verse.translations.ron}
          </p>
        </div>
      )}
      {showAiTranslation && aiEntry && (
        <div className="border-l border-ai-border/60 pl-3">
          <span className="text-ai/60 text-[0.65rem] font-body italic tracking-wide">
            AI Draft
          </span>
          <p
            className="verse-text text-text mt-0.5"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {aiEntry.text}
          </p>
          <div className="mt-1">
            <ConfidencePill confidence={aiEntry.confidence ?? 0} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Shared AI translation block for Study mode */
function AiTranslationBlock({ aiEntry, fontSize }: { aiEntry: TranslationEntry; fontSize: number }) {
  return (
    <div className="border-l border-ai-border/60 pl-3">
      <span className="text-ai/60 text-[0.65rem] font-body italic tracking-wide">
        AI Draft
      </span>
      <p
        className="verse-text text-text mt-0.5"
        style={{ fontSize: fontSize * 0.85 }}
      >
        {aiEntry.text}
      </p>
      <div className="mt-1.5">
        <ConfidenceBadge
          confidence={aiEntry.confidence ?? 0}
          verifiedWords={aiEntry.verifiedWords}
          totalWords={aiEntry.totalWords}
          source={aiEntry.source}
        />
      </div>
    </div>
  )
}

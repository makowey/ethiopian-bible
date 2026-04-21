import { Link } from 'react-router-dom'

/* ── Ethiopian cross SVG (reusable) ───────────────────────── */
function EthiopianCross({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* Main cross body */}
      <path d="M28 4h8v16h16v8H36v16h16v8H36v8h-8v-8H12v-8h16V28H12v-8h16V4z"
            fill="currentColor" opacity="0.9" />
      {/* Center jewel */}
      <circle cx="32" cy="32" r="3.5" fill="currentColor" opacity="0.6" />
      {/* Arm tips — small diamonds */}
      <path d="M32 2l2 3h-4z M32 62l2-3h-4z M2 32l3 2v-4z M62 32l-3 2v-4z"
            fill="currentColor" opacity="0.4" />
    </svg>
  )
}

/* ── Small ornamental rule ────────────────────────────────── */
function OrnamentalRule() {
  return (
    <div className="flex items-center gap-3 my-5 opacity-50" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
      <EthiopianCross className="w-3 h-3 text-accent flex-shrink-0" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
    </div>
  )
}

export function WelcomePage() {
  return (
    <div className="flex flex-col">

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section className="relative min-h-[92svh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">

        {/* Ambient glow behind cross */}
        <div className="hero-glow" aria-hidden="true" />

        {/* Background cross pattern — very faint */}
        <div
          className="absolute inset-0 opacity-[0.018] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M35 5h10v20h20v10H45v20h20v10H45v10H35v-10H15v-10h20V35H15V25h20V5z' fill='%23c8952a'/%3E%3C/svg%3E")`,
            backgroundSize: '160px 160px',
          }}
        />

        {/* Cross hero icon */}
        <div
          className="relative text-accent mb-10 animate-float animate-glow-pulse animate-reveal-up"
          style={{ animationDelay: '0s' }}
        >
          <EthiopianCross className="w-24 h-24 md:w-28 md:h-28 mx-auto" />
        </div>

        {/* Title */}
        <h1
          className="font-title text-4xl md:text-6xl lg:text-7xl font-semibold text-text leading-tight tracking-wide animate-reveal-up delay-100"
          style={{ textShadow: '0 2px 40px rgba(200,149,42,0.12)' }}
        >
          The Ethiopian Bible
        </h1>

        {/* Decorative subtitle rule */}
        <div className="flex items-center gap-4 my-5 w-64 md:w-80 animate-reveal-up delay-200" aria-hidden="true">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(200,149,42,0.4))' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-accent/50" />
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(200,149,42,0.4))' }} />
        </div>

        {/* Subtitle */}
        <p className="font-body italic text-text-muted text-base md:text-xl max-w-sm md:max-w-md leading-relaxed animate-reveal-up delay-300">
          The oldest and most complete biblical canon in Christianity —
          <span className="text-text not-italic"> 81 books </span>
          preserved in Ge&apos;ez since the 4th century.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-10 animate-reveal-up delay-400">
          <Link
            to="/read/Gen/1"
            className="px-8 py-3 rounded-sm font-ui font-medium text-sm tracking-wide transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(200,149,42,0.25), rgba(200,149,42,0.12))',
              border: '1px solid rgba(200,149,42,0.35)',
              color: 'var(--color-accent-bright)',
              boxShadow: '0 0 20px rgba(200,149,42,0.08)',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(200,149,42,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(200,149,42,0.08)')}
          >
            Begin Reading
          </Link>
          <Link
            to="/discover"
            className="px-8 py-3 rounded-sm font-ui font-medium text-sm tracking-wide text-text-muted hover:text-text transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(200,160,80,0.12)' }}
          >
            Discover the Differences
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-scroll-ind" aria-hidden="true">
          <span className="text-text-faint font-ui text-[0.6rem] uppercase tracking-widest">Scroll</span>
          <svg className="w-4 h-4 text-accent/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ══ LIVE COMPARISON CARD ════════════════════════════════ */}
      <section className="max-w-2xl mx-auto w-full px-4 pb-16">
        <div className="manuscript-panel p-7 md:p-10">

          {/* Header */}
          <div className="text-center mb-7">
            <p className="font-ui text-[0.65rem] uppercase tracking-[0.2em] text-accent/50 mb-2">
              Genesis 5 · Verse 3
            </p>
            <p className="font-body italic text-text-muted text-sm md:text-base">
              Open your Bible to Genesis 5:3. Now read it here:
            </p>
          </div>

          {/* Ge'ez original */}
          <div className="text-center mb-8">
            <p
              className="font-geez text-geez text-2xl md:text-3xl leading-loose geez-glow"
              lang="gez"
            >
              ወሐይወ ፡ አዳም ፡ ፪፻ወ፴ዓመተ ፡ ወወለደ
            </p>
            <p className="font-ui text-[0.6rem] tracking-widest uppercase text-text-faint mt-2">
              Ge&apos;ez original · Ethiopian Maṣḥafa Qeddus
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-7 opacity-20" aria-hidden="true">
            <div className="h-px flex-1 bg-accent" />
            <EthiopianCross className="w-3 h-3 text-accent" />
            <div className="h-px flex-1 bg-accent" />
          </div>

          {/* Side-by-side translations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="relative pl-4"
                 style={{ borderLeft: '2px solid rgba(122,173,110,0.4)' }}>
              <p className="font-ui text-[0.6rem] uppercase tracking-widest mb-2"
                 style={{ color: 'rgba(122,173,110,0.6)' }}>
                Septuagint · 3rd c. BCE
              </p>
              <p className="font-body text-text text-sm md:text-base leading-relaxed">
                And Adam lived{' '}
                <strong style={{ color: 'var(--color-lxx)' }}>
                  two hundred and thirty years
                </strong>
                , and begot a son after his own form.
              </p>
            </div>

            <div className="relative pl-4"
                 style={{ borderLeft: '2px solid rgba(184,96,96,0.4)' }}>
              <p className="font-ui text-[0.6rem] uppercase tracking-widest mb-2"
                 style={{ color: 'rgba(184,96,96,0.6)' }}>
                King James · Masoretic
              </p>
              <p className="font-body text-text text-sm md:text-base leading-relaxed">
                And Adam lived{' '}
                <strong style={{ color: 'var(--color-mt)' }}>
                  an hundred and thirty years
                </strong>
                , and begat a son in his own likeness.
              </p>
            </div>
          </div>

          {/* Punchline */}
          <div className="mt-8 text-center space-y-1.5">
            <p className="font-body text-text-muted text-sm">
              Same book. Same verse.{' '}
              <span className="text-text font-semibold">One hundred years apart.</span>
            </p>
            <p className="font-body italic text-text-muted text-xs md:text-sm">
              The Dead Sea Scrolls and the Gospel of Luke agree with the longer number.
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <Link
              to="/discover"
              className="font-body italic text-accent hover:text-accent-bright transition-colors text-sm"
            >
              See 4 more verses like this &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ══ CROSS DIVIDER ══════════════════════════════════════ */}
      <div className="cross-divider max-w-2xl mx-auto w-full px-4" aria-hidden="true">
        <EthiopianCross className="w-5 h-5 flex-shrink-0" />
      </div>

      {/* ══ DOOR CARDS ══════════════════════════════════════════ */}
      <section className="max-w-2xl mx-auto w-full px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DoorCard
            icon={<DiscoverIcon />}
            title="Discover the Differences"
            desc="5 verses that change how you read your Bible. DSS-verified."
            to="/discover"
            accent
          />
          <DoorCard
            icon={<LibraryIcon />}
            title="Open the Bible"
            desc="81 books organized by canon section. Tap a book to start reading."
            to="/bible"
          />
          <DoorCard
            icon={<ScrollIcon />}
            title="Start with Genesis"
            desc="Begin at the beginning — Ge'ez, Septuagint, and KJV side by side."
            to="/read/Gen/1"
          />
          <DoorCard
            icon={<ScholarIcon />}
            title="Scholarly Comparison"
            desc="12 documented variants with cited sources. Every claim verifiable."
            to="/compare"
          />
          <DoorCard
            icon={<AppendixIcon />}
            title="NT Quotations: LXX &amp; Apocrypha"
            desc="Where the New Testament quotes a Bible your Bible doesn't have — 8 LXX divergences and 8 Deuterocanonical allusions compared."
            to="/appendix"
          />
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer className="text-center pb-12 px-4 text-text-faint text-xs leading-relaxed border-t border-border pt-8">
        <OrnamentalRule />
        <p className="text-text-muted/60">
          Ge&apos;ez texts from{' '}
          <a href="https://betamasaheft.eu/" target="_blank" rel="noopener" className="text-accent/70 hover:text-accent transition-colors">
            Beta Masaheft
          </a>{' '}
          (CC BY-SA 4.0). English from Brenton (1851) and KJV (1611), public domain.
        </p>
        <p className="mt-2 space-x-3">
          <Link to="/about" className="text-accent/70 hover:text-accent transition-colors">About</Link>
          <span className="text-border-strong">·</span>
          <a href="https://github.com/makowey/ethiopian-bible" target="_blank" rel="noopener" className="text-accent/70 hover:text-accent transition-colors">
            Source code
          </a>
        </p>
      </footer>
    </div>
  )
}

/* ── Door card ─────────────────────────────────────────────── */
function DoorCard({
  icon, title, desc, to, accent,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  to: string
  accent?: boolean
}) {
  const base = `door-card flex flex-col gap-2 p-6 rounded-sm text-left group cursor-pointer`
  const style = accent
    ? {
        background: 'linear-gradient(135deg, rgba(200,149,42,0.10), rgba(200,149,42,0.04))',
        border: '1px solid rgba(200,149,42,0.20)',
      }
    : {
        background: 'var(--color-surface)',
        border: '1px solid rgba(200,160,80,0.08)',
      }

  return (
    <Link to={to} className={`${base} ${accent ? 'door-card-accent' : ''}`} style={style}>
      <div className="text-accent/50 group-hover:text-accent/80 transition-colors mb-1">
        {icon}
      </div>
      <h2 className="font-body font-semibold text-text group-hover:text-accent-bright transition-colors text-base leading-snug">
        {title}
      </h2>
      <p className="font-ui text-text-muted text-xs leading-relaxed">
        {desc}
      </p>
    </Link>
  )
}

/* ── Door icons ─────────────────────────────────────────────── */
function DiscoverIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}
function LibraryIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
function ScrollIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
function ScholarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 3v17.25m0 0c-1.472-1.808-3.785-3-6.375-3H3a.75.75 0 01-.75-.75V5.625c0-.621.504-1.125 1.125-1.125h2.25C7.5 4.5 9.813 5.692 12 7.5m0 12.75c1.472-1.808 3.785-3 6.375-3H21a.75.75 0 00.75-.75V5.625c0-.621-.504-1.125-1.125-1.125h-2.25C16.5 4.5 14.187 5.692 12 7.5" />
    </svg>
  )
}
function AppendixIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}

import { useState } from 'react'

/* ─── Ge'ez Fidel data ───────────────────────────────────────────────────
   Each row: [name, IPA, ä  u  i  a  e  ɨ  o]
   Orders: 1=ä  2=u  3=i  4=a  5=e  6=ɨ(neutral)  7=o
──────────────────────────────────────────────────────────────────────── */
const ORDER_LABELS = ['ä', 'u', 'i', 'a', 'e', 'ɨ', 'o']
const ORDER_NUMS   = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']

const FIDEL: Array<{ name: string; ipa: string; forms: string[] }> = [
  { name: 'Hä',  ipa: 'h',  forms: ['ሀ','ሁ','ሂ','ሃ','ሄ','ህ','ሆ'] },
  { name: 'Lä',  ipa: 'l',  forms: ['ለ','ሉ','ሊ','ላ','ሌ','ል','ሎ'] },
  { name: 'Ḥä',  ipa: 'ħ',  forms: ['ሐ','ሑ','ሒ','ሓ','ሔ','ሕ','ሖ'] },
  { name: 'Mä',  ipa: 'm',  forms: ['መ','ሙ','ሚ','ማ','ሜ','ም','ሞ'] },
  { name: 'Śä',  ipa: 'ɬ',  forms: ['ሠ','ሡ','ሢ','ሣ','ሤ','ሥ','ሦ'] },
  { name: 'Rä',  ipa: 'r',  forms: ['ረ','ሩ','ሪ','ራ','ሬ','ር','ሮ'] },
  { name: 'Sä',  ipa: 's',  forms: ['ሰ','ሱ','ሲ','ሳ','ሴ','ስ','ሶ'] },
  { name: 'Šä',  ipa: 'ʃ',  forms: ['ሸ','ሹ','ሺ','ሻ','ሼ','ሽ','ሾ'] },
  { name: 'Qä',  ipa: 'q',  forms: ['ቀ','ቁ','ቂ','ቃ','ቄ','ቅ','ቆ'] },
  { name: 'Bä',  ipa: 'b',  forms: ['በ','ቡ','ቢ','ባ','ቤ','ብ','ቦ'] },
  { name: 'Tä',  ipa: 't',  forms: ['ተ','ቱ','ቲ','ታ','ቴ','ት','ቶ'] },
  { name: 'Čä',  ipa: 'tʃ', forms: ['ቸ','ቹ','ቺ','ቻ','ቼ','ች','ቾ'] },
  { name: 'Nä',  ipa: 'n',  forms: ['ነ','ኑ','ኒ','ና','ኔ','ን','ኖ'] },
  { name: 'Ñä',  ipa: 'ɲ',  forms: ['ኘ','ኙ','ኚ','ኛ','ኜ','ኝ','ኞ'] },
  { name: 'Ä',   ipa: 'ʔ',  forms: ['አ','ኡ','ኢ','ኣ','ኤ','እ','ኦ'] },
  { name: 'Kä',  ipa: 'k',  forms: ['ከ','ኩ','ኪ','ካ','ኬ','ክ','ኮ'] },
  { name: 'Xä',  ipa: 'x',  forms: ['ኸ','ኹ','ኺ','ኻ','ኼ','ኽ','ኾ'] },
  { name: 'Wä',  ipa: 'w',  forms: ['ወ','ዉ','ዊ','ዋ','ዌ','ው','ዎ'] },
  { name: 'ʽÄ',  ipa: 'ʕ',  forms: ['ዐ','ዑ','ዒ','ዓ','ዔ','ዕ','ዖ'] },
  { name: 'Zä',  ipa: 'z',  forms: ['ዘ','ዙ','ዚ','ዛ','ዜ','ዝ','ዞ'] },
  { name: 'Žä',  ipa: 'ʒ',  forms: ['ዠ','ዡ','ዢ','ዣ','ዤ','ዥ','ዦ'] },
  { name: 'Yä',  ipa: 'j',  forms: ['የ','ዩ','ዪ','ያ','ዬ','ይ','ዮ'] },
  { name: 'Dä',  ipa: 'd',  forms: ['ደ','ዱ','ዲ','ዳ','ዴ','ድ','ዶ'] },
  { name: 'Ǧä',  ipa: 'dʒ', forms: ['ጀ','ጁ','ጂ','ጃ','ጄ','ጅ','ጆ'] },
  { name: 'Gä',  ipa: 'ɡ',  forms: ['ገ','ጉ','ጊ','ጋ','ጌ','ግ','ጎ'] },
  { name: 'Ṭä',  ipa: 'tʼ', forms: ['ጠ','ጡ','ጢ','ጣ','ጤ','ጥ','ጦ'] },
  { name: 'Čʼä', ipa: 'tʃʼ',forms: ['ጨ','ጩ','ጪ','ጫ','ጬ','ጭ','ጮ'] },
  { name: 'Pä',  ipa: 'p',  forms: ['ፐ','ፑ','ፒ','ፓ','ፔ','ፕ','ፖ'] },
  { name: 'Ṣä',  ipa: 'tsʼ',forms: ['ጸ','ጹ','ጺ','ጻ','ጼ','ጽ','ጾ'] },
  { name: 'Ḍä',  ipa: 'dʼ', forms: ['ዷ','ዱ','ዲ','ዳ','ዴ','ድ','ዶ'] },
  { name: 'Ṗä',  ipa: 'pʼ', forms: ['ጰ','ጱ','ጲ','ጳ','ጴ','ጵ','ጶ'] },
  { name: 'Fä',  ipa: 'f',  forms: ['ፈ','ፉ','ፊ','ፋ','ፌ','ፍ','ፎ'] },
  { name: 'Vä',  ipa: 'v',  forms: ['ቨ','ቩ','ቪ','ቫ','ቬ','ቭ','ቮ'] },
]

const VOCAB: Array<{ geez: string; translit: string; meaning: string }> = [
  { geez: 'አብ',    translit: 'ʾab',      meaning: 'father' },
  { geez: 'ወልድ',   translit: 'wald',     meaning: 'son' },
  { geez: 'መንፈስ',  translit: 'manfas',   meaning: 'spirit' },
  { geez: 'እግዚአብሔር', translit: 'ʾigziʾabḥer', meaning: 'Lord / God' },
  { geez: 'ሰማይ',   translit: 'samāy',    meaning: 'heaven / sky' },
  { geez: 'ምድር',   translit: 'madr',     meaning: 'earth / land' },
  { geez: 'ብርሃን',  translit: 'barḥān',   meaning: 'light' },
  { geez: 'ጽልመት',  translit: 'ṣalmat',   meaning: 'darkness' },
  { geez: 'ሕይወት',  translit: 'ḥayawat',  meaning: 'life' },
  { geez: 'ሞት',    translit: 'mot',      meaning: 'death' },
  { geez: 'ሰላም',   translit: 'salām',    meaning: 'peace / shalom' },
  { geez: 'ፍቅር',   translit: 'feqr',     meaning: 'love' },
  { geez: 'ሃይማኖት', translit: 'hāymānot', meaning: 'faith / religion' },
  { geez: 'ጸሎት',   translit: 'ṣalot',    meaning: 'prayer' },
  { geez: 'ቅዱስ',   translit: 'qeddus',   meaning: 'holy / saint' },
  { geez: 'ንጉሥ',   translit: 'naguś',    meaning: 'king' },
  { geez: 'ቤት',    translit: 'bet',      meaning: 'house / temple' },
  { geez: 'ሰዓት',   translit: 'saʿāt',    meaning: 'time / hour' },
  { geez: 'ቃል',    translit: 'qāl',      meaning: 'word' },
  { geez: 'ጸሐፍ',   translit: 'ṣaḥāf',    meaning: 'scripture / book' },
]

const NUMERALS = [
  { symbol: '፩', value: '1' }, { symbol: '፪', value: '2' },
  { symbol: '፫', value: '3' }, { symbol: '፬', value: '4' },
  { symbol: '፭', value: '5' }, { symbol: '፮', value: '6' },
  { symbol: '፯', value: '7' }, { symbol: '፰', value: '8' },
  { symbol: '፱', value: '9' }, { symbol: '፲', value: '10' },
  { symbol: '፳', value: '20' }, { symbol: '፴', value: '30' },
  { symbol: '፵', value: '40' }, { symbol: '፶', value: '50' },
  { symbol: '፷', value: '60' }, { symbol: '፸', value: '70' },
  { symbol: '፹', value: '80' }, { symbol: '፺', value: '90' },
  { symbol: '፻', value: '100' }, { symbol: '፼', value: '10,000' },
]

const READING_TIPS = [
  {
    title: 'Script direction',
    body: 'Ge\'ez is written left to right, like English. Each character is a syllable (consonant + vowel), not a single sound.',
  },
  {
    title: 'The 7 orders',
    body: 'Every consonant has 7 forms, one for each vowel. The 1st order (ä) is the base form. Master one consonant across all 7 orders before moving to the next.',
  },
  {
    title: 'The 6th order (ɨ)',
    body: 'The 6th order is a reduced, neutral vowel — often transcribed with no vowel or as "e". It\'s very common at word endings.',
  },
  {
    title: 'Ejective consonants',
    body: 'Letters marked with ʼ (like ṭ, čʼ, ṣ, ṗ) are ejective — produced with a glottal stop. They sound more clipped than their plain counterparts.',
  },
  {
    title: 'Pharyngeals',
    body: 'ħ (ሐ) and ʕ (ዐ) are pharyngeal consonants similar to Arabic ح and ع. They are distinct from the plain h (ሀ) and the glottal stop ʔ (አ).',
  },
  {
    title: 'Word boundaries',
    body: 'Ge\'ez uses the word separator ። (full stop) and ፡ (word space/comma). In manuscripts these are essential for parsing text.',
  },
]

const HISTORY: Array<{ period: string; years: string; content: string }> = [
  {
    period: 'South Arabian origins',
    years: 'c. 900 – 400 BCE',
    content: 'Ge\'ez descends from the Ancient South Arabian (Sabaean) script, brought to the Horn of Africa by Semitic-speaking migrants crossing the Red Sea from the Arabian Peninsula. The earliest inscriptions in the region are in Sabaean, found at sites like Yeha in northern Ethiopia. At this stage the script was consonantal only — vowels were not written, like Hebrew or Arabic.',
  },
  {
    period: 'Proto-Ethiopic',
    years: 'c. 400 BCE – 300 CE',
    content: 'Over several centuries the Sabaean script was adapted into a local form now called Proto-Ethiopic or Old Ethiopic. The language evolved independently as the Aksumite civilisation rose to power. Inscriptions from this era mix Sabaean and local features. Writing was still abjad (consonants only), carved in stone in a right-to-left or boustrophedon direction.',
  },
  {
    period: 'Aksumite Kingdom & the vowel revolution',
    years: 'c. 300 – 700 CE',
    content: 'The most transformative development came under the Kingdom of Aksum. Around the 4th century CE, Ge\'ez scribes invented a system of seven vowel modifications for each consonant — creating the world\'s first fully vocalised abugida (syllabic alphabet). Each consonant base was modified by consistent strokes to indicate the vowel, making Ge\'ez far easier to read than pure consonantal scripts. This innovation is unique in ancient script history and remains in use unchanged today.',
  },
  {
    period: 'Christianisation & the Bible',
    years: 'c. 330 – 600 CE',
    content: 'King Ezana of Aksum converted to Christianity around 330 CE, making Ethiopia one of the first Christian kingdoms. Within decades, the Nine Saints — missionaries from Syria and Egypt — began translating the Bible into Ge\'ez. The Ge\'ez Bible canon (the Haile Selassie Bible) eventually included 81 books, more than any other Christian tradition. This period produced the vast majority of surviving Ge\'ez literature.',
  },
  {
    period: 'Classical literary period',
    years: 'c. 600 – 1500 CE',
    content: 'As spoken everyday language, Ge\'ez gradually gave way to Amharic and Tigrinya, but it flourished as a liturgical and literary tongue — analogous to Latin in medieval Europe. Scholars produced major works: the Kebra Nagast (Glory of Kings), the Fetha Nagast (Law of Kings), hagiographies, and extensive theological commentary. Monasteries like Debre Damo and Lalibela became centres of manuscript production.',
  },
  {
    period: 'Zagwe and Solomonic dynasties',
    years: 'c. 900 – 1700 CE',
    content: 'The Zagwe dynasty (c. 900–1270) and the restored Solomonic dynasty that followed oversaw a golden age of Ge\'ez manuscript culture. Illuminated parchment codices — kaleidoscopic with gold leaf and mineral pigments — were produced in great numbers. Scribal schools (qǝne schools) trained priests to compose poetry in Ge\'ez. The language became deeply intertwined with Ethiopian national and religious identity.',
  },
  {
    period: 'Modern survival',
    years: '1700 CE – present',
    content: 'Ge\'ez is no longer spoken as a mother tongue but remains the liturgical language of the Ethiopian Orthodox Tewahedo Church, the Eritrean Orthodox Church, and the Ethiopian Catholic Church — serving over 50 million Christians. Priests and deacons undergo years of training to chant and interpret Ge\'ez scripture. The Ethiopic script (Unicode block U+1200–U+137F) was standardised in 1991 and is fully supported on modern devices.',
  },
]

const FEATURES: Array<{ label: string; detail: string }> = [
  { label: 'Language family',     detail: 'Afroasiatic → Semitic → South Semitic → Ethiopic → Classical Ethiopic' },
  { label: 'Script type',         detail: 'Abugida (syllabary) — each glyph encodes consonant + vowel' },
  { label: 'Writing direction',   detail: 'Left to right (reversed from its South Arabian ancestor)' },
  { label: 'Characters',          detail: '33 base consonants × 7 vowel orders = 231 core syllables + labiovelar extensions' },
  { label: 'Closest relatives',   detail: 'Amharic, Tigrinya, Tigre (all derived from Ge\'ez), and distantly Arabic & Hebrew' },
  { label: 'Oldest inscription',  detail: 'Hawulti stele, Matara, Eritrea — c. 2nd–3rd century CE' },
  { label: 'Script origin',       detail: 'Adapted from Ancient South Arabian (Sabaean) script' },
  { label: 'Current use',         detail: 'Liturgical language of ~50 million Orthodox and Catholic Ethiopian & Eritrean Christians' },
]

type Tab = 'fidel' | 'reading' | 'vocab' | 'numerals' | 'history'

export function GeezPage() {
  const [activeTab, setActiveTab] = useState<Tab>('fidel')
  const [selected, setSelected] = useState<{ char: string; name: string; ipa: string; order: number } | null>(null)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 animate-chapter-in">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="font-title text-2xl md:text-3xl font-semibold text-text tracking-wide">
          Ge'ez Script
        </h1>
        <p className="font-geez text-accent/50 text-xl mt-1 geez-glow" lang="gez">ፊደል</p>
        <p className="font-body italic text-text-muted text-base mt-2 max-w-xl mx-auto">
          The Ethiopic syllabary — used for Ge'ez, Amharic, and Tigrinya — has been in continuous use since the 4th century.
        </p>
        <div className="chapter-rule mt-4" aria-hidden="true">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-accent/40 flex-shrink-0" fill="currentColor">
            <path d="M5 0h2v4h4v2H7v4H5V6H1V4h4z"/>
          </svg>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {(['history', 'fidel', 'reading', 'vocab', 'numerals'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-ui transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab === 'history' ? 'History' : tab === 'fidel' ? 'Fidel Chart' : tab === 'reading' ? 'How to Read' : tab === 'vocab' ? 'Vocabulary' : 'Numerals'}
          </button>
        ))}
      </div>

      {/* ── FIDEL CHART ─────────────────────────────────────────── */}
      {activeTab === 'fidel' && (
        <div>
          <p className="text-text-muted text-sm font-body italic mb-4">
            Tap any character to hear its name and see its transliteration. The columns are the 7 vowel orders.
          </p>

          {/* Order header */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse min-w-[520px]">
              <thead>
                <tr>
                  <th className="text-left font-ui text-[0.6rem] text-text-faint uppercase tracking-wider pb-2 pr-3 w-16">Base</th>
                  {ORDER_LABELS.map((o, i) => (
                    <th key={i} className="pb-2 px-1">
                      <div className="font-ui text-[0.65rem] text-text-faint uppercase tracking-wider">{ORDER_NUMS[i]}</div>
                      <div className="font-body italic text-accent/60 text-xs">/{o}/</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIDEL.map(row => (
                  <tr key={row.name} className="border-t border-border/40 hover:bg-surface-raised/60 transition-colors">
                    <td className="text-left pr-3 py-1">
                      <span className="font-ui text-xs text-text-muted">{row.name}</span>
                      <span className="font-ui text-[0.6rem] text-text-faint ml-1">/{row.ipa}/</span>
                    </td>
                    {row.forms.map((char, i) => (
                      <td key={i} className="px-1 py-1">
                        <button
                          onClick={() => setSelected({ char, name: row.name, ipa: row.ipa, order: i })}
                          className={`font-geez text-xl leading-none cursor-pointer rounded px-1.5 py-1 transition-all ${
                            selected?.char === char
                              ? 'bg-accent/15 text-geez'
                              : 'text-geez hover:bg-accent/08 hover:scale-110'
                          }`}
                          lang="gez"
                          aria-label={`${row.name} ${ORDER_NUMS[i]} order — ${char}`}
                        >
                          {char}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected character detail */}
          {selected && (
            <div className="mt-6 p-4 manuscript-panel animate-simple-fade-in">
              <div className="flex items-center gap-6">
                <span className="font-geez text-6xl text-geez geez-glow leading-none" lang="gez">
                  {selected.char}
                </span>
                <div>
                  <div className="font-ui text-sm text-text-muted">
                    <span className="text-accent font-semibold">{selected.name}</span>
                    {' '}— {ORDER_NUMS[selected.order]} order
                  </div>
                  <div className="font-body text-text-muted text-sm mt-0.5">
                    Vowel: <span className="italic text-accent">/{ORDER_LABELS[selected.order]}/</span>
                    {'  ·  '}Consonant IPA: <span className="italic text-accent">/{selected.ipa}/</span>
                  </div>
                  <div className="font-ui text-xs text-text-faint mt-1">
                    Combined sound: <span className="font-body text-sm text-text">[{selected.ipa}{ORDER_LABELS[selected.order]}]</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HOW TO READ ─────────────────────────────────────────── */}
      {activeTab === 'reading' && (
        <div className="space-y-4 max-w-2xl">
          {READING_TIPS.map(tip => (
            <div key={tip.title} className="manuscript-panel p-4">
              <h3 className="font-ui text-sm font-semibold text-accent mb-1">{tip.title}</h3>
              <p className="font-body text-text-muted text-base leading-relaxed">{tip.body}</p>
            </div>
          ))}

          <div className="manuscript-panel p-4">
            <h3 className="font-ui text-sm font-semibold text-accent mb-3">Example: Genesis 1:1</h3>
            <div className="space-y-2">
              <p className="font-geez text-2xl text-geez geez-glow leading-relaxed" lang="gez">
                በቀዳሚት ፈጠረ እግዚአብሔር ሰማየ ወምድረ።
              </p>
              <p className="font-body italic text-text-muted text-sm">
                ba-qadāmit faṭara ʾigziʾabḥer samāya wa-madra.
              </p>
              <p className="font-body text-text text-sm">
                "In the beginning God created the heaven and the earth."
              </p>
            </div>
          </div>

          <div className="manuscript-panel p-4">
            <h3 className="font-ui text-sm font-semibold text-accent mb-3">Study path</h3>
            <ol className="space-y-2 list-decimal list-inside font-body text-text-muted text-base">
              <li>Learn the 1st-order forms (ä column) of all 33 consonants — these are the base shapes.</li>
              <li>For each consonant, learn all 7 vowel orders. Notice the systematic modifications.</li>
              <li>Practice reading the basic vocabulary in the Vocabulary tab.</li>
              <li>Open a chapter in the reader, enable Ge'ez word cards (Study mode), and tap each word.</li>
              <li>Read Gen 1 aloud following the transliteration alongside the Ge'ez text.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── VOCABULARY ──────────────────────────────────────────── */}
      {activeTab === 'vocab' && (
        <div>
          <p className="text-text-muted text-sm font-body italic mb-4">
            Core theological vocabulary found throughout the Ethiopian Bible.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VOCAB.map(v => (
              <div
                key={v.geez}
                className="manuscript-panel p-3 flex items-center gap-4"
              >
                <span className="font-geez text-3xl text-geez leading-none flex-shrink-0 w-16 text-center geez-glow" lang="gez">
                  {v.geez}
                </span>
                <div>
                  <div className="font-body italic text-translit text-sm">{v.translit}</div>
                  <div className="font-body text-text text-base">{v.meaning}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NUMERALS ────────────────────────────────────────────── */}
      {activeTab === 'numerals' && (
        <div>
          <p className="text-text-muted text-sm font-body italic mb-4">
            Ethiopic numerals are used in manuscripts for chapter and verse numbers.
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-6">
            {NUMERALS.map(n => (
              <div key={n.symbol} className="manuscript-panel p-3 text-center">
                <div className="font-geez text-3xl text-geez leading-none geez-glow" lang="gez">{n.symbol}</div>
                <div className="font-ui text-xs text-text-muted mt-1">{n.value}</div>
              </div>
            ))}
          </div>
          <div className="manuscript-panel p-4 max-w-md">
            <h3 className="font-ui text-sm font-semibold text-accent mb-2">Punctuation</h3>
            <div className="space-y-2">
              {[
                { sym: '።', name: 'Full stop (period)' },
                { sym: '፡', name: 'Word separator / comma' },
                { sym: '፣', name: 'Semicolon' },
                { sym: '፤', name: 'Colon' },
                { sym: '፥', name: 'Paragraph break' },
                { sym: '፦', name: 'Preface colon' },
              ].map(p => (
                <div key={p.sym} className="flex items-center gap-4">
                  <span className="font-geez text-2xl text-geez w-8 text-center" lang="gez">{p.sym}</span>
                  <span className="font-body text-text-muted text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="max-w-2xl">
          {/* Quick-facts strip */}
          <div className="manuscript-panel p-4 mb-6">
            <h3 className="font-ui text-xs uppercase tracking-widest text-text-faint mb-3">At a glance</h3>
            <dl className="space-y-2">
              {FEATURES.map(f => (
                <div key={f.label} className="flex flex-col sm:flex-row sm:gap-3">
                  <dt className="font-ui text-xs text-accent/80 font-medium flex-shrink-0 sm:w-40">{f.label}</dt>
                  <dd className="font-body text-text-muted text-sm">{f.detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* vertical rule */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-accent/20" aria-hidden="true" />

            <div className="space-y-6 pl-10">
              {HISTORY.map((era, i) => (
                <div key={i} className="relative animate-reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  {/* dot */}
                  <div
                    className="absolute -left-7 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-accent/50 bg-surface"
                    aria-hidden="true"
                  />
                  <div className="font-ui text-[0.6rem] uppercase tracking-widest text-accent/60 mb-0.5">
                    {era.years}
                  </div>
                  <h3 className="font-title text-base font-semibold text-text mb-1">{era.period}</h3>
                  <p className="font-body text-text-muted text-base leading-relaxed">{era.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MascotProps {
  className?: string
  mood?: 'happy' | 'excited' | 'sad'
}

/**
 * LexiPulse's mascot: "Zap", a small violet spark-creature with a
 * lightning-bolt marking (ties to the Practice Arena's energy/speed theme
 * and the app's own name). Pure inline SVG — no external asset, themes
 * automatically since it reads the app's own CSS custom properties.
 */
export function Mascot({ className, mood = 'happy' }: MascotProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mascot-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--chart-accent)" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
      </defs>

      <ellipse cx="50" cy="92" rx="26" ry="5" fill="black" opacity="0.12" />

      {/* body */}
      <rect x="13" y="17" width="74" height="68" rx="34" fill="url(#mascot-body)" />
      <rect x="13" y="17" width="74" height="68" rx="34" fill="white" opacity="0.06" />

      {/* lightning-bolt chest marking */}
      <path d="M56 30 L41 56 L49 56 L44 76 L66 48 L55 48 Z" fill="#fde047" stroke="#5b21b6" strokeWidth="1.5" strokeLinejoin="round" />

      {/* blush */}
      <circle cx="26" cy="58" r="5.5" fill="#f472b6" opacity="0.55" />
      <circle cx="74" cy="58" r="5.5" fill="#f472b6" opacity="0.55" />

      {/* eyes */}
      <circle cx="36" cy="46" r="10" fill="white" />
      <circle cx="64" cy="46" r="10" fill="white" />
      <circle cx={mood === 'excited' ? 38 : 37} cy="47.5" r="4.5" fill="#1e1033" />
      <circle cx={mood === 'excited' ? 66 : 65} cy="47.5" r="4.5" fill="#1e1033" />
      <circle cx="35.5" cy="45.5" r="1.4" fill="white" />
      <circle cx="63.5" cy="45.5" r="1.4" fill="white" />

      {/* mouth */}
      {mood === 'excited' ? (
        <ellipse cx="50" cy="65" rx="9" ry="7" fill="#1e1033" />
      ) : (
        <path
          d={mood === 'sad' ? 'M40 68 Q50 60 60 68' : 'M40 63 Q50 71 60 63'}
          stroke="#1e1033"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

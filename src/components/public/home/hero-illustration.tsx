export function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 380" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
         style={{ position: "absolute", inset: 0, display: "block" }}>
      <defs>
        <linearGradient id="sbs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8b888"/>
          <stop offset=".55" stopColor="#b88a5a"/>
          <stop offset="1" stopColor="#7a5232"/>
        </linearGradient>
        <linearGradient id="sbs-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6a4a"/>
          <stop offset="1" stopColor="#5e4126"/>
        </linearGradient>
        <linearGradient id="sbs-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d3f25"/>
          <stop offset="1" stopColor="#3a2615"/>
        </linearGradient>
        <linearGradient id="sbs-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2615"/>
          <stop offset="1" stopColor="#1f1408"/>
        </linearGradient>
        <linearGradient id="sbs-dim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(20,12,5,0)"/>
          <stop offset="1" stopColor="rgba(20,12,5,.85)"/>
        </linearGradient>
      </defs>
      <rect width="420" height="380" fill="url(#sbs-sky)"/>
      <circle cx="300" cy="120" r="60" fill="#f3c98a" opacity=".55"/>
      <circle cx="300" cy="120" r="28" fill="#f7d9a3" opacity=".9"/>
      <path d="M0,210 L40,180 L90,200 L140,165 L200,195 L260,170 L320,200 L380,175 L420,195 L420,260 L0,260 Z" fill="url(#sbs-far)" opacity=".75"/>
      <rect x="0" y="200" width="420" height="40" fill="#e8d6b8" opacity=".22"/>
      <path d="M0,250 L50,220 L100,235 L150,205 L180,222 L210,180 L240,210 L270,200 L320,225 L380,210 L420,230 L420,310 L0,310 Z" fill="url(#sbs-mid)"/>
      <rect x="0" y="245" width="420" height="28" fill="#d8c2a0" opacity=".18"/>
      <path d="M0,300 L420,300 L420,380 L0,380 Z" fill="url(#sbs-near)"/>
      <g opacity=".95">
        <path d="M40,300 L70,278 L100,300 Z" fill="#8b3a26"/>
        <rect x="48" y="298" width="44" height="22" fill="#e8d2b0"/>
        <rect x="58" y="306" width="8" height="14" fill="#3a2615"/>
        <path d="M110,308 L150,282 L190,308 Z" fill="#a04830"/>
        <rect x="118" y="306" width="64" height="30" fill="#f0d8b3"/>
        <rect x="130" y="314" width="10" height="14" fill="#3a2615"/>
        <rect x="156" y="314" width="10" height="14" fill="#3a2615"/>
        <path d="M205,300 L235,272 L265,300 Z" fill="#6f2c1c"/>
        <rect x="220" y="266" width="4" height="14" fill="#6f2c1c"/>
        <rect x="218" y="270" width="8" height="2" fill="#6f2c1c"/>
        <rect x="208" y="298" width="54" height="30" fill="#e8d2b0"/>
        <path d="M280,312 L320,286 L360,312 Z" fill="#8b3a26"/>
        <rect x="288" y="310" width="64" height="34" fill="#ecd5af"/>
        <rect x="300" y="320" width="10" height="14" fill="#3a2615"/>
        <rect x="328" y="320" width="10" height="14" fill="#3a2615"/>
        <path d="M370,316 L395,294 L420,316 L420,360 L370,360 Z" fill="#9a4128"/>
      </g>
      <g>
        <rect x="60" y="307" width="6" height="8" fill="#f1c378" opacity=".9"/>
        <rect x="135" y="316" width="6" height="8" fill="#f1c378" opacity=".9"/>
        <rect x="306" y="322" width="6" height="8" fill="#f1c378" opacity=".9"/>
      </g>
      <rect x="0" y="120" width="420" height="260" fill="url(#sbs-dim)"/>
    </svg>
  )
}

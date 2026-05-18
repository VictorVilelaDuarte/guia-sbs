export function Wave({ from, to, flip = false, height = 36 }: {
  from: string; to: string; flip?: boolean; height?: number
}) {
  const path = "M0,28 C90,4 180,52 270,30 C330,16 380,38 420,22 L420,72 L0,72 Z"
  return (
    <div style={{ background: from, lineHeight: 0, position: "relative", marginTop: -1 }}>
      <svg viewBox="0 0 420 72" preserveAspectRatio="none"
           width="100%" height={height}
           style={{ display: "block", transform: flip ? "scaleX(-1)" : "none" }}>
        <path d={path} fill={to}/>
      </svg>
    </div>
  )
}

export function HeroBottomCurve({ color = "#F5F0E8" }: { color?: string }) {
  return (
    <svg viewBox="0 0 420 90" preserveAspectRatio="none" width="100%" height="56"
         style={{ display: "block", position: "absolute", left: 0, right: 0, bottom: -1 }}>
      <path d="M0,60 C70,18 160,82 230,52 C300,24 370,70 420,40 L420,90 L0,90 Z" fill={color}/>
    </svg>
  )
}

export function FooterTopCurve({ from, to }: { from: string; to: string }) {
  return (
    <div style={{ background: from, lineHeight: 0 }}>
      <svg viewBox="0 0 420 80" preserveAspectRatio="none" width="100%" height="60" style={{ display: "block" }}>
        <path d="M0,30 C80,72 170,8 250,32 C330,56 380,28 420,42 L420,80 L0,80 Z" fill={to}/>
      </svg>
    </div>
  )
}

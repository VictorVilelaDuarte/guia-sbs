export function PhotoPH({ palette, label, ratio = "16/9" }: {
  palette: [string, string, string]
  label: string
  ratio?: string
}) {
  const [a, b, c] = palette
  const gradId = `ph-${label}`
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio, overflow: "hidden", background: a }}>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={a}/>
            <stop offset="1" stopColor={b}/>
          </linearGradient>
        </defs>
        <rect width="200" height="120" fill={`url(#${gradId})`}/>
        <path d="M0,80 L30,60 L60,72 L100,52 L140,68 L180,55 L200,70 L200,120 L0,120 Z" fill={c} opacity=".55"/>
        <path d="M0,95 L40,82 L80,92 L120,78 L160,90 L200,82 L200,120 L0,120 Z" fill={c} opacity=".85"/>
        <circle cx="148" cy="35" r="14" fill="#f3c98a" opacity=".45"/>
      </svg>
    </div>
  )
}

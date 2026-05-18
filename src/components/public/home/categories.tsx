import { IconPlate, IconBed, IconCompass, IconWrench, IconBag, IconMask } from "./icons"

const BLOBS = {
  terraLight: { path: "M50,8 C72,8 92,22 92,46 C92,72 78,92 52,92 C28,92 8,76 8,52 C8,28 28,8 50,8 Z", fill: "#E8C9A8", icon: "#8B4513" },
  amberLight: { path: "M52,6 C76,10 94,28 90,52 C86,76 64,94 40,88 C18,82 4,60 10,38 C16,18 32,4 52,6 Z", fill: "#F3D9A8", icon: "#A06820" },
  brownLight: { path: "M48,8 C70,4 92,20 94,44 C96,70 76,92 50,90 C24,88 6,68 8,44 C10,22 28,12 48,8 Z", fill: "#D8C2A0", icon: "#6B4423" },
  sandDark:   { path: "M50,10 C74,8 90,28 90,50 C90,74 70,92 46,90 C22,88 8,66 12,42 C16,22 32,12 50,10 Z", fill: "#C8B898", icon: "#5C4A2E" },
  terraMid:   { path: "M52,8 C76,12 92,30 88,54 C84,78 60,94 38,86 C16,78 6,56 12,34 C18,16 36,4 52,8 Z", fill: "#D9A57A", icon: "#7A3A12" },
  goldLight:  { path: "M50,6 C72,8 94,24 92,48 C90,74 70,94 44,90 C20,86 4,64 10,40 C14,20 32,4 50,6 Z", fill: "#F0D08A", icon: "#8A5A1E" },
} as const

type BlobKey = keyof typeof BLOBS

interface CatItem {
  id: string
  label: string
  Glyph: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement
  blobKey: BlobKey
  count: number
}

const CATS: CatItem[] = [
  { id: "rest", label: "Restaurantes",   Glyph: IconPlate,   blobKey: "terraLight", count: 38 },
  { id: "host", label: "Hospedagem",     Glyph: IconBed,     blobKey: "amberLight", count: 24 },
  { id: "pass", label: "Passeios",       Glyph: IconCompass, blobKey: "brownLight", count: 19 },
  { id: "serv", label: "Serviços",       Glyph: IconWrench,  blobKey: "sandDark",   count: 56 },
  { id: "com",  label: "Comércio",       Glyph: IconBag,     blobKey: "terraMid",   count: 41 },
  { id: "ent",  label: "Entretenimento", Glyph: IconMask,    blobKey: "goldLight",  count: 12 },
]

function CategoryCard({ label, Glyph, blobKey, count, active, onClick }: Omit<CatItem, "id"> & {
  active: boolean
  onClick: () => void
}) {
  const blob = BLOBS[blobKey]
  return (
    <button onClick={onClick} className="press" style={{
      position: "relative",
      background: active ? "#fff" : "var(--sand-2)",
      border: active ? "1.5px solid var(--terra)" : "1px solid rgba(212,201,176,.5)",
      borderRadius: 22,
      padding: "16px 10px 14px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      cursor: "pointer", textAlign: "center",
      boxShadow: active ? "0 8px 22px -10px rgba(139,69,19,.35)" : "0 2px 8px -4px rgba(80,50,20,.18)",
      transition: "all .2s",
      width: "100%",
    }} aria-label={`${label} — ${count} locais`}>
      <div style={{ position: "relative", width: 56, height: 56, display: "grid", placeItems: "center" }}>
        <svg viewBox="0 0 100 100" width="56" height="56" style={{ position: "absolute", inset: 0 }}>
          <path d={blob.path} fill={blob.fill}/>
        </svg>
        <Glyph width="28" height="28" style={{ position: "relative", color: blob.icon } as React.CSSProperties}/>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", lineHeight: 1.1 }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".02em" }}>{count} locais</div>
    </button>
  )
}

interface CategoriesProps {
  active: string | null
  setActive: (id: string | null) => void
}

export function Categories({ active, setActive }: CategoriesProps) {
  return (
    <div className="home-px" style={{ background: "var(--sand-1)", paddingTop: 26, paddingBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          O que você <em style={{ color: "var(--terra)" }}>procura?</em>
        </h2>
        <button style={{
          border: "none", background: "transparent",
          color: "var(--terra)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
        }}>Ver tudo →</button>
      </div>
      <div className="cat-grid">
        {CATS.map(c => (
          <CategoryCard key={c.id} {...c}
            active={active === c.id}
            onClick={() => setActive(active === c.id ? null : c.id)}/>
        ))}
      </div>
    </div>
  )
}

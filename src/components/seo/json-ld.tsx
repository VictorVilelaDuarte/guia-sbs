// Server Component que injeta um bloco de structured data.
// O replace de "<" evita que conteúdo vindo do banco (descrições etc.)
// feche a tag <script> e injete HTML (XSS).
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

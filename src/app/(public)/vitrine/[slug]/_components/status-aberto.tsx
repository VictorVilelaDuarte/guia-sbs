interface Props {
  statusAgora: { aberto: boolean; label: string } | null
}

export function StatusAberto({ statusAgora }: Props) {
  if (!statusAgora) return null
  return (
    <div className="flex items-center gap-2 mb-5">
      <span
        className={`flex items-center gap-1.5 text-sm font-medium ${
          statusAgora.aberto ? "text-green-600" : "text-rose-500"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            statusAgora.aberto ? "bg-green-500 animate-pulse" : "bg-rose-400"
          }`}
        />
        {statusAgora.label}
      </span>
    </div>
  )
}

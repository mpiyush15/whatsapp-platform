interface SectionCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

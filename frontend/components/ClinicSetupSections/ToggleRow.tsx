interface ToggleRowProps {
  title: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}

export default function ToggleRow({ title, description, enabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          enabled ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

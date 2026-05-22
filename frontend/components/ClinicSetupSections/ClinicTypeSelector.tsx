import SectionCard from "./SectionCard"
import { clinicTypeForSelector, type ClinicTypeId } from "@/lib/healthcareClinicTypes"

interface Props {
  settings: { clinicType: ClinicTypeId }
  onUpdate: (updates: { clinicType: ClinicTypeId }) => void
}

const MODES: Array<{
  id: "consultation" | "clinic_pharmacy"
  title: string
  description: string
}> = [
  {
    id: "consultation",
    title: "Doctor clinic only",
    description: "Visits, prescriptions, and payment. Best for most small clinics.",
  },
  {
    id: "clinic_pharmacy",
    title: "Clinic + medicine counter",
    description: "Also track medicine stock and sell from your counter.",
  },
]

export default function ClinicTypeSelector({ settings, onUpdate }: Props) {
  const selected = clinicTypeForSelector(settings.clinicType)

  return (
    <SectionCard
      title="What kind of clinic is this?"
      subtitle="Pick one — you can change later and press Save."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode) => {
          const active = selected === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onUpdate({ clinicType: mode.id })}
              className={`rounded-lg border p-4 text-left transition ${
                active
                  ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{mode.title}</h3>
                {active && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{mode.description}</p>
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

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
    title: "Consultation only",
    description: "Visits, prescriptions, and consultation billing. Medicine catalog for prescribing; no stock-linked dispensary by default.",
  },
  {
    id: "clinic_pharmacy",
    title: "Integrated dispensary",
    description: "Same as consultation plus inventory and pharmacy billing tied to stock—full in-clinic counter workflow.",
  },
]

export default function ClinicTypeSelector({ settings, onUpdate }: Props) {
  const selected = clinicTypeForSelector(settings.clinicType)

  return (
    <SectionCard
      title="Clinic type"
      subtitle="Consultation-only vs integrated dispensary. Change anytime—Save updates the clinic record."
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

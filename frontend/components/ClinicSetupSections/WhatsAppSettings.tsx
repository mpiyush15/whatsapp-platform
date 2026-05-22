import SectionCard from "./SectionCard"
import ToggleRow from "./ToggleRow"

interface Props {
  settings: {
    sendPrescriptionWhatsApp: boolean
    medicineReminders: boolean
    followUpReminders: boolean
  }
  onUpdate: (updates: any) => void
  /** Inside healthcare pack panel — no outer card */
  embedded?: boolean
}

export default function WhatsAppSettings({ settings, onUpdate, embedded = false }: Props) {
  const toggles = (
      <div className="space-y-4">
        <ToggleRow
          title="Send prescription on WhatsApp"
          description="Patient gets PDF after doctor saves"
          enabled={settings.sendPrescriptionWhatsApp}
          onChange={(value) => onUpdate({ sendPrescriptionWhatsApp: value })}
        />

        <ToggleRow
          title="Medicine reminders"
          description="Daily reminder messages for medicines"
          enabled={settings.medicineReminders}
          onChange={(value) => onUpdate({ medicineReminders: value })}
        />

        <ToggleRow
          title="Visit reminders"
          description="Remind patient before next appointment"
          enabled={settings.followUpReminders}
          onChange={(value) => onUpdate({ followUpReminders: value })}
        />
      </div>
  )

  if (embedded) {
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">What to send automatically</p>
        <p className="mb-4 text-xs text-slate-500">Turn on after your WhatsApp templates are approved.</p>
        {toggles}
      </div>
    )
  }

  return (
    <SectionCard
      title="WhatsApp messages"
      subtitle="What to send to patients automatically"
    >
      {toggles}
    </SectionCard>
  )
}

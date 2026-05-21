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
          title="Send Prescription on WhatsApp"
          description="Automatically share prescription PDF"
          enabled={settings.sendPrescriptionWhatsApp}
          onChange={(value) => onUpdate({ sendPrescriptionWhatsApp: value })}
        />

        <ToggleRow
          title="Medicine Reminder Automation"
          description="Send medicine reminders to patients"
          enabled={settings.medicineReminders}
          onChange={(value) => onUpdate({ medicineReminders: value })}
        />

        <ToggleRow
          title="Follow-up Reminder Automation"
          description="Automatically remind patients before visits"
          enabled={settings.followUpReminders}
          onChange={(value) => onUpdate({ followUpReminders: value })}
        />
      </div>
  )

  if (embedded) {
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">Automation toggles</p>
        <p className="mb-4 text-xs text-slate-500">Enable when templates are approved—backend will respect these soon.</p>
        {toggles}
      </div>
    )
  }

  return (
    <SectionCard
      title="WhatsApp Automation"
      subtitle="Enable Replysys communication workflows"
    >
      {toggles}
    </SectionCard>
  )
}

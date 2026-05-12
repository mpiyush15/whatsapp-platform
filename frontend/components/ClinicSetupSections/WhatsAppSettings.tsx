import SectionCard from "./SectionCard"
import ToggleRow from "./ToggleRow"

interface Props {
  settings: {
    sendPrescriptionWhatsApp: boolean
    medicineReminders: boolean
    followUpReminders: boolean
  }
  onUpdate: (updates: any) => void
}

export default function WhatsAppSettings({ settings, onUpdate }: Props) {
  return (
    <SectionCard
      title="WhatsApp Automation"
      subtitle="Enable Replysys communication workflows"
    >
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
    </SectionCard>
  )
}

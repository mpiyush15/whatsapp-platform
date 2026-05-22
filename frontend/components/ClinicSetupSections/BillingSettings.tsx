import SectionCard from "./SectionCard"
import ToggleRow from "./ToggleRow"

interface Props {
  settings: {
    enableBilling: boolean
    enablePharmacyBilling: boolean
    enableGST: boolean
    gstPercentage: string
    currency: string
  }
  onUpdate: (updates: any) => void
}

export default function BillingSettings({ settings, onUpdate }: Props) {
  return (
    <SectionCard
      title="Payments & tax"
      subtitle="Turn on what you need for your clinic"
    >
      <div className="space-y-4">
        <ToggleRow
          title="Visit charges & invoices"
          description="Bill patients after consultation"
          enabled={settings.enableBilling}
          onChange={(value) => onUpdate({ enableBilling: value })}
        />

        <ToggleRow
          title="Sell medicines at counter"
          description="Add medicine prices to bills (needs medicine stock)"
          enabled={settings.enablePharmacyBilling}
          onChange={(value) => onUpdate({ enablePharmacyBilling: value })}
        />

        <ToggleRow
          title="GST on bills"
          description="Add tax on invoices"
          enabled={settings.enableGST}
          onChange={(value) => onUpdate({ enableGST: value })}
        />

        {settings.enableGST && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">GST Percentage</label>
              <input
                type="text"
                value={settings.gstPercentage}
                onChange={(e) => onUpdate({ gstPercentage: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Currency</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => onUpdate({ currency: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

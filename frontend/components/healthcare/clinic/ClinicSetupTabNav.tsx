'use client'

import type { ClinicSetupTabConfig, ClinicSetupTabId } from '@/lib/healthcareClinicSetupUi'

type Props = {
  tabs: ClinicSetupTabConfig[]
  activeTab: ClinicSetupTabId
  onChange: (id: ClinicSetupTabId) => void
}

export function ClinicSetupTabNav({ tabs, activeTab, onChange }: Props) {
  return (
    <nav
      aria-label="Clinic setup sections"
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm scrollbar-none"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`min-w-[7.5rem] shrink-0 rounded-lg px-3 py-2.5 text-left transition ${
              active ? `${tab.activeBg} ring-1 ring-inset ${tab.border.replace('border-', 'ring-')}` : 'hover:bg-slate-50'
            }`}
          >
            <span className={`block text-sm font-semibold ${active ? tab.accent : 'text-slate-800'}`}>{tab.label}</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">{tab.hint}</span>
          </button>
        )
      })}
    </nav>
  )
}

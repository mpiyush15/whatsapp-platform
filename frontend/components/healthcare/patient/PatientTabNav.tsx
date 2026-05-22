'use client'

import type { PatientTabConfig, PatientTabId } from '@/lib/healthcarePatientUi'

type Props = {
  tabs: PatientTabConfig[]
  activeTab: PatientTabId
  onChange: (id: PatientTabId) => void
}

export function PatientTabNav({ tabs, activeTab, onChange }: Props) {
  return (
    <nav
      aria-label="Patient sections"
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm scrollbar-none"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? `${tab.activeBg} ${tab.accent} ring-1 ring-inset ${tab.border.replace('border-', 'ring-')}`
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

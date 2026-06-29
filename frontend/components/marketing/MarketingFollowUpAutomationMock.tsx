'use client';

import { ADVANCED_MOCK_AUTOMATION_STEPS } from '@/components/marketing/marketing-advanced-features-mock-data';
import { MarketingDashboardMockShell } from '@/components/marketing/MarketingDashboardMockShell';

/** Follow-up sequence timeline — chatbot automation */
export function MarketingFollowUpAutomationMock() {
  return (
    <MarketingDashboardMockShell
      activeNav="Chatbot"
      sectionLabel="Automation"
      pageTitle="Follow-up sequence"
      headerAction={
        <span className="rounded-md bg-green-600 px-2 py-0.5 text-[9px] font-semibold text-white">
          Active
        </span>
      }
    >
      <div className="min-h-[280px] p-3 sm:min-h-[320px]">
        <div className="relative space-y-0 pl-4">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gray-200" aria-hidden />
          {ADVANCED_MOCK_AUTOMATION_STEPS.map((step, i) => (
            <div key={step.day} className="relative pb-4 last:pb-0">
              <span className="absolute -left-4 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-green-600 ring-1 ring-green-200" />
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold text-gray-900">
                    Day {step.day} · {step.title}
                  </p>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold capitalize ${
                      step.status === 'sent'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-[9px] text-gray-500">Template: {step.template}</p>
              </div>
              {i < ADVANCED_MOCK_AUTOMATION_STEPS.length - 1 ? (
                <p className="ml-1 mt-1 text-[8px] text-gray-400">Wait 48h if no reply →</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </MarketingDashboardMockShell>
  );
}

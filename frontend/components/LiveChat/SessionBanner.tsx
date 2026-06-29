'use client';

import { AlertTriangle, Megaphone } from 'lucide-react';
import type { SessionStatus } from '@/lib/liveChatApi';

interface Props {
  session: SessionStatus | null;
  onSendTemplate: () => void;
}

export default function SessionBanner({ session, onSendTemplate }: Props) {
  if (!session) return null;

  if (session.withinSession) {
    return session.attributedCampaignName ? (
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-800 flex items-center gap-2">
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        Replied via campaign: <span className="font-semibold">{session.attributedCampaignName}</span>
      </div>
    ) : null;
  }

  return (
    <div className="px-3 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-start gap-2 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          24-hour chat window expired. Free messages won&apos;t deliver — send an approved WhatsApp
          template instead.
        </span>
      </div>
      <button
        type="button"
        onClick={onSendTemplate}
        className="shrink-0 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-xs font-semibold"
      >
        Send template
      </button>
    </div>
  );
}

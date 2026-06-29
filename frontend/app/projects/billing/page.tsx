"use client";

import BillingCenter from "@/components/BillingCenter";
import GlobalHeader from "@/components/GlobalHeader";

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalHeader showBack />
      <BillingCenter />
    </div>
  );
}

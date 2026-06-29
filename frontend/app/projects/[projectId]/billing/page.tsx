"use client";

import { useParams } from "next/navigation";
import BillingCenter from "@/components/BillingCenter";

export default function BillingPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <BillingCenter projectId={projectId} />;
}

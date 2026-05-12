"use client"

import { useParams } from "next/navigation"
import FrontdeskQueueBoard from "@/components/healthcare/frontdesk/FrontdeskQueueBoard"

export default function HealthcareFrontdeskPage() {
  const params = useParams()
  const projectId = params.projectId as string

  return <FrontdeskQueueBoard projectId={projectId} />
}

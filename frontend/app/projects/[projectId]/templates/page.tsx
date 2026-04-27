"use client"

import { useParams } from "next/navigation"
import TemplatesTab from "@/components/TemplatesTab"

export default function TemplatesPage() {
  const params = useParams()
  const projectId = params.projectId as string

  return <TemplatesTab projectId={projectId} />
}

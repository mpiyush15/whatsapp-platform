"use client"

import { useParams } from "next/navigation"
import FlowBuilderStudio from "@/components/flow-builder/FlowBuilderStudio"
import { useProject } from "@/lib/context/ProjectContext"

export default function ProjectFlowBuilderPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { vertical } = useProject()

  return <FlowBuilderStudio projectId={projectId} vertical={vertical} />
}

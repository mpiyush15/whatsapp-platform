"use client"

import { useParams } from "next/navigation"
import ProjectApiKeysPanel from "@/components/project-settings/ProjectApiKeysPanel"

export default function ProjectSettingsApiKeysPage() {
  const params = useParams()
  const projectId = params.projectId as string

  return <ProjectApiKeysPanel projectId={projectId} />
}

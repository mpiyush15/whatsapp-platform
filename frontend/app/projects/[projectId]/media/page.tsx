"use client"

import { useParams } from "next/navigation"
import MediaLibraryTab from "@/components/MediaLibraryTab"

export default function MediaLibraryPage() {
  const params = useParams()
  const projectId = params.projectId as string

  return <MediaLibraryTab projectId={projectId} />
}

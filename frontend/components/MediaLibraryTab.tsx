"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import DataTable from "@/components/DataTable"
import { Plus, Trash2, Copy, FileIcon, ImageIcon, FileText, Upload } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

const authService = {
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token')
    }
    return null
  }
}

const getHeaders = () => {
  const token = authService.getToken()
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

interface Media {
  _id: string
  fileName: string
  fileType: string
  mediaUrl: string
  sizeBytes: number
  source: string
  createdAt: string
}

export default function MediaLibraryTab({ projectId }: { projectId: string }) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchMedia = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/media-library?projectId=${projectId}`, {
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setMedia(data.media || [])
      } else {
        setError(data.message || "Failed to fetch media")
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch media")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchMedia()
    }
  }, [projectId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/media-library/upload?projectId=${projectId}`, {
        method: 'POST',
        headers: getHeaders(), // Don't set Content-Type for FormData, browser sets it with boundary
        body: formData
      })
      
      const data = await res.json()
      if (data.success) {
        fetchMedia() // Refresh the list
      } else {
        alert(data.message || "Upload failed")
      }
    } catch (err: any) {
      alert(err.message || "Upload failed")
    } finally {
      setUploading(false)
      // Clear input
      if (e.target) e.target.value = ''
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return

    try {
      const res = await fetch(`${API_URL}/media-library/${mediaId}?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setMedia(media.filter(m => m._id !== mediaId))
      } else {
        alert(data.message || "Failed to delete")
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert("URL copied to clipboard!")
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const columns = [
    {
      key: "preview",
      label: "Preview",
      width: "80px",
      render: (_: any, row: Media) => {
        const isImage = row.fileType?.includes('image') || row.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        if (isImage) {
          return (
            <div className="h-10 w-10 rounded-md border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
              <img src={row.mediaUrl} alt={row.fileName} className="object-cover h-full w-full" />
            </div>
          )
        }
        const isPdf = row.fileType?.includes('pdf') || row.fileName?.match(/\.pdf$/i)
        return (
          <div className="h-10 w-10 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
            {isPdf ? <FileText size={20} /> : <FileIcon size={20} />}
          </div>
        )
      }
    },
    {
      key: "fileName",
      label: "File Name",
      render: (val: string, row: Media) => (
        <div>
          <p className="font-medium text-slate-800">{val || "Unnamed file"}</p>
          <a href={row.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">View Source ↗</a>
        </div>
      )
    },
    {
      key: "fileType",
      label: "Type / Size",
      render: (_: any, row: Media) => (
        <div className="text-sm text-slate-500">
          <div>{row.fileType || 'Unknown'}</div>
          <div>{formatSize(row.sizeBytes)}</div>
        </div>
      )
    },
    {
      key: "createdAt",
      label: "Uploaded",
      render: (val: string) => (
        <span className="text-slate-600 whitespace-nowrap">
          {new Date(val).toLocaleDateString()}
        </span>
      )
    }
  ]

  const actions = [
    {
      label: "Copy URL",
      icon: <Copy size={16} />,
      onClick: (row: Media) => handleCopyUrl(row.mediaUrl),
      variant: "secondary" as const
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      onClick: (row: Media) => handleDelete(row._id),
      variant: "danger" as const
    }
  ]

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Media Library</h1>
          <p className="text-slate-500 mt-1">Upload and manage images, videos, and PDFs for your campaigns.</p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            id="media-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept="image/*,video/*,application/pdf"
          />
          <label htmlFor="media-upload">
            <div className={`inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
              <span className="font-medium flex items-center">
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Upload File
                  </>
                )}
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={media}
          loading={loading}
          error={error}
          actions={actions}
          emptyMessage="No media files uploaded yet. Upload a file to get started!"
          wide={true}
        />
      </div>
    </div>
  )
}

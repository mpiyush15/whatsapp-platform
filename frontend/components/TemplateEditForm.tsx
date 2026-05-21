"use client"

import { useEffect, useState, useRef } from "react"
import { Plus, ChevronDown, Info } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface TemplateButton {
  id: string
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
  text: string
  value: string // url or phone number
}

export interface TemplateFormData {
  name: string
  language: string
  category: string
  authUseCase?: "login_otp" | "signup_otp" | "order_verification" | "custom_otp"
  authAutoFillEnabled?: boolean
  appPackageName?: string
  appSignatureHash?: string
  variableType: "Number" | "Text"
  mediaSample: "none" | "image" | "video" | "document" | "location"
  mediaUrl: string
  mediaFile: File | null
  headerText: string
  content: string
  footerText: string
  buttons: TemplateButton[]
  messageValidityEnabled?: boolean
  messageValidityPeriod?: "10_minutes" | "12_hours" | "24_hours" | "7_days" | "30_days"
  // legacy compat
  hasMedia: boolean
  mediaType: string
  mediaInputType: "url" | "file"
}

interface Props {
  formData: TemplateFormData
  setFormData: (d: TemplateFormData) => void
  category: string
  templateType: "default" | "catalogue" | "calling_permissions_request"
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "en_US", label: "English (US)" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "pt_BR", label: "Portuguese (BR)" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "id", label: "Indonesian" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "tr", label: "Turkish" },
  { value: "zh_CN", label: "Chinese (Simplified)" },
]

const CATEGORY_LABEL: Record<string, string> = {
  marketing: "Marketing",
  utility: "Utility",
  authentication: "Authentication",
}

const TYPE_LABEL: Record<string, string> = {
  default: "Default",
  catalogue: "Catalogue",
  calling_permissions_request: "Calling permissions request",
}

export const AUTH_OTP_BODY_PRESETS: Record<string, string> = {
  login_otp: "{{1}} is your verification code. Do not share this code.",
  signup_otp: "{{1}} is your verification code. Do not share this code.",
  order_verification:
    "{{1}} is your verification code. For your security, do not share this code.",
  custom_otp: "{{1}} is your verification code. Do not share this code.",
}

const AUTH_FIXED_MESSAGE = AUTH_OTP_BODY_PRESETS.login_otp

const AUTH_USE_CASE_OPTIONS = [
  { value: "login_otp", label: "Login OTP (preset)" },
  { value: "signup_otp", label: "Signup OTP (preset)" },
  { value: "order_verification", label: "Order verification (preset)" },
  { value: "custom_otp", label: "Custom OTP — your template name & message" },
] as const

export function isValidAuthOtpBody(content: string): boolean {
  const trimmed = (content || "").trim()
  if (!trimmed.includes("{{1}}")) return false
  const matches = trimmed.match(/\{\{\d+\}\}/g) || []
  return matches.length === 1 && matches[0] === "{{1}}"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TemplateEditForm({ formData, setFormData, category, templateType }: Props) {
  const [showMediaDropdown, setShowMediaDropdown] = useState(false)
  const [showButtonDropdown, setShowButtonDropdown] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const mediaSample = formData.mediaSample || "none"

  const set = (patch: Partial<TemplateFormData>) => setFormData({ ...formData, ...patch })

  // Insert {{N}} variable into body at cursor
  const insertBodyVariable = () => {
    const ta = bodyRef.current
    if (!ta) return
    const varCount = (formData.content.match(/\{\{\d+\}\}/g) || []).length
    const newVar = `{{${varCount + 1}}}`
    const start = ta.selectionStart ?? formData.content.length
    const end = ta.selectionEnd ?? formData.content.length
    const newContent = formData.content.slice(0, start) + newVar + formData.content.slice(end)
    set({ content: newContent })
    // Restore cursor after variable
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + newVar.length
    }, 0)
  }

  const insertHeaderVariable = () => {
    const varCount = (formData.headerText.match(/\{\{\d+\}\}/g) || []).length
    set({ headerText: formData.headerText + `{{${varCount + 1}}}` })
  }

  const addButton = (type: TemplateButton["type"]) => {
    if (formData.buttons.length >= 10) return
    const btn: TemplateButton = { id: uid(), type, text: "", value: "" }
    set({ buttons: [...formData.buttons, btn] })
    setShowButtonDropdown(false)
  }

  const updateButton = (id: string, patch: Partial<TemplateButton>) => {
    set({ buttons: formData.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  }

  const removeButton = (id: string) => {
    set({ buttons: formData.buttons.filter((b) => b.id !== id) })
  }

  const mediaSampleOptions: { value: TemplateFormData["mediaSample"]; label: string; icon: string }[] = [
    { value: "none", label: "None", icon: "⊘" },
    { value: "image", label: "Image", icon: "🖼" },
    { value: "video", label: "Video", icon: "▶" },
    { value: "document", label: "Document", icon: "📄" },
    { value: "location", label: "Location", icon: "📍" },
  ]

  const categoryLabel = CATEGORY_LABEL[category] ?? category
  const typeLabel = TYPE_LABEL[templateType] ?? templateType
  const langLabel = LANGUAGES.find((l) => l.value === formData.language)?.label ?? formData.language
  const canUploadMediaFile = category === "marketing" && templateType === "default" && ["image", "video", "document"].includes(mediaSample)
  const isUtilityDefault = category === "utility" && templateType === "default"
  const isAuthenticationDefault = category === "authentication" && templateType === "default"

  const authUseCase = formData.authUseCase || "login_otp"
  const isCustomAuthOtp = authUseCase === "custom_otp"

  useEffect(() => {
    if (!isAuthenticationDefault) return

    const patch: Partial<TemplateFormData> = {}

    if (!formData.authUseCase) patch.authUseCase = "login_otp"
    if (formData.variableType !== "Number") patch.variableType = "Number"
    if (formData.hasMedia) patch.hasMedia = false
    if (formData.mediaSample !== "none") patch.mediaSample = "none"
    if (formData.mediaUrl) patch.mediaUrl = ""
    if (formData.mediaFile) patch.mediaFile = null
    if (formData.headerText) patch.headerText = ""
    if (formData.footerText) patch.footerText = ""
    if (formData.buttons.length > 0) patch.buttons = []

    if (Object.keys(patch).length > 0) set(patch)
  }, [
    isAuthenticationDefault,
    formData.authUseCase,
    formData.variableType,
    formData.hasMedia,
    formData.mediaSample,
    formData.mediaUrl,
    formData.mediaFile,
    formData.headerText,
    formData.footerText,
    formData.buttons.length,
  ])

  if (isAuthenticationDefault) {
    return (
      <div className="space-y-0">
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#1877f2" }}>
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {formData.name || "login_otp"} • {langLabel}
            </p>
            <p className="text-xs text-gray-500">Authentication • Default</p>
          </div>
        </div>

        <div className="px-5 py-5 bg-white border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Template name and language</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name your template</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                  maxLength={512}
                  placeholder="login_otp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{formData.name.length}/512</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers and underscores only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select language</label>
              <select
                value={formData.language}
                onChange={(e) => set({ language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 bg-white border-b border-gray-200 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Authentication template setup</h3>
            <p className="text-xs text-gray-500 mt-1">Simple OTP setup for ecommerce use-cases.</p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <p className="font-semibold">Authentication vs Utility</p>
            <p className="mt-1 leading-relaxed">
              Use <strong>Authentication</strong> only for OTP codes (must include {"{{1}}"}).
              Welcome, payment, low-credit, and other custom messages → choose <strong>Utility</strong> or <strong>Marketing</strong> instead.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Use case</label>
            <select
              value={authUseCase}
              onChange={(e) => {
                const next = e.target.value as TemplateFormData["authUseCase"]
                const presetBody = AUTH_OTP_BODY_PRESETS[next] || AUTH_FIXED_MESSAGE
                const nameHints: Record<string, string> = {
                  login_otp: "replysys_login_otp",
                  signup_otp: "replysys_signup_otp",
                  order_verification: "order_verification_otp",
                }
                set({
                  authUseCase: next,
                  content: presetBody,
                  ...(nameHints[next] && !formData.name.trim() ? { name: nameHints[next] } : {}),
                })
              }}
              className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {AUTH_USE_CASE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isCustomAuthOtp ? "Message (custom, Meta OTP rules)" : "Message (preset)"}
            </label>
            <textarea
              value={formData.content}
              readOnly={!isCustomAuthOtp}
              onChange={(e) => isCustomAuthOtp && set({ content: e.target.value })}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm resize-none ${
                isCustomAuthOtp
                  ? "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
            />
            {isCustomAuthOtp ? (
              <p className={`text-xs mt-1 ${isValidAuthOtpBody(formData.content) ? "text-emerald-700" : "text-red-600"}`}>
                {isValidAuthOtpBody(formData.content)
                  ? "Valid — exactly one {{1}} for the OTP code."
                  : "Must include exactly one variable {{1}} (OTP). No header, media, or extra variables."}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Preset copy for Meta. Pick <strong>Custom OTP</strong> to edit the message and use your own template name.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.authAutoFillEnabled}
                onChange={(e) => set({ authAutoFillEnabled: e.target.checked })}
                className="h-4 w-4"
              />
              Enable auto-fill (for mobile apps)
            </label>
          </div>

          {formData.authAutoFillEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App package name</label>
                <input
                  type="text"
                  value={formData.appPackageName || ""}
                  onChange={(e) => set({ appPackageName: e.target.value })}
                  placeholder="com.yourapp.android"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App signature hash</label>
                <input
                  type="text"
                  value={formData.appSignatureHash || ""}
                  onChange={(e) => set({ appSignatureHash: e.target.value })}
                  placeholder="ABcdEfGhIjK"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ── Template name badge ── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#1877f2" }}>
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {formData.name || "your_template_name"} • {langLabel}
          </p>
          <p className="text-xs text-gray-500">
            {categoryLabel} • {typeLabel}
          </p>
        </div>
      </div>

      {/* ── Section: Template name and language ── */}
      <div className="px-5 py-5 bg-white border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Template name and language</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name your template
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                maxLength={512}
                placeholder="Enter a template name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {formData.name.length}/512
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers and underscores only</p>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select language</label>
            <select
              value={formData.language}
              onChange={(e) => set({ language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section: Content ── */}
      <div className="px-5 py-5 bg-white border-b border-gray-200 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Content</h3>
          <p className="text-xs text-gray-500 mt-1">
            Add a header, body and footer for your template. Cloud API hosted by Meta will review the template variables and content to protect the security and integrity of our services.
          </p>
        </div>

        {/* Type of variable */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-sm font-medium text-gray-700">Type of variable</label>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <select
            value={formData.variableType}
            onChange={(e) => set({ variableType: e.target.value as "Number" | "Text" })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
          >
            <option value="Number">Number</option>
            <option value="Text">Text</option>
          </select>
        </div>

        {/* Media sample */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Media sample <span className="font-normal text-gray-400">• Optional</span>
          </label>
          <button
            type="button"
            onClick={() => setShowMediaDropdown((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 min-w-[140px] justify-between"
          >
            <span className="capitalize">{mediaSample === "none" ? "None" : mediaSample.charAt(0).toUpperCase() + mediaSample.slice(1)}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showMediaDropdown && (
            <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[160px]">
              {mediaSampleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    set({
                      mediaSample: opt.value,
                      hasMedia: opt.value !== "none",
                      mediaType: opt.value !== "none" ? opt.value.toUpperCase() : "IMAGE",
                    })
                    setShowMediaDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-left"
                >
                  <span className="w-5 text-center">{opt.icon}</span>
                  <span>{opt.label}</span>
                  {mediaSample === opt.value && (
                    <span className="ml-auto w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Media source selection for marketing/default */}
        {canUploadMediaFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Media source</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="mediaSource"
                  checked={formData.mediaInputType === "url"}
                  onChange={() => set({ mediaInputType: "url" })}
                  className="h-4 w-4"
                />
                Use URL
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="mediaSource"
                  checked={formData.mediaInputType === "file"}
                  onChange={() => set({ mediaInputType: "file" })}
                  className="h-4 w-4"
                />
                Upload file (local preview)
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">File is kept in local state for preview. It will be uploaded to S3 at submit flow.</p>
          </div>
        )}

        {/* Media URL input if image/video/document selected */}
        {mediaSample !== "none" && mediaSample !== "location" && (!canUploadMediaFile || formData.mediaInputType === "url") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mediaSample.charAt(0).toUpperCase() + mediaSample.slice(1)} URL (sample)
            </label>
            <input
              type="url"
              value={formData.mediaUrl}
              onChange={(e) => set({ mediaUrl: e.target.value })}
              placeholder={`https://example.com/sample.${mediaSample === "image" ? "jpg" : mediaSample === "video" ? "mp4" : "pdf"}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Sample URL for Meta approval. Actual URL provided when sending.</p>
          </div>
        )}

        {/* Local file picker for marketing/default media */}
        {canUploadMediaFile && formData.mediaInputType === "file" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload {mediaSample.charAt(0).toUpperCase() + mediaSample.slice(1)} file
            </label>
            <input
              type="file"
              accept={
                mediaSample === "image"
                  ? "image/*"
                  : mediaSample === "video"
                  ? "video/*"
                  : ".pdf,.doc,.docx,.txt"
              }
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                set({ mediaFile: file, hasMedia: !!file || mediaSample !== "none" })
              }}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm file:font-medium hover:file:bg-gray-50"
            />
            {formData.mediaFile && (
              <p className="text-xs text-green-700 mt-2">
                Selected: {formData.mediaFile.name} ({(formData.mediaFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        )}

        {/* Header */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Header <span className="font-normal text-gray-400">• Optional</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.headerText}
              onChange={(e) => set({ headerText: e.target.value.slice(0, 60) })}
              maxLength={60}
              placeholder="Add a short line of text to the header of your message"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {formData.headerText.length}/60
            </span>
          </div>
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={insertHeaderVariable}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add variable
            </button>
          </div>
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
          <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <div className="relative">
              <textarea
                ref={bodyRef}
                value={formData.content}
                onChange={(e) => set({ content: e.target.value.slice(0, 1024) })}
                maxLength={1024}
                placeholder="Enter the body text of your message..."
                rows={5}
                className="w-full px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {formData.content.length}/1024
              </span>
            </div>
            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-200 bg-gray-50">
              <button type="button" title="Emoji" className="p-1 hover:bg-gray-200 rounded text-base leading-none">😊</button>
              <button
                type="button" title="Bold"
                onClick={() => {
                  const ta = bodyRef.current; if (!ta) return
                  const s = ta.selectionStart; const e = ta.selectionEnd
                  const sel = formData.content.slice(s, e)
                  const next = formData.content.slice(0, s) + `*${sel || "bold text"}*` + formData.content.slice(e)
                  set({ content: next })
                }}
                className="p-1 hover:bg-gray-200 rounded text-xs font-bold text-gray-700 w-6 h-6 flex items-center justify-center"
              >B</button>
              <button
                type="button" title="Italic"
                onClick={() => {
                  const ta = bodyRef.current; if (!ta) return
                  const s = ta.selectionStart; const e = ta.selectionEnd
                  const sel = formData.content.slice(s, e)
                  const next = formData.content.slice(0, s) + `_${sel || "italic text"}_` + formData.content.slice(e)
                  set({ content: next })
                }}
                className="p-1 hover:bg-gray-200 rounded text-xs italic text-gray-700 w-6 h-6 flex items-center justify-center"
              >I</button>
              <button
                type="button" title="Strikethrough"
                onClick={() => {
                  const ta = bodyRef.current; if (!ta) return
                  const s = ta.selectionStart; const e = ta.selectionEnd
                  const sel = formData.content.slice(s, e)
                  const next = formData.content.slice(0, s) + `~${sel || "strikethrough"}~` + formData.content.slice(e)
                  set({ content: next })
                }}
                className="p-1 hover:bg-gray-200 rounded text-xs line-through text-gray-700 w-6 h-6 flex items-center justify-center"
              >S</button>
              <button
                type="button" title="Code"
                onClick={() => {
                  const ta = bodyRef.current; if (!ta) return
                  const s = ta.selectionStart; const e = ta.selectionEnd
                  const sel = formData.content.slice(s, e)
                  const next = formData.content.slice(0, s) + `\`${sel || "code"}\`` + formData.content.slice(e)
                  set({ content: next })
                }}
                className="p-1 hover:bg-gray-200 rounded text-xs font-mono text-gray-700 w-6 h-6 flex items-center justify-center"
              >&lt;/&gt;</button>
              <button
                type="button"
                onClick={insertBodyVariable}
                className="ml-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50"
              >
                <Plus className="w-3 h-3" /> Add variable
              </button>
              <Info className="w-3.5 h-3.5 text-gray-400 ml-1" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Footer <span className="font-normal text-gray-400">• Optional</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.footerText}
              onChange={(e) => set({ footerText: e.target.value.slice(0, 60) })}
              maxLength={60}
              placeholder="Add a short line of text to the bottom of your message"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {formData.footerText.length}/60
            </span>
          </div>
        </div>
      </div>

      {/* ── Section: Buttons ── */}
      <div className="px-5 py-5 bg-white space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Buttons <span className="font-normal text-gray-400 text-sm">• Optional</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Create buttons that let customers respond to your message or take action. You can add up to 10 buttons. If you add more than three buttons, they will appear in a list.
          </p>
        </div>

        {/* Existing buttons */}
        {formData.buttons.map((btn, idx) => (
          <div key={btn.id} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {btn.type === "QUICK_REPLY" ? "Quick reply" : btn.type === "URL" ? "Visit website" : "Call phone number"}
              </span>
              <button type="button" onClick={() => removeButton(btn.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Button text</label>
                <input
                  type="text"
                  value={btn.text}
                  onChange={(e) => updateButton(btn.id, { text: e.target.value })}
                  maxLength={25}
                  placeholder="Button label"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {btn.type !== "QUICK_REPLY" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {btn.type === "URL" ? "Website URL" : "Phone number"}
                  </label>
                  <input
                    type={btn.type === "URL" ? "url" : "tel"}
                    value={btn.value}
                    onChange={(e) => updateButton(btn.id, { value: e.target.value })}
                    placeholder={btn.type === "URL" ? "https://example.com" : "+1234567890"}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add button dropdown */}
        {formData.buttons.length < 10 && (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setShowButtonDropdown((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
            >
              <Plus className="w-4 h-4" /> Add button <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showButtonDropdown && (
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[200px]">
                {[
                  { type: "QUICK_REPLY" as const, label: "Quick reply", desc: "Customer replies with preset text" },
                  { type: "URL" as const, label: "Visit website", desc: "Open a URL in the browser" },
                  { type: "PHONE_NUMBER" as const, label: "Call phone number", desc: "Dial a phone number" },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => addButton(opt.type)}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section: Message validity period (Utility Default) ── */}
      {isUtilityDefault && (
        <div className="px-5 py-5 bg-white border-t border-gray-200 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Message validity period</h3>
            <p className="text-xs text-gray-500 mt-1">
              You can set a custom validity period that your utility message must be delivered by before it expires.
              If a message is not delivered within this time frame, it will not be charged and your customer will not see it.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Set custom validity period for your message</p>
              <p className="text-xs text-gray-500 mt-1">
                {formData.messageValidityEnabled
                  ? "Select how long the message should be valid."
                  : "If you don’t set a custom validity period, the standard 10 minutes validity period will be applied."}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!formData.messageValidityEnabled}
                onChange={(e) => set({ messageValidityEnabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5" />
            </label>
          </div>

          {formData.messageValidityEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validity period</label>
              <select
                value={formData.messageValidityPeriod || "10_minutes"}
                onChange={(e) => set({ messageValidityPeriod: e.target.value as TemplateFormData["messageValidityPeriod"] })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[220px]"
              >
                <option value="10_minutes">10 minutes (default)</option>
                <option value="12_hours">12 hours</option>
                <option value="24_hours">24 hours</option>
                <option value="7_days">7 days</option>
                <option value="30_days">30 days</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

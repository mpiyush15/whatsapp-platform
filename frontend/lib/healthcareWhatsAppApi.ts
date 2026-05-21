import { apiGet, apiPost, fetchAPI } from '@/lib/api-client'
import {
  HEALTHCARE_WHATSAPP_PACK,
  normalizeHealthcarePreset,
  normalizeHealthcarePresetList,
  type AccountTemplateRow,
  type HealthcareTemplatePreset,
} from '@/lib/healthcareWhatsAppPack'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'

export type HealthcareWhatsAppPresetsResponse = {
  success?: boolean
  data?: {
    accountId?: string
    projectId?: string
    templates: HealthcareTemplatePreset[]
  }
}

export type ProjectWhatsAppStatus = {
  whatsappConnected: boolean
  displayNumber: string | null
  projectName: string | null
}

export async function fetchHealthcareTemplatePresets(projectId: string): Promise<HealthcareTemplatePreset[]> {
  try {
    const res = await apiGet<HealthcareWhatsAppPresetsResponse>(
      `/healthcare/whatsapp/template-presets?projectId=${encodeURIComponent(projectId)}`,
    )
    const apiPresets = res?.data?.templates
    if (Array.isArray(apiPresets) && apiPresets.length > 0) {
      const normalized = normalizeHealthcarePresetList(
        apiPresets.filter((p) => p?.recommendedTemplateName),
      )
      const names = new Set(normalized.map((p) => p.recommendedTemplateName))
      const extras = HEALTHCARE_WHATSAPP_PACK.filter((p) => !names.has(p.recommendedTemplateName))
      return [...normalized, ...extras]
    }
  } catch {
    // fall through to full local pack
  }
  return [...HEALTHCARE_WHATSAPP_PACK]
}

export async function fetchAccountTemplates(projectId: string): Promise<AccountTemplateRow[]> {
  const response = await fetchAPI(`/templates?projectId=${encodeURIComponent(projectId)}`)
  const data = await response.json()
  const payload = data?.data ?? data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.templates)) return payload.templates
  return []
}

export async function fetchProjectWhatsAppStatus(projectId: string): Promise<ProjectWhatsAppStatus> {
  try {
    const res = await apiGet<{
      data?: { whatsappPhoneNumberId?: string; whatsappPhoneNumber?: string; name?: string }
    }>(`/projects/${encodeURIComponent(projectId)}`)
    const p = res?.data
    return {
      whatsappConnected: Boolean(p?.whatsappPhoneNumberId),
      displayNumber: p?.whatsappPhoneNumber ?? null,
      projectName: p?.name ?? null,
    }
  } catch {
    return { whatsappConnected: false, displayNumber: null, projectName: null }
  }
}

export async function createDraftTemplate(projectId: string, preset: HealthcareTemplatePreset) {
  const normalized = normalizeHealthcarePreset(preset)
  const response = await fetchAPI('/templates', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      name: normalized.recommendedTemplateName,
      language: 'en',
      category: normalized.category,
      content: normalized.sampleMessage,
      hasMedia: false,
      footerText: '',
      headerText: '',
      buttons: [],
      variableType: 'Number',
    }),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || result?.error || `Failed to create ${preset.recommendedTemplateName}`)
  }
  return result
}

export async function installHealthcareTemplatePack(projectId: string) {
  const [presets, existing] = await Promise.all([
    fetchHealthcareTemplatePresets(projectId),
    fetchAccountTemplates(projectId),
  ])
  const existingNames = new Set(existing.map((t) => t.name))
  const toCreate = presets.filter((p) => !existingNames.has(p.recommendedTemplateName))

  const created: string[] = []
  const skipped: string[] = []
  const errors: { name: string; message: string }[] = []

  for (const preset of toCreate) {
    try {
      await createDraftTemplate(projectId, preset)
      created.push(preset.recommendedTemplateName)
    } catch (e) {
      errors.push({
        name: preset.recommendedTemplateName,
        message: e instanceof Error ? e.message : 'Create failed',
      })
    }
  }

  for (const preset of presets) {
    if (existingNames.has(preset.recommendedTemplateName)) {
      skipped.push(preset.recommendedTemplateName)
    }
  }

  return { created, skipped, errors, total: presets.length }
}

export async function submitTemplateToMeta(projectId: string, templateId: string) {
  const response = await fetchAPI(
    `/templates/${encodeURIComponent(templateId)}/submit?projectId=${encodeURIComponent(projectId)}`,
    { method: 'POST' },
  )
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || result?.error || 'Submit failed')
  }
  return result
}

export async function syncTemplatesFromMeta(projectId: string) {
  const response = await fetchAPI(`/templates/sync?projectId=${encodeURIComponent(projectId)}`, {
    method: 'POST',
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result?.message || result?.error || 'Sync failed')
  }
  return result
}

export { API_URL }

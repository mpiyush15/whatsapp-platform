import { createPrescriptionPdfBlobUrl, openPrescriptionPdf, openPrescriptionPdfWithBackground, PrescriptionTemplate } from './prescriptionPdf'

export interface PrescriptionViewConfig {
  prescription: any
  clinic: {
    name?: string
    logoUrl?: string
    enablePrescriptionDesign?: boolean
    prescriptionTemplate?: PrescriptionTemplate
    prescriptionBlankPdfUrl?: string
    headerColor?: string
    headerTextColor?: string
    headerFontWeight?: string
    footerColor?: string
    footerTextColor?: string
    footerFontWeight?: string
  }
  action?: 'view' | 'print'
  /** Required to load uploaded letterhead via API (no S3 CORS issues). */
  projectId?: string
}

function clinicUsesGeneratedPrescriptionDesign(clinic: PrescriptionViewConfig['clinic']): boolean {
  const flag = clinic.enablePrescriptionDesign as boolean | string | undefined
  if (flag === false || flag === 'false') return false
  return true
}

function buildPdfConfig(prescription: PrescriptionViewConfig['prescription'], clinic: PrescriptionViewConfig['clinic']) {
  return {
    ...prescription,
    clinicName: clinic.name,
    clinicLogoUrl: clinic.logoUrl,
    headerColor: clinic.headerColor,
    headerTextColor: clinic.headerTextColor,
    headerFontWeight: clinic.headerFontWeight,
    footerColor: clinic.footerColor,
    footerTextColor: clinic.footerTextColor,
    footerFontWeight: clinic.footerFontWeight,
  }
}

function prescriptionBlankPdfProxyPath(projectId: string) {
  return `/healthcare/clinic/${encodeURIComponent(projectId)}/prescription-blank-pdf`
}

/** Returns blob URL for drawer preview. Revoke with URL.revokeObjectURL when closing. */
export async function getPrescriptionPdfBlobUrl(config: PrescriptionViewConfig): Promise<string> {
  const { prescription, clinic, projectId } = config
  const pdfConfig = buildPdfConfig(prescription, clinic)
  const template = (clinic.prescriptionTemplate || 'classic') as PrescriptionTemplate
  const blankUrl = clinic.prescriptionBlankPdfUrl?.trim()

  if (blankUrl) {
    const sources: Array<{ url: string; authenticated: boolean }> = []
    if (projectId) {
      sources.push({ url: prescriptionBlankPdfProxyPath(projectId), authenticated: true })
    }
    sources.push({ url: blankUrl, authenticated: false })

    for (const source of sources) {
      try {
        return await createPrescriptionPdfBlobUrl(pdfConfig, template, source.url, {
          authenticated: source.authenticated,
        })
      } catch (blankErr) {
        console.warn('Letterhead PDF load failed, trying next source:', blankErr)
      }
    }
  }

  return createPrescriptionPdfBlobUrl(pdfConfig, template)
}

export async function printPrescriptionPdf(config: PrescriptionViewConfig): Promise<void> {
  const url = await getPrescriptionPdfBlobUrl(config)
  const pdfWindow = window.open(url, '_blank')
  if (!pdfWindow) {
    URL.revokeObjectURL(url)
    throw new Error('Could not open print window. Please allow pop-ups for this site.')
  }
  const triggerPrint = () => {
    try {
      pdfWindow.focus()
      pdfWindow.print()
    } catch {
      /* wait for PDF */
    }
  }
  pdfWindow.addEventListener('load', triggerPrint)
  setTimeout(triggerPrint, 900)
}

/** Opens PDF in new tab (legacy). Prefer drawer + getPrescriptionPdfBlobUrl. */
export const handlePrescriptionAction = async (config: PrescriptionViewConfig) => {
  const { action = 'view' } = config

  if (action === 'print') {
    await printPrescriptionPdf(config)
    return
  }

  const url = await getPrescriptionPdfBlobUrl(config)
  const pdfWindow = window.open(url, '_blank')
  if (!pdfWindow) {
    URL.revokeObjectURL(url)
    throw new Error('Could not open PDF. Please allow pop-ups for this site.')
  }
}

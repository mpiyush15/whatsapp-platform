import { openPrescriptionPdf, openPrescriptionPdfWithBackground, PrescriptionTemplate } from './prescriptionPdf'

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
  action: 'view' | 'print'
}

/**
 * Unified function to handle prescription view and print
 * Uses the clinic's selected template and custom branding settings
 * Respects design toggle: uses generated PDF if enabled, uploaded PDF if disabled
 */
export const handlePrescriptionAction = async (config: PrescriptionViewConfig) => {
  const { prescription, clinic, action } = config

  try {
    console.log('📋 handlePrescriptionAction called:', {
      clinicName: clinic.name,
      clinicLogoUrl: clinic.logoUrl,
      enablePrescriptionDesign: clinic.enablePrescriptionDesign,
      headerColor: clinic.headerColor,
      footerColor: clinic.footerColor,
      action
    })

    // Design is enabled - use generated PDF template with clinic's custom settings
    if (clinic.enablePrescriptionDesign !== false) {
      const pdfConfig = {
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
      const template = clinic.prescriptionTemplate || 'classic'
      
      console.log('📋 PDF Config:', {
        clinicName: pdfConfig.clinicName,
        clinicLogoUrl: pdfConfig.clinicLogoUrl,
        headerColor: pdfConfig.headerColor,
        template,
      })

      if (action === 'view' || action === 'print') {
        await openPrescriptionPdf(pdfConfig, template)
      }
    }
    // Design is disabled - overlay prescription data on uploaded blank PDF
    else if (clinic.prescriptionBlankPdfUrl) {
      const pdfConfig = {
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

      if (action === 'view') {
        await openPrescriptionPdfWithBackground(pdfConfig, clinic.prescriptionBlankPdfUrl, false)
      } else if (action === 'print') {
        await openPrescriptionPdfWithBackground(pdfConfig, clinic.prescriptionBlankPdfUrl, true)
      }
    } else {
      throw new Error('No prescription template configured. Please set up in clinic settings.')
    }
  } catch (err) {
    console.error(`Failed to ${action} prescription:`, err)
    alert(`Failed to ${action} prescription. ${err instanceof Error ? err.message : 'Please try again.'}`)
    throw err
  }
}

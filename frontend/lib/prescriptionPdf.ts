import jsPDF from "jspdf"
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { fetchAPI } from './api-client'

export type PrescriptionTemplate = 'classic' | 'modern' | 'minimal' | 'clean'

export interface PrescriptionPdfData {
  prescriptionId: string
  patientSnapshot?: {
    fullName?: string | null
    phoneNumber?: string | null
    ageYears?: number | string | null
    gender?: string | null
  }
  doctorSnapshot?: {
    fullName?: string | null
    specialization?: string | null
  }
  patientId: string
  doctorId: string
  diagnosis?: string
  status?: string
  issuedAt?: string | null
  followUpAt?: string | null
  notes?: string
  medicines?: Array<{
    medicineName: string
    dosage?: string
    frequency?: string
    durationDays?: number
    instructions?: string
    quantity?: number
  }>
  clinicName?: string
  clinicLogoUrl?: string
  clinicLogoDataUrl?: string
  headerColor?: string
  headerTextColor?: string
  headerFontWeight?: string
  footerColor?: string
  footerTextColor?: string
  footerFontWeight?: string
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatDateShort(value?: string | null) {
  if (!value) return ""
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return String(value)
  }
}

export function computeAgeYears(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null
  try {
    const dob = new Date(dateOfBirth)
    if (Number.isNaN(dob.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
    return age >= 0 ? age : null
  } catch {
    return null
  }
}

function formatMedicineSchedule(medicine: NonNullable<PrescriptionPdfData["medicines"]>[number]) {
  const parts: string[] = []
  if (medicine.dosage?.trim()) parts.push(medicine.dosage.trim())
  if (medicine.frequency?.trim()) parts.push(medicine.frequency.trim())
  if (medicine.durationDays && medicine.durationDays > 0) parts.push(`${medicine.durationDays} days`)
  if (medicine.quantity && medicine.quantity > 0) parts.push(`Qty ${medicine.quantity}`)
  return parts.join("  •  ")
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#ffffff')
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [255, 255, 255]
}

async function getDataUrlFromRemoteImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to convert image to data URL'))
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('Unable to load clinic logo for PDF:', error)
    return null
  }
}

function getPdfImageType(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

function renderClassicTemplate(doc: jsPDF, prescription: PrescriptionPdfData) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const lineHeight = 7

  // Use clinic's custom header color, defaults to white
  const headerBgColor = prescription.headerColor || '#ffffff'
  const headerTextColor = prescription.headerTextColor || '#1F2937'
  const headerFontWeight = prescription.headerFontWeight || 'bold'

  // HEADER SECTION (0-50mm from top)
  const headerHeight = 45
  doc.setFillColor(...hexToRgb(headerBgColor))
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  doc.setFontSize(14)
  doc.setFont(undefined, headerFontWeight as 'bold' | 'normal')
  doc.setTextColor(...hexToRgb(headerTextColor))
  doc.text("Prescription", margin, 12)
  
  // Add clinic name if available
  if (prescription.clinicName) {
    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    doc.text(prescription.clinicName, margin, 22)
  }

  if (prescription.clinicLogoDataUrl) {
    const logoWidth = 30
    const logoHeight = 30
    const imageType = getPdfImageType(prescription.clinicLogoDataUrl)
    doc.addImage(prescription.clinicLogoDataUrl, imageType, pageWidth - margin - logoWidth - 5, 8, logoWidth, logoHeight)
  }

  // CONTENT SECTION (starts after header)
  let y = headerHeight + 8
  doc.setFontSize(8)
  doc.setTextColor("#4B5563")
  doc.setFont(undefined, "normal")

  const headerLines = [
    [`Prescription ID:`, prescription.prescriptionId || "—"],
    [`Status:`, prescription.status || "—"],
    [`Issued At:`, formatDate(prescription.issuedAt)],
    [`Follow-up:`, formatDate(prescription.followUpAt)],
    [`Patient:`, prescription.patientSnapshot?.fullName || prescription.patientId || "—"],
    [`Doctor:`, prescription.doctorSnapshot?.fullName || prescription.doctorId || "—"],
    [`Specialization:`, prescription.doctorSnapshot?.specialization || "—"],
    [`Diagnosis:`, prescription.diagnosis || "—"],
  ]

  headerLines.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, margin, y)
    y += lineHeight
  })

  y += 3
  doc.setFontSize(9)
  doc.setFont(undefined, "bold")
  doc.setTextColor("#1F2937")
  doc.text("Medicines", margin, y)
  doc.setFont(undefined, "normal")
  doc.setTextColor("#4B5563")
  y += lineHeight + 2

  if (prescription.medicines && prescription.medicines.length > 0) {
    prescription.medicines.forEach((medicine, index) => {
      const medicineText = `${index + 1}. ${medicine.medicineName}${medicine.dosage ? ` • ${medicine.dosage}` : ""}${medicine.frequency ? ` • ${medicine.frequency}` : ""}${medicine.durationDays ? ` • ${medicine.durationDays}d` : ""}${medicine.quantity ? ` • qty ${medicine.quantity}` : ""}`
      const lines = doc.splitTextToSize(medicineText, pageWidth - margin * 2)
      doc.setFontSize(7.5)
      doc.text(lines, margin, y)
      y += lines.length * lineHeight + 1
      
      if (medicine.instructions) {
        const instructionLines = doc.splitTextToSize(`Instructions: ${medicine.instructions}`, pageWidth - margin * 2 - 8)
        doc.setFontSize(7)
        doc.text(instructionLines, margin + 5, y)
        y += instructionLines.length * lineHeight
      }
      y += 2
      
      // Check if we need a new page (reserve 20mm for footer)
      if (y > pageHeight - 30) {
        doc.addPage()
        y = margin
      }
    })
  }

  if (prescription.notes && y < pageHeight - 30) {
    y += 3
    doc.setFontSize(9)
    doc.setFont(undefined, "bold")
    doc.setTextColor("#1F2937")
    doc.text("Notes", margin, y)
    doc.setFont(undefined, "normal")
    doc.setTextColor("#4B5563")
    y += lineHeight
    const noteLines = doc.splitTextToSize(prescription.notes, pageWidth - margin * 2)
    doc.setFontSize(7.5)
    doc.text(noteLines, margin, y)
  }

  // FOOTER SECTION (at bottom, 20mm height)
  const footerBgColor = prescription.footerColor || '#f3f4f6'
  const footerTextColor = prescription.footerTextColor || '#0f172a'
  const footerFontWeight = prescription.footerFontWeight || 'normal'
  
  const footerHeight = 18
  const footerY = pageHeight - footerHeight
  doc.setFillColor(...hexToRgb(footerBgColor))
  doc.rect(0, footerY, pageWidth, footerHeight, 'F')
  
  doc.setFont(undefined, footerFontWeight as 'bold' | 'normal')
  doc.setTextColor(...hexToRgb(footerTextColor))
  doc.setFontSize(7)
  if (prescription.clinicName) {
    doc.text(prescription.clinicName, margin, footerY + 5)
  }
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY + 11)
}

function renderModernTemplate(doc: jsPDF, prescription: PrescriptionPdfData) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const lineHeight = 16
  let y = margin

  // Header background
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 0, pageWidth, 80, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont(undefined, "bold")
  doc.text("Prescription", margin, 35)
  doc.setFontSize(10)
  doc.text(prescription.clinicName || "Medical Clinic", margin, 55)

  if (prescription.clinicLogoDataUrl) {
    const logoWidth = 60
    const logoHeight = 60
    const imageType = getPdfImageType(prescription.clinicLogoDataUrl)
    doc.addImage(prescription.clinicLogoDataUrl, imageType, pageWidth - margin - logoWidth, 10, logoWidth, logoHeight)
  }

  y = 90
  doc.setTextColor("#1F2937")
  doc.setFontSize(10)

  // Patient and Doctor section with boxes
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 60

  doc.setDrawColor(219, 234, 254)
  doc.setLineWidth(1)
  doc.rect(margin, y, boxWidth, boxHeight)
  doc.setFillColor(240, 249, 255)
  doc.rect(margin, y, boxWidth, boxHeight, "F")
  doc.setTextColor("#1E40AF")
  doc.setFont(undefined, "bold")
  doc.text("Patient", margin + 8, y + 16)
  doc.setFont(undefined, "normal")
  doc.setTextColor("#1F2937")
  doc.setFontSize(9)
  doc.text(prescription.patientSnapshot?.fullName || prescription.patientId || "—", margin + 8, y + 32)
  doc.text(`ID: ${prescription.patientId}`, margin + 8, y + 48)

  doc.setDrawColor(219, 234, 254)
  doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight)
  doc.setFillColor(240, 249, 255)
  doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight, "F")
  doc.setTextColor("#1E40AF")
  doc.setFont(undefined, "bold")
  doc.text("Doctor", margin + boxWidth + 18, y + 16)
  doc.setFont(undefined, "normal")
  doc.setTextColor("#1F2937")
  doc.setFontSize(9)
  doc.text(prescription.doctorSnapshot?.fullName || prescription.doctorId || "—", margin + boxWidth + 18, y + 32)
  doc.text(prescription.doctorSnapshot?.specialization || "—", margin + boxWidth + 18, y + 48)

  y += boxHeight + 20
  doc.setFontSize(10)
  doc.setFont(undefined, "bold")
  doc.setTextColor("#1E40AF")
  doc.text("Prescription Details", margin, y)
  y += 14

  doc.setFontSize(9)
  doc.setFont(undefined, "normal")
  doc.setTextColor("#4B5563")
  const details = [
    [`Issued:`, formatDate(prescription.issuedAt)],
    [`Follow-up:`, formatDate(prescription.followUpAt)],
    [`Diagnosis:`, prescription.diagnosis || "—"],
    [`Status:`, prescription.status || "—"],
  ]
  details.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, margin, y)
    y += lineHeight
  })

  y += 8
  doc.setFontSize(10)
  doc.setFont(undefined, "bold")
  doc.setTextColor("#1E40AF")
  doc.text("Medicines", margin, y)
  y += 14

  if (prescription.medicines && prescription.medicines.length > 0) {
    doc.setFontSize(9)
    prescription.medicines.forEach((medicine, index) => {
      doc.setFont(undefined, "bold")
      doc.setTextColor("#1F2937")
      const medicineText = `${index + 1}. ${medicine.medicineName}`
      doc.text(medicineText, margin, y)
      y += 12

      doc.setFont(undefined, "normal")
      doc.setTextColor("#4B5563")
      const details = []
      if (medicine.dosage) details.push(`Dosage: ${medicine.dosage}`)
      if (medicine.frequency) details.push(`Frequency: ${medicine.frequency}`)
      if (medicine.durationDays) details.push(`Duration: ${medicine.durationDays} days`)
      if (medicine.quantity) details.push(`Qty: ${medicine.quantity}`)
      if (medicine.instructions) details.push(`Instructions: ${medicine.instructions}`)

      details.forEach((detail) => {
        doc.text(detail, margin + 8, y)
        y += 10
      })
      y += 4

      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
    })
  }
}

function renderMinimalTemplate(doc: jsPDF, prescription: PrescriptionPdfData) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 50
  const lineHeight = 14
  let y = margin

  doc.setFontSize(14)
  doc.setFont(undefined, "bold")
  doc.setTextColor("#1F2937")
  doc.text("Rx", margin, y)

  if (prescription.clinicLogoDataUrl) {
    const logoWidth = 50
    const logoHeight = 50
    const imageType = getPdfImageType(prescription.clinicLogoDataUrl)
    doc.addImage(prescription.clinicLogoDataUrl, imageType, doc.internal.pageSize.getWidth() - margin - logoWidth, margin - logoHeight / 2, logoWidth, logoHeight)
  }

  y += 20
  doc.setFontSize(9)
  doc.setFont(undefined, "normal")
  doc.setTextColor("#4B5563")

  const info = [
    `${prescription.patientSnapshot?.fullName || "Patient: " + prescription.patientId}`,
    `by ${prescription.doctorSnapshot?.fullName || prescription.doctorId}`,
    `${formatDate(prescription.issuedAt)}`,
  ]

  info.forEach((line) => {
    doc.text(line, margin, y)
    y += lineHeight
  })

  y += 10
  if (prescription.diagnosis) {
    doc.setFont(undefined, "bold")
    doc.text("Diagnosis", margin, y)
    y += 10
    doc.setFont(undefined, "normal")
    const diagLines = doc.splitTextToSize(prescription.diagnosis, pageWidth - margin * 2)
    doc.text(diagLines, margin, y)
    y += diagLines.length * lineHeight + 10
  }

  if (prescription.medicines && prescription.medicines.length > 0) {
    doc.setFont(undefined, "bold")
    doc.text("Medicines", margin, y)
    y += lineHeight

    doc.setFont(undefined, "normal")
    prescription.medicines.forEach((medicine) => {
      const medicineText = `• ${medicine.medicineName}${medicine.dosage ? ` (${medicine.dosage})` : ""}${medicine.frequency ? ` - ${medicine.frequency}` : ""}`
      const lines = doc.splitTextToSize(medicineText, pageWidth - margin * 2 - 10)
      doc.text(lines, margin + 8, y)
      y += lines.length * lineHeight
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
    })
  }

  if (prescription.notes) {
    y += 10
    doc.setFont(undefined, "bold")
    doc.text("Notes", margin, y)
    y += lineHeight
    doc.setFont(undefined, "normal")
    const noteLines = doc.splitTextToSize(prescription.notes, pageWidth - margin * 2)
    doc.text(noteLines, margin, y)
  }
}

function renderCleanTemplate(doc: jsPDF, prescription: PrescriptionPdfData) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const lineHeight = 16
  let y = margin

  doc.setFontSize(16)
  doc.setFont(undefined, "bold")
  doc.setTextColor("#1F2937")
  doc.text("Prescription", margin, y)

  if (prescription.clinicLogoDataUrl) {
    const logoWidth = 60
    const logoHeight = 60
    const imageType = getPdfImageType(prescription.clinicLogoDataUrl)
    doc.addImage(prescription.clinicLogoDataUrl, imageType, doc.internal.pageSize.getWidth() - margin - logoWidth, margin - logoHeight / 2, logoWidth, logoHeight)
  }

  // Thin divider line
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.5)
  y += 10
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  doc.setFontSize(10)
  doc.setFont(undefined, "normal")
  doc.setTextColor("#4B5563")

  const twoColumnData = [
    { label: "Patient", value: prescription.patientSnapshot?.fullName || prescription.patientId || "—" },
    { label: "Doctor", value: prescription.doctorSnapshot?.fullName || prescription.doctorId || "—" },
    { label: "Issued", value: formatDate(prescription.issuedAt) },
    { label: "Follow-up", value: formatDate(prescription.followUpAt) },
  ]

  const colWidth = (pageWidth - margin * 2) / 2
  for (let i = 0; i < twoColumnData.length; i += 2) {
    doc.setFont(undefined, "bold")
    doc.setTextColor("#6B7280")
    doc.text(twoColumnData[i].label, margin, y)
    doc.setFont(undefined, "normal")
    doc.setTextColor("#1F2937")
    doc.text(twoColumnData[i].value, margin, y + 12)

    if (i + 1 < twoColumnData.length) {
      doc.setFont(undefined, "bold")
      doc.setTextColor("#6B7280")
      doc.text(twoColumnData[i + 1].label, margin + colWidth, y)
      doc.setFont(undefined, "normal")
      doc.setTextColor("#1F2937")
      doc.text(twoColumnData[i + 1].value, margin + colWidth, y + 12)
    }
    y += 28
  }

  y += 10
  doc.setDrawColor(229, 231, 235)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  if (prescription.diagnosis) {
    doc.setFont(undefined, "bold")
    doc.setTextColor("#1F2937")
    doc.text("Diagnosis", margin, y)
    y += 12
    doc.setFont(undefined, "normal")
    doc.setTextColor("#4B5563")
    const diagLines = doc.splitTextToSize(prescription.diagnosis, pageWidth - margin * 2)
    doc.text(diagLines, margin, y)
    y += diagLines.length * lineHeight + 10
  }

  doc.setFont(undefined, "bold")
  doc.setTextColor("#1F2937")
  doc.text("Medicines", margin, y)
  y += 12

  if (prescription.medicines && prescription.medicines.length > 0) {
    doc.setFont(undefined, "normal")
    doc.setTextColor("#4B5563")
    prescription.medicines.forEach((medicine, index) => {
      const medicineText = `${index + 1}. ${medicine.medicineName}${medicine.dosage ? ` • ${medicine.dosage}` : ""}${medicine.frequency ? ` • ${medicine.frequency}` : ""}${medicine.durationDays ? ` (${medicine.durationDays}d)` : ""}`
      const lines = doc.splitTextToSize(medicineText, pageWidth - margin * 2)
      doc.text(lines, margin, y)
      y += lines.length * lineHeight
      if (medicine.instructions) {
        doc.setFontSize(9)
        const instructionLines = doc.splitTextToSize(`→ ${medicine.instructions}`, pageWidth - margin * 2 - 12)
        doc.text(instructionLines, margin + 12, y)
        y += instructionLines.length * lineHeight
        doc.setFontSize(10)
      }
      y += 6
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
    })
  }

  if (prescription.notes) {
    y += 10
    doc.setDrawColor(229, 231, 235)
    doc.line(margin, y, pageWidth - margin, y)
    y += 15
    doc.setFont(undefined, "bold")
    doc.setTextColor("#1F2937")
    doc.text("Notes", margin, y)
    y += 12
    doc.setFont(undefined, "normal")
    doc.setTextColor("#4B5563")
    const noteLines = doc.splitTextToSize(prescription.notes, pageWidth - margin * 2)
    doc.text(noteLines, margin, y)
  }
}

export async function buildPrescriptionPdf(prescription: PrescriptionPdfData, template: PrescriptionTemplate = 'classic') {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  let pdfPrescription = prescription

  console.log('🖼️ buildPrescriptionPdf - Input:', {
    clinicName: prescription.clinicName,
    clinicLogoUrl: prescription.clinicLogoUrl,
    clinicLogoDataUrl: prescription.clinicLogoDataUrl ? '[data-url]' : 'none',
    headerColor: prescription.headerColor,
    footerColor: prescription.footerColor,
  })

  if (!prescription.clinicLogoDataUrl && prescription.clinicLogoUrl) {
    try {
      const dataUrl = await getDataUrlFromRemoteImage(prescription.clinicLogoUrl)
      if (dataUrl) {
        pdfPrescription = { ...prescription, clinicLogoDataUrl: dataUrl }
      }
    } catch {
      /* logo optional — CORS on S3 is common */
    }
  }

  switch (template) {
    case 'modern':
      renderModernTemplate(doc, pdfPrescription)
      break
    case 'minimal':
      renderMinimalTemplate(doc, pdfPrescription)
      break
    case 'clean':
      renderCleanTemplate(doc, pdfPrescription)
      break
    case 'classic':
    default:
      renderClassicTemplate(doc, pdfPrescription)
      break
  }

  return doc
}

function estimateTextLines(text: string, maxWidth: number, fontSize: number) {
  const averageCharWidth = fontSize * 0.55
  return Math.max(1, Math.ceil(text.length * averageCharWidth / maxWidth))
}

export type PrescriptionBackgroundPdfOptions = {
  /** Load via authenticated API (clinic letterhead proxy). */
  authenticated?: boolean
}

async function loadBackgroundPdfBytes(
  backgroundPdfUrl: string,
  options?: PrescriptionBackgroundPdfOptions
): Promise<ArrayBuffer> {
  try {
    const response = options?.authenticated
      ? await fetchAPI(backgroundPdfUrl)
      : await fetch(backgroundPdfUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch background PDF: ${response.status}`)
    }

    return response.arrayBuffer()
  } catch (networkErr) {
    const hint =
      networkErr instanceof TypeError && networkErr.message === 'Failed to fetch'
        ? 'Cannot load your clinic letterhead PDF. Re-upload it in Clinic setup → Prescription paper.'
        : networkErr instanceof Error
          ? networkErr.message
          : 'Cannot load uploaded prescription PDF.'
    throw new Error(hint)
  }
}

/** Overlay patient, doctor, medicines on uploaded clinic letterhead (no clinic name / Rx id). */
async function renderPrescriptionOnLetterhead(
  prescription: PrescriptionPdfData,
  pdfDoc: PDFDocument
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const textColor = rgb(0.1, 0.1, 0.1)
  const labelColor = rgb(0.35, 0.35, 0.35)
  const ruleColor = rgb(0.75, 0.75, 0.75)

  const page = pdfDoc.getPages()[0]
  const { width, height } = page.getSize()

  const marginX = Math.max(42, width * 0.08)
  const marginRight = width - marginX
  const contentWidth = marginRight - marginX
  const bottomSafe = Math.max(56, height * 0.1)
  const topContentY = height - Math.max(200, height * 0.28)

  let y = topContentY
  const gap = (n = 1) => {
    y -= n * 4
  }

  const lineHeightFor = (size: number) => size * 1.35

  const measureLines = (text: string, size: number, maxW: number) =>
    estimateTextLines(text, maxW, size)

  const advanceY = (text: string, size: number, maxW: number) => {
    const lines = measureLines(text, size, maxW)
    y -= lines * lineHeightFor(size) + 3
  }

  const drawWrapped = (
    text: string,
    opts: {
      x?: number
      size?: number
      bold?: boolean
      color?: ReturnType<typeof rgb>
      maxWidth?: number
    } = {}
  ) => {
    if (!text.trim()) return
    const size = opts.size ?? 10
    const maxW = opts.maxWidth ?? contentWidth
    const x = opts.x ?? marginX
    const usedFont = opts.bold ? fontBold : font
    page.drawText(text, {
      x,
      y,
      size,
      font: usedFont,
      color: opts.color ?? textColor,
      maxWidth: maxW,
      lineHeight: lineHeightFor(size),
    })
    advanceY(text, size, maxW)
  }

  const drawRule = () => {
    y -= 6
    page.drawLine({
      start: { x: marginX, y },
      end: { x: marginRight, y },
      thickness: 0.5,
      color: ruleColor,
    })
    y -= 10
  }

  const patientName = prescription.patientSnapshot?.fullName?.trim() || "Patient"
  const patientPhone = prescription.patientSnapshot?.phoneNumber?.trim()
  const patientAge = prescription.patientSnapshot?.ageYears
  const patientGender = prescription.patientSnapshot?.gender?.trim()
  const doctorName = prescription.doctorSnapshot?.fullName?.trim() || "Doctor"
  const doctorSpec = prescription.doctorSnapshot?.specialization?.trim()

  const patientMeta: string[] = []
  if (patientAge != null && patientAge !== "") patientMeta.push(`${patientAge} yrs`)
  if (patientGender) patientMeta.push(patientGender)
  if (patientPhone) patientMeta.push(patientPhone)

  const colMid = marginX + contentWidth * 0.52
  const colWidth = contentWidth * 0.48 - 8

  page.drawText("Patient", {
    x: marginX,
    y,
    size: 8,
    font: fontBold,
    color: labelColor,
  })
  page.drawText("Doctor", {
    x: colMid,
    y,
    size: 8,
    font: fontBold,
    color: labelColor,
  })
  y -= 14

  page.drawText(patientName, {
    x: marginX,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
    maxWidth: colWidth,
    lineHeight: 14,
  })
  page.drawText(doctorName, {
    x: colMid,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
    maxWidth: colWidth,
    lineHeight: 14,
  })
  y -= 16

  if (patientMeta.length) {
    const metaLine = patientMeta.join("  •  ")
    page.drawText(metaLine, {
      x: marginX,
      y,
      size: 9,
      font,
      color: textColor,
      maxWidth: colWidth,
      lineHeight: 12,
    })
  }
  if (doctorSpec) {
    page.drawText(doctorSpec, {
      x: colMid,
      y,
      size: 9,
      font,
      color: textColor,
      maxWidth: colWidth,
      lineHeight: 12,
    })
  }
  y -= patientMeta.length || doctorSpec ? 14 : 0

  const dateLine = formatDateShort(prescription.issuedAt)
  const followLine = formatDateShort(prescription.followUpAt)
  if (dateLine) {
    drawWrapped(`Date: ${dateLine}`, { size: 9, color: labelColor })
  }
  if (followLine) {
    drawWrapped(`Next visit: ${followLine}`, { size: 9, color: labelColor })
  }

  gap()
  drawRule()

  if (prescription.diagnosis?.trim()) {
    drawWrapped(`Diagnosis: ${prescription.diagnosis.trim()}`, { size: 10, bold: true })
    gap()
  }

  const medicines = prescription.medicines || []
  if (medicines.length > 0) {
    drawWrapped("Medicines", { size: 10, bold: true, color: labelColor })
    gap(0.5)

    for (let index = 0; index < medicines.length; index += 1) {
      if (y < bottomSafe + 40) break

      const medicine = medicines[index]
      const schedule = formatMedicineSchedule(medicine)

      drawWrapped(`${index + 1}. ${medicine.medicineName}`, { size: 11, bold: true })

      if (schedule) {
        drawWrapped(`   ${schedule}`, { size: 9.5 })
      }

      if (medicine.instructions?.trim()) {
        drawWrapped(`   Note: ${medicine.instructions.trim()}`, { size: 9, color: labelColor })
      }

      gap(0.75)
    }
  }

  if (prescription.notes?.trim() && y > bottomSafe + 24) {
    drawRule()
    drawWrapped("Advice / Notes", { size: 9, bold: true, color: labelColor })
    drawWrapped(prescription.notes.trim(), { size: 9.5 })
  }
}

/** Build PDF blob URL for in-app preview (caller must revoke URL when done). */
export async function createPrescriptionPdfBlobUrl(
  prescription: PrescriptionPdfData,
  template: PrescriptionTemplate = 'classic',
  backgroundPdfUrl?: string,
  backgroundOptions?: PrescriptionBackgroundPdfOptions
): Promise<string> {
  if (backgroundPdfUrl) {
    const pdfBytes = await loadBackgroundPdfBytes(backgroundPdfUrl, backgroundOptions)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    await renderPrescriptionOnLetterhead(prescription, pdfDoc)
    const modifiedBytes = await pdfDoc.save()
    const blob = new Blob([new Uint8Array(modifiedBytes)], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }

  const doc = await buildPrescriptionPdf(prescription, template)
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

export async function openPrescriptionPdfWithBackground(
  prescription: PrescriptionPdfData,
  backgroundPdfUrl: string,
  autoPrint = false,
  options?: PrescriptionBackgroundPdfOptions
) {
  try {
    const pdfBytes = await loadBackgroundPdfBytes(backgroundPdfUrl, options)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    await renderPrescriptionOnLetterhead(prescription, pdfDoc)

    const modifiedBytes = await pdfDoc.save()
    const blob = new Blob([new Uint8Array(modifiedBytes)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const pdfWindow = window.open(url, '_blank')
    if (!pdfWindow) {
      URL.revokeObjectURL(url)
      throw new Error('Could not open PDF. Please allow pop-ups.')
    }
    if (autoPrint) {
      const triggerPrint = () => {
        try {
          pdfWindow.focus()
          pdfWindow.print()
        } catch {
          /* wait for PDF render */
        }
      }
      pdfWindow.addEventListener('load', triggerPrint)
      setTimeout(triggerPrint, 900)
    }
  } catch (error) {
    console.error('Failed to overlay prescription on PDF:', error)
    throw error
  }
}

export async function openPrescriptionPdf(
  prescription: PrescriptionPdfData,
  template: PrescriptionTemplate = 'classic',
  autoPrint = false
) {
  const doc = await buildPrescriptionPdf(prescription, template)
  const blob = doc.output("blob")
  const url = URL.createObjectURL(blob)
  const pdfWindow = window.open(url, "_blank")
  if (!pdfWindow) {
    URL.revokeObjectURL(url)
    throw new Error("Could not open PDF. Please allow pop-ups for this site.")
  }
  if (autoPrint) {
    const triggerPrint = () => {
      try {
        pdfWindow.focus()
        pdfWindow.print()
      } catch {
        /* print may fail until PDF loads */
      }
    }
    pdfWindow.addEventListener("load", triggerPrint)
    setTimeout(triggerPrint, 800)
  }
}

export async function downloadPrescriptionPdf(prescription: PrescriptionPdfData, template: PrescriptionTemplate = 'classic') {
  const doc = await buildPrescriptionPdf(prescription, template)
  const filename = `prescription-${prescription.prescriptionId || "unknown"}.pdf`
  doc.save(filename)
}

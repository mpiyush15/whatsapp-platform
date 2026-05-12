import { jsPDF } from "jspdf"

export type PatientInvoicePdfInput = {
  invoiceNumber: string
  issuedAt?: string | null
  dueAt?: string | null
  status?: string
  items?: Array<{ description: string; quantity: number; unitPrice: number; total?: number }>
  total?: number
  balanceDue?: number
  amountPaid?: number
}

/**
 * Simple text-based PDF for clinic patient invoices (consultation / pharmacy line items).
 */
export function downloadPatientInvoicePdf(
  invoice: PatientInvoicePdfInput,
  opts: { patientName: string; clinicName?: string | null }
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const margin = 18
  let y = margin

  const line = (text: string, size = 10, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style)
    doc.setFontSize(size)
    const split = doc.splitTextToSize(text, 180)
    doc.text(split, margin, y)
    y += split.length * (size * 0.45) + 2
    if (y > 270) {
      doc.addPage()
      y = margin
    }
  }

  line(opts.clinicName || "Clinic", 14, "bold")
  line("Patient invoice", 12, "bold")
  y += 2

  line(`Invoice #: ${invoice.invoiceNumber}`, 10, "bold")
  if (invoice.issuedAt) {
    line(`Issued: ${new Date(invoice.issuedAt).toLocaleString("en-IN")}`, 9)
  }
  if (invoice.dueAt) {
    line(`Due: ${new Date(invoice.dueAt).toLocaleString("en-IN")}`, 9)
  }
  line(`Status: ${(invoice.status || "issued").replace(/-/g, " ")}`, 9)
  y += 4

  line(`Bill to: ${opts.patientName}`, 10, "bold")
  y += 4

  line("Items", 10, "bold")
  const items = invoice.items || []
  if (items.length === 0) {
    line("—", 9)
  } else {
    for (const row of items) {
      const sub = Number(row.total ?? Number(row.quantity || 1) * Number(row.unitPrice || 0))
      line(`${row.description}  ×${row.quantity}  @ ₹${Number(row.unitPrice || 0).toLocaleString("en-IN")}  = ₹${sub.toLocaleString("en-IN")}`, 9)
    }
  }
  y += 4

  const total = Number(invoice.total || 0)
  const paid = Number(invoice.amountPaid || 0)
  const due = Number(invoice.balanceDue ?? Math.max(total - paid, 0))

  line(`Total: ₹${total.toLocaleString("en-IN")}`, 11, "bold")
  line(`Amount paid: ₹${paid.toLocaleString("en-IN")}`, 10)
  line(`Balance due: ₹${due.toLocaleString("en-IN")}`, 10, "bold")
  y += 6
  line("Please pay the balance due at the front desk or as instructed by the clinic.", 9)

  doc.save(`${invoice.invoiceNumber || "invoice"}.pdf`)
}

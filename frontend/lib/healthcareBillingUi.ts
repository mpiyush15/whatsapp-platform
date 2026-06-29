/** Plain labels for clinic billing / reception */

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  issued: 'Waiting for payment',
  paid: 'Paid',
  'partially-paid': 'Part paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  completed: 'Received',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  'bank-transfer': 'Bank transfer',
  wallet: 'Wallet',
  insurance: 'Insurance',
  other: 'Other',
}

export function formatInvoiceStatus(status?: string | null): string {
  return INVOICE_STATUS_LABELS[String(status || '')] || status || '—'
}

export function formatPaymentStatus(status?: string | null): string {
  return PAYMENT_STATUS_LABELS[String(status || '')] || status || '—'
}

export function formatPaymentMethod(method?: string | null): string {
  return PAYMENT_METHOD_LABELS[String(method || '')] || method || 'Cash'
}

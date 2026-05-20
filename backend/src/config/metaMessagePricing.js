/**
 * Estimated Meta WhatsApp Business Platform rates (India / INR per billable message).
 * Update via env when Meta changes pricing. These are estimates for analytics — not invoices.
 * @see https://developers.facebook.com/docs/whatsapp/pricing
 */
export const META_MESSAGE_RATES_INR = {
  marketing: Number(process.env.META_RATE_MARKETING_INR || 0.7846),
  utility: Number(process.env.META_RATE_UTILITY_INR || 0.3458),
  authentication: Number(process.env.META_RATE_AUTHENTICATION_INR || 0.3458),
  /** Service / user-initiated session replies (often $0 within 24h window; set if you bill internally) */
  service: Number(process.env.META_RATE_SERVICE_INR || 0),
};

export const META_PRICING_NOTES = {
  currency: 'INR',
  region: process.env.META_PRICING_REGION || 'India',
  disclaimer:
    'Estimated Meta messaging cost from outbound volume × category rates. Actual Meta invoices may use conversation-based billing.',
};

export function estimateMetaCostInr(categoryCounts) {
  const breakdown = Object.keys(META_MESSAGE_RATES_INR).map((key) => {
    const count = Number(categoryCounts[key] || 0);
    const rateInr = META_MESSAGE_RATES_INR[key];
    const subtotal = Math.round(count * rateInr * 100) / 100;
    return { category: key, count, rateInr, subtotalInr: subtotal };
  });

  const totalInr = Math.round(breakdown.reduce((s, row) => s + row.subtotalInr, 0) * 100) / 100;
  const billableMessages = breakdown.reduce((s, row) => s + row.count, 0);

  return {
    ...META_PRICING_NOTES,
    breakdown,
    billableMessages,
    totalEstimatedInr: totalInr,
  };
}

export default { META_MESSAGE_RATES_INR, META_PRICING_NOTES, estimateMetaCostInr };

/**
 * Normalize phone to E.164-style (+91…) for India-first flows.
 */
export function normalizePhone(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length > 10 && digits.startsWith('91')) return `+${digits}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
}

export function phoneLookupVariants(normalized) {
  const digits = normalized.replace(/\D/g, '');
  const variants = new Set([normalized, digits, digits.replace(/^91/, ''), `+${digits}`]);
  return [...variants].filter(Boolean);
}

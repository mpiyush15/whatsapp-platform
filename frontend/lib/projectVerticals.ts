export const PROJECT_VERTICALS = ['whatsapp', 'healthcare', 'ecommerce', 'pathology', 'education'] as const;

export type ProjectVertical = (typeof PROJECT_VERTICALS)[number];

export const VERTICAL_LABELS: Record<ProjectVertical, string> = {
  whatsapp: 'WhatsApp',
  healthcare: 'Healthcare',
  ecommerce: 'E-commerce',
  pathology: 'Pathology',
  education: 'Education',
};

export const VERTICAL_BADGE_CLASS: Record<ProjectVertical, string> = {
  whatsapp: 'bg-green-100 text-green-800 border-green-200',
  healthcare: 'bg-sky-100 text-sky-800 border-sky-200',
  ecommerce: 'bg-purple-100 text-purple-800 border-purple-200',
  pathology: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  education: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function normalizeVertical(value?: string | null): ProjectVertical {
  const key = String(value || 'whatsapp').toLowerCase();
  return (PROJECT_VERTICALS as readonly string[]).includes(key)
    ? (key as ProjectVertical)
    : 'whatsapp';
}

export function verticalLabel(value?: string | null): string {
  return VERTICAL_LABELS[normalizeVertical(value)];
}

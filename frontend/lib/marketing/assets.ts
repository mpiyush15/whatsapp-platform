/** Marketing hero — hosted on S3 (pixels-official) */
export const MARKETING_DASHBOARD_HERO_URL =
  process.env.NEXT_PUBLIC_MARKETING_DASHBOARD_HERO_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/replysys-dashboard-hero.png';

/** Features page hero — team collaboration (S3, local fallback in /public/marketing) */
export const MARKETING_FEATURES_HERO_TEAM_URL =
  process.env.NEXT_PUBLIC_MARKETING_FEATURES_HERO_TEAM_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/features-hero-team.png';

export const MARKETING_FEATURES_HERO_TEAM_LOCAL = '/marketing/features-hero-team.png';

/** E-commerce industry hero illustration — SVG (S3, local fallback in /public/marketing) */
export const MARKETING_ECOMMERCE_HERO_ILLUSTRATION_URL =
  process.env.NEXT_PUBLIC_MARKETING_ECOMMERCE_HERO_ILLUSTRATION_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/ecommerce-hero-illustration.svg';

export const MARKETING_ECOMMERCE_HERO_ILLUSTRATION_LOCAL = '/marketing/ecommerce-hero-illustration.svg';

/** Food & Beverage industry hero illustration */
export const MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_URL =
  process.env.NEXT_PUBLIC_MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/ecommerce-hero-illustration.svg'; // Using ecommerce as placeholder

export const MARKETING_FOOD_BEVERAGE_HERO_ILLUSTRATION_LOCAL = '/marketing/ecommerce-hero-illustration.svg';

/** E-commerce playbook section — online market growth (JPG, full quality on S3) */
export const MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_URL =
  process.env.NEXT_PUBLIC_MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/ecommerce-playbook-online-market.jpg';

export const MARKETING_ECOMMERCE_PLAYBOOK_IMAGE_LOCAL = '/marketing/ecommerce-playbook-online-market.jpg';

/** Marketing landing — problems carousel, account risk card (JPG on S3) */
export const MARKETING_PROBLEM_ACCOUNT_BAN_URL =
  process.env.NEXT_PUBLIC_MARKETING_PROBLEM_ACCOUNT_BAN_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/problems/whatsapp-account-ban.jpg';

export const MARKETING_PROBLEM_ACCOUNT_BAN_LOCAL = '/marketing/problems/whatsapp-account-ban.jpg';

/** Marketing landing — problems carousel, consent / opt-in card (JPG on S3) */
export const MARKETING_PROBLEM_CONSENT_OPTIN_URL =
  process.env.NEXT_PUBLIC_MARKETING_PROBLEM_CONSENT_OPTIN_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/problems/whatsapp-consent-opt-in.jpg';

export const MARKETING_PROBLEM_CONSENT_OPTIN_LOCAL = '/marketing/problems/whatsapp-consent-opt-in.jpg';

/** Marketing landing — problems carousel, compliance / templates card (JPG on S3) */
export const MARKETING_PROBLEM_TEMPLATE_COMPLIANCE_URL =
  process.env.NEXT_PUBLIC_MARKETING_PROBLEM_TEMPLATE_COMPLIANCE_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/problems/whatsapp-template-compliance.jpg';

export const MARKETING_PROBLEM_TEMPLATE_COMPLIANCE_LOCAL =
  '/marketing/problems/whatsapp-template-compliance.jpg';

/** Marketing landing — problems carousel, operations / too many tools card (JPG on S3) */
export const MARKETING_PROBLEM_TOO_MANY_TOOLS_URL =
  process.env.NEXT_PUBLIC_MARKETING_PROBLEM_TOO_MANY_TOOLS_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/problems/too-many-tools.jpg';

export const MARKETING_PROBLEM_TOO_MANY_TOOLS_LOCAL = '/marketing/problems/too-many-tools.jpg';

/** Marketing landing — problems carousel, scale / manual follow-ups card (JPG on S3) */
export const MARKETING_PROBLEM_MANUAL_FOLLOWUPS_URL =
  process.env.NEXT_PUBLIC_MARKETING_PROBLEM_MANUAL_FOLLOWUPS_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/problems/manual-follow-ups.jpg';

export const MARKETING_PROBLEM_MANUAL_FOLLOWUPS_LOCAL = '/marketing/problems/manual-follow-ups.jpg';

/** Healthcare industry hero — doctor + WhatsApp notification bubbles (PNG on S3) */
export const MARKETING_HEALTHCARE_HERO_DOCTOR_URL =
  process.env.NEXT_PUBLIC_MARKETING_HEALTHCARE_HERO_DOCTOR_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/healthcare-hero-doctor.png';

export const MARKETING_HEALTHCARE_HERO_DOCTOR_LOCAL = '/marketing/healthcare-hero-doctor.png';

/** Healthcare clinic operations — before/after comparison (PNG on S3) */
export const MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_URL =
  process.env.NEXT_PUBLIC_MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/dr+sec+2.png';

export const MARKETING_HEALTHCARE_CLINIC_OPS_COMPARE_LOCAL = '/marketing/healthcare-clinic-ops-compare.png';

/** Sales solution page hero — pipeline illustration (JPG on S3) */
export const MARKETING_SALES_SOLUTION_HERO_URL =
  process.env.NEXT_PUBLIC_MARKETING_SALES_SOLUTION_HERO_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/sales-solution-hero.jpg';

export const MARKETING_SALES_SOLUTION_HERO_LOCAL = '/marketing/sales-solution-hero.jpg';

/** Customer spotlight — Vaibhav Biotech */
export const MARKETING_CUSTOMER_VAIBHAV_LOGO_URL =
  process.env.NEXT_PUBLIC_MARKETING_CUSTOMER_VAIBHAV_LOGO_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/customers/vaibhav-biotech-logo.png';

export const MARKETING_CUSTOMER_VAIBHAV_LOGO_LOCAL = '/marketing/customers/vaibhav-biotech-logo.png';

export const MARKETING_CUSTOMER_PLANT_IN_GARDEN_URL =
  process.env.NEXT_PUBLIC_MARKETING_CUSTOMER_PLANT_IN_GARDEN_URL ||
  'https://pixels-official.s3.ap-south-1.amazonaws.com/marketing/customers/plant-in-garden-store.jpg';

export const MARKETING_CUSTOMER_PLANT_IN_GARDEN_LOCAL = '/marketing/customers/plant-in-garden-store.jpg';

/** Main marketing page — WhatsApp Business API explainer (add MP4/WebM when ready) */
export const MARKETING_WA_API_VIDEO_SRC =
  process.env.NEXT_PUBLIC_MARKETING_WA_API_VIDEO_URL ?? '';

export const MARKETING_WA_API_VIDEO_POSTER =
  process.env.NEXT_PUBLIC_MARKETING_WA_API_VIDEO_POSTER ?? '';

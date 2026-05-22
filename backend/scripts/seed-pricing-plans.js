/**
 * Seed default WhatsApp + Healthcare pricing plans for public page & gating.
 *
 * Usage: node scripts/seed-pricing-plans.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PricingPlan from '../src/models/PricingPlan.js';
import { catalogForProductLine } from '../src/config/planFeatureCatalog.js';

dotenv.config();

const PLANS = [
  {
    planId: 'plan_whatsapp_starter',
    productLine: 'whatsapp',
    name: 'Starter',
    sortOrder: 1,
    description: 'Small teams getting started on WhatsApp API.',
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    currency: 'INR',
    isPopular: false,
    limits: { messages: 5000, contacts: 2000, campaigns: 10, phoneNumbers: 1, users: 3, templates: 25 },
    entitlements: {
      live_chat: true,
      broadcasts: true,
      templates: true,
      contacts_crm: true,
      whatsapp_api: true,
    },
  },
  {
    planId: 'plan_whatsapp_growth',
    productLine: 'whatsapp',
    name: 'Growth',
    sortOrder: 2,
    description: 'Scaling outreach with campaigns and automation.',
    monthlyPrice: 7999,
    yearlyPrice: 79990,
    currency: 'INR',
    isPopular: true,
    limits: { messages: 25000, contacts: 15000, campaigns: 50, phoneNumbers: 2, users: 10, templates: 100 },
    entitlements: {
      live_chat: true,
      broadcasts: true,
      campaigns: true,
      chatbot: true,
      flow_builder: true,
      templates: true,
      contacts_crm: true,
      analytics: true,
      multi_agent: true,
      whatsapp_api: true,
    },
  },
  {
    planId: 'plan_whatsapp_enterprise',
    productLine: 'whatsapp',
    name: 'Enterprise',
    sortOrder: 3,
    description: 'High volume with API, webhooks, and unlimited caps.',
    monthlyPrice: 19999,
    yearlyPrice: 199990,
    currency: 'INR',
    isPopular: false,
    limits: {
      messages: null,
      contacts: null,
      campaigns: null,
      phoneNumbers: 5,
      users: null,
      templates: null,
      apiCalls: null,
      storageGB: 100,
    },
    entitlements: {
      live_chat: true,
      broadcasts: true,
      campaigns: true,
      chatbot: true,
      flow_builder: true,
      templates: true,
      contacts_crm: true,
      api_access: true,
      webhooks: true,
      analytics: true,
      multi_agent: true,
      whatsapp_api: true,
    },
  },
  {
    planId: 'plan_healthcare_clinic',
    productLine: 'healthcare',
    name: 'Clinic',
    sortOrder: 1,
    description: 'Single-location clinic with core clinical workflows.',
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    currency: 'INR',
    isPopular: false,
    limits: { patients: 2000, appointments: 500, prescriptions: 400, doctors: 5, healthcareUsers: 8 },
    entitlements: {
      hc_patients: true,
      hc_appointments: true,
      hc_prescriptions: true,
      hc_frontdesk: true,
      hc_billing: true,
      hc_doctors: true,
    },
  },
  {
    planId: 'plan_healthcare_plus',
    productLine: 'healthcare',
    name: 'Clinic Plus',
    sortOrder: 2,
    description: 'Pharmacy, inventory, analytics, and WhatsApp reminders.',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    currency: 'INR',
    isPopular: true,
    limits: { patients: 10000, appointments: 2000, prescriptions: 1500, doctors: 20, healthcareUsers: 25 },
    entitlements: {
      hc_patients: true,
      hc_appointments: true,
      hc_prescriptions: true,
      hc_frontdesk: true,
      hc_billing: true,
      hc_pharmacy: true,
      hc_inventory: true,
      hc_doctors: true,
      hc_analytics: true,
      hc_whatsapp: true,
      hc_compliance: true,
    },
  },
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected. Seeding pricing plans…');

  for (const spec of PLANS) {
    const catalog = catalogForProductLine(spec.productLine);
    const included = catalog.features.filter((f) => spec.entitlements[f.key]).map((f) => f.label);

    await PricingPlan.findOneAndUpdate(
      { planId: spec.planId },
      {
        $set: {
          ...spec,
          publishedToPublic: true,
          isActive: true,
          setupFee: 0,
          signupCredits: spec.productLine === 'whatsapp' ? 500 : 0,
          monthlyCredits: 0,
          features: { included, excluded: [] },
          entitlements: spec.entitlements,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${spec.productLine} / ${spec.name}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

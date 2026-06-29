// Pricing Plans Configuration
// Lock these in - don't change without business decision

export const PRICING_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Best for small businesses & first-time WhatsApp automation',
    monthlyPrice: 2499,
    setupFee: 0,
    currency: '₹',
    billingCycle: 'month',
    
    // Features included
    features: {
      whatsappNumbers: 1,
      agents: 3,
      broadcasting: true,
      chatbot: 'basic', // menu/keyword based only
      liveChat: true,
      contactManagement: true,
      analytics: 'basic',
      autoReplies: true,
      paymentLinks: true,
      emailNotifications: true,
      webhooks: false,
      advancedCampaigns: false,
      crmIntegrations: false,
      apiAccess: false,
      advancedAnalytics: false,
      scheduling: false,
      autoFollowups: false,
    },
    
    support: 'Standard',
    description: 'Perfect for getting started with WhatsApp automation',
  },

  PRO: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing businesses & serious WhatsApp usage',
    monthlyPrice: 4999,
    setupFee: 0,
    currency: '₹',
    billingCycle: 'month',
    
    // Features included
    features: {
      whatsappNumbers: 3,
      agents: 10,
      broadcasting: true,
      chatbot: 'advanced', // logic-based flows
      liveChat: true,
      contactManagement: true,
      analytics: 'advanced',
      autoReplies: true,
      paymentLinks: true,
      emailNotifications: true,
      webhooks: true,
      advancedCampaigns: true,
      crmIntegrations: false, // Future
      apiAccess: 'limited',
      advancedAnalytics: true,
      scheduling: true,
      autoFollowups: true,
      tagSegmentation: true,
      agentRouting: true,
    },
    
    support: 'Priority',
    description: 'Advanced automation for growing businesses',
  },
};

// Message pricing (pass-through to Meta)
export const MESSAGE_PRICING = {
  marketing: {
    price: 1.09,
    currency: '₹',
    type: 'Marketing messages',
  },
  utility: {
    price: 0.145,
    currency: '₹',
    type: 'Utility/Auth messages',
  },
};

// Get all plans
export const getAllPlans = () => Object.values(PRICING_PLANS);

// Get plan by ID
export const getPlanById = (planId) => PRICING_PLANS[planId.toUpperCase()];

// Calculate total cost (plan + messages)
export const calculateMonthlyCost = (planId, messagesCount = 0) => {
  const plan = getPlanById(planId);
  if (!plan) return null;
  
  const planCost = plan.monthlyPrice;
  const estimatedMessageCost = messagesCount * MESSAGE_PRICING.marketing.price;
  
  return {
    planCost,
    estimatedMessageCost,
    total: planCost + estimatedMessageCost,
  };
};

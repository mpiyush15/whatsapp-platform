const OBJECT_ID_CAMPAIGN = /^[a-f0-9]{24}$/i;

/**
 * Meta billing category for an outbound message (for cost / credit estimates).
 */
export function classifyOutboundMessage(message, templateCategoryByName = new Map()) {
  const campaign = String(message.campaign || '');
  if (OBJECT_ID_CAMPAIGN.test(campaign)) {
    return 'marketing';
  }

  if (message.messageType === 'template') {
    const name = message.content?.templateName;
    if (name && templateCategoryByName.has(name)) {
      return templateCategoryByName.get(name);
    }
    return 'marketing';
  }

  if (
    campaign === 'workflow_conversation' ||
    campaign === 'keyword_auto_reply' ||
    campaign.startsWith('workflow_')
  ) {
    return 'service';
  }

  return 'service';
}

export function creditsForCategory(category) {
  const costs = {
    marketing: Number(process.env.CREDIT_COST_MARKETING || 1),
    utility: Number(process.env.CREDIT_COST_UTILITY || 1),
    authentication: Number(process.env.CREDIT_COST_AUTHENTICATION || 1),
    service: Number(process.env.CREDIT_COST_SERVICE || 0),
  };
  return Number(costs[category] ?? costs.utility);
}

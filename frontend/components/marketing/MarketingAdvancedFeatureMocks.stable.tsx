'use client';

/**
 * Stable v2 — advanced feature dashboard mocks (no framer-motion in mocks).
 */
import {
  ADVANCED_MOCK_AUTOMATION_STEPS,
  type AdvancedFeatureId,
} from '@/components/marketing/marketing-advanced-features-mock-data';
import { MarketingAgentsSettingsMock } from '@/components/marketing/MarketingAgentsSettingsMock';
import { MarketingCampaignRetargetMock } from '@/components/marketing/MarketingCampaignRetargetMock';
import { MarketingFollowUpAutomationMock } from '@/components/marketing/MarketingFollowUpAutomationMock';
import { MarketingTemplatesDashboardMock } from '@/components/marketing/MarketingTemplatesDashboardMock';

export function TeamAgentsAdvancedMock() {
  return <MarketingAgentsSettingsMock />;
}

export function TemplatesSyncAdvancedMock() {
  return <MarketingTemplatesDashboardMock />;
}

export function RetargetingAdvancedMock() {
  return <MarketingCampaignRetargetMock />;
}

export function FollowUpAutomationAdvancedMock() {
  return <MarketingFollowUpAutomationMock />;
}

const MOCKS: Record<AdvancedFeatureId, () => React.ReactElement> = {
  teamAgents: TeamAgentsAdvancedMock,
  templatesSync: TemplatesSyncAdvancedMock,
  retargeting: RetargetingAdvancedMock,
  followUpAutomation: FollowUpAutomationAdvancedMock,
};

export function MarketingAdvancedFeatureMock({ id }: { id: AdvancedFeatureId }) {
  const Mock = MOCKS[id];
  return <Mock />;
}

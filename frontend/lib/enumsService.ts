/**
 * Enums Service
 * Fetches enum definitions from backend API
 * Single source of truth: backend/src/constants/enums.js
 */

const ENUMS_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AllEnums {
  AccountType: Record<string, string>;
  UserRole: Record<string, string>;
  AccountStatus: Record<string, string>;
  MetaSyncStatus: Record<string, string>;
  PermissionLevel: Record<string, string>;
  PhoneStatus: Record<string, string>;
  PhoneQualityRating: Record<string, string>;
  ConversationStatus: Record<string, string>;
  MessageStatus: Record<string, string>;
  MessageDirection: Record<string, string>;
  AssignmentStatus: Record<string, string>;
  AssignmentMode: Record<string, string>;
  TemplateStatus: Record<string, string>;
  TemplateCategory: Record<string, string>;
  CampaignType: Record<string, string>;
  CampaignStatus: Record<string, string>;
  CampaignTargetType: Record<string, string>;
  CampaignTriggerType: Record<string, string>;
  LeadStatus: Record<string, string>;
  LeadSource: Record<string, string>;
  ContactType: Record<string, string>;
  AgentRole: Record<string, string>;
  AgentStatus: Record<string, string>;
  AgentAvailability: Record<string, string>;
  PaymentStatus: Record<string, string>;
  PaymentMethod: Record<string, string>;
  PaymentType: Record<string, string>;
  SubscriptionStatus: Record<string, string>;
  IntegrationType: Record<string, string>;
  WebhookStatus: Record<string, string>;
  TagType: Record<string, string>;
  KeywordRuleAction: Record<string, string>;
}

let cachedEnums: AllEnums | null = null;
let fetchPromise: Promise<AllEnums> | null = null;

/**
 * Fetch all enums from backend
 * Results are cached in memory
 */
export async function fetchEnumsFromBackend(): Promise<AllEnums> {
  // Return cached if available
  if (cachedEnums) {
    return cachedEnums;
  }

  // Prevent multiple simultaneous requests
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(`${ENUMS_API}/api/enums/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Don't cache at HTTP level, we cache in memory
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enums: ${response.statusText}`);
      }

      const data = await response.json();
      cachedEnums = data.data || data;
      return cachedEnums as AllEnums;
    } catch (error) {
      console.error('❌ Failed to fetch enums from backend:', error);
      // Return empty object - components should handle gracefully
      throw error;
    }
  })();

  return fetchPromise;
}

/**
 * Fetch specific enum by name
 * @param enumName - Name of the enum (e.g., 'UserRole', 'PaymentStatus')
 */
export async function fetchEnumByName(enumName: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${ENUMS_API}/api/enums/${enumName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Enum not found: ${enumName}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error(`❌ Failed to fetch enum ${enumName}:`, error);
    throw error;
  }
}

/**
 * Validate if value exists in specific enum
 * @param enumName - Name of the enum
 * @param value - Value to validate
 */
export async function validateEnumValue(
  enumName: string,
  value: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${ENUMS_API}/api/enums/validate?enum=${enumName}&value=${value}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.data?.isValid ?? false;
  } catch (error) {
    console.error(`❌ Failed to validate enum value:`, error);
    return false;
  }
}

/**
 * Get cached enums synchronously (if available)
 * Returns null if not yet fetched
 */
export function getCachedEnums(): AllEnums | null {
  return cachedEnums;
}

/**
 * Clear cached enums
 * Useful for testing or force-refresh
 */
export function clearEnumsCache(): void {
  cachedEnums = null;
  fetchPromise = null;
}

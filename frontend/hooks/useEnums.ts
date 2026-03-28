/**
 * useEnums Hook
 * Fetch and cache enum definitions in React components
 * Automatically handles loading and error states
 */

'use client';

import { useEffect, useState } from 'react';
import { fetchEnumsFromBackend, getCachedEnums } from '@/lib/enumsService';

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

interface UseEnumsResult {
  enums: AllEnums | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and cache enums
 * Usage:
 *   const { enums, loading, error } = useEnums();
 *   if (enums) {
 *     return enums.UserRole.ADMIN // "admin"
 *   }
 */
export function useEnums(): UseEnumsResult {
  const [enums, setEnums] = useState<AllEnums | null>(() => getCachedEnums());
  const [loading, setLoading] = useState(!enums);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (enums) return; // Already loaded

    let isMounted = true;

    const loadEnums = async () => {
      try {
        setLoading(true);
        const fetchedEnums = await fetchEnumsFromBackend();
        if (isMounted) {
          setEnums(fetchedEnums);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEnums();

    return () => {
      isMounted = false;
    };
  }, [enums]);

  return { enums, loading, error };
}

/**
 * Hook to fetch specific enum by name
 * Usage:
 *   const { enum: UserRole, loading } = useEnumByName('UserRole');
 *   if (UserRole) {
 *     return UserRole.ADMIN // "admin"
 *   }
 */
export function useEnumByName(enumName: string) {
  const [enumData, setEnumData] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadEnum = async () => {
      try {
        setLoading(true);
        // Try to get from cache first
        const cached = getCachedEnums();
        if (cached && enumName in cached) {
          if (isMounted) {
            setEnumData((cached as any)[enumName]);
            setError(null);
          }
        } else {
          // Fetch from backend if not in cache
          const { enums } = await fetchEnumsFromBackend().then(() => ({
            enums: getCachedEnums(),
          }));
          if (isMounted && enums && enumName in enums) {
            setEnumData((enums as any)[enumName]);
            setError(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEnum();

    return () => {
      isMounted = false;
    };
  }, [enumName]);

  return { enum: enumData, loading, error };
}

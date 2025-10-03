// Type definitions for payee JSON fields and complex types

/**
 * Subscription information for recurring payees
 */
export interface SubscriptionInfo {
  monthlyCost: number;
  renewalDate: string; // ISO date string
  cancellationInfo?: {
    url?: string;
    phone?: string;
    method: 'online' | 'phone' | 'email';
  };
  isActive: boolean;
  billingCycle?: 'monthly' | 'quarterly' | 'yearly';
  trialEndDate?: string; // ISO date string
  notes?: string;
}

/**
 * Structured address information
 */
export interface PayeeAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Preferred payment methods for a payee
 */
export type PaymentMethodReference = number; // Account ID reference

/**
 * Tags for payee categorization and filtering
 */
export type PayeeTags = string[];
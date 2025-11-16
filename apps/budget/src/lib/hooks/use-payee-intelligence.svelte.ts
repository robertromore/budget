/**
 * Hook for payee intelligence and suggestions
 * Provides intelligent suggestions for transaction forms based on payee data
 */

import { trpc } from "$lib/trpc/client";

export function usePayeeIntelligence() {
  /**
   * Get intelligent suggestions for a specific payee
   */
  function getPayeeSuggestionsFor(payeeId: number) {
    return trpc().payeeRoutes.suggestions.query({ id: payeeId });
  }

  /**
   * Generate basic suggestions for a transaction based on payee
   */
  function generateBasicSuggestions(payee: any) {
    if (!payee) return null;

    // Basic suggestion logic based on payee data
    return {
      category: payee.defaultCategoryId
        ? {
            id: payee.defaultCategoryId,
            confidence: 0.8,
          }
        : null,
      amount: payee.avgAmount
        ? {
            value: payee.avgAmount,
            confidence: 0.6,
          }
        : null,
      notes: payee.notes
        ? {
            template: `Transaction with ${payee.name}`,
            confidence: 0.5,
          }
        : null,
    };
  }

  return {
    getPayeeSuggestionsFor,
    generateBasicSuggestions,
  };
}

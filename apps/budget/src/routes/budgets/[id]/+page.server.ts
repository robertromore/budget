import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const budgetId = parseInt(params.id);

  if (isNaN(budgetId)) {
    throw error(400, 'Invalid budget ID');
  }

  // For now, return mock data that matches our test budget
  // In a real app, this would fetch from the database via tRPC
  const budget = {
    id: budgetId,
    name: "Test Envelope Budget",
    description: "Test budget for envelope system validation",
    type: "category-envelope",
    scope: "category",
    status: "active",
    enforcementLevel: "warning"
  };

  // Mock envelope data for demonstration
  const envelopes = [
    {
      id: 1,
      budgetId: budgetId,
      categoryId: 1,
      allocatedAmount: 500.00,
      spentAmount: 320.50,
      availableAmount: 179.50,
      deficitAmount: 0,
      rolloverAmount: 15.00,
      status: "active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      budgetId: budgetId,
      categoryId: 2,
      allocatedAmount: 300.00,
      spentAmount: 280.00,
      availableAmount: 20.00,
      deficitAmount: 0,
      rolloverAmount: 0,
      status: "active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      budgetId: budgetId,
      categoryId: 3,
      allocatedAmount: 200.00,
      spentAmount: 235.75,
      availableAmount: 0,
      deficitAmount: 35.75,
      rolloverAmount: 0,
      status: "overspent" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 4,
      budgetId: budgetId,
      categoryId: 4,
      allocatedAmount: 150.00,
      spentAmount: 150.00,
      availableAmount: 0,
      deficitAmount: 0,
      rolloverAmount: 0,
      status: "depleted" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  // Mock categories data
  const categories = [
    { id: 1, name: "Groceries", type: "expense", icon: "🛒" },
    { id: 2, name: "Transportation", type: "expense", icon: "🚗" },
    { id: 3, name: "Dining Out", type: "expense", icon: "🍽️" },
    { id: 4, name: "Utilities", type: "expense", icon: "⚡" },
    { id: 5, name: "Entertainment", type: "expense", icon: "🎬" },
  ];

  return {
    budget,
    envelopes,
    categories
  };
};
import { describe, test, expect } from 'bun:test';
import type { Account } from '$lib/schema';
import type { AccountSortField, SortDirection } from '$lib/states/entities/accounts.svelte';

// Test the sorting logic separately from the Svelte state management
function sortAccounts(accounts: Account[], field: AccountSortField, direction: SortDirection): Account[] {
  return [...accounts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (field) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'balance':
        aValue = a.balance || 0;
        bValue = b.balance || 0;
        break;
      case 'dateOpened':
        aValue = a.dateOpened ? new Date(a.dateOpened).getTime() : 0;
        bValue = b.dateOpened ? new Date(b.dateOpened).getTime() : 0;
        break;
      case 'status':
        aValue = a.closed ? 1 : 0; // Active accounts first when asc
        bValue = b.closed ? 1 : 0;
        break;
      case 'createdAt':
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      default:
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Mock accounts data for testing
const mockAccounts: Account[] = [
  {
    id: 1,
    name: 'Checking Account',
    balance: 1500,
    dateOpened: '2023-01-15',
    closed: false,
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2023-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Savings Account',
    balance: 5000,
    dateOpened: '2022-06-20',
    closed: false,
    createdAt: '2022-06-20T14:30:00Z',
    updatedAt: '2022-06-20T14:30:00Z',
  },
  {
    id: 3,
    name: 'Credit Card',
    balance: -800,
    dateOpened: '2023-03-10',
    closed: false,
    createdAt: '2023-03-10T09:15:00Z',
    updatedAt: '2023-03-10T09:15:00Z',
  },
  {
    id: 4,
    name: 'Old Account',
    balance: 0,
    dateOpened: '2021-12-01',
    closed: true,
    createdAt: '2021-12-01T16:45:00Z',
    updatedAt: '2023-01-01T12:00:00Z',
  },
  {
    id: 5,
    name: 'Investment Account',
    balance: 10000,
    dateOpened: '2023-05-01',
    closed: false,
    createdAt: '2023-05-01T11:20:00Z',
    updatedAt: '2023-05-01T11:20:00Z',
  },
];

describe('Account Sorting Logic', () => {
  describe('Name Sorting', () => {
    test('should sort by name ascending', () => {
      const sorted = sortAccounts(mockAccounts, 'name', 'asc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual([
        'Checking Account',
        'Credit Card',
        'Investment Account', 
        'Old Account',
        'Savings Account'
      ]);
    });

    test('should sort by name descending', () => {
      const sorted = sortAccounts(mockAccounts, 'name', 'desc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual([
        'Savings Account',
        'Old Account',
        'Investment Account',
        'Credit Card',
        'Checking Account'
      ]);
    });
  });

  describe('Balance Sorting', () => {
    test('should sort by balance ascending', () => {
      const sorted = sortAccounts(mockAccounts, 'balance', 'asc');
      const balances = sorted.map(account => account.balance);
      expect(balances).toEqual([-800, 0, 1500, 5000, 10000]);
    });

    test('should sort by balance descending', () => {
      const sorted = sortAccounts(mockAccounts, 'balance', 'desc');
      const balances = sorted.map(account => account.balance);
      expect(balances).toEqual([10000, 5000, 1500, 0, -800]);
    });
  });

  describe('Date Opened Sorting', () => {
    test('should sort by date opened ascending (oldest first)', () => {
      const sorted = sortAccounts(mockAccounts, 'dateOpened', 'asc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual([
        'Old Account',         // 2021-12-01
        'Savings Account',     // 2022-06-20
        'Checking Account',    // 2023-01-15
        'Credit Card',         // 2023-03-10
        'Investment Account'   // 2023-05-01
      ]);
    });

    test('should sort by date opened descending (newest first)', () => {
      const sorted = sortAccounts(mockAccounts, 'dateOpened', 'desc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual([
        'Investment Account',  // 2023-05-01
        'Credit Card',         // 2023-03-10
        'Checking Account',    // 2023-01-15
        'Savings Account',     // 2022-06-20
        'Old Account'          // 2021-12-01
      ]);
    });
  });

  describe('Status Sorting', () => {
    test('should sort by status ascending (active first)', () => {
      const sorted = sortAccounts(mockAccounts, 'status', 'asc');
      const activeAccounts = sorted.filter(account => !account.closed);
      const closedAccounts = sorted.filter(account => account.closed);
      
      // Active accounts should come first
      expect(activeAccounts.length).toBe(4);
      expect(closedAccounts.length).toBe(1);
      expect(sorted.indexOf(activeAccounts[0])).toBeLessThan(sorted.indexOf(closedAccounts[0]));
    });

    test('should sort by status descending (closed first)', () => {
      const sorted = sortAccounts(mockAccounts, 'status', 'desc');
      const closedAccounts = sorted.filter(account => account.closed);
      const activeAccounts = sorted.filter(account => !account.closed);
      
      // Closed accounts should come first
      expect(closedAccounts.length).toBe(1);
      expect(activeAccounts.length).toBe(4);
      expect(sorted.indexOf(closedAccounts[0])).toBeLessThan(sorted.indexOf(activeAccounts[0]));
    });
  });

  describe('Created At Sorting', () => {
    test('should sort by created date ascending (oldest first)', () => {
      const sorted = sortAccounts(mockAccounts, 'createdAt', 'asc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual([
        'Old Account',         // 2021-12-01
        'Savings Account',     // 2022-06-20
        'Checking Account',    // 2023-01-15
        'Credit Card',         // 2023-03-10
        'Investment Account'   // 2023-05-01
      ]);
    });

    test('should sort by created date descending (newest first)', () => {
      const sorted = sortAccounts(mockAccounts, 'createdAt', 'desc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual([
        'Investment Account',  // 2023-05-01
        'Credit Card',         // 2023-03-10
        'Checking Account',    // 2023-01-15
        'Savings Account',     // 2022-06-20
        'Old Account'          // 2021-12-01
      ]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle accounts with null/undefined values', () => {
      const accountsWithNulls: Account[] = [
        {
          id: 1,
          name: '',
          balance: 0,
          dateOpened: null as any,
          closed: false,
          createdAt: null as any,
          updatedAt: null as any,
        },
        ...mockAccounts
      ];

      // Should not throw errors
      expect(() => sortAccounts(accountsWithNulls, 'name', 'asc')).not.toThrow();
      expect(() => sortAccounts(accountsWithNulls, 'dateOpened', 'asc')).not.toThrow();
      expect(() => sortAccounts(accountsWithNulls, 'createdAt', 'asc')).not.toThrow();
      
      const sorted = sortAccounts(accountsWithNulls, 'name', 'asc');
      expect(sorted.length).toBe(6);
    });

    test('should handle empty accounts array', () => {
      const sorted = sortAccounts([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });

    test('should preserve original array', () => {
      const original = [...mockAccounts];
      sortAccounts(mockAccounts, 'name', 'desc');
      
      // Original array should be unchanged
      expect(mockAccounts).toEqual(original);
    });

    test('should handle single account', () => {
      const singleAccount = [mockAccounts[0]];
      const sorted = sortAccounts(singleAccount, 'name', 'asc');
      expect(sorted).toEqual(singleAccount);
    });
  });

  describe('Case Sensitivity', () => {
    test('should handle different case names correctly', () => {
      const mixedCaseAccounts: Account[] = [
        { ...mockAccounts[0], name: 'apple Account' },
        { ...mockAccounts[1], name: 'Banana Account' },
        { ...mockAccounts[2], name: 'cherry Account' },
      ];

      const sorted = sortAccounts(mixedCaseAccounts, 'name', 'asc');
      const names = sorted.map(account => account.name);
      expect(names).toEqual(['apple Account', 'Banana Account', 'cherry Account']);
    });
  });
});
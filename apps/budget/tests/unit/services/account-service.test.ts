import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountService } from '$lib/server/domains/accounts/services';
import type { AccountRepository } from '$lib/server/domains/accounts/repository';
import type { TransactionService } from '$lib/server/domains/transactions/services';
import type { Account } from '$lib/schema/accounts';
import { ValidationError, NotFoundError, ConflictError } from '$lib/server/shared/types/errors';

describe('AccountService', () => {
  let mockAccountRepository: Partial<AccountRepository>;
  let mockTransactionService: Partial<TransactionService>;
  let accountService: AccountService;

  const mockAccount: Account = {
    id: 1,
    name: 'Checking Account',
    slug: 'checking-account',
    balance: 1000.00,
    onBudget: true,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockAccountRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdOrThrow: vi.fn(),
      findBySlug: vi.fn(),
      findBySlugOrThrow: vi.fn(),
      findActive: vi.fn(),
      findAll: vi.fn(),
      findAllWithTransactions: vi.fn(),
      findWithTransactions: vi.fn(),
      searchByName: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      softDelete: vi.fn(),
      isSlugUnique: vi.fn(),
    };

    mockTransactionService = {
      createTransaction: vi.fn(),
      getAccountTransactions: vi.fn(),
    };

    accountService = new AccountService(
      mockAccountRepository as AccountRepository,
      mockTransactionService as TransactionService
    );
  });

  describe('createAccount', () => {
    it('should create an account with default settings', async () => {
      const createData = {
        name: 'Savings Account',
      };

      const createdAccount = {
        ...mockAccount,
        name: 'Savings Account',
        slug: 'savings-account',
        balance: 0,
      };

      vi.mocked(mockAccountRepository.isSlugUnique!).mockResolvedValue(true);
      vi.mocked(mockAccountRepository.create!).mockResolvedValue(createdAccount);

      const result = await accountService.createAccount(createData);

      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Savings Account',
          onBudget: true,
        })
      );
      expect(result).toEqual(createdAccount);
    });

    it('should create an account with initial balance', async () => {
      const createData = {
        name: 'Checking Account',
        initialBalance: 1000.00,
      };

      vi.mocked(mockAccountRepository.isSlugUnique!).mockResolvedValue(true);
      vi.mocked(mockAccountRepository.create!).mockResolvedValue(mockAccount);
      vi.mocked(mockTransactionService.createTransaction!).mockResolvedValue({} as any);

      const result = await accountService.createAccount(createData);

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          amount: 1000.00,
          notes: 'Initial balance',
          status: 'cleared',
        })
      );
      expect(result).toEqual(mockAccount);
    });

    it('should set onBudget to false for investment accounts by default', async () => {
      const createData = {
        name: 'Investment Account',
        accountType: 'investment' as const,
      };

      vi.mocked(mockAccountRepository.isSlugUnique!).mockResolvedValue(true);
      vi.mocked(mockAccountRepository.create!).mockResolvedValue({
        ...mockAccount,
        onBudget: false,
      });

      await accountService.createAccount(createData);

      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          onBudget: false,
        })
      );
    });

    it('should respect explicit onBudget setting', async () => {
      const createData = {
        name: 'Investment Account',
        accountType: 'investment' as const,
        onBudget: true,
      };

      vi.mocked(mockAccountRepository.isSlugUnique!).mockResolvedValue(true);
      vi.mocked(mockAccountRepository.create!).mockResolvedValue(mockAccount);

      await accountService.createAccount(createData);

      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          onBudget: true,
        })
      );
    });

    it('should generate unique slug when duplicate exists', async () => {
      const createData = {
        name: 'Checking Account',
      };

      // First slug check returns false (not unique), second returns true
      vi.mocked(mockAccountRepository.isSlugUnique!)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      vi.mocked(mockAccountRepository.create!).mockResolvedValue({
        ...mockAccount,
        slug: 'checking-account-1',
      });

      const result = await accountService.createAccount(createData);

      expect(mockAccountRepository.isSlugUnique).toHaveBeenCalledTimes(2);
      expect(result.slug).toBe('checking-account-1');
    });

    it('should throw ValidationError for empty name', async () => {
      const createData = {
        name: '',
      };

      await expect(accountService.createAccount(createData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getAccountById', () => {
    it('should return account when found', async () => {
      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockResolvedValue(mockAccount);

      const result = await accountService.getAccountById(1);

      expect(mockAccountRepository.findByIdOrThrow).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockRejectedValue(new NotFoundError('Account', 999));

      await expect(accountService.getAccountById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAccountBySlug', () => {
    it('should return account when found by slug', async () => {
      vi.mocked(mockAccountRepository.findBySlugOrThrow!).mockResolvedValue(mockAccount);

      const result = await accountService.getAccountBySlug('checking-account');

      expect(mockAccountRepository.findBySlugOrThrow).toHaveBeenCalledWith('checking-account');
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundError when account slug does not exist', async () => {
      vi.mocked(mockAccountRepository.findBySlugOrThrow!).mockRejectedValue(new NotFoundError('Account', 'non-existent'));

      await expect(accountService.getAccountBySlug('non-existent'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updateAccount', () => {
    it('should update account successfully', async () => {
      const updateData = {
        name: 'Primary Checking',
        notes: 'New notes',
      };

      const updatedAccount = {
        ...mockAccount,
        name: 'Primary Checking',
        notes: 'New notes',
      };

      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockResolvedValue(mockAccount);
      vi.mocked(mockAccountRepository.update!).mockResolvedValue(updatedAccount);

      const result = await accountService.updateAccount(1, updateData);

      expect(mockAccountRepository.findByIdOrThrow).toHaveBeenCalledWith(1);
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Primary Checking',
          notes: 'New notes',
        })
      );
      expect(result).toEqual(updatedAccount);
    });

    it('should throw NotFoundError when updating non-existent account', async () => {
      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockRejectedValue(new NotFoundError('Account', 999));

      await expect(accountService.updateAccount(999, { name: 'Primary Savings' }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account with no transactions', async () => {
      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockResolvedValue(mockAccount);
      vi.mocked(mockAccountRepository.findWithTransactions!).mockResolvedValue({ ...mockAccount, transactions: [] } as any);
      vi.mocked(mockAccountRepository.softDelete!).mockResolvedValue(undefined);

      await accountService.deleteAccount(1);

      expect(mockAccountRepository.findByIdOrThrow).toHaveBeenCalledWith(1);
      expect(mockAccountRepository.findWithTransactions).toHaveBeenCalledWith(1);
      expect(mockAccountRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw ConflictError when deleting account with transactions', async () => {
      const mockTransactions = [
        { id: 1, accountId: 1, amount: 100 },
      ];

      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockResolvedValue(mockAccount);
      vi.mocked(mockAccountRepository.findWithTransactions!).mockResolvedValue({
        ...mockAccount,
        transactions: mockTransactions
      } as any);

      await expect(accountService.deleteAccount(1))
        .rejects
        .toThrow(ConflictError);

      expect(mockAccountRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when deleting non-existent account', async () => {
      vi.mocked(mockAccountRepository.findByIdOrThrow!).mockRejectedValue(new NotFoundError('Account', 999));

      await expect(accountService.deleteAccount(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAllAccountsWithTransactions', () => {
    it('should return all accounts with transactions', async () => {
      const mockAccounts = [
        mockAccount,
        { ...mockAccount, id: 2, name: 'Savings' },
        { ...mockAccount, id: 3, name: 'Credit Card' },
      ];

      vi.mocked(mockAccountRepository.findAllWithTransactions!).mockResolvedValue(mockAccounts);

      const result = await accountService.getAllAccountsWithTransactions();

      expect(mockAccountRepository.findAllWithTransactions).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when no accounts exist', async () => {
      vi.mocked(mockAccountRepository.findAllWithTransactions!).mockResolvedValue([]);

      const result = await accountService.getAllAccountsWithTransactions();

      expect(result).toEqual([]);
    });
  });
});

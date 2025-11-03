import type { Account } from '$lib/schema/accounts';

/**
 * Database result type for account transaction queries with joined payee and category
 */
export interface AccountTransactionDbResult {
	id: number;
	accountId: number;
	parentId: number | null;
	status: string;
	payeeId: number | null;
	amount: string;
	categoryId: number | null;
	notes: string | null;
	date: string;
	scheduleId: number | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	payee: {
		id: number;
		name: string;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
		deletedAt: string | null;
	} | null;
	category: {
		id: number;
		name: string;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
		deletedAt: string | null;
	} | null;
}

/**
 * Transaction with calculated running balance
 */
export interface TransactionWithBalance extends AccountTransactionDbResult {
	balance: number;
}

/**
 * Account with associated transactions
 */
export interface AccountWithTransactions extends Omit<Account, 'transactions'> {
	transactions: TransactionWithBalance[];
}

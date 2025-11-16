import type {AccountType} from "$lib/schema/accounts";

export interface DefaultAccount {
  slug: string;
  name: string;
  accountType: AccountType;
  accountIcon: string;
  accountColor: string;
  description: string;
  onBudget: boolean;
  sortOrder: number;
}

export const defaultAccounts: DefaultAccount[] = [
  {
    slug: "checking",
    name: "Checking Account",
    accountType: "checking",
    accountIcon: "wallet",
    accountColor: "#3b82f6",
    description: "Primary checking account for everyday expenses",
    onBudget: true,
    sortOrder: 1,
  },
  {
    slug: "savings",
    name: "Savings Account",
    accountType: "savings",
    accountIcon: "piggy-bank",
    accountColor: "#10b981",
    description: "General savings account",
    onBudget: true,
    sortOrder: 2,
  },
  {
    slug: "emergency-fund",
    name: "Emergency Fund",
    accountType: "savings",
    accountIcon: "cross",
    accountColor: "#f97316",
    description: "Emergency savings fund for unexpected expenses",
    onBudget: true,
    sortOrder: 3,
  },
  {
    slug: "primary-credit-card",
    name: "Primary Credit Card",
    accountType: "credit_card",
    accountIcon: "credit-card",
    accountColor: "#8b5cf6",
    description: "Main credit card for purchases",
    onBudget: true,
    sortOrder: 4,
  },
  {
    slug: "rewards-credit-card",
    name: "Rewards Credit Card",
    accountType: "credit_card",
    accountIcon: "gift",
    accountColor: "#eab308",
    description: "Credit card for rewards and cashback",
    onBudget: true,
    sortOrder: 5,
  },
  {
    slug: "investment-portfolio",
    name: "Investment Portfolio",
    accountType: "investment",
    accountIcon: "trending-up",
    accountColor: "#14b8a6",
    description: "Brokerage or investment account",
    onBudget: false,
    sortOrder: 6,
  },
  {
    slug: "retirement-account",
    name: "Retirement Account",
    accountType: "investment",
    accountIcon: "landmark",
    accountColor: "#6366f1",
    description: "401(k), IRA, or other retirement savings",
    onBudget: false,
    sortOrder: 7,
  },
  {
    slug: "hsa-account",
    name: "HSA Account",
    accountType: "hsa",
    accountIcon: "heart-pulse",
    accountColor: "#ef4444",
    description: "Health Savings Account for medical expenses",
    onBudget: true,
    sortOrder: 8,
  },
  {
    slug: "cash-wallet",
    name: "Cash Wallet",
    accountType: "cash",
    accountIcon: "wallet",
    accountColor: "#64748b",
    description: "Physical cash on hand",
    onBudget: true,
    sortOrder: 9,
  },
  {
    slug: "personal-loan",
    name: "Personal Loan",
    accountType: "loan",
    accountIcon: "banknote",
    accountColor: "#92400e",
    description: "Personal loan or line of credit",
    onBudget: true,
    sortOrder: 10,
  },
];

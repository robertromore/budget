import {
  Activity,
  Calendar,
  ChartBar,
  ChartPie,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "$lib/components/icons";

// Temporarily isolated for monthly spending trends chart testing
export const analyticsTypes = [
  {
    id: "monthly-spending",
    title: "Monthly Spending Trends",
    description: "Track spending patterns over time",
    icon: TrendingUp,
    category: "Time-Based",
  },
  {
    id: "income-vs-expenses",
    title: "Income vs Expenses",
    description: "Compare monthly income and expenses",
    icon: ChartBar,
    category: "Time-Based",
  },
  {
    id: "cash-flow",
    title: "Cash Flow Timeline",
    description: "Account balance changes over time",
    icon: Activity,
    category: "Time-Based",
  },
];

// Full analytics types (temporarily disabled for focused testing)
const FULL_ANALYTICS_TYPES = [
  {
    id: "monthly-spending",
    title: "Monthly Spending Trends",
    description: "Track spending patterns over time",
    icon: TrendingUp,
    category: "Time-Based",
  },
  {
    id: "income-vs-expenses",
    title: "Income vs Expenses",
    description: "Compare monthly income and expenses",
    icon: ChartBar,
    category: "Time-Based",
  },
  {
    id: "cash-flow",
    title: "Cash Flow Timeline",
    description: "Account balance changes over time",
    icon: Activity,
    category: "Time-Based",
  },
  {
    id: "category-spending",
    title: "Spending by Category",
    description: "Distribution of expenses by category",
    icon: ChartPie,
    category: "Category Analysis",
  },
  {
    id: "top-categories",
    title: "Top Spending Categories",
    description: "Highest expense categories",
    icon: TrendingDown,
    category: "Category Analysis",
  },
  {
    id: "category-trends",
    title: "Category Trends Over Time",
    description: "How category spending evolves",
    icon: Calendar,
    category: "Category Analysis",
  },
  {
    id: "avg-transaction-size",
    title: "Average Transaction Size",
    description: "By category, payee, and time period",
    icon: DollarSign,
    category: "Transaction Analysis",
  },
  {
    id: "transaction-frequency",
    title: "Transaction Frequency",
    description: "Transaction patterns over time",
    icon: Activity,
    category: "Transaction Analysis",
  },
  {
    id: "top-payees",
    title: "Top Payees/Vendors",
    description: "Most frequent and highest paid vendors",
    icon: Users,
    category: "Payee Analysis",
  },
  {
    id: "spending-rate",
    title: "Daily Spending Rate",
    description: "Average daily spending patterns",
    icon: TrendingUp,
    category: "Financial Health",
  },
  {
    id: "balance-volatility",
    title: "Balance Volatility",
    description: "How much the account balance fluctuates",
    icon: Activity,
    category: "Financial Health",
  },
];

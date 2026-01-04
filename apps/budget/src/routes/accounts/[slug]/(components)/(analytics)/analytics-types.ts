import Activity from "@lucide/svelte/icons/activity";
import Calendar from "@lucide/svelte/icons/calendar";
import ChartBar from "@lucide/svelte/icons/chart-bar";
import ChartPie from "@lucide/svelte/icons/chart-pie";
import CircleDot from "@lucide/svelte/icons/circle-dot";
import CreditCard from "@lucide/svelte/icons/credit-card";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import Hexagon from "@lucide/svelte/icons/hexagon";
import Percent from "@lucide/svelte/icons/percent";
import Target from "@lucide/svelte/icons/target";
import TrendingDown from "@lucide/svelte/icons/trending-down";
import TrendingUp from "@lucide/svelte/icons/trending-up";
import Users from "@lucide/svelte/icons/users";
import Gauge from "@lucide/svelte/icons/gauge";
import CalendarDays from "@lucide/svelte/icons/calendar-days";
import BarChart3 from "@lucide/svelte/icons/bar-chart-3";
import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
import Repeat from "@lucide/svelte/icons/repeat";
import PiggyBank from "@lucide/svelte/icons/piggy-bank";
import ArrowLeftRight from "@lucide/svelte/icons/arrow-left-right";
import GitCompare from "@lucide/svelte/icons/git-compare";
import Clock from "@lucide/svelte/icons/clock";
import UserPlus from "@lucide/svelte/icons/user-plus";

export const analyticsTypes = [
  // Credit Card Analytics
  {
    id: "credit-utilization",
    title: "Utilization Trend",
    description: "Credit utilization % over time with thresholds",
    icon: Percent,
    category: "Credit Card",
    accountTypes: ["credit_card"],
  },
  {
    id: "credit-balance",
    title: "Balance History",
    description: "Balance over time with credit limit reference",
    icon: CreditCard,
    category: "Credit Card",
    accountTypes: ["credit_card"],
  },
  {
    id: "credit-payments",
    title: "Payment Analysis",
    description: "Payments vs minimum and interest charges",
    icon: DollarSign,
    category: "Credit Card",
    accountTypes: ["credit_card"],
  },
  {
    id: "credit-payoff",
    title: "Payoff Projections",
    description: "What-if scenarios at different payment levels",
    icon: Target,
    category: "Credit Card",
    accountTypes: ["credit_card"],
  },

  // Time-Based Analysis
  {
    id: "monthly-spending",
    title: "Monthly Spending",
    description: "Track spending over time",
    icon: TrendingUp,
    category: "Time-Based",
  },
  {
    id: "income-vs-expenses",
    title: "Income vs Expenses",
    description: "Compare income and expenses",
    icon: ChartBar,
    category: "Time-Based",
  },
  {
    id: "daily-calendar",
    title: "Daily Calendar",
    description: "Spending heatmap by day",
    icon: Calendar,
    category: "Time-Based",
  },
  {
    id: "spending-velocity",
    title: "Spending Velocity",
    description: "Rolling average spend rate",
    icon: Gauge,
    category: "Time-Based",
  },
  {
    id: "year-over-year",
    title: "Year over Year",
    description: "Compare months across years",
    icon: CalendarDays,
    category: "Time-Based",
  },
  {
    id: "weekday-patterns",
    title: "Weekday Patterns",
    description: "Spending by day of week",
    icon: BarChart3,
    category: "Time-Based",
  },

  // Category Analysis
  {
    id: "category-composition",
    title: "Category Breakdown",
    description: "Stacked monthly composition",
    icon: ChartPie,
    category: "Category Analysis",
  },
  {
    id: "top-categories",
    title: "Top Categories",
    description: "Highest expense categories",
    icon: TrendingDown,
    category: "Category Analysis",
  },
  {
    id: "category-radar",
    title: "Category Radar",
    description: "Multi-category comparison",
    icon: Hexagon,
    category: "Category Analysis",
  },
  {
    id: "category-trends",
    title: "Category Trends",
    description: "Month-over-month changes",
    icon: GitCompare,
    category: "Category Analysis",
  },

  // Behavioral Insights
  {
    id: "spending-distribution",
    title: "Spending Distribution",
    description: "Transaction amount histogram",
    icon: Activity,
    category: "Behavioral Insights",
  },
  {
    id: "outlier-detection",
    title: "Outlier Detection",
    description: "Find unusually large transactions",
    icon: AlertTriangle,
    category: "Behavioral Insights",
  },
  {
    id: "recurring-spending",
    title: "Recurring vs One-time",
    description: "Predictable vs discretionary",
    icon: Repeat,
    category: "Behavioral Insights",
  },

  // Financial Health
  {
    id: "savings-rate",
    title: "Savings Rate",
    description: "Income saved percentage",
    icon: PiggyBank,
    category: "Financial Health",
  },
  {
    id: "cash-flow",
    title: "Cash Flow",
    description: "Money in and out over time",
    icon: ArrowLeftRight,
    category: "Financial Health",
  },

  // Payee Analysis
  {
    id: "top-payees",
    title: "Top Payees",
    description: "Ranked by spending amount",
    icon: Users,
    category: "Payee Analysis",
  },
  {
    id: "payee-frequency",
    title: "Payee Frequency",
    description: "How often you visit payees",
    icon: Clock,
    category: "Payee Analysis",
  },
  {
    id: "payee-trends",
    title: "Payee Trends",
    description: "Spending at top payees over time",
    icon: TrendingUp,
    category: "Payee Analysis",
  },
  {
    id: "new-payees",
    title: "New Payees",
    description: "First-time merchants by month",
    icon: UserPlus,
    category: "Payee Analysis",
  },

  // Transaction Analysis
  {
    id: "transaction-explorer",
    title: "Transaction Explorer",
    description: "Scatter plot of transactions",
    icon: CircleDot,
    category: "Transaction Analysis",
  },
];

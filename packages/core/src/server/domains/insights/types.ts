export type PeriodKind = "week" | "month";

export interface DailyBreakdownPoint {
  date: string;
  label: string;
  current: number;
  avg: number;
}

export interface CategoryMover {
  categoryName: string;
  current: number;
  avg: number;
  delta: number;
  pctVsAvg: number;
}

export interface ProjectionPoint {
  date: string;
  value: number;
}

export interface RecentPaycheck {
  payeeName: string;
  amount: number;
  date: string;
}

export type AttentionItem =
  | {
      kind: "category-trend";
      categoryName: string;
      pctVsAvg: number;
      deltaAmount: number;
    }
  | {
      kind: "price-change";
      payeeName: string;
      previousAmount: number;
      newAmount: number;
      changePct: number;
      changeDate: string;
    }
  | {
      kind: "inactive-subscription";
      payeeName: string;
      amount: number;
      lastSeenDate: string;
      daysSinceLastSeen: number;
    };

export interface PeriodBrief {
  period: PeriodKind;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;

  totalSpent: number;
  totalReceived: number;
  netCashflow: number;
  transactionCount: number;

  avgPeriodSpent: number;
  pctVsAvg: number;

  driverCategories: CategoryMover[];
  dailyBreakdown: DailyBreakdownPoint[];
  topMovers: CategoryMover[];

  currentBalance: number;
  recentPaycheck: RecentPaycheck | null;

  projectedEndOfMonthBalance: number;
  floor: number;
  aboveFloor: number;

  attentionItems: AttentionItem[];

  projectionSparkline: ProjectionPoint[];
}

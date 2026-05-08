import { accounts } from "$core/schema/accounts";
import { categories } from "$core/schema/categories";
import { transactions } from "$core/schema/transactions";
import { db } from "$core/server/db";
import { RecurringDetectionService } from "$core/server/domains/shared/recurring-detection";
import type { RecurringPattern } from "$core/server/domains/shared/recurring-detection/types";
import { and, eq, isNull, sql } from "drizzle-orm";
import type {
  AttentionItem,
  CategoryMover,
  DailyBreakdownPoint,
  PeriodBrief,
  PeriodKind,
  ProjectionPoint,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseIsoLocal(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

function startOfWeekMon(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function periodBoundsFor(now: Date, period: PeriodKind, offset = 0): { start: Date; end: Date } {
  if (period === "week") {
    const start = startOfWeekMon(now);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { start: startOfMonth(ref), end: endOfMonth(ref) };
}

function formatPeriodLabel(start: Date, end: Date, period: PeriodKind): string {
  if (period === "week") {
    if (start.getMonth() === end.getMonth()) {
      return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
    }
    return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}`;
  }
  return `${SHORT_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
}

export interface PeriodBriefOptions {
  period: PeriodKind;
  /** ISO date for "now"; defaults to today. Useful for testing. */
  asOf?: string;
}

export class PeriodBriefService {
  private recurringService = new RecurringDetectionService();

  async getPeriodBrief(workspaceId: number, options: PeriodBriefOptions): Promise<PeriodBrief> {
    const { period } = options;
    const now = options.asOf ? parseIsoLocal(options.asOf) : new Date();

    const lookbackPeriods = period === "week" ? 4 : 3;
    const current = periodBoundsFor(now, period, 0);

    const periodStart = toIso(current.start);
    const periodEnd = toIso(current.end);

    // Lookback range = N prior periods (excluding current)
    const lookback = periodBoundsFor(now, period, -lookbackPeriods);
    const lookbackStart = toIso(lookback.start);

    // Day BEFORE current period starts — all "prior" data ends here.
    const priorEnd = new Date(current.start.getTime() - DAY_MS);
    const priorEndIso = toIso(priorEnd);

    const [
      currentTotals,
      priorTotals,
      currentCategoryAgg,
      priorCategoryAgg,
      dailyBreakdown,
      currentBalance,
      paycheck,
      floor,
      patterns,
    ] = await Promise.all([
      this.getPeriodTotals(workspaceId, periodStart, periodEnd),
      this.getPeriodTotals(workspaceId, lookbackStart, priorEndIso),
      this.getCategorySpend(workspaceId, periodStart, periodEnd),
      this.getCategorySpend(workspaceId, lookbackStart, priorEndIso),
      this.getDailyBreakdown(workspaceId, period, current.start, lookbackPeriods),
      this.getCurrentBalance(workspaceId),
      this.getRecentPaycheck(workspaceId, periodStart, periodEnd),
      this.getFloor(workspaceId),
      this.recurringService.detectPatterns(workspaceId, {
        months: 6,
        minTransactions: 3,
        minConfidence: 60,
        minPredictability: 70,
        patternTypes: ["subscription", "bill"],
      }),
    ]);

    const avgPeriodSpent = priorTotals.totalSpent / lookbackPeriods;
    const pctVsAvg =
      avgPeriodSpent > 0 ? ((currentTotals.totalSpent - avgPeriodSpent) / avgPeriodSpent) * 100 : 0;

    const movers = this.buildCategoryMovers(currentCategoryAgg, priorCategoryAgg, lookbackPeriods);
    const driverCategories = movers
      .filter((m) => m.delta > 0)
      .slice(0, 2)
      .filter((m) => m.current > avgPeriodSpent * 0.05);

    const monthBounds = periodBoundsFor(now, "month", 0);
    const monthlyNet = currentTotals.totalReceived - currentTotals.totalSpent;
    const remainingDaysInMonth = Math.max(
      0,
      Math.ceil((monthBounds.end.getTime() - now.getTime()) / DAY_MS)
    );
    const projectedBurnRate =
      avgPeriodSpent > 0 && period === "week"
        ? avgPeriodSpent / 7
        : avgPeriodSpent > 0
          ? avgPeriodSpent / 30
          : 0;
    const projectedEndOfMonthBalance =
      currentBalance + monthlyNet - projectedBurnRate * remainingDaysInMonth;

    const projectionSparkline = this.buildSparkline(
      now,
      currentBalance,
      monthlyNet > 0 ? monthlyNet / 30 : -projectedBurnRate
    );

    const attentionItems = this.composeAttentionItems(movers, patterns, now);

    return {
      period,
      periodLabel: formatPeriodLabel(current.start, current.end, period),
      periodStart,
      periodEnd,

      totalSpent: currentTotals.totalSpent,
      totalReceived: currentTotals.totalReceived,
      netCashflow: currentTotals.totalReceived - currentTotals.totalSpent,
      transactionCount: currentTotals.transactionCount,

      avgPeriodSpent,
      pctVsAvg,

      driverCategories,
      dailyBreakdown,
      topMovers: movers.slice(0, 5),

      currentBalance,
      recentPaycheck: paycheck,

      projectedEndOfMonthBalance,
      floor,
      aboveFloor: projectedEndOfMonthBalance - floor,

      attentionItems,
      projectionSparkline,
    };
  }

  private async getPeriodTotals(
    workspaceId: number,
    fromIso: string,
    toIso: string
  ): Promise<{ totalSpent: number; totalReceived: number; transactionCount: number }> {
    const result = await db
      .select({
        totalSpent: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`,
        totalReceived: sql<number>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          isNull(accounts.deletedAt),
          sql`${transactions.date} >= ${fromIso}`,
          sql`${transactions.date} <= ${toIso}`
        )
      );

    const row = result[0];
    return {
      totalSpent: Number(row?.totalSpent) || 0,
      totalReceived: Number(row?.totalReceived) || 0,
      transactionCount: Number(row?.transactionCount) || 0,
    };
  }

  private async getCategorySpend(
    workspaceId: number,
    fromIso: string,
    toIso: string
  ): Promise<Map<string, number>> {
    const rows = await db
      .select({
        categoryName: categories.name,
        total: sql<number>`SUM(ABS(${transactions.amount}))`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          isNull(accounts.deletedAt),
          sql`${transactions.amount} < 0`,
          sql`${transactions.date} >= ${fromIso}`,
          sql`${transactions.date} <= ${toIso}`
        )
      )
      .groupBy(transactions.categoryId, categories.name);

    const out = new Map<string, number>();
    for (const r of rows) {
      const name = r.categoryName ?? "Uncategorized";
      out.set(name, (out.get(name) ?? 0) + Number(r.total ?? 0));
    }
    return out;
  }

  private buildCategoryMovers(
    current: Map<string, number>,
    prior: Map<string, number>,
    lookbackPeriods: number
  ): CategoryMover[] {
    const names = new Set<string>([...current.keys(), ...prior.keys()]);
    const movers: CategoryMover[] = [];

    for (const name of names) {
      const c = current.get(name) ?? 0;
      const p = (prior.get(name) ?? 0) / lookbackPeriods;
      if (c < 5 && p < 5) continue;
      const delta = c - p;
      const pctVsAvg = p > 0 ? (delta / p) * 100 : c > 0 ? 100 : 0;
      movers.push({ categoryName: name, current: c, avg: p, delta, pctVsAvg });
    }

    movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return movers;
  }

  private async getDailyBreakdown(
    workspaceId: number,
    period: PeriodKind,
    periodStart: Date,
    lookbackPeriods: number
  ): Promise<DailyBreakdownPoint[]> {
    if (period === "week") {
      // 7 daily entries (Mon-Sun), current vs same-weekday avg over prior N weeks
      const out: DailyBreakdownPoint[] = [];
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(periodStart);
        day.setDate(periodStart.getDate() + i);
        const dayIso = toIso(day);

        const current = await this.spendOn(workspaceId, dayIso, dayIso);

        // Average of same-weekday over prior N weeks
        let priorSum = 0;
        for (let w = 1; w <= lookbackPeriods; w += 1) {
          const prior = new Date(day);
          prior.setDate(day.getDate() - 7 * w);
          const priorIso = toIso(prior);
          priorSum += await this.spendOn(workspaceId, priorIso, priorIso);
        }
        const avg = priorSum / lookbackPeriods;

        out.push({
          date: dayIso,
          label: SHORT_DAYS[day.getDay()]!,
          current,
          avg,
        });
      }
      return out;
    }

    // Month — split into weekly buckets across the calendar month
    const monthEnd = endOfMonth(periodStart);
    const buckets: Array<{ start: Date; end: Date }> = [];
    let cursor = new Date(periodStart);
    let weekIdx = 0;
    while (cursor <= monthEnd) {
      const bucketStart = new Date(cursor);
      const bucketEnd = new Date(cursor);
      bucketEnd.setDate(Math.min(cursor.getDate() + 6, monthEnd.getDate()));
      buckets.push({ start: bucketStart, end: bucketEnd });
      cursor = new Date(bucketEnd);
      cursor.setDate(cursor.getDate() + 1);
      weekIdx += 1;
      if (weekIdx >= 5) break;
    }

    const out: DailyBreakdownPoint[] = [];
    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i]!;
      const fromIso = toIso(b.start);
      const toIsoStr = toIso(b.end);
      const current = await this.spendOn(workspaceId, fromIso, toIsoStr);

      // Average across same week-of-month over prior N months
      let priorSum = 0;
      for (let m = 1; m <= lookbackPeriods; m += 1) {
        const priorMonthStart = new Date(periodStart.getFullYear(), periodStart.getMonth() - m, 1);
        const priorBucketStart = new Date(priorMonthStart);
        priorBucketStart.setDate(b.start.getDate());
        const priorBucketEnd = new Date(priorMonthStart);
        priorBucketEnd.setDate(Math.min(b.end.getDate(), endOfMonth(priorMonthStart).getDate()));
        priorSum += await this.spendOn(workspaceId, toIso(priorBucketStart), toIso(priorBucketEnd));
      }
      const avg = priorSum / lookbackPeriods;

      out.push({
        date: fromIso,
        label: `Week ${i + 1}`,
        current,
        avg,
      });
    }
    return out;
  }

  private async spendOn(workspaceId: number, fromIso: string, toIso: string): Promise<number> {
    const rows = await db
      .select({
        total: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          isNull(accounts.deletedAt),
          sql`${transactions.date} >= ${fromIso}`,
          sql`${transactions.date} <= ${toIso}`
        )
      );
    return Number(rows[0]?.total) || 0;
  }

  private async getCurrentBalance(workspaceId: number): Promise<number> {
    const result = await db
      .select({
        sum: sql<number>`COALESCE(SUM(${accounts.initialBalance}), 0) + COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(accounts)
      .leftJoin(
        transactions,
        and(eq(transactions.accountId, accounts.id), isNull(transactions.deletedAt))
      )
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(accounts.deletedAt),
          sql`${accounts.closed} = 0`,
          sql`${accounts.onBudget} = 1`
        )
      );

    return Number(result[0]?.sum) || 0;
  }

  private async getRecentPaycheck(
    workspaceId: number,
    fromIso: string,
    toIso: string
  ): Promise<PeriodBrief["recentPaycheck"]> {
    const rows = await db
      .select({
        amount: transactions.amount,
        date: transactions.date,
        payeeId: transactions.payeeId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(transactions.deletedAt),
          isNull(accounts.deletedAt),
          sql`${transactions.amount} > 0`,
          sql`${transactions.date} >= ${fromIso}`,
          sql`${transactions.date} <= ${toIso}`
        )
      )
      .orderBy(sql`${transactions.amount} DESC`)
      .limit(1);

    const top = rows[0];
    if (!top || !top.payeeId) return null;

    const payeeRow = await db.query.payees.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, top.payeeId!),
    });

    return {
      payeeName: payeeRow?.name ?? "Recent deposit",
      amount: Number(top.amount),
      date: top.date,
    };
  }

  private async getFloor(workspaceId: number): Promise<number> {
    const result = await db
      .select({
        sum: sql<number>`COALESCE(SUM(${accounts.targetBalance}), 0)`,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.workspaceId, workspaceId),
          isNull(accounts.deletedAt),
          sql`${accounts.closed} = 0`,
          sql`${accounts.targetBalance} IS NOT NULL`
        )
      );
    return Number(result[0]?.sum) || 0;
  }

  private buildSparkline(now: Date, currentBalance: number, dailyRate: number): ProjectionPoint[] {
    const out: ProjectionPoint[] = [];
    for (let d = 0; d <= 30; d += 5) {
      const future = new Date(now);
      future.setDate(now.getDate() + d);
      out.push({ date: toIso(future), value: currentBalance + dailyRate * d });
    }
    return out;
  }

  private composeAttentionItems(
    movers: CategoryMover[],
    patterns: RecurringPattern[],
    now: Date
  ): AttentionItem[] {
    const items: AttentionItem[] = [];

    // 1. Biggest category trending up (>30% over avg with material delta)
    const topMover = movers.find((m) => m.delta > 0 && m.pctVsAvg >= 30 && m.delta >= 25);
    if (topMover) {
      items.push({
        kind: "category-trend",
        categoryName: topMover.categoryName,
        pctVsAvg: topMover.pctVsAvg,
        deltaAmount: topMover.delta,
      });
    }

    // 2. Subscription price drift — recurring monthly with amount.max - amount.min material
    const priceChanges = patterns
      .filter((p) => p.frequency === "monthly" && p.amount.predictability < 95)
      .map((p) => {
        const txns = p.transactionIds;
        if (txns.length < 3) return null;
        const high = p.amount.max;
        const low = p.amount.min;
        if (high - low < Math.max(0.5, low * 0.03)) return null;
        const changePct = low > 0 ? ((high - low) / low) * 100 : 0;
        return {
          payeeName: p.payeeName,
          previousAmount: low,
          newAmount: high,
          changePct,
          changeDate: p.lastDate,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.changePct - a.changePct);
    if (priceChanges[0]) {
      items.push({ kind: "price-change", ...priceChanges[0] });
    }

    // 3. Inactive subscription — monthly cadence but no instance in 45+ days
    const nowMs = now.getTime();
    const inactives = patterns
      .filter((p) => p.frequency === "monthly" && p.patternType === "subscription")
      .map((p) => {
        const last = parseIsoLocal(p.lastDate);
        const days = Math.floor((nowMs - last.getTime()) / DAY_MS);
        return { pattern: p, days };
      })
      .filter(({ days }) => days >= 45)
      .sort((a, b) => b.days - a.days);
    if (inactives[0]) {
      const { pattern, days } = inactives[0];
      items.push({
        kind: "inactive-subscription",
        payeeName: pattern.payeeName,
        amount: pattern.amount.median,
        lastSeenDate: pattern.lastDate,
        daysSinceLastSeen: days,
      });
    }

    return items.slice(0, 3);
  }
}

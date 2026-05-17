<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import { Skeleton } from '$lib/components/ui/skeleton';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Activity from '@lucide/svelte/icons/activity';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import Trash2 from '@lucide/svelte/icons/trash-2';

let windowHours = $state<24 | 168 | 720>(24);

const activityQuery = $derived(rpc.aiTelemetry.getRecentToolActivity(windowHours).options());
const feedbackQuery = $derived(rpc.aiTelemetry.getRecentFeedbackStats(windowHours).options());
const llmQuery = $derived(rpc.aiTelemetry.getRecentLLMCallStats(windowHours).options());

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  next_transaction: 'Next transaction prediction',
  budget_suggestion: 'Budget suggestion',
  anomaly: 'Anomaly detection',
  pdf_extraction_row: 'PDF row extraction',
};

const LLM_FEATURE_LABELS: Record<string, string> = {
  chat: 'Chat',
  narrative: 'Daily brief',
  pdf_extraction: 'PDF extraction',
  pdf_describe: 'PDF describe',
  document_explain: 'Document explain',
  test_connection: 'Connection test',
  category_refinement: 'Category refinement',
};

function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

// Telemetry retention: opportunistic cleanup runs on mount (cooldown-
// gated server-side, so it's a no-op when not eligible). The trash
// button forces an immediate cleanup with the same default retention.
const pruneMutation = rpc.aiTelemetry.pruneTelemetry().options();

$effect(() => {
  // Fire-and-forget. Server short-circuits if the cooldown hasn't
  // elapsed, so visiting this page often is cheap.
  pruneMutation.mutate(undefined);
});

function handleManualCleanup() {
  pruneMutation.mutate({ force: true });
}

const windowOptions = [
  { value: 24, label: 'Last 24 hours' },
  { value: 168, label: 'Last 7 days' },
  { value: 720, label: 'Last 30 days' },
];

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
</script>

<svelte:head>
  <title>AI Activity - Intelligence Settings</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center gap-3">
    <Button variant="ghost" size="icon" href="/settings/intelligence">
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-2xl font-bold tracking-tight">AI Activity</h1>
      <p class="text-muted-foreground text-sm">
        Tool calls made by the chat assistant. Latency and error rate per tool.
      </p>
    </div>
  </div>

  <div class="flex items-center gap-3">
    <Activity class="text-muted-foreground h-4 w-4" />
    <Select.Root
      type="single"
      bind:value={
        () => String(windowHours),
        (v: string) => (windowHours = Number(v) as 24 | 168 | 720)
      }>
      <Select.Trigger class="w-48">
        {windowOptions.find((o) => o.value === windowHours)?.label}
      </Select.Trigger>
      <Select.Content>
        {#each windowOptions as opt}
          <Select.Item value={String(opt.value)}>{opt.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <div class="ml-auto flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onclick={handleManualCleanup}
        disabled={pruneMutation.isPending}
        title="Delete tool-call rows older than 90 days and feedback rows older than 365 days">
        <Trash2 class="mr-2 h-4 w-4" />
        Clean up now
      </Button>
    </div>
  </div>

  {#if activityQuery.isLoading}
    <div class="space-y-3">
      <Skeleton class="h-24" />
      <Skeleton class="h-64" />
    </div>
  {:else if activityQuery.data}
    {@const { totals, byTool, recentFailures } = activityQuery.data}

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Description>Total calls</Card.Description>
          <Card.Title class="text-3xl tabular-nums">{totals.calls.toLocaleString()}</Card.Title>
        </Card.Header>
      </Card.Root>
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Description>Successes</Card.Description>
          <Card.Title class="text-3xl tabular-nums text-emerald-600 dark:text-emerald-400">
            {totals.successes.toLocaleString()}
          </Card.Title>
        </Card.Header>
      </Card.Root>
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Description>Failures</Card.Description>
          <Card.Title
            class="text-3xl tabular-nums {totals.failures > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'}">
            {totals.failures.toLocaleString()}
          </Card.Title>
        </Card.Header>
      </Card.Root>
    </div>

    <Card.Root>
      <Card.Header>
        <Card.Title>By tool</Card.Title>
        <Card.Description>Per-tool counts and latency</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if byTool.length === 0}
          <p class="text-muted-foreground py-8 text-center text-sm">
            No tool calls recorded in this window yet. Try asking the assistant something.
          </p>
        {:else}
          <table class="w-full text-sm">
            <thead class="text-muted-foreground border-b text-xs uppercase">
              <tr>
                <th class="py-2 text-left font-medium">Tool</th>
                <th class="py-2 text-right font-medium">Calls</th>
                <th class="py-2 text-right font-medium">Failures</th>
                <th class="py-2 text-right font-medium">Avg latency</th>
                <th class="py-2 text-right font-medium">Max latency</th>
              </tr>
            </thead>
            <tbody>
              {#each byTool as row (row.toolName)}
                <tr class="border-b last:border-0">
                  <td class="py-2 font-mono text-xs">{row.toolName}</td>
                  <td class="py-2 text-right tabular-nums">{row.callCount}</td>
                  <td
                    class="py-2 text-right tabular-nums {row.failureCount > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground'}">
                    {row.failureCount}
                  </td>
                  <td class="py-2 text-right tabular-nums">{formatLatency(row.avgLatencyMs)}</td>
                  <td class="text-muted-foreground py-2 text-right tabular-nums">
                    {formatLatency(row.maxLatencyMs)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </Card.Content>
    </Card.Root>

    {#if recentFailures.length > 0}
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-rose-500" />
            <Card.Title>Recent failures</Card.Title>
          </div>
          <Card.Description>Last 20 tool errors in this window</Card.Description>
        </Card.Header>
        <Card.Content>
          <ul class="divide-y">
            {#each recentFailures as failure (failure.id)}
              <li class="flex items-center justify-between gap-4 py-2 text-sm">
                <span class="font-mono text-xs">{failure.toolName}</span>
                <span class="text-muted-foreground flex-1 truncate text-xs">
                  {failure.errorCode ?? 'unknown'}
                </span>
                <span class="text-muted-foreground tabular-nums text-xs">
                  {formatLatency(failure.latencyMs)}
                </span>
                <span class="text-muted-foreground w-20 text-right text-xs">
                  {formatRelativeTime(failure.createdAt)}
                </span>
              </li>
            {/each}
          </ul>
        </Card.Content>
      </Card.Root>
    {:else if byTool.length > 0}
      <p class="text-muted-foreground flex items-center gap-2 text-sm">
        <CheckCircle2 class="h-4 w-4 text-emerald-500" />
        No failures in this window.
      </p>
    {/if}
  {/if}

  {#if llmQuery.data && llmQuery.data.byFeature.length > 0}
    {@const llm = llmQuery.data}
    <Card.Root>
      <Card.Header>
        <Card.Title>LLM usage</Card.Title>
        <Card.Description>
          Calls to the configured LLM providers. Total:
          <span class="tabular-nums">{formatTokens(llm.totals.inputTokens)}</span> in /
          <span class="tabular-nums">{formatTokens(llm.totals.outputTokens)}</span> out across
          <span class="tabular-nums">{llm.totals.callCount}</span>
          call{llm.totals.callCount === 1 ? '' : 's'}.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <table class="w-full text-sm">
          <thead class="text-muted-foreground border-b text-xs uppercase">
            <tr>
              <th class="py-2 text-left font-medium">Feature</th>
              <th class="py-2 text-right font-medium">Calls</th>
              <th class="py-2 text-right font-medium">Input tokens</th>
              <th class="py-2 text-right font-medium">Output tokens</th>
              <th class="py-2 text-right font-medium">Avg latency</th>
              <th class="py-2 text-right font-medium">Failures</th>
            </tr>
          </thead>
          <tbody>
            {#each llm.byFeature as row (row.feature)}
              <tr class="border-b last:border-0">
                <td class="py-2 font-medium">
                  {LLM_FEATURE_LABELS[row.feature] ?? row.feature}
                </td>
                <td class="py-2 text-right tabular-nums">{row.callCount}</td>
                <td class="py-2 text-right tabular-nums">{formatTokens(row.inputTokens)}</td>
                <td class="py-2 text-right tabular-nums">{formatTokens(row.outputTokens)}</td>
                <td class="text-muted-foreground py-2 text-right tabular-nums">
                  {formatLatency(row.avgLatencyMs)}
                </td>
                <td
                  class="py-2 text-right tabular-nums {row.failureCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-muted-foreground'}">
                  {row.failureCount}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if feedbackQuery.data && feedbackQuery.data.byType.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>User feedback signals</Card.Title>
        <Card.Description>
          What users told us by accepting, dismissing, or editing AI suggestions.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <table class="w-full text-sm">
          <thead class="text-muted-foreground border-b text-xs uppercase">
            <tr>
              <th class="py-2 text-left font-medium">Source</th>
              <th class="py-2 text-right font-medium">Total</th>
              <th class="py-2 text-right font-medium">Accepted</th>
              <th class="py-2 text-right font-medium">Rejected / edited</th>
              <th class="py-2 text-right font-medium">Accuracy</th>
              <th class="py-2 text-right font-medium">Avg confidence</th>
            </tr>
          </thead>
          <tbody>
            {#each feedbackQuery.data.byType as row (row.predictionType)}
              <tr class="border-b last:border-0">
                <td class="py-2">
                  {FEEDBACK_TYPE_LABELS[row.predictionType] ?? row.predictionType}
                </td>
                <td class="py-2 text-right tabular-nums">{row.total}</td>
                <td class="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {row.positive}
                </td>
                <td
                  class="py-2 text-right tabular-nums {row.negative > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-muted-foreground'}">
                  {row.negative}
                </td>
                <td class="py-2 text-right tabular-nums">
                  {#if row.accuracyRate !== null}
                    {Math.round(row.accuracyRate * 100)}%
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="text-muted-foreground py-2 text-right tabular-nums">
                  {#if row.avgConfidence !== null}
                    {Math.round(row.avgConfidence * 100)}%
                  {:else}
                    —
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

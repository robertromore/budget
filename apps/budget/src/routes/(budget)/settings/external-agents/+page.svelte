<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as RadioGroup from '$lib/components/ui/radio-group';
import { Skeleton } from '$lib/components/ui/skeleton';
import { toast } from 'svelte-sonner';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Copy from '@lucide/svelte/icons/copy';
import KeyRound from '@lucide/svelte/icons/key-round';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

const listQuery = rpc.externalApiKeys.listApiKeys().options();
const createMutation = rpc.externalApiKeys.createApiKey().options();
const revokeMutation = rpc.externalApiKeys.revokeApiKey().options();

let createOpen = $state(false);
let newName = $state('');
let newScope = $state<'read_only' | 'read_write'>('read_only');

// Set by the create mutation's onSuccess so we can show the plaintext
// exactly once in a follow-up dialog.
let revealedKey = $state<string | null>(null);
let revealedKeyName = $state<string>('');

function openCreate() {
  newName = '';
  newScope = 'read_only';
  createOpen = true;
}

function handleCreate() {
  if (!newName.trim()) return;
  createMutation.mutate(
    { name: newName.trim(), scope: newScope },
    {
      onSuccess: (data) => {
        createOpen = false;
        revealedKey = data.plaintextKey;
        revealedKeyName = data.key.name;
      },
    }
  );
}

function handleRevoke(id: number, name: string) {
  if (!confirm(`Revoke "${name}"? Any agent using this key will stop working.`)) return;
  revokeMutation.mutate({ id });
}

async function copyKey() {
  if (!revealedKey) return;
  try {
    await navigator.clipboard.writeText(revealedKey);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Copy failed — select and copy manually');
  }
}

function dismissReveal() {
  revealedKey = null;
  revealedKeyName = '';
}

const mcpUrl = $derived(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp`);

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function scopeLabel(scope: string): string {
  return scope === 'read_only' ? 'Read only' : 'Read + write';
}
</script>

<svelte:head>
  <title>External Agents - Intelligence Settings</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center gap-3">
    <Button variant="ghost" size="icon" href="/settings/intelligence">
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-2xl font-bold tracking-tight">External Agents</h1>
      <p class="text-muted-foreground text-sm">
        API keys that let Claude Desktop, Codex, or custom agents act on your workspace.
      </p>
    </div>
  </div>

  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <Card.Title>API keys</Card.Title>
          <Card.Description>
            Each key is scoped to this workspace. Revoke a key to immediately disable it.
          </Card.Description>
        </div>
        <Button onclick={openCreate}>
          <Plus class="mr-2 h-4 w-4" />
          New key
        </Button>
      </div>
    </Card.Header>
    <Card.Content>
      {#if listQuery.isLoading}
        <Skeleton class="h-40" />
      {:else if !listQuery.data || listQuery.data.length === 0}
        <div class="flex flex-col items-center gap-2 py-8 text-center">
          <KeyRound class="text-muted-foreground h-8 w-8" />
          <p class="text-sm">No API keys yet.</p>
          <p class="text-muted-foreground text-xs">
            Create one to connect Claude Desktop, Codex, or another MCP client.
          </p>
        </div>
      {:else}
        <table class="w-full text-sm">
          <thead class="text-muted-foreground border-b text-xs uppercase">
            <tr>
              <th class="py-2 text-left font-medium">Name</th>
              <th class="py-2 text-left font-medium">Prefix</th>
              <th class="py-2 text-left font-medium">Scope</th>
              <th class="py-2 text-left font-medium">Last used</th>
              <th class="py-2 text-left font-medium">Created</th>
              <th class="py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each listQuery.data as key (key.id)}
              <tr class="border-b last:border-0">
                <td class="py-2 font-medium">{key.name}</td>
                <td class="py-2 font-mono text-xs">{key.keyPrefix}…</td>
                <td class="py-2 text-xs">{scopeLabel(key.scope)}</td>
                <td class="text-muted-foreground py-2 text-xs">{formatDate(key.lastUsedAt)}</td>
                <td class="text-muted-foreground py-2 text-xs">{formatDate(key.createdAt)}</td>
                <td class="py-2 text-right">
                  {#if key.revokedAt}
                    <span class="text-muted-foreground text-xs">Revoked</span>
                  {:else}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => handleRevoke(key.id, key.name)}
                      disabled={revokeMutation.isPending}>
                      <Trash2 class="mr-1 h-3 w-3" />
                      Revoke
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>How to connect</Card.Title>
      <Card.Description>
        Paste the MCP server URL and your API key into the agent's config.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm">
      <div>
        <Label class="text-xs font-medium">Server URL</Label>
        <p class="bg-muted/50 mt-1 rounded-md border px-2 py-1.5 font-mono text-xs">{mcpUrl}</p>
      </div>
      <div>
        <Label class="text-xs font-medium">Claude Desktop</Label>
        <p class="text-muted-foreground mt-1 text-xs">
          Add to <span class="font-mono">claude_desktop_config.json</span>:
        </p>
        <pre class="bg-muted/50 mt-1 overflow-x-auto rounded-md border p-2 text-xs"><code
            >{JSON.stringify(
              {
                mcpServers: {
                  budget: {
                    url: mcpUrl,
                    headers: { Authorization: 'Bearer <your-api-key>' },
                  },
                },
              },
              null,
              2
            )}</code
          ></pre>
      </div>
      <div>
        <Label class="text-xs font-medium">Codex CLI</Label>
        <p class="text-muted-foreground mt-1 text-xs">
          Add to <span class="font-mono">~/.codex/config.toml</span>:
        </p>
        <pre class="bg-muted/50 mt-1 overflow-x-auto rounded-md border p-2 text-xs"><code
            >{`[mcp_servers.budget]
url = "${mcpUrl}"
authorization = "Bearer <your-api-key>"`}</code
          ></pre>
      </div>
    </Card.Content>
  </Card.Root>
</div>

<Dialog bind:open={createOpen}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Create API key</DialogTitle>
      <DialogDescription>
        Give the key a label and choose what it can do. You'll see the key once after creation.
      </DialogDescription>
    </DialogHeader>
    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="key-name">Name</Label>
        <Input
          id="key-name"
          bind:value={newName}
          placeholder="Claude Desktop"
          maxlength={100}
          disabled={createMutation.isPending} />
      </div>
      <div class="space-y-2">
        <Label>Scope</Label>
        <RadioGroup.Root bind:value={newScope}>
          <div class="flex items-start gap-3 rounded-md border p-3">
            <RadioGroup.Item value="read_only" id="scope-read-only" />
            <div class="flex-1 space-y-1">
              <Label for="scope-read-only" class="cursor-pointer font-medium">Read only</Label>
              <p class="text-muted-foreground text-xs">
                Agent can query balances, transactions, budgets, anomalies. Cannot create or modify.
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 rounded-md border p-3">
            <RadioGroup.Item value="read_write" id="scope-read-write" />
            <div class="flex-1 space-y-1">
              <Label for="scope-read-write" class="cursor-pointer font-medium">Read + write</Label>
              <p class="text-muted-foreground text-xs">
                Agent can also create payees, categorize transactions, and import statements.
              </p>
            </div>
          </div>
        </RadioGroup.Root>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
      <Button onclick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
        Create key
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={() => revealedKey !== null, (v) => (v ? null : dismissReveal())}>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Copy your API key</DialogTitle>
      <DialogDescription>
        This is the only time you'll see the full key for <strong>{revealedKeyName}</strong>.
        Store it somewhere safe.
      </DialogDescription>
    </DialogHeader>
    <div class="space-y-3 py-2">
      <div class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
        <p>If you close this dialog without copying the key, you'll need to revoke it and create a new one.</p>
      </div>
      <div class="flex items-center gap-2">
        <Input value={revealedKey ?? ''} readonly class="font-mono text-xs" />
        <Button variant="outline" size="icon" onclick={copyKey} aria-label="Copy">
          <Copy class="h-4 w-4" />
        </Button>
      </div>
    </div>
    <DialogFooter>
      <Button onclick={dismissReveal}>I've saved it</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

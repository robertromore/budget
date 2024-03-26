<script lang="ts">
  import { getAccountState } from "$lib/states/AccountState.svelte";
	import { cn } from "$lib/utils";
	import { Button } from "./ui/button";

  let { className }: {
    className: string | null | undefined
  } = $props();

  const data = getAccountState();
</script>

<div class={cn("pb-12", className)}>
	<div class="space-y-4 py-4">
		<div class="py-2">
			<h2 class="relative px-7 text-lg font-semibold tracking-tight">
				Accounts
			</h2>
			<div class="px-1">
				<div class="space-y-1 p-2">
          <Button
            variant="ghost"
            class="w-full justify-start font-normal"
            href="/accounts">
            Overview
          </Button>
          {#if data.accounts}
            {#each data.accounts as account}
              <Button
                variant="ghost"
                class="w-full justify-start font-normal"
                href="/accounts/{account.id}"
              >
                {account.name}
              </Button>
            {/each}
          {/if}
				</div>
			</div>
		</div>
	</div>
</div>

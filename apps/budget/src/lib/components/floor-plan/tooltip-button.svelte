<script lang="ts">
  /**
   * Icon / text button wrapped in a shadcn Tooltip so the label surfaces
   * on hover + keyboard focus via screen-reader-friendly markup rather
   * than the native `title` attribute.
   *
   * `title=` attributes show only on mouse hover (not keyboard focus),
   * can't be styled, and are inaccessible to many assistive tools. The
   * Tooltip component handles both hover and focus, ties its content to
   * the trigger via aria-describedby, and renders in the app's theme.
   *
   * Uses bits-ui's `Tooltip.Trigger` child-snippet pattern so the caller
   * gets a real `<button>` with their own classes/handlers intact.
   */
  import type { Snippet } from "svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";

  type Side = "top" | "bottom" | "left" | "right";

  type Props = {
    label: string;
    side?: Side;
    class?: string;
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    ariaLabel?: string;
    ariaPressed?: boolean;
    delayMs?: number;
    children: Snippet;
  };

  let {
    label,
    side = "bottom",
    class: className,
    disabled,
    onclick,
    ariaLabel,
    ariaPressed,
    delayMs = 300,
    children,
  }: Props = $props();
</script>

<Tooltip.Root disableHoverableContent delayDuration={delayMs}>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        class={className}
        {disabled}
        {onclick}
        aria-label={ariaLabel ?? label}
        aria-pressed={ariaPressed}
      >
        {@render children()}
      </button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content {side}>{label}</Tooltip.Content>
</Tooltip.Root>

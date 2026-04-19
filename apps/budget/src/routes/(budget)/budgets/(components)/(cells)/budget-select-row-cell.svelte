<script lang="ts">
import { Checkbox } from '$lib/components/ui/checkbox';

/**
 * Row-selection checkbox for the budgets data table. Wraps the shadcn
 * Checkbox so we can intercept shift-click and route it to a range
 * handler — TanStack's `row.toggleSelected` never surfaces the shift
 * key, so this is the only place the extra event data is available.
 */
interface Props {
  checked: boolean;
  disabled?: boolean;
  /** Plain toggle — wired to Checkbox's `onCheckedChange`. */
  onToggle: (value: boolean) => void;
  /** Optional shift-range handler; budget id is closed over in the column factory. */
  onRangeSelect?: () => void;
  ariaLabel?: string;
}

let { checked, disabled = false, onToggle, onRangeSelect, ariaLabel }: Props = $props();

function handleClickCapture(event: MouseEvent) {
  if (event.shiftKey && onRangeSelect) {
    // Stop the Checkbox's built-in toggle from firing; the range handler
    // owns the resulting selection delta.
    event.preventDefault();
    event.stopPropagation();
    onRangeSelect();
  }
  // Non-shift clicks fall through — the Checkbox's own handler fires
  // `onCheckedChange` with the new value.
}
</script>

<span class="inline-flex" onclickcapture={handleClickCapture} role="presentation">
  <Checkbox
    {checked}
    {disabled}
    onCheckedChange={onToggle}
    aria-label={ariaLabel} />
</span>

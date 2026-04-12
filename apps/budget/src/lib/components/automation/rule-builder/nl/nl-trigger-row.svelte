<!--
  NL Trigger Row

  Displays the trigger selection in natural language format:
  "When [Entity Type ▼] [Event ▼]"
-->
<script lang="ts">
import * as Select from '$lib/components/ui/select';
import {
  entityTypes,
  getEntityTypeLabel,
  triggerEvents,
  type EntityType,
  type TriggerConfig,
} from '$core/types/automation';

interface Props {
  /** Current trigger configuration */
  trigger: TriggerConfig;
  /** Whether the entity type can be changed (usually disabled) */
  entityTypeDisabled?: boolean;
  /** Called when trigger is updated */
  onUpdate: (trigger: TriggerConfig) => void;
}

let { trigger, entityTypeDisabled = true, onUpdate }: Props = $props();

// Get available events for the current entity type
const availableEvents = $derived(triggerEvents[trigger.entityType] || []);

// Get display labels
const entityLabel = $derived(getEntityTypeLabel(trigger.entityType));
const eventLabel = $derived(
  availableEvents.find((e) => e.event === trigger.event)?.label || 'Select event...'
);

function handleEntityTypeChange(value: string | undefined) {
  if (!value) return;
  const newEntityType = value as EntityType;
  const newEvents = triggerEvents[newEntityType] || [];
  const defaultEvent = newEvents[0]?.event || '';

  onUpdate({
    ...trigger,
    entityType: newEntityType,
    event: defaultEvent,
  });
}

function handleEventChange(value: string | undefined) {
  if (!value) return;
  onUpdate({
    ...trigger,
    event: value,
  });
}
</script>

<div
  class="group flex flex-wrap items-center gap-2 rounded-md border border-success/20 bg-success-bg/50 px-3 py-2 text-base">
  <span class="text-foreground font-medium">When</span>

  <!-- Entity Type Select -->
  <Select.Root
    type="single"
    value={trigger.entityType}
    onValueChange={handleEntityTypeChange}
    disabled={entityTypeDisabled}>
    <Select.Trigger
      class="h-8 w-auto min-w-32 gap-1 border-success/30 bg-success-bg px-3 font-medium text-success-fg hover:bg-success-bg/80">
      {entityLabel}
    </Select.Trigger>
    <Select.Content>
      {#each entityTypes as type (type.value)}
        <Select.Item value={type.value}>
          {type.label}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>

  <span class="text-muted-foreground">is</span>

  <!-- Event Select -->
  <Select.Root type="single" value={trigger.event} onValueChange={handleEventChange}>
    <Select.Trigger
      class="h-8 w-auto min-w-36 gap-1 border-success/30 bg-success-bg px-3 font-medium text-success-fg hover:bg-success-bg/80">
      {eventLabel}
    </Select.Trigger>
    <Select.Content>
      {#each availableEvents as event (event.event)}
        <Select.Item value={event.event}>
          <div class="flex flex-col">
            <span>{event.label}</span>
            <span class="text-muted-foreground text-xs">{event.description}</span>
          </div>
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>

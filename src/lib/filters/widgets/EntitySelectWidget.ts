import EntityFilter from "$lib/components/filters/EntityFilter.svelte";
import type { FilterWidget } from "../BaseFilter.svelte";

const EntitySelectWidget: FilterWidget = {
  id: 'entity_filter_widget',
  label: 'Entity',
  component: EntityFilter,
  props: {},
  icon: 'icon-[lucide--mouse-pointer-2]'
};

export default EntitySelectWidget;

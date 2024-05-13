import TextFilter from "$lib/components/filters/TextFilter.svelte";
import type { FilterWidget } from "../BaseFilter.svelte";

const EntityTextWidget: FilterWidget = {
  id: 'entity_text_widget',
  label: 'Text',
  component: TextFilter,
  props: {},
  icon: 'icon-[lucide--text-cursor-input]'
};

export default EntityTextWidget;

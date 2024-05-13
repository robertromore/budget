import NumberTextFilter from '$lib/components/filters/NumberTextFilter.svelte';
import type { FilterWidget } from '../BaseFilter.svelte';

const NumberTextWidget: FilterWidget = {
  id: 'number_text_widget',
  label: 'Text',
  component: NumberTextFilter,
  props: {},
  icon: 'icon-[lucide--text-cursor-input]'
};

export default NumberTextWidget;

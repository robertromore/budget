import NumberSliderFilter from '$lib/components/filters/NumberSliderFilter.svelte';
import type { FilterWidget } from '../BaseFilter.svelte';

const NumberSliderWidget: FilterWidget = {
  id: 'number_slider_widget',
  label: 'Slider',
  component: NumberSliderFilter,
  props: {},
  icon: 'icon-[radix-icons--slider]'
};

export default NumberSliderWidget;

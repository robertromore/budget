import type { Option } from '@budget-shared/utils/options';
interface Props {
    currentPeriod?: string | number;
    data: Option[];
    dateField?: string;
    enablePeriodFiltering?: boolean;
}
declare const ChartPeriodControls: import("svelte").Component<Props, {}, "currentPeriod">;
type ChartPeriodControls = ReturnType<typeof ChartPeriodControls>;
export default ChartPeriodControls;

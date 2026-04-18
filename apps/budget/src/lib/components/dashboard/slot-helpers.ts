import type {
  DashboardGroupInstanceWithWidgets,
  DashboardWidget,
} from '$core/schema/dashboards';

export type DashboardSlot =
  | { kind: 'widget'; domId: string; widget: DashboardWidget; sortOrder: number }
  | {
      kind: 'group';
      domId: string;
      instance: DashboardGroupInstanceWithWidgets;
      sortOrder: number;
    };

/**
 * Merge standalone widgets and group instances into a single ordered list
 * of top-level dashboard slots. Widgets win ties so legacy data (where
 * both tables start at sortOrder 0) keeps the widgets-first ordering the
 * previous UI rendered.
 */
export function buildDashboardSlots(
  widgets: DashboardWidget[],
  instances: DashboardGroupInstanceWithWidgets[]
): DashboardSlot[] {
  const all: DashboardSlot[] = [
    ...widgets.map(
      (w): DashboardSlot => ({
        kind: 'widget',
        domId: `w-${w.id}`,
        widget: w,
        sortOrder: w.sortOrder,
      })
    ),
    ...instances.map(
      (instance): DashboardSlot => ({
        kind: 'group',
        domId: `g-${instance.id}`,
        instance,
        sortOrder: instance.sortOrder,
      })
    ),
  ];
  all.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.kind !== b.kind) return a.kind === 'widget' ? -1 : 1;
    return 0;
  });
  return all;
}

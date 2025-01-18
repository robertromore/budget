import type { LayoutLoad } from './$types';
import type { View } from '$lib/schema/view';
import DataTableFacetedFilterStatus from './(components)/(facets)/data-table-faceted-filter-status.svelte';

export const load: LayoutLoad = async ({ params, data }) => {
  return {
    views: [
      {
        id: 1,
        name: 'all',
        label: 'All Transactions',
        description: 'All transactions for this account',
        filters: [],
        display: [],
        icon: ''
      },
      {
        id: 2,
        name: 'cleared',
        label: 'Cleared',
        description: 'Cleared transactions for this account',
        filters: [
          {
            column: 'status',
            value: ['cleared'],
            component: DataTableFacetedFilterStatus
          }
        ],
        display: [],
        icon: ''
      },
      {
        id: 3,
        name: 'upcoming',
        label: 'Upcoming',
        description: 'Upcoming transactions for this account',
        filters: [
          {
            column: 'status',
            value: ['pending'],
            component: DataTableFacetedFilterStatus
          }
        ],
        display: [],
        icon: ''
      }
    ] as View[]
  };
};

<script lang="ts" generics="TData, TValue, TEntity">
import type {Column} from '@tanstack/table-core';
import {DataTableFacetedFilter} from '..';
import type {Component} from 'svelte';
import {currentViews} from '$lib/states/views';
import {SvelteMap} from 'svelte/reactivity';
import type {FacetedFilterOption} from '$lib/types';

type EntityConfig<TEntity> = {
  // Data source for all entities
  entities: TEntity[];
  // Function to get ID from entity (string or number)
  getId: (entity: TEntity) => string | number;
  // Function to get display label from entity
  getLabel: (entity: TEntity) => string;
  // Icon component to use for all options
  icon: Component;
  // Title for the filter
  title: string;
  // Icon for "Show all" button
  allIcon?: Component;
};

type Props<TData, TValue, TEntity> = {
  column: Column<TData, TValue>;
  config: EntityConfig<TEntity>;
};

let {column, config}: Props<TData, TValue, TEntity> = $props();

const activeView = $derived(currentViews.get().activeView);
const activeViewModel = $derived(activeView.view);
const selectedValues = $derived(activeViewModel.getFilterValue(column.id));

// Get faceted values with counts from TanStack Table
const facets = $derived(column?.getFacetedUniqueValues?.() || new Map());

const entityOptions = $derived.by(() => {
  const options = new SvelteMap<number | string, FacetedFilterOption>();

  // Add options based on faceted data (actual data in table with counts)
  facets.forEach((count: number, value: string) => {
    if (value === 'null' || value === '') {
      // Handle null/empty entities
      options.set('null', {
        label: '(None)',
        value: 'null',
        icon: config.icon,
      });
    } else {
      // Find the entity
      const entityId = isNaN(Number(value)) ? value : parseInt(value);
      const entity = config.entities.find(e => {
        const id = config.getId(e);
        return (typeof id === 'string' ? id : id.toString()) === (typeof entityId === 'string' ? entityId : entityId.toString());
      });

      if (entity) {
        const id = config.getId(entity);
        options.set(id, {
          label: config.getLabel(entity),
          value: id.toString(),
          icon: config.icon,
        });
      }
    }
  });

  return options;
});

const allEntityOptions = $derived.by(() => {
  const options = new SvelteMap<number | string, FacetedFilterOption>();

  // Include null option if it exists in data
  if (facets.has('null') || facets.has('')) {
    options.set('null', {
      label: '(None)',
      value: 'null',
      icon: config.icon,
    });
  }

  // Add all entity options
  config.entities?.forEach((entity: TEntity) => {
    const id = config.getId(entity);
    options.set(id, {
      label: config.getLabel(entity),
      value: id.toString(),
      icon: config.icon,
    });
  });

  return options;
});
</script>

<DataTableFacetedFilter
  {column}
  title={config.title}
  options={entityOptions}
  allOptions={allEntityOptions}
  allIcon={config.allIcon || config.icon} />
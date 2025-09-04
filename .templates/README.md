# Component Templates

This directory contains standardized component templates that follow the established DX patterns for this project.

## Available Templates

### `component-template.svelte`

General-purpose component template with:

- Standardized import organization (Framework → SvelteKit → Third-party → UI → Internal → State → Types → Utils)
- Interface-based props with proper TypeScript typing
- Consistent prop destructuring patterns
- $bindable prop handling
- Event handler patterns
- Local state management with $state and $derived
- Effect handling with $effect

### `data-table-component-template.svelte`

Specialized template for data table components with:

- Generic type support (`<TData, TValue>`)
- Extended HTMLAttributes interface
- Table/Column prop patterns
- State integration with currentViews
- Dropdown menu interactions
- Sort and filter handling

### `form-component-template.svelte`

Form component template with:

- Superform integration
- Zod validation patterns  
- Form field components
- Entity/Date/Numeric input examples
- Form state synchronization
- Error handling patterns

## Usage Guidelines

1. **Copy the appropriate template** to your component location
2. **Replace placeholder names** (Entity, SomeType, etc.) with actual types
3. **Remove unused imports** and add needed ones following the import order
4. **Update the Props interface** to match your component's needs
5. **Implement the actual component logic** using the established patterns
6. **Test thoroughly** to ensure TypeScript compliance

## Import Organization Order

All templates follow this standardized import order:

```typescript
// Framework imports (svelte, svelte/*)
// SvelteKit imports ($app/*, $env/*)
// Third-party library imports (external packages)
// UI component imports ($lib/components/ui/*)  
// Internal component imports ($lib/components/*)
// State imports ($lib/states/*)
// Type imports (type-only imports)
// Schema imports ($lib/schema/*)
// Utility imports ($lib/utils/*)
```

## Props Interface Standards

- Use `interface Props` instead of `type Props`
- Extend HTMLAttributes when appropriate for components that accept HTML props
- Use `$bindable()` annotation for two-way binding props
- Group props logically: required first, optional second, events third, styling last
- Document complex object props with nested interfaces

## Naming Conventions

- Component files: `kebab-case.svelte`
- Interface names: `PascalCase` (Props, Options, Config, etc.)
- Props: `camelCase`
- Event handlers: `onAction` pattern (onSave, onCancel, onDelete)
- State variables: `camelCase`
- CSS classes: use `class: className` destructuring pattern

## Best Practices

- Always define Props interface before destructuring
- Use meaningful prop names that indicate purpose
- Provide sensible defaults for optional props
- Handle all bindable props consistently
- Include proper TypeScript generics when needed
- Test components with different prop combinations
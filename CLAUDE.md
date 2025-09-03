# Claude Code Configuration

This file contains configuration and preferences for Claude Code agents working on this project.

## Package Manager Preference

**ALWAYS use `bun` commands instead of `npm` commands in this project.**

### Command Mappings

- ❌ `npm install` → ✅ `bun install`
- ❌ `npm run dev` → ✅ `bun run dev`
- ❌ `npm run build` → ✅ `bun run build`
- ❌ `npm run test` → ✅ `bun run test`
- ❌ `npm add package` → ✅ `bun add package`
- ❌ `npm remove package` → ✅ `bun remove package`

### Benefits

- Faster package installation and script execution
- Better performance for development workflows
- Consistent with project setup and team preferences

## Project Context

This is a SvelteKit budget management application with:

- **Frontend**: SvelteKit with Svelte 5, TypeScript, Tailwind CSS, shadcn-svelte
- **Backend**: tRPC, Drizzle ORM, Better Auth, domain-driven architecture
- **Database**: SQLite (with migrations via Drizzle)
- **Architecture**: Domain-separated frontend and backend with comprehensive error handling

## Import Preferences

**ALWAYS use the `$lib` alias when importing from the `src/lib` folder.**

### Import Mappings

- ❌ `import { Component } from '../../../lib/components/ui/button'`
- ✅ `import { Component } from '$lib/components/ui/button'`
- ❌ `import { db } from '../../lib/server/db'`
- ✅ `import { db } from '$lib/server/db'`
- ❌ `import type { Account } from '../lib/schema/accounts'`
- ✅ `import type { Account } from '$lib/schema/accounts'`

### Import Benefits

- Cleaner, more readable imports
- Consistent with SvelteKit conventions
- Easier refactoring and maintenance
- Avoids relative path complexity

## Comment and Documentation Standards

**NEVER reference previous work, changes, or transitions in comments or documentation.**

### Comment Principles

- ❌ `// Now uses the new validation system`
- ✅ `// Validates input using comprehensive sanitization`
- ❌ `// Changed from repository pattern to service layer`
- ✅ `// Service layer handles business logic and validation`
- ❌ `// TODO: Implement after refactoring is complete`
- ✅ `// TODO: Add transaction loading functionality`
- ❌ `// Updated to use the latest middleware`
- ✅ `// Uses tRPC middleware for authentication and rate limiting`

### Documentation Standards

- Document code and architecture as it currently exists
- Focus on what the code does, not what it replaced
- Avoid temporal references like "now", "updated", "changed from"
- Write comments as if this is the first implementation
- Use present tense to describe current functionality
- Remove transitional TODO comments that reference previous states

### Documentation Benefits

- Creates timeless documentation that doesn't become outdated
- Focuses on current architecture rather than historical changes
- Improves code readability for new developers
- Maintains professional documentation standards
- Prevents confusion about what is "old" vs "new" code

## Markdown Documentation Standards

**ALWAYS follow Google's documentation style guidelines and run markdownlint when creating or editing markdown content.**

### Style Guidelines

- Follow [Google's documentation style guide](https://google.github.io/styleguide/docguide/style.html)
- Use markdownlint to validate markdown syntax and formatting
- Ensure proper heading hierarchy (H1 → H2 → H3)
- Add language specifications to fenced code blocks
- Include proper blank lines around headings and lists
- End files with a single trailing newline

### Markdown Quality Standards

- ✅ Use language tags: ```typescript,```bash, ```text
- ✅ Proper heading structure with blank lines
- ✅ Consistent list formatting with proper spacing
- ✅ Professional tone following Google's style principles
- ❌ Bare URLs without proper link formatting
- ❌ Missing language specifications in code blocks
- ❌ Inconsistent heading spacing

### Markdown Benefits

- Ensures consistent, professional documentation quality
- Improves readability and maintainability of documentation
- Follows industry-standard documentation practices
- Enables automated quality checking and validation

## Development Commands

- **Dev server**: `bun run dev`
- **Build**: `bun run build`
- **Test**: `bun run test` (if available)
- **Lint**: `bun run lint` (if available)
- **Type check**: `bun run typecheck` (if available)

## Form Handling Standards

**ALWAYS use SvelteKit Superforms for form handling and validation.**

### SvelteKit Superforms Best Practices

- Use `superForm()` for client-side form management with proper validation adapters
- Implement server-side validation with Zod schemas in form actions
- Handle form errors gracefully with proper error display
- Use `enhance` for progressive enhancement of forms
- Implement proper loading states and form submission feedback
- Follow the validation flow: client validation → server validation → success/error handling

### Form Implementation Pattern

```typescript
// Client-side form setup
const form = superForm(data.form, {
  validators: zod4Client(validationSchema),
  onResult: ({ result }) => {
    if (result.type === 'success') {
      // Handle success
    }
  }
});

// Server-side action
const formSchema = z.object({
  field: z.string().min(1)
});

export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod4Server(formSchema));
    if (!form.valid) return fail(400, { form });
    // Process valid form data
    return { form };
  }
};
```

### Form Benefits

- Provides comprehensive form validation and error handling
- Ensures consistent form behavior across the application  
- Integrates seamlessly with SvelteKit's form handling
- Reduces boilerplate code for common form patterns

## Code Style Standards

**ALWAYS use object method shorthand syntax when defining object methods.**

### Method Definition Style

- ✅ `const obj = { method() { return 'value'; } }`
- ❌ `const obj = { method: function() { return 'value'; } }`
- ✅ `const obj = { async method() { return await promise; } }`
- ❌ `const obj = { method: async function() { return await promise; } }`

### Style Benefits

- More concise and readable code
- Consistent with modern JavaScript/TypeScript standards
- Better performance characteristics
- Cleaner syntax for method definitions

## Error Handling and Validation

**ALWAYS implement comprehensive error handling with proper user feedback.**

### Error Handling Patterns

- Use proper error boundaries and fallback UI components
- Implement graceful degradation for failed network requests
- Provide meaningful error messages to users
- Log errors appropriately for debugging while protecting sensitive data
- Handle edge cases and unexpected input gracefully

### Validation Strategy

- Validate data at multiple layers: client, server, and database
- Use TypeScript for compile-time type safety
- Implement runtime validation for user inputs and API responses
- Sanitize user inputs to prevent security vulnerabilities

## Performance and Accessibility

**ALWAYS prioritize performance and accessibility in component design.**

### Performance Guidelines

- Use Svelte's reactive features efficiently with proper state management
- Implement lazy loading for large datasets and images
- Optimize bundle size with proper code splitting
- Use appropriate caching strategies for API calls

### Accessibility Standards

- Ensure proper semantic HTML structure
- Include appropriate ARIA labels and descriptions
- Implement keyboard navigation support
- Maintain proper color contrast and focus indicators
- Test with screen readers and accessibility tools

## Testing Standards

**ALWAYS write comprehensive tests for new functionality and bug fixes.**

### Testing Strategy

- Write unit tests for business logic and utility functions
- Create integration tests for API endpoints and database operations
- Implement component tests for UI functionality
- Add end-to-end tests for critical user workflows
- Test error conditions and edge cases thoroughly

### Test Organization

- Unit tests: `tests/unit/` - Fast, isolated tests for pure functions
- Integration tests: `tests/integration/` - Database and API testing
- Component tests: `tests/components/` - UI component behavior
- E2E tests: `tests/e2e/` - Full user journey testing

## Security Practices

**ALWAYS implement security best practices at every layer.**

### Input Validation

- Validate all user inputs on both client and server sides
- Use type-safe validation schemas (Zod) for API endpoints
- Sanitize HTML content to prevent XSS attacks
- Implement proper CSRF protection for forms
- Rate limit API endpoints to prevent abuse

### Authentication & Authorization

- Use secure session management with Better Auth
- Implement proper role-based access control
- Validate permissions on every protected route
- Use HTTPS in production environments
- Implement secure password policies

## Git and Development Workflow

**ALWAYS follow consistent Git practices for clean project history.**

### Commit Standards

- Use conventional commit format: `type(scope): description`
- Write clear, concise commit messages
- Keep commits focused on single changes
- Include issue references where applicable
- Use present tense in commit messages

### Branch Strategy

- Create feature branches for new functionality
- Use descriptive branch names (e.g., `feature/user-authentication`)
- Keep branches small and focused
- Delete branches after merging
- Use pull requests for code review

## Code Review Guidelines

**ALWAYS conduct thorough code reviews before merging.**

### Review Checklist

- Verify code follows project standards and conventions
- Check for proper error handling and edge cases
- Ensure tests cover new functionality
- Validate security considerations
- Confirm documentation is updated
- Test functionality manually if needed

### Review Feedback

- Provide constructive, specific feedback
- Explain the reasoning behind suggestions
- Focus on code quality and maintainability
- Be respectful and collaborative
- Address all feedback before approving

## Development Workflow Best Practices

**ALWAYS follow incremental development patterns for complex changes to ensure reliability and maintainability.**

### Planning and Implementation Strategy

#### Break Down Complex Changes

- **❌ Don't ask for**: "Implement a complete authentication system with all features"
- **✅ Do ask for**: "Create a plan for authentication, then implement it step by step"
- Request a detailed plan first, then implement each step incrementally
- Test each step thoroughly before proceeding to the next
- Validate functionality at each milestone before adding complexity

**Example Incremental Workflow:**

```text
Plan → Implement Step 1 → Test → Implement Step 2 → Test → Continue...
```

### Complex Problem Solving

#### Visualization for Complex Logic

For intricate algorithms, data transformations, or architectural decisions:

- **Request code to visualize the problem**: Create debugging utilities, data loggers, or visual representations
- **Generate comprehensive test data**: Build datasets that expose edge cases and boundary conditions
- **Create debugging tools**: Implement logging, state snapshots, or step-by-step execution traces
- **Document decision trees**: Map out conditional logic and data flow patterns

#### Systematic Debugging Process

When implementations fail or behave unexpectedly:

1. **Add Comprehensive Logging**
   - Request detailed logging at each step of the failing process
   - Log input parameters, intermediate values, and output results
   - Include timing information and execution paths

2. **Capture and Save Logs**
   - Run the failing code with logging enabled
   - Save logs to files for systematic analysis
   - Create reproducible test cases that trigger the issue

3. **Iterative Analysis**
   - Review logs systematically to identify failure points
   - Compare expected vs actual values at each step
   - Repeat the logging and analysis cycle until root cause is found

### Architecture-Aware Development

#### Respect Existing Code Patterns

Before implementing new features:

- **Analyze existing codebase**: Understand current architecture and design patterns
- **Follow established conventions**: Match existing file organization, naming patterns, and separation of concerns
- **Avoid monolithic solutions**: Don't put all changes in one file if the codebase uses distributed architecture
- **Maintain consistency**: Use the same state management, error handling, and data flow patterns

**Example Analysis Request:**

```text
"Before adding this feature, examine how similar functionality is implemented. 
Show me the patterns for file organization, state management, and error handling, 
then implement following these same patterns."
```

### Implementation Guidelines

- Request detailed plans for any change involving 2+ files
- Ask for visualization tools when dealing with complex data transformations
- Implement systematic logging for any failing functionality
- Always analyze existing code patterns before implementing new features
- Test each step independently before proceeding

### Workflow Benefits

- **Reduced Risk**: Small, tested increments minimize breaking changes
- **Better Debugging**: Issues are isolated and easier to diagnose
- **Improved Quality**: Each step can be thoroughly reviewed and optimized
- **Maintainable Code**: Solutions follow established patterns and are easier to understand

## Always Works™ Implementation Standards

**ALWAYS ensure implementations are thoroughly tested and verified before claiming completion.**

### Core Philosophy

- **"Should work" ≠ "does work"** - Pattern matching and theoretical correctness aren't sufficient
- **Problem-solving focus** - The goal is solving problems, not just writing code
- **Verification requirement** - Untested code is just a guess, not a solution
- **User trust priority** - Every failed implementation erodes confidence and wastes time

### The 30-Second Reality Check

**Must answer YES to ALL before claiming completion:**

- ✅ **Did I run/build the code?** - Actual execution, not theoretical analysis
- ✅ **Did I trigger the exact feature I changed?** - Test the specific functionality modified
- ✅ **Did I see the expected result with my own observation?** - Visual/GUI confirmation included
- ✅ **Did I check for error messages?** - Console, logs, and user-facing errors reviewed
- ✅ **Would I bet $100 this works?** - Personal confidence test for thoroughness

### Phrases to Avoid

These phrases indicate insufficient verification:

- ❌ "This should work now"
- ❌ "I've fixed the issue" (especially on 2nd+ attempt)
- ❌ "Try it now" (without testing it first)
- ❌ "The logic is correct so..."
- ❌ "Based on the code, it appears to..."

### Specific Test Requirements

#### UI Changes

- Actually click buttons, links, and submit forms
- Verify visual changes appear correctly
- Test responsive behavior across screen sizes
- Check accessibility features (keyboard navigation, screen readers)

#### API Changes

- Make actual HTTP requests to modified endpoints
- Test both success and error scenarios
- Verify request/response data structures
- Check authentication and authorization

#### Data Changes

- Query the database directly to confirm changes
- Verify data integrity and constraints
- Test edge cases and boundary conditions
- Check for unintended side effects

#### Logic Changes

- Run the specific scenarios that were modified
- Test both expected and unexpected inputs
- Verify error handling paths
- Check performance implications

#### Configuration Changes

- Restart services and verify they load correctly
- Test configuration in target environments
- Validate environment variables and settings
- Check for breaking changes in dependent systems

### The Embarrassment Test

**Ask yourself:** "If the user records themselves trying this feature and it fails, will I feel embarrassed watching their frustration?"

This test ensures you're considering the user experience and the impact of failed implementations.

### Time Reality Check

- **Time saved by skipping tests**: 30 seconds
- **Time wasted when it doesn't work**: 30+ minutes
- **User trust lost**: Immeasurable and difficult to rebuild

### User Perspective

A user encountering the same bug for the third time isn't thinking:

- ❌ "This AI is trying hard and learning"

They're thinking:

- ✅ "Why am I wasting time with this unreliable tool?"

### Implementation Verification Checklist

Before marking any task as complete:

1. **Execute the code** in the actual environment
2. **Test the specific feature** that was modified
3. **Verify expected behavior** through direct observation
4. **Check for errors** in all relevant logs and outputs
5. **Test edge cases** that could break the implementation
6. **Confirm user experience** meets expectations

### Quality Standards

- **Zero tolerance** for claiming completion without verification
- **Thorough testing** before any "this is fixed" statements
- **Honest communication** about what was tested vs. assumed
- **User-first mentality** in all implementation decisions

## Architecture Notes

### Frontend Organization

- States: `entities/`, `ui/`, `views/`
- Components: Domain-organized with index.ts exports
- Hooks: UI-focused in `hooks/ui/`
- Constants: Centralized in `constants/`

### Backend Organization  

- Domains: `server/domains/` with repository → service → routes pattern
- Shared: Common utilities in `server/shared/`
- Config: Centralized configuration in `server/config/`
- Security: Multi-layer validation and error handling

---

*This configuration ensures consistent tooling across all Claude Code sessions.*

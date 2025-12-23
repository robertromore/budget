# Code Review

Review code changes for quality, security, performance, and adherence to project standards.

## Usage

```
/review              # Review staged git changes
/review [file]       # Review specific file
/review --diff       # Review uncommitted changes (staged + unstaged)
```

## Review Process

### 1. Determine Scope

If a file path is provided via `$ARGUMENTS`, review that specific file.
Otherwise, determine what to review:

```bash
# Check for staged changes
git diff --cached --name-only

# If no staged changes, check unstaged
git diff --name-only

# If still nothing, check recent commit
git diff HEAD~1 --name-only
```

### 2. Gather Context

For each file to review:
1. Read the current file contents
2. Read the diff to understand what changed
3. Identify related files that might be affected

### 3. Perform Review

Analyze the code against these categories:

#### Functionality & Logic
- Does the code solve the intended problem correctly?
- Are edge cases and error conditions handled?
- Does it integrate properly with existing code?

#### Code Quality
- Clear variable/function names?
- Appropriate complexity (avoid deep nesting)?
- No code duplication (DRY)?
- Single responsibility principle?

#### Performance
- Efficient algorithms and data structures?
- No N+1 query problems?
- Appropriate memoization/caching?
- Bundle size considerations?

#### Security
- Input validation present?
- No SQL injection or XSS vulnerabilities?
- Proper authentication/authorization?
- No secrets or sensitive data exposed?

#### Project Standards
- Follows naming conventions?
- Uses correct import patterns ($lib/)?
- Matches existing code style?
- TypeScript types properly defined?

#### Testing
- Tests added/updated for new functionality?
- Edge cases covered?
- Test quality (clear intent, proper mocking)?

### 4. Format Output

Present findings with severity levels:

```
## Code Review Summary

### Files Reviewed
- `src/lib/query/accounts.ts` (modified)
- `src/lib/trpc/routes/accounts.ts` (modified)

---

### Blocking Issues

- **[file:line]**: Description of critical issue
  - Why it matters
  - Suggested fix

---

### Important Suggestions

- **[file:line]**: Description of improvement
  - Current: `code snippet`
  - Suggested: `improved code`

---

### Minor Suggestions

- Consider using X instead of Y for consistency
- Future opportunity: could be optimized further

---

### Positive Notes

- Good use of error handling in X
- Clean separation of concerns in Y
```

## Review Guidelines

### Be Constructive
Focus on the code, not the author. Explain the "why" behind suggestions.

### Be Specific
Point to exact lines and provide concrete alternatives when suggesting changes.

### Prioritize
Not everything needs to be fixed. Distinguish blocking issues from nice-to-haves.

### Be Thorough
Check imports, types, tests, and related files - not just the changed lines.

## Technology-Specific Checks

### Svelte Components
- Proper use of Svelte 5 runes ($state, $derived, $effect)
- No memory leaks (cleanup in $effect)
- Accessibility attributes present
- Correct event handling syntax

### tRPC Routes
- Input validation with Zod
- Proper error handling with TRPCError
- Consistent error messages
- Rate limiting on sensitive endpoints

### Drizzle Queries
- Efficient joins (no N+1)
- Proper indexing hints
- Transaction usage where needed
- Soft delete handling

### Query Layer
- Correct use of defineQuery/defineMutation
- Proper cache invalidation
- Error transformation
- Success/error toast messages

$ARGUMENTS

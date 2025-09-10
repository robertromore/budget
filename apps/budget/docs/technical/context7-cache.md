# Context7 Documentation Cache System

The Context7 cache system provides offline access to documentation for major libraries used in the project. This reduces API calls, saves tokens, and provides faster access to documentation during development.

## Overview

The cache system maintains local copies of comprehensive documentation from Context7's MCP server, allowing specialized agents to access documentation without making repeated API calls. This improves development efficiency and reduces token usage.

## Cached Libraries

The cache system maintains offline documentation for:

### 1. LayerChart (`layerchart-docs.md`)
- Component library and data visualization patterns
- Chart types: Bar, Area, Line, Pie, Arc, Scatter
- Performance optimization and debugging
- Integration with Svelte 5 and project architecture

### 2. Svelte 5 (`svelte5-docs.md`)
- Runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`
- Migration patterns from Svelte 4 to Svelte 5
- Component composition and reactive programming
- Integration with SvelteKit

### 3. tRPC (`trpc-docs.md`)
- Router and procedure patterns
- Input validation with Zod schemas
- Error handling and transformation
- Client-server integration and middleware

### 4. SvelteKit (`sveltekit-docs.md`)
- File-based routing and dynamic routes
- Load functions (page and server)
- Form actions and progressive enhancement
- Hooks, adapters, and deployment

## Cache Management Scripts

### Available Commands

```bash
# Get help and instructions for updating cache (MANUAL STEPS REQUIRED)
bun run cache:help

# Check cache status and file information
bun run cache:status

# Clean cache (removes all cached files)
bun run cache:clean
```

**⚠️ IMPORTANT**: The `cache:help` command does NOT automatically update cache files. It provides instructions for manually asking Claude Code to perform updates using Context7 MCP tools.

### Cache Update Process

The `cache:help` script provides instructions for updating cached documentation:

1. **Manual Process via Claude Code:**
   - Ask Claude Code: "Please update the Context7 cache for all libraries"
   - Claude Code will use Context7 MCP tools to fetch latest documentation
   - Documentation is automatically saved to `.context7-cache/` directory

2. **Individual Library Updates:**
   - Request specific library updates: "Update the LayerChart cache"
   - Useful when only certain documentation needs refreshing

## Cache Location and Structure

```
/.context7-cache/
├── layerchart-docs.md    # LayerChart comprehensive documentation
├── svelte5-docs.md       # Svelte 5 runes and patterns  
├── trpc-docs.md          # tRPC routers and procedures
└── sveltekit-docs.md     # SvelteKit framework patterns
```

### File Characteristics

- **Size**: 50KB-200KB each (comprehensive documentation)
- **Format**: Markdown with code examples and API references
- **Content**: Generated from Context7 with 100-400+ code snippets per library
- **Version Control**: Excluded from git (`.gitignore`) but reproducible

## Agent Integration

All specialized agents prioritize cached documentation following this hierarchy:

### 1. Primary Source: Local Cache
- **Location**: `/.context7-cache/*.md` files
- **Advantages**: Fast, offline, token-free access
- **Usage**: Agents check local cache first

### 2. Fallback Source: Context7 MCP Server
- **Usage**: When cache is missing or incomplete
- **Process**: Automatic fallback with Context7 API calls
- **Advantages**: Always up-to-date, comprehensive coverage

### 3. Reference Source: Official Documentation
- **Usage**: For latest updates and official announcements
- **Sites**: LayerChart examples, Svelte docs, tRPC guides, SvelteKit docs

## Integration with Specialized Agents

### LayerChart Specialist
```markdown
**Documentation Resources:**
- Primary: /.context7-cache/layerchart-docs.md
- Fallback: Context7 /techniq/layerchart
- Reference: https://next.layerchart.com/
```

### Backend API Architect
```markdown
**Documentation Resources:**
- Primary: /.context7-cache/trpc-docs.md
- Primary: /.context7-cache/sveltekit-docs.md
- Fallback: Context7 for tRPC and SvelteKit
```

### Frontend UI Specialist
```markdown
**Documentation Resources:**
- Primary: /.context7-cache/svelte5-docs.md
- Primary: /.context7-cache/sveltekit-docs.md
- Fallback: Context7 for Svelte 5 and SvelteKit
```

### Query Layer Specialist
```markdown
**Documentation Resources:**
- Primary: /.context7-cache/trpc-docs.md
- Primary: /.context7-cache/sveltekit-docs.md
- Fallback: Context7 for tRPC and SvelteKit
```

## Benefits

### Development Efficiency
- **Faster Access**: Local file reads vs API requests
- **Offline Capability**: Works without internet connection
- **Reduced Interruptions**: No waiting for API responses

### Cost Optimization
- **Token Savings**: Reduces Context7 API usage
- **Batch Operations**: Single cache update vs multiple API calls
- **Predictable Usage**: Known documentation size vs variable API costs

### Consistency
- **Version Control**: All agents use same cached documentation versions
- **Synchronized Updates**: Cache updates affect all agents simultaneously
- **Reliable Fallback**: Automatic Context7 fallback when needed

## Best Practices

### Update Frequency
- **Regular Updates**: Update cache when library versions change
- **Feature Releases**: Refresh cache for new framework versions
- **Project Milestones**: Update before major development phases

### Cache Verification
```bash
# Check cache status regularly
bun run cache:status

# Sample output:
# ✅ layerchart-docs.md (156K, modified: Jan 21 10:30)
# ✅ svelte5-docs.md (89K, modified: Jan 21 10:31)  
# ✅ trpc-docs.md (134K, modified: Jan 21 10:32)
# ✅ sveltekit-docs.md (201K, modified: Jan 21 10:33)
```

### Troubleshooting

#### Cache Files Missing
```bash
bun run cache:update
# Follow the provided instructions
```

#### Outdated Cache
```bash
bun run cache:clean
bun run cache:update
# Regenerate all cache files
```

#### Large File Sizes
Cache files contain comprehensive documentation and are intentionally large to provide complete offline access. This is normal and expected behavior.

## Technical Implementation

### Script Architecture

```
scripts/
└── context7-cache-help.sh      # Help, instructions, and status
```

### Package.json Integration

```json
{
  "scripts": {
    "cache:help": "./scripts/context7-cache-help.sh",
    "cache:status": "ls -la .context7-cache/",
    "cache:clean": "rm -rf .context7-cache && echo 'Context7 cache cleared'"
  }
}
```

### .gitignore Configuration

```gitignore
# Context7 cache (reproducible)
.context7-cache/
```

## Development Workflow Integration

### New Developer Setup
1. Clone repository
2. Run `bun run cache:help`
3. Follow instructions to ask Claude Code to populate cache
4. Begin development with offline documentation

### CI/CD Integration
- Cache can be regenerated in deployment environments
- No dependency on cached files for builds
- Optional cache population for development containers

### Agent Development
- New agents automatically inherit cache-first documentation access
- No additional configuration required
- Consistent documentation access patterns

## Future Enhancements

### Potential Improvements
- Automatic cache invalidation based on library versions
- Selective cache updates for specific documentation sections
- Cache compression for reduced storage requirements
- Integration with package.json dependency updates

### Monitoring
- Cache hit/miss metrics for optimization
- Documentation access patterns analysis
- Token usage comparison with/without cache

This cache system provides a robust foundation for efficient documentation access while maintaining the flexibility to access the latest information when needed.
# Documentation

This directory contains technical documentation for the budget management application.

## Available Documentation

### Performance and Architecture

- **[Account Performance Optimizations](./account-performance-optimizations.md)**
  - Comprehensive guide to account page performance improvements
  - Smart rendering strategies (client-side vs server-side)
  - Multi-layer caching architecture
  - Performance metrics and troubleshooting

- **[Transaction Update Flow](./transaction-update-flow.md)**
  - Detailed documentation of transaction inline editing system
  - API patterns and error handling
  - Cache invalidation strategies
  - Field mapping and type safety

## Quick Reference

### Performance Thresholds

- **Client-side rendering**: ≤5,000 transactions
- **Server-side rendering**: >5,000 transactions
- **Cache durations**: Account summaries (5min), Transactions (1min)

### Key Architecture Components

- **Smart rendering strategy**: Adaptive client/server-side rendering
- **SvelteKit API routes**: Bypass tRPC client-side parsing issues
- **Comprehensive caching**: Multi-layer cache with strategic invalidation
- **Field mapping system**: UI column ID to database field translation

### Recent Improvements

1. **HTTP 400 Error Resolution**: Fixed transaction update reliability
2. **Performance Optimizations**: Smart rendering based on dataset size
3. **Cache Management**: Comprehensive invalidation after updates
4. **Code Cleanup**: Removed debugging statements and unused imports

## Contributing

When adding new documentation:

1. Follow [Google's documentation style guide](https://google.github.io/styleguide/docguide/style.html)
2. Use proper markdown formatting (run `bunx markdownlint-cli --fix` to validate)
3. Include code examples and practical implementation details
4. Add troubleshooting sections for common issues
5. Update this README with new documentation links

## Implementation Status

- ✅ Account performance optimizations
- ✅ Transaction update flow improvements
- ✅ Cache invalidation system
- ✅ Error handling enhancements
- 🔄 Additional performance monitoring (planned)
- 🔄 Real-time synchronization documentation (planned)
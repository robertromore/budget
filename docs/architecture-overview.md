# Architecture Overview

This document provides a comprehensive overview of the SvelteKit budget management application architecture, which implements a domain-driven design pattern with clear separation between frontend and backend concerns.

[TOC]

## System Architecture

The application follows a modern full-stack architecture built on SvelteKit with TypeScript throughout. The system is organized into distinct domains with well-defined boundaries and responsibilities.

### Core Technologies

- **Frontend**: SvelteKit 2.x with Svelte 5 runes for reactivity
- **Backend**: Node.js with tRPC for type-safe API communication
- **Database**: SQLite with Drizzle ORM for type-safe database operations
- **Runtime**: Bun for package management and execution
- **Testing**: Vitest for unit tests, Playwright for end-to-end testing

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────┬─────────────────┬─────────────────────────────┤
│     Views       │       UI        │      Entities/State         │
│   (/routes)     │  (/components)  │     (/states)              │
└─────────────────┼─────────────────┼─────────────────────────────┘
                  │                 │
┌─────────────────┼─────────────────┼─────────────────────────────┐
│                 │     tRPC Client │                             │
│                 └─────────────────┘                             │
├─────────────────────────────────────────────────────────────────┤
│                     Backend Layer                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    Domains      │    Shared       │    Configuration            │
│  (Repository→   │  (Middleware,   │   (Database, Auth,          │
│   Service→      │   Types,        │    Validation)              │
│   Routes)       │   Utils)        │                             │
└─────────────────┼─────────────────┼─────────────────────────────┘
                  │                 │
┌─────────────────┼─────────────────┼─────────────────────────────┐
│                 │   Drizzle ORM   │                             │
│                 └─────────────────┘                             │
├─────────────────────────────────────────────────────────────────┤
│                    SQLite Database                              │
└─────────────────────────────────────────────────────────────────┘
```

## Domain-Driven Design

The application implements domain-driven design principles with clear domain boundaries and consistent patterns across all business entities.

### Domain Organization

Each business domain follows a consistent structure:

```
src/lib/server/domains/{domain}/
├── index.ts          # Domain exports
├── repository.ts     # Data access layer
├── services.ts       # Business logic layer
├── routes.ts         # tRPC route definitions
└── validation.ts     # Domain-specific validation
```

### Currently Implemented Domains

1. **Accounts**: Fully implemented with comprehensive CRUD operations
2. **Categories**: Structure defined, implementation pending
3. **Payees**: Structure defined, implementation pending
4. **Schedules**: Structure defined, implementation pending
5. **Transactions**: Structure defined, implementation pending
6. **Views**: Structure defined, implementation pending

## Data Flow Architecture

The application follows a unidirectional data flow pattern:

### Request Flow

1. **Client Request**: User interaction triggers tRPC client call
2. **Middleware Pipeline**: Request passes through authentication, validation, and rate limiting
3. **Route Handler**: tRPC route receives typed request
4. **Service Layer**: Business logic processing and validation
5. **Repository Layer**: Database operations through Drizzle ORM
6. **Response**: Type-safe response sent back to client

### State Management Flow

1. **Server State**: Initial data loaded via SvelteKit's load functions
2. **Client State**: Managed through Svelte 5 runes in organized state classes
3. **UI Updates**: Reactive updates through state changes
4. **Persistence**: Changes persisted through tRPC mutations

## Security Architecture

The application implements comprehensive security measures at multiple layers:

### Authentication & Authorization

- **Session-based authentication**: Secure session management
- **Role-based access control**: Admin and user roles with appropriate permissions
- **Route protection**: Authenticated and admin-only routes

### Rate Limiting

Multiple rate limiting strategies based on operation sensitivity:

- **Standard mutations**: Basic rate limiting for common operations
- **Bulk operations**: Special limits for batch operations
- **Strict operations**: Enhanced protection for sensitive operations
- **Admin operations**: Separate rate limits for administrative functions

### Input Validation

- **Schema validation**: Zod schemas for all inputs
- **Type safety**: TypeScript enforcement throughout the stack
- **SQL injection prevention**: Drizzle ORM with parameterized queries
- **Input sanitization**: Automatic sanitization of user inputs

## Error Handling Strategy

Comprehensive error handling with typed domain errors:

### Error Types

- **ValidationError**: Input validation failures
- **NotFoundError**: Resource not found scenarios
- **DatabaseError**: Database operation failures
- **AuthenticationError**: Authentication failures
- **AuthorizationError**: Authorization failures

### Error Propagation

1. **Database Layer**: Catches and wraps database errors
2. **Service Layer**: Business logic error handling
3. **Route Layer**: HTTP status code mapping
4. **Client Layer**: User-friendly error messages

## Performance Considerations

### Database Optimization

- **Connection pooling**: Efficient database connection management
- **Query optimization**: Indexed queries and efficient joins
- **Bulk operations**: Optimized batch processing
- **Soft deletes**: Maintains referential integrity while supporting "undo" operations

### Frontend Optimization

- **Lazy loading**: Components and routes loaded on demand
- **State management**: Efficient reactive state with minimal re-renders
- **Type safety**: Compile-time error detection
- **Bundle optimization**: Tree shaking and code splitting

## Testing Architecture

Comprehensive testing strategy covering all application layers:

### Test Types

- **Unit Tests**: Business logic and utility functions
- **Integration Tests**: API endpoints and database operations
- **End-to-End Tests**: Complete user workflows
- **Security Tests**: Authentication, authorization, and rate limiting

### Test Organization

```
tests/
├── unit/           # Unit tests for utilities and business logic
├── integration/    # API and database integration tests
└── e2e/           # End-to-end user workflow tests (Playwright)
```

## Development Workflow

### Code Organization Principles

1. **Domain separation**: Clear boundaries between business domains
2. **Layer separation**: Distinct repository, service, and route layers
3. **Type safety**: TypeScript throughout with strict configuration
4. **Consistent patterns**: Standardized approaches across all domains

### Build and Deployment

- **Development**: Bun-based development server with hot reload
- **Testing**: Automated test suites with CI/CD integration
- **Building**: Optimized production builds
- **Database**: Migration-based schema management

## Scalability Considerations

The architecture is designed to scale both in complexity and performance:

### Horizontal Scaling

- **Stateless design**: Session storage can be externalized
- **Database scaling**: SQLite for development, easily migrated to PostgreSQL
- **API scaling**: tRPC procedures can be distributed across services

### Vertical Scaling

- **Modular domains**: New business domains follow established patterns
- **Plugin architecture**: Extensions through consistent interfaces
- **Configuration management**: Environment-based configuration

## See Also

- [Frontend Architecture](frontend-architecture.md)
- [Backend Architecture](backend-architecture.md)
- [Development Guidelines](development-guidelines.md)
- [Project Standards](project-standards.md)
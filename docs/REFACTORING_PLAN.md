# Refactoring Plan

## Phase 1: tRPC Cleanup & Consolidation (Week 1)
**Goal**: Clean up and optimize existing tRPC implementation

⚠️ **Discovery**: oRPC system doesn't exist yet - we need to clean up tRPC first

### Tasks:
- [ ] **Audit tRPC usage**: Document all current tRPC dependencies
- [ ] **Consolidate tRPC patterns**: Standardize how tRPC is used across the app
- [ ] **Remove unused tRPC code**: Clean up any dead code or redundant patterns
- [ ] **Document tRPC architecture**: Create clear docs for current API layer
- [ ] **Prepare for future oRPC migration**: Structure code for easier future migration

**Impact**: 🔥 High - Eliminates confusion and sets foundation for future migration

---

## Phase 2: Component Organization (Week 2)  
**Goal**: Logical component grouping

### Tasks:
- [ ] **Create domain folders**:
  ```
  lib/components/business/
  ├── accounts/
  ├── transactions/
  ├── schedules/
  └── shared/
  ```
- [ ] **Move account components** from scattered locations
- [ ] **Consolidate table components** from `/routes/accounts/[id]/(components)/`
- [ ] **Update all imports** to new locations

**Impact**: 🔥 High - Much easier navigation

---

## Phase 3: State Management (Week 3)
**Goal**: Clear state ownership

### Tasks:
- [ ] **Rename `/lib/states/` → `/lib/stores/`** (conventional naming)
- [ ] **Group stores by domain**:
  ```
  lib/stores/
  ├── entities/        # Business data
  ├── ui/             # UI state
  └── app/            # Global app state
  ```
- [ ] **Document store relationships**
- [ ] **Create store composition patterns**

**Impact**: 🟡 Medium - Better maintainability

---

## Phase 4: Route Simplification (Week 4)
**Goal**: Cleaner route structure

### Tasks:
- [ ] **Flatten deep nesting**: Move components out of route folders
- [ ] **Group routes logically**:
  ```
  routes/
  ├── (app)/          # Main application
  ├── api/            # API endpoints  
  └── (auth)/         # Future auth routes
  ```
- [ ] **Standardize page structure**
- [ ] **Create layout consistency**

**Impact**: 🟡 Medium - Easier route management

---

## Phase 5: Developer Experience (Week 5)
**Goal**: Easy development workflow

### Tasks:
- [ ] **Create component index files** for easier imports
- [ ] **Add barrel exports**: `/lib/components/index.ts`
- [ ] **Generate API documentation**
- [ ] **Create development helpers**:
  - Debug utilities
  - Mock data generators
  - Component playground

**Impact**: 🟢 Low - Quality of life improvements

---

## Quick Wins (Do First)
1. **Create docs folder** ✅ (Done)
2. **Remove unused tRPC references**
3. **Add README sections for**:
   - Getting started
   - Architecture overview  
   - Common tasks
4. **Create `.vscode/settings.json`** with useful settings

## Success Metrics
- [ ] **Find any component** in < 30 seconds
- [ ] **Add new feature** following clear pattern
- [ ] **Onboard new developer** with documentation alone
- [ ] **No duplicate or dead code**
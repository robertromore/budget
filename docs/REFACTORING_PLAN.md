# Refactoring Plan

## Phase 1: API Consolidation (Week 1)
**Goal**: Single source of truth for API calls

### Tasks:
- [ ] **Remove tRPC**: Delete `/lib/trpc/` completely
- [ ] **Centralize oRPC**: Ensure all components use oRPC client
- [ ] **Update imports**: Replace any remaining tRPC imports
- [ ] **Test API coverage**: Verify all CRUD operations work

**Impact**: 🔥 High - Eliminates major confusion source

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
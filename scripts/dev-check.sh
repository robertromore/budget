#!/bin/bash

# Development Health Check Script
# Runs all quality checks before committing code

set -e  # Exit on any error

echo "🔍 Running Development Health Check..."
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    exit 1
fi

# 1. Check TypeScript compilation
echo ""
echo "1️⃣ Checking TypeScript compilation..."
bunx svelte-kit sync > /dev/null 2>&1
if bunx svelte-check --tsconfig ./tsconfig.json > /dev/null 2>&1; then
    print_status 0 "TypeScript compilation successful"
else
    echo "Running svelte-check with output:"
    bunx svelte-check --tsconfig ./tsconfig.json
    print_status 1 "TypeScript compilation failed"
fi

# 2. Run ESLint
echo ""
echo "2️⃣ Running ESLint..."
if bunx eslint src/ tests/ --ext .ts,.js,.svelte > /dev/null 2>&1; then
    print_status 0 "ESLint passed"
else
    echo "ESLint issues found. Running with output:"
    bunx eslint src/ tests/ --ext .ts,.js,.svelte
    print_status 1 "ESLint failed"
fi

# 3. Check Prettier formatting
echo ""
echo "3️⃣ Checking Prettier formatting..."
if bunx prettier --check . > /dev/null 2>&1; then
    print_status 0 "Code formatting is correct"
else
    print_warning "Code formatting issues found. Run 'bun run format' to fix."
    bunx prettier --check .
    print_status 1 "Prettier check failed"
fi

# 4. Run tests
echo ""
echo "4️⃣ Running tests..."
if bun run test:bun > /dev/null 2>&1; then
    print_status 0 "Unit tests passed"
else
    echo "Test failures found. Running with output:"
    bun run test:bun
    print_status 1 "Unit tests failed"
fi

# 5. Check for common issues
echo ""
echo "5️⃣ Checking for common issues..."

# Check for console.log statements (excluding allowed ones)
if grep -r "console\.log\|console\.debug\|debugger" src/ --include="*.ts" --include="*.js" --include="*.svelte" > /dev/null 2>&1; then
    print_warning "Found console.log/debugger statements in src/"
    grep -r "console\.log\|console\.debug\|debugger" src/ --include="*.ts" --include="*.js" --include="*.svelte"
else
    print_status 0 "No console.log/debugger statements found"
fi

# Check for TODO/FIXME comments
if grep -r "TODO\|FIXME\|XXX" src/ --include="*.ts" --include="*.js" --include="*.svelte" > /dev/null 2>&1; then
    print_warning "Found TODO/FIXME comments:"
    grep -r "TODO\|FIXME\|XXX" src/ --include="*.ts" --include="*.js" --include="*.svelte"
fi

# 6. Check bundle size (if build succeeds)
echo ""
echo "6️⃣ Checking build..."
if bunx vite build > /dev/null 2>&1; then
    print_status 0 "Build successful"
    echo "📦 Build size:"
    if [ -d "build" ]; then
        du -sh build/
    fi
else
    print_status 1 "Build failed"
fi

echo ""
echo -e "${GREEN}🎉 All checks passed! Ready to commit.${NC}"
echo "======================================"
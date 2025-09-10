#!/bin/bash

# Development Setup Script
# Sets up a fresh development environment

set -e  # Exit on any error

echo "🚀 Setting up development environment..."
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    exit 1
fi

# 1. Check if Bun is installed
echo ""
echo "1️⃣ Checking Bun installation..."
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    print_status 0 "Bun is installed (version: $BUN_VERSION)"
else
    echo -e "${RED}❌ Bun is not installed${NC}"
    print_info "Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# 2. Install dependencies
echo ""
echo "2️⃣ Installing dependencies..."
print_info "Running bun install..."
if bun install; then
    print_status 0 "Dependencies installed successfully"
else
    print_status 1 "Failed to install dependencies"
fi

# 3. Set up database
echo ""
echo "3️⃣ Setting up database..."
print_info "Generating database schema..."
if bun run db:generate; then
    print_status 0 "Database schema generated"
else
    print_status 1 "Failed to generate database schema"
fi

print_info "Running database migrations..."
if bun run db:migrate; then
    print_status 0 "Database migrations completed"
else
    print_status 1 "Database migrations failed"
fi

print_info "Seeding database with sample data..."
if bun run db:seed; then
    print_status 0 "Database seeded successfully"
else
    print_warning "Database seeding failed (this might be expected for existing databases)"
fi

# 4. Run initial checks
echo ""
echo "4️⃣ Running initial health checks..."
print_info "Checking TypeScript compilation..."
bunx svelte-kit sync
if bunx svelte-check --tsconfig ./tsconfig.json > /dev/null 2>&1; then
    print_status 0 "TypeScript compilation successful"
else
    print_warning "TypeScript compilation has issues (check manually)"
fi

print_info "Checking code formatting..."
if bunx prettier --check . > /dev/null 2>&1; then
    print_status 0 "Code formatting is correct"
else
    print_info "Formatting code..."
    bunx prettier --write .
    print_status 0 "Code formatted successfully"
fi

# 5. Create useful aliases/shortcuts
echo ""
echo "5️⃣ Creating development shortcuts..."

# Add npm scripts if they don't exist
print_info "Updating package.json scripts..."

# Check if our custom scripts exist and add them
if ! grep -q "dev:check" package.json; then
    print_info "Adding dev:check script to package.json"
    # This would require jq or manual editing - for now just inform user
    print_warning "Add this script to package.json: \"dev:check\": \"./scripts/dev-check.sh\""
fi

if ! grep -q "dev:setup" package.json; then
    print_info "Adding dev:setup script to package.json"
    print_warning "Add this script to package.json: \"dev:setup\": \"./scripts/setup-dev.sh\""
fi

# 6. Final setup
echo ""
echo "6️⃣ Final setup steps..."

print_info "Creating .env.local if it doesn't exist..."
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Local development environment variables
# Copy from .env.example and customize as needed

# Database
DATABASE_URL="file:./drizzle/db/sqlite.db"

# Development
NODE_ENV="development"
EOF
    print_status 0 "Created .env.local template"
else
    print_status 0 ".env.local already exists"
fi

# 7. Success message
echo ""
echo -e "${GREEN}🎉 Development environment setup complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Run 'bun run dev' to start the development server"
echo "2. Run './scripts/dev-check.sh' before committing code"
echo "3. Check .env.local and update as needed"
echo ""
echo "Useful commands:"
echo "• bun run dev          - Start development server"
echo "• bun run build        - Build for production"
echo "• bun run test         - Run all tests"
echo "• bun run lint         - Check code formatting"
echo "• bun run format       - Fix code formatting"
echo "• bun run db:migrate   - Run database migrations"
echo "• bun run db:seed      - Seed database with sample data"
echo ""
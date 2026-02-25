# Development Scripts

This directory contains automation scripts to improve the developer experience
and maintain code quality.

## Available Scripts

### 🔍 `dev-check.sh`

**Purpose:** Comprehensive health check before committing code  
**Usage:** `./scripts/dev-check.sh` or `bun run dev:check`

**What it does:**

- ✅ TypeScript compilation check
- ✅ ESLint validation
- ✅ Prettier formatting check
- ✅ Unit test execution
- ✅ Build verification
- ⚠️ Scans for console.log/debugger statements
- ⚠️ Identifies TODO/FIXME comments

**When to use:**

- Before creating commits
- Before pushing code
- After major changes
- As part of CI/CD pipeline

### 🚀 `setup-dev.sh`

**Purpose:** One-command development environment setup  
**Usage:** `./scripts/setup-dev.sh` or `bun run dev:setup`

**What it does:**

- ✅ Verifies Bun installation
- ✅ Installs project dependencies
- ✅ Sets up database (schema + migrations + seeding)
- ✅ Runs initial health checks
- ✅ Formats code if needed
- ✅ Creates .env.local template

**When to use:**

- First-time project setup
- After cloning the repository
- When onboarding new team members
- After major dependency updates

### ⚡ `component-generator.sh`

**Purpose:** Generate new components using standardized templates  
**Usage:** `./scripts/component-generator.sh [TYPE] [NAME] [PATH]`

**Component Types:**

- `component` - Basic reusable component
- `form` - Form component with validation
- `compound` - Complex compound component
- `datatable` - Data table component

**Examples:**

```bash
# Generate a basic button component
./scripts/component-generator.sh component Button src/lib/components/ui

# Generate a user form component
./scripts/component-generator.sh form UserForm src/routes/users/(forms)

# Generate a compound list component
./scripts/component-generator.sh compound EditableList src/lib/components/compound
```

**Features:**

- 📝 Uses project templates from `.templates/` directory
- 🔄 Automatic name case conversion (PascalCase, camelCase, kebab-case)
- 📁 Creates directory structure if needed
- 🔗 Updates `index.ts` barrel exports automatically
- ⚠️ Prevents accidental overwrites

## NPM Scripts Integration

These scripts are integrated into `package.json` for convenient access:

```json
{
  "scripts": {
    "dev:check": "./scripts/dev-check.sh",
    "dev:setup": "./scripts/setup-dev.sh",
    "generate:component": "./scripts/component-generator.sh"
  }
}
```

## Usage Recommendations

### Before Every Commit

```bash
bun run dev:check
```

### New Developer Onboarding

```bash
git clone <repository>
cd <project>
bun run dev:setup
```

### Creating New Components

```bash
# Use the generator for consistency
bun run generate:component component MyButton src/lib/components/ui

# Edit the generated file to implement your logic
code src/lib/components/ui/my-button.svelte
```

### Daily Development Workflow

```bash
# Start development
bun run dev

# Before committing changes
bun run dev:check

# If checks pass, commit
git add .
git commit -m "Add new feature"
```

## Script Features

### Error Handling

- ✅ All scripts use `set -e` for fail-fast behavior
- ✅ Colored output for better readability
- ✅ Detailed error messages and suggestions

### Safety Measures

- ✅ Directory validation before execution
- ✅ Confirmation prompts for destructive actions
- ✅ Backup recommendations for important operations

### Output Quality

- 🎨 Color-coded success/warning/error messages
- 📊 Progress indicators for long-running operations
- 📋 Helpful next-steps suggestions

## Customization

### Adding New Scripts

1. Create the script in the `scripts/` directory
2. Make it executable: `chmod +x scripts/your-script.sh`
3. Add to `package.json` scripts section
4. Update this README

### Modifying Existing Scripts

- Follow the established patterns for error handling and output
- Test thoroughly before committing changes
- Update documentation as needed

### Environment-Specific Adjustments

Scripts automatically detect the environment and adjust behavior:

- Development vs. production builds
- Different database configurations
- OS-specific commands when necessary

## Troubleshooting

### Permission Errors

```bash
chmod +x scripts/*.sh
```

### Path Issues

Scripts should be run from the project root directory.

### Bun Not Found

Install Bun: `curl -fsSL https://bun.sh/install | bash`

### Database Issues

Reset database: `bun run db:restart`

## Contributing

When adding new automation scripts:

1. Follow the existing naming convention
2. Include comprehensive error handling
3. Add colored output for better UX
4. Document the script purpose and usage
5. Test on different environments
6. Update this README file

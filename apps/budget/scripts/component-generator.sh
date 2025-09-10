#!/bin/bash

# Component Generator Script
# Generates new components using our standardized templates

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Help function
show_help() {
    echo "Component Generator"
    echo "=================="
    echo ""
    echo "Usage: $0 [TYPE] [NAME] [PATH]"
    echo ""
    echo "Types:"
    echo "  component  - Generate a basic component"
    echo "  form       - Generate a form component"
    echo "  compound   - Generate a compound component"
    echo "  datatable  - Generate a data table component"
    echo ""
    echo "Examples:"
    echo "  $0 component MyButton src/lib/components/ui"
    echo "  $0 form UserForm src/routes/users/(forms)"
    echo "  $0 compound EditableList src/lib/components/compound"
    echo ""
}

# Check arguments
if [ $# -lt 2 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

TYPE=$1
NAME=$2
PATH=${3:-"src/lib/components"}

# Convert component name to different cases
KEBAB_NAME=$(echo $NAME | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr '[:upper:]' '[:lower:]')
PASCAL_NAME=$(echo $NAME | sed 's/\b\w/\U&/g' | sed 's/-//g')
CAMEL_NAME=$(echo $PASCAL_NAME | sed 's/^\w/\l&/')

print_info "Generating $TYPE component: $NAME"
print_info "Component will be created at: $PATH/$KEBAB_NAME.svelte"

# Check if templates directory exists
if [ ! -d ".templates" ]; then
    print_error "Templates directory not found. Make sure you're in the project root."
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$PATH"

# Select template based on type
TEMPLATE_FILE=""
case $TYPE in
    "component")
        TEMPLATE_FILE=".templates/component-template.svelte"
        ;;
    "form")
        TEMPLATE_FILE=".templates/form-component-template.svelte"
        ;;
    "compound")
        TEMPLATE_FILE=".templates/compound-component-template.svelte"
        ;;
    "datatable")
        TEMPLATE_FILE=".templates/data-table-component-template.svelte"
        ;;
    *)
        print_error "Unknown component type: $TYPE"
        show_help
        exit 1
        ;;
esac

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Create the component file
TARGET_FILE="$PATH/$KEBAB_NAME.svelte"

if [ -f "$TARGET_FILE" ]; then
    print_warning "Component already exists: $TARGET_FILE"
    echo -n "Do you want to overwrite it? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "Cancelled component generation"
        exit 0
    fi
fi

# Copy template and replace placeholders
print_info "Copying template and customizing..."

# Basic placeholder replacements
sed \
    -e "s/Component/${PASCAL_NAME}/g" \
    -e "s/component/${CAMEL_NAME}/g" \
    -e "s/COMPONENT/${NAME^^}/g" \
    -e "s/SomeType/${PASCAL_NAME}Type/g" \
    -e "s/someState/${CAMEL_NAME}State/g" \
    -e "s/EntitySchema/${PASCAL_NAME}Schema/g" \
    -e "s/entity/${CAMEL_NAME}/g" \
    -e "s/Entity/${PASCAL_NAME}/g" \
    "$TEMPLATE_FILE" > "$TARGET_FILE"

print_success "Component created: $TARGET_FILE"

# If it's in lib/components, check if we need to update an index.ts file
COMPONENT_DIR=$(dirname "$TARGET_FILE")
INDEX_FILE="$COMPONENT_DIR/index.ts"

if [[ "$PATH" == *"src/lib/components"* ]]; then
    print_info "Checking if index.ts needs updating..."
    
    if [ -f "$INDEX_FILE" ]; then
        # Check if export already exists
        if ! grep -q "export.*$KEBAB_NAME" "$INDEX_FILE"; then
            echo "export { default as $PASCAL_NAME } from \"./$KEBAB_NAME.svelte\";" >> "$INDEX_FILE"
            print_success "Added export to $INDEX_FILE"
        else
            print_info "Export already exists in $INDEX_FILE"
        fi
    else
        print_warning "No index.ts found in $COMPONENT_DIR"
        echo -n "Create index.ts with component export? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "export { default as $PASCAL_NAME } from \"./$KEBAB_NAME.svelte\";" > "$INDEX_FILE"
            print_success "Created $INDEX_FILE with component export"
        fi
    fi
fi

# Provide next steps
echo ""
print_success "Component generation complete!"
echo ""
echo "Next steps:"
echo "1. Edit $TARGET_FILE to implement your component logic"
echo "2. Replace placeholder imports with actual dependencies"
echo "3. Update type definitions to match your use case"
echo "4. Add component to Storybook if applicable"
echo ""
echo "Component details:"
echo "• File: $TARGET_FILE"
echo "• Pascal case: $PASCAL_NAME"
echo "• Kebab case: $KEBAB_NAME"
echo "• Camel case: $CAMEL_NAME"
echo ""
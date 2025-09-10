#!/bin/bash

# Bundle Analysis Script
# Analyzes the production bundle for size optimization opportunities

set -e  # Exit on any error

echo "📊 Bundle Analysis Report"
echo "========================"

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

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in project root directory"
    exit 1
fi

# Build the project for production
echo ""
print_info "Building production bundle..."
if bun run build > /dev/null 2>&1; then
    print_success "Production build completed"
else
    print_error "Production build failed"
    bun run build
    exit 1
fi

# Check if build directory exists
if [ ! -d "build" ]; then
    print_error "Build directory not found"
    exit 1
fi

echo ""
echo "📦 Bundle Size Analysis"
echo "======================"

# Total bundle size
TOTAL_SIZE=$(du -sh build/ | cut -f1)
print_info "Total bundle size: $TOTAL_SIZE"

# JavaScript files analysis
echo ""
echo "🔍 JavaScript Files:"
echo "-------------------"
if find build -name "*.js" -type f | head -10 | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    BASENAME=$(basename "$file")
    echo "  📄 $BASENAME: $SIZE"
done; then
    JS_COUNT=$(find build -name "*.js" -type f | wc -l | tr -d ' ')
    JS_SIZE=$(find build -name "*.js" -type f -exec du -ch {} + | tail -1 | cut -f1)
    print_info "Total JS files: $JS_COUNT ($JS_SIZE)"
fi

# CSS files analysis
echo ""
echo "🎨 CSS Files:"
echo "------------"
if find build -name "*.css" -type f | head -10 | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    BASENAME=$(basename "$file")
    echo "  🎨 $BASENAME: $SIZE"
done; then
    CSS_COUNT=$(find build -name "*.css" -type f | wc -l | tr -d ' ')
    CSS_SIZE=$(find build -name "*.css" -type f -exec du -ch {} + | tail -1 | cut -f1)
    print_info "Total CSS files: $CSS_COUNT ($CSS_SIZE)"
fi

# Asset files analysis
echo ""
echo "🖼️ Asset Files:"
echo "--------------"
if find build -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.svg" -o -name "*.ico" -o -name "*.woff" -o -name "*.woff2" \) | head -10 | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    BASENAME=$(basename "$file")
    echo "  🖼️  $BASENAME: $SIZE"
done; then
    ASSET_COUNT=$(find build -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.svg" -o -name "*.ico" -o -name "*.woff" -o -name "*.woff2" \) | wc -l | tr -d ' ')
    if [ "$ASSET_COUNT" -gt 0 ]; then
        ASSET_SIZE=$(find build -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.svg" -o -name "*.ico" -o -name "*.woff" -o -name "*.woff2" \) -exec du -ch {} + | tail -1 | cut -f1)
        print_info "Total asset files: $ASSET_COUNT ($ASSET_SIZE)"
    else
        print_info "No asset files found"
    fi
fi

# Largest files overall
echo ""
echo "📈 Largest Files (Top 10):"
echo "============================"
find build -type f -exec du -h {} + | sort -hr | head -10 | while read size file; do
    basename_file=$(basename "$file")
    echo "  📁 $basename_file: $size"
done

# Analysis and recommendations
echo ""
echo "🔍 Analysis & Recommendations"
echo "============================="

# Check for large JavaScript files
LARGE_JS_FILES=$(find build -name "*.js" -size +100k | wc -l | tr -d ' ')
if [ "$LARGE_JS_FILES" -gt 0 ]; then
    print_warning "Found $LARGE_JS_FILES JavaScript files larger than 100KB"
    echo "  💡 Consider code splitting or lazy loading for large components"
fi

# Check for unoptimized images
LARGE_IMAGES=$(find build -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -size +500k | wc -l | tr -d ' ')
if [ "$LARGE_IMAGES" -gt 0 ]; then
    print_warning "Found $LARGE_IMAGES images larger than 500KB"
    echo "  💡 Consider image optimization or next-gen formats (WebP, AVIF)"
fi

# Check for duplicate files (by size)
echo ""
echo "🔄 Checking for potential duplicates:"
if command -v gdu >/dev/null 2>&1; then
    # Use GNU du if available (via brew install coreutils)
    find build -type f -exec gdu -b {} + | sort -n | uniq -d -f1 | if [ $(wc -l) -gt 0 ]; then
        print_warning "Found files with identical sizes (potential duplicates)"
        while read size file; do
            basename_file=$(basename "$file")
            echo "  🔁 $basename_file: $size bytes"
        done
    else
        print_success "No obvious duplicate files detected"
    fi
else
    # Fallback for macOS built-in du (uses different approach)
    TEMP_FILE="/tmp/bundle_sizes.tmp"
    find build -type f -exec du -k {} + | sort -n > "$TEMP_FILE"
    if awk '{print $1}' "$TEMP_FILE" | uniq -d | wc -l | grep -q -v '^[[:space:]]*0'; then
        print_warning "Found files with similar sizes (potential duplicates)"
        awk '{print $1}' "$TEMP_FILE" | uniq -d | while read size; do
            echo "  🔁 Files with ${size}KB:"
            grep "^$size" "$TEMP_FILE" | while read s file; do
                basename_file=$(basename "$file")
                echo "    📄 $basename_file"
            done
        done
    else
        print_success "No obvious duplicate files detected"
    fi
    rm -f "$TEMP_FILE"
fi

# Bundle optimization suggestions
echo ""
echo "💡 Optimization Suggestions"
echo "==========================="
echo "1. 📦 Code Splitting:"
echo "   - Use dynamic imports for non-critical components"
echo "   - Implement route-based code splitting"
echo ""
echo "2. 🗜️ Compression:"
echo "   - Enable gzip/brotli compression on your server"
echo "   - Consider using Vite's built-in compression plugin"
echo ""
echo "3. 🌳 Tree Shaking:"
echo "   - Use named imports instead of default imports"
echo "   - Remove unused dependencies from package.json"
echo ""
echo "4. 📱 Progressive Loading:"
echo "   - Lazy load images and components below the fold"
echo "   - Use intersection observer for deferred loading"
echo ""
echo "5. 📊 Monitoring:"
echo "   - Set up bundle size monitoring in CI/CD"
echo "   - Use tools like bundlephobia.com to check dependency sizes"

# Performance budget check
echo ""
echo "⚡ Performance Budget Check"
echo "=========================="

# Extract numeric value from total size (remove unit)
SIZE_VALUE=$(echo $TOTAL_SIZE | sed 's/[^0-9.]//g')
SIZE_UNIT=$(echo $TOTAL_SIZE | sed 's/[0-9.]//g')

# Convert to KB for comparison
case $SIZE_UNIT in
    "K")
        SIZE_KB=$SIZE_VALUE
        ;;
    "M")
        SIZE_KB=$(awk "BEGIN {print $SIZE_VALUE * 1024}")
        ;;
    "G")
        SIZE_KB=$(awk "BEGIN {print $SIZE_VALUE * 1048576}")
        ;;
    *)
        SIZE_KB=$SIZE_VALUE  # Assume bytes, convert to KB
        SIZE_KB=$(awk "BEGIN {print $SIZE_KB / 1024}")
        ;;
esac

# Performance budget thresholds
BUDGET_GOOD="500"     # 500KB
BUDGET_WARNING="1000" # 1MB
BUDGET_CRITICAL="2000" # 2MB

# Compare with budget (using awk for floating point comparison)
if awk "BEGIN {exit ($SIZE_KB <= $BUDGET_GOOD) ? 0 : 1}"; then
    print_success "Bundle size is within good performance budget (< 500KB)"
elif awk "BEGIN {exit ($SIZE_KB <= $BUDGET_WARNING) ? 0 : 1}"; then
    print_warning "Bundle size is acceptable but consider optimization (< 1MB)"
elif awk "BEGIN {exit ($SIZE_KB <= $BUDGET_CRITICAL) ? 0 : 1}"; then
    print_warning "Bundle size is large and may impact performance (< 2MB)"
else
    print_error "Bundle size exceeds recommended limits (> 2MB)"
    echo "  🚨 Immediate optimization recommended for production"
fi

echo ""
print_success "Bundle analysis completed!"
echo ""
echo "💾 Tip: Run this analysis regularly to monitor bundle growth"
echo "🔄 Consider adding 'bun run analyze' to your CI/CD pipeline"
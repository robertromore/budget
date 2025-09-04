#!/bin/bash

# Performance Monitoring Script
# Tracks bundle size changes and performance metrics over time

set -e  # Exit on any error

echo "📈 Performance Monitoring"
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

# Create performance tracking directory
PERF_DIR=".performance"
mkdir -p "$PERF_DIR"

# Get current timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
CURRENT_REPORT="$PERF_DIR/bundle-$TIMESTAMP.json"

print_info "Running bundle analysis..."

# Build the project for accurate measurements
if bun run build > /dev/null 2>&1; then
    print_success "Build completed successfully"
else
    print_error "Build failed - cannot measure bundle size"
    exit 1
fi

# Extract metrics
if [ -d "build" ]; then
    TOTAL_SIZE=$(du -sh build/ | cut -f1)
    JS_SIZE=$(find build -name "*.js" -type f -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "0K")
    CSS_SIZE=$(find build -name "*.css" -type f -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1 || echo "0K")
    JS_COUNT=$(find build -name "*.js" -type f | wc -l | tr -d ' ')
    CSS_COUNT=$(find build -name "*.css" -type f | wc -l | tr -d ' ')
    
    # Convert sizes to KB for JSON storage
    TOTAL_KB=$(echo "$TOTAL_SIZE" | sed 's/[^0-9.]//g')
    TOTAL_UNIT=$(echo "$TOTAL_SIZE" | sed 's/[0-9.]//g')
    
    case $TOTAL_UNIT in
        "M") TOTAL_KB=$(awk "BEGIN {print $TOTAL_KB * 1024}") ;;
        "G") TOTAL_KB=$(awk "BEGIN {print $TOTAL_KB * 1048576}") ;;
        *) ;; # Assume KB
    esac
    
    JS_KB=$(echo "$JS_SIZE" | sed 's/[^0-9.]//g')
    JS_UNIT=$(echo "$JS_SIZE" | sed 's/[0-9.]//g')
    
    case $JS_UNIT in
        "M") JS_KB=$(awk "BEGIN {print $JS_KB * 1024}") ;;
        "G") JS_KB=$(awk "BEGIN {print $JS_KB * 1048576}") ;;
        *) ;; # Assume KB
    esac
    
    # Create JSON report
    cat > "$CURRENT_REPORT" << EOF
{
  "timestamp": "$TIMESTAMP",
  "total_size_kb": $TOTAL_KB,
  "total_size_display": "$TOTAL_SIZE",
  "js_size_kb": $JS_KB,
  "js_size_display": "$JS_SIZE",
  "css_size_display": "$CSS_SIZE",
  "js_file_count": $JS_COUNT,
  "css_file_count": $CSS_COUNT,
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF
    
    print_success "Performance data recorded: $CURRENT_REPORT"
    
    # Compare with previous measurements
    LATEST_PREVIOUS=$(find "$PERF_DIR" -name "bundle-*.json" ! -name "bundle-$TIMESTAMP.json" | sort | tail -1)
    
    if [ -n "$LATEST_PREVIOUS" ] && [ -f "$LATEST_PREVIOUS" ]; then
        print_info "Comparing with previous measurement..."
        
        PREV_SIZE=$(grep '"total_size_kb"' "$LATEST_PREVIOUS" | sed 's/.*: *\([0-9.]*\).*/\1/')
        PREV_TIMESTAMP=$(grep '"timestamp"' "$LATEST_PREVIOUS" | sed 's/.*": *"\([^"]*\)".*/\1/')
        
        if [ -n "$PREV_SIZE" ] && [ -n "$TOTAL_KB" ]; then
            SIZE_DIFF=$(awk "BEGIN {print $TOTAL_KB - $PREV_SIZE}")
            PERCENT_CHANGE=$(awk "BEGIN {printf \"%.1f\", ($SIZE_DIFF / $PREV_SIZE) * 100}")
            
            echo ""
            echo "📊 Bundle Size Comparison"
            echo "========================"
            echo "Previous: ${PREV_SIZE}KB ($PREV_TIMESTAMP)"
            echo "Current:  ${TOTAL_KB}KB ($TIMESTAMP)"
            
            if awk "BEGIN {exit ($SIZE_DIFF > 0) ? 0 : 1}"; then
                if awk "BEGIN {exit ($PERCENT_CHANGE > 10) ? 0 : 1}"; then
                    print_warning "Bundle size increased by ${SIZE_DIFF}KB (+${PERCENT_CHANGE}%)"
                    echo "  🚨 Significant size increase detected!"
                else
                    print_warning "Bundle size increased by ${SIZE_DIFF}KB (+${PERCENT_CHANGE}%)"
                fi
            elif awk "BEGIN {exit ($SIZE_DIFF < 0) ? 0 : 1}"; then
                SIZE_DIFF_ABS=$(awk "BEGIN {print -1 * $SIZE_DIFF}")
                PERCENT_CHANGE_ABS=$(awk "BEGIN {print -1 * $PERCENT_CHANGE}")
                print_success "Bundle size decreased by ${SIZE_DIFF_ABS}KB (-${PERCENT_CHANGE_ABS}%)"
            else
                print_success "Bundle size unchanged"
            fi
        fi
    else
        print_info "No previous measurements found - this is your baseline"
    fi
    
    # Generate summary report
    echo ""
    echo "📋 Current Metrics Summary"
    echo "=========================="
    echo "Total Bundle Size: $TOTAL_SIZE"
    echo "JavaScript Files: $JS_COUNT files ($JS_SIZE)"
    echo "CSS Files: $CSS_COUNT files ($CSS_SIZE)"
    
    # Performance recommendations
    echo ""
    echo "💡 Performance Status"
    echo "===================="
    
    if awk "BEGIN {exit ($TOTAL_KB <= 500) ? 0 : 1}"; then
        print_success "Bundle size is optimal (≤ 500KB)"
    elif awk "BEGIN {exit ($TOTAL_KB <= 1000) ? 0 : 1}"; then
        print_warning "Bundle size is acceptable but could be optimized (≤ 1MB)"
    elif awk "BEGIN {exit ($TOTAL_KB <= 2000) ? 0 : 1}"; then
        print_warning "Bundle size is large - consider optimization (≤ 2MB)"
    else
        print_error "Bundle size exceeds recommended limits (> 2MB)"
        echo "  🚨 Immediate optimization recommended"
    fi
    
    # Cleanup old reports (keep last 10)
    print_info "Cleaning up old performance reports..."
    find "$PERF_DIR" -name "bundle-*.json" | sort | head -n -10 | xargs rm -f
    
    REMAINING_COUNT=$(find "$PERF_DIR" -name "bundle-*.json" | wc -l | tr -d ' ')
    print_success "Keeping $REMAINING_COUNT most recent reports"
    
else
    print_error "Build directory not found"
    exit 1
fi

echo ""
print_success "Performance monitoring completed!"

# Usage tips
echo ""
echo "💾 Tips:"
echo "• Run 'bun run perf:monitor' regularly to track changes"
echo "• Check .performance/ directory for historical data"
echo "• Use 'bun run analyze' for detailed bundle analysis"
echo "• Consider adding performance monitoring to your CI/CD"
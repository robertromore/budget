#!/bin/bash

# Context7 Cache Help Script
# This script provides instructions for updating the Context7 documentation cache.
# ⚠️  IMPORTANT: This script does NOT automatically update cache files.
# The actual updates must be performed manually using Claude Code's MCP tools.

set -e

echo "ℹ️  Context7 Cache Help & Status"
echo "================================"
echo ""
echo "⚠️  IMPORTANT: This script provides INSTRUCTIONS ONLY"
echo "    It does NOT automatically update cache files."
echo "    You must manually ask Claude Code to perform updates."
echo ""

# Check if .context7-cache directory exists
if [ ! -d ".context7-cache" ]; then
    echo "📁 Creating .context7-cache directory..."
    mkdir -p .context7-cache
fi

echo "📋 How to Update Context7 Cache (Manual Steps Required):"
echo ""
echo "   STEP 1: Ask Claude Code to update the cache"
echo "   ----------------------------------------"
echo "   Copy and paste this request to Claude Code:"
echo ""
echo "   \"Please update the Context7 cache for all libraries\""
echo ""
echo "   STEP 2: Claude Code will use MCP tools to:"
echo "   ----------------------------------------"
echo "   • Resolve library IDs for: layerchart, svelte, trpc, sveltekit"
echo "   • Fetch comprehensive documentation from Context7"
echo "   • Save documentation to .context7-cache/ directory"
echo ""
echo "   STEP 3: Verify cache was updated"
echo "   --------------------------------"
echo "   Run: bun run cache:status"
echo ""
echo "💡 When to Update Cache:"
echo "   • Library versions change (LayerChart, Svelte 5, tRPC, SvelteKit)"
echo "   • New features are released"
echo "   • Cache files are missing or corrupted"
echo ""

# Check current cache status
echo "📊 Current Cache Status:"
echo "========================"

cache_files=("layerchart-docs.md" "svelte5-docs.md" "trpc-docs.md" "sveltekit-docs.md")

for file in "${cache_files[@]}"; do
    if [ -f ".context7-cache/$file" ]; then
        size=$(ls -lh ".context7-cache/$file" | awk '{print $5}')
        modified=$(ls -la ".context7-cache/$file" | awk '{print $6, $7, $8}')
        echo "✅ $file ($size, modified: $modified)"
    else
        echo "❌ $file (missing)"
    fi
done

echo ""
echo "🎯 Available Cache Commands:"
echo "   bun run cache:help     # Show this help (you are here)"
echo "   bun run cache:status   # Show detailed cache file status"  
echo "   bun run cache:clean    # Remove all cache files"
echo ""
echo "✨ Remember: Only Claude Code can actually update the cache files!"
echo "   This script just shows you how to ask Claude Code to do it."
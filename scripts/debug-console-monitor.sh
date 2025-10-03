#!/bin/bash

# Debug Console Monitor for MCP Server
# Monitors the debug console output when using the debug wrapper

DEBUG_LOG="/Users/I038020/_My_code/SAPCFMCPServer/mcp-debug-console.log"

echo "🐛 Monitoring MCP Server Debug Console Output..."
echo "📁 Debug log: $DEBUG_LOG"
echo "📋 Press Ctrl+C to stop monitoring"
echo ""

# Create debug log if it doesn't exist
touch "$DEBUG_LOG"

# Monitor the debug console log
tail -f "$DEBUG_LOG" | while read line; do
    # Add timestamp and color formatting
    timestamp=$(date "+%H:%M:%S")

    if [[ "$line" == *"ERROR"* ]]; then
        echo -e "\033[31m[$timestamp] $line\033[0m"
    elif [[ "$line" == *"WARN"* ]] || [[ "$line" == *"WARNING"* ]]; then
        echo -e "\033[33m[$timestamp] $line\033[0m"
    elif [[ "$line" == *"DEBUG"* ]]; then
        echo -e "\033[36m[$timestamp] $line\033[0m"
    elif [[ "$line" == *"INFO"* ]]; then
        echo -e "\033[32m[$timestamp] $line\033[0m"
    else
        echo "[$timestamp] $line"
    fi
done
#!/bin/bash

# SAP CF MCP Server - Log Monitor
# Use this to watch MCP server activity in real-time when using from other VS Code workspaces

echo "🔍 Monitoring SAP CF MCP Server logs..."
echo "📁 Server location: /Users/I038020/_My_code/SAPCFMCPServer"
echo "📋 Press Ctrl+C to stop monitoring"
echo ""

# Navigate to MCP server directory
cd /Users/I038020/_My_code/SAPCFMCPServer

# Watch the combined log with pretty formatting
tail -f combined.log | while read line; do
    # Parse JSON and format nicely
    echo "$line" | jq -r '
        def extract_time: .timestamp | split("T")[1] | split(".")[0];
        if .level == "error" then
            "\u001b[31m[\(extract_time)] ERROR: \(.message)\u001b[0m"
        elif .level == "info" then
            "\u001b[32m[\(extract_time)] INFO: \(.message)\u001b[0m"
        elif .level == "warn" then
            "\u001b[33m[\(extract_time)] WARN: \(.message)\u001b[0m"
        else
            "[\(extract_time)] \(.level | ascii_upcase): \(.message)"
        end +
        if .filePath then " (file: \(.filePath | split("/") | last))" else "" end +
        if .serviceName then " (service: \(.serviceName))" else "" end +
        if .toolName then " (tool: \(.toolName))" else "" end +
        if .error and .error != {} then "\n  Error: \(.error.message // .error)" else "" end
    ' 2>/dev/null || echo "$line"
done
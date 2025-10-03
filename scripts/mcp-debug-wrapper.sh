#!/bin/bash

# MCP Server Debug Wrapper
# This script runs the MCP server in debug mode and logs all output to a debug file

LOG_FILE="/Users/I038020/_My_code/SAPCFMCPServer/mcp-debug-console.log"

echo "$(date): Starting MCP server in debug mode" >> "$LOG_FILE"
echo "Environment: MCP_DEBUG=$MCP_DEBUG, LOG_LEVEL=$LOG_LEVEL" >> "$LOG_FILE"

# Run the MCP server and capture both stdout and stderr
MCP_DEBUG=true LOG_LEVEL=debug node /Users/I038020/_My_code/SAPCFMCPServer/dist/index.js 2>&1 | tee -a "$LOG_FILE"
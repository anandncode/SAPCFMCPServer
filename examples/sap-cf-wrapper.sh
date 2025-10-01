#!/bin/bash

# SAP CF MCP Server Wrapper for TLM-Main project
# Place this in your TLM-Main project root

MCP_SERVER_PATH="/Users/I038020/_My_code/_MyPrograms/_Sync/MCPServer/SAP/CloudFoundry"

case "$1" in
  "parse")
    echo "🔍 Parsing MTA file with MCP Server..."
    node "$MCP_SERVER_PATH/scripts/mcp-cli.js" parse "${2:-mta.yaml}"
    ;;
  "token")
    echo "🔐 Getting XSUAA token..."
    node "$MCP_SERVER_PATH/scripts/mcp-cli.js" token
    ;;
  "resources")
    echo "☁️ Querying CF resources..."
    node "$MCP_SERVER_PATH/scripts/mcp-cli.js" cf-resources
    ;;
  "menu")
    echo "📋 Opening MCP tools menu..."
    bash "$MCP_SERVER_PATH/scripts/sap-cf-tools.sh" menu
    ;;
  *)
    echo "SAP CF MCP Server Commands:"
    echo "  ./sap-cf.sh parse [mta.yaml]  - Parse MTA file"
    echo "  ./sap-cf.sh token             - Get XSUAA token"
    echo "  ./sap-cf.sh resources         - Query CF resources"
    echo "  ./sap-cf.sh menu              - Interactive menu"
    ;;
esac
# Debug Mode Setup for MCP Server

When using the SAP CF MCP Server from other VS Code workspaces via `.vscode/mcp.json`, the console output is not visible because the MCP protocol uses stdio for communication. Here's how to enable and monitor debug output:

## Solution 1: Using Debug Wrapper Script (Recommended)

1. **Use the debug wrapper in your MCP configuration:**

   Copy this configuration to your other workspace's `.vscode/mcp.json`:

   ```json
   {
     "mcpServers": {
       "sap-cf-debug": {
         "command": "/Users/I038020/_My_code/SAPCFMCPServer/scripts/mcp-debug-wrapper.sh",
         "args": [],
         "env": {
           "LOG_LEVEL": "debug",
           "MCP_DEBUG": "true"
         }
       }
     }
   }
   ```

2. **Monitor debug output in real-time:**

   Run this command in a separate terminal:

   ```bash
   /Users/I038020/_My_code/SAPCFMCPServer/scripts/debug-console-monitor.sh
   ```

   Or simply watch the debug console log:

   ```bash
   tail -f /Users/I038020/_My_code/SAPCFMCPServer/mcp-debug-console.log
   ```

## Solution 2: Using Regular Log Files

1. **Use the regular MCP configuration:**

   ```json
   {
     "mcpServers": {
       "sap-cf": {
         "command": "node",
         "args": ["/Users/I038020/_My_code/SAPCFMCPServer/dist/index.js"],
         "env": {
           "LOG_LEVEL": "debug",
           "MCP_DEBUG": "true"
         }
       }
     }
   }
   ```

2. **Monitor using the standard log monitor:**

   ```bash
   /Users/I038020/_My_code/SAPCFMCPServer/scripts/monitor-logs.sh
   ```

## What Debug Mode Shows

When debug mode is enabled, you'll see:

- **Server startup messages**: Confirmation that debug mode is active
- **Tool calls**: Every time an MCP tool is invoked
- **API operations**: Details about CF CLI commands and API calls
- **Authentication flows**: XSUAA token requests and responses
- **Error details**: Full stack traces and context

## Debug Files

The MCP server writes to multiple log files:

- `combined.log` - All log messages (JSON format)
- `error.log` - Error messages only
- `mcp-debug.log` - Debug-level messages (when `MCP_DEBUG=true`)
- `mcp-debug-console.log` - Console output (when using debug wrapper)

## Troubleshooting

If you're still not seeing output:

1. **Check if debug mode is actually enabled:**
   ```bash
   grep "Debug mode enabled" /Users/I038020/_My_code/SAPCFMCPServer/mcp-debug-console.log
   ```

2. **Verify the MCP server is running:**
   ```bash
   ps aux | grep "sap-cf-mcp-server"
   ```

3. **Check VS Code MCP integration:**
   - Open VS Code Developer Tools (Help > Toggle Developer Tools)
   - Look for MCP-related messages in the console

## Example Debug Output

When working correctly, you should see output like:

```
[17:47:19] INFO: SAP CF MCP Server started successfully
[17:47:19] DEBUG: Debug mode enabled - verbose logging active
[17:47:19] DEBUG: Environment: NODE_ENV=staging, LOG_LEVEL=debug
[17:48:15] INFO: MCP tool called (tool: parse_mta)
[17:48:16] INFO: MCP tool called (tool: get_service_binding)
```

This debug setup ensures you have full visibility into the MCP server operations even when running in protocol mode from other VS Code workspaces.
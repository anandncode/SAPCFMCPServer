# 🔍 MCP Server Monitoring Guide

When using the SAP CF MCP Server from other VS Code workspaces via `mcp.json`, you won't see detailed output in the VS Code terminal. This is by design - the MCP protocol uses stdio for communication, so console output is disabled to avoid interference.

## 📋 **Why No Console Output?**

**MCP Protocol Limitation:**
- MCP uses stdin/stdout for JSON-RPC communication
- Any console.log or colored output interferes with the protocol
- This is why the server runs "silently" when used via mcp.json

**But logging still happens!** All activity is written to log files.

## 🔧 **Monitoring Solutions**

### **Option 1: Real-time Log Monitoring (Recommended)**

**Terminal Command:**
```bash
# Run this in a separate terminal to watch logs in real-time
/Users/I038020/_My_code/SAPCFMCPServer/scripts/monitor-logs.sh
```

**What you'll see:**
```
🔍 Monitoring SAP CF MCP Server logs...
📁 Server location: /Users/I038020/_My_code/SAPCFMCPServer
📋 Press Ctrl+C to stop monitoring

[14:25:30] INFO: SAP CF MCP Server started successfully
[14:25:35] INFO: MCP tool called (tool: parse_mta)
[14:25:35] INFO: Successfully parsed MTA descriptor (file: examples/my-sample-mta.yaml)
[14:25:40] INFO: MCP tool called (tool: get_service_binding)
```

### **Option 2: VS Code Tasks**

**Copy to your project:**
```bash
cp /Users/I038020/_My_code/SAPCFMCPServer/examples/vscode-tasks-monitoring.json .vscode/tasks.json
```

**Available tasks:**
- **"Monitor MCP Server Logs"** - Real-time log monitoring
- **"View MCP Server Logs"** - Show last 50 log entries
- **"View MCP Debug Logs"** - Show debug logs (if enabled)

**Usage:**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Monitor MCP Server Logs"

### **Option 3: Debug Mode**

**Enable detailed logging:**
```json
// .vscode/mcp.json (debug version)
{
  "mcpServers": {
    "sap-cf-debug": {
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

**Creates additional debug file:** `mcp-debug.log` with detailed information

### **Option 4: Manual Log Checking**

**View recent activity:**
```bash
# Last 20 log entries
tail -20 /Users/I038020/_My_code/SAPCFMCPServer/combined.log

# Follow logs in real-time
tail -f /Users/I038020/_My_code/SAPCFMCPServer/combined.log

# Search for errors
grep -i error /Users/I038020/_My_code/SAPCFMCPServer/combined.log

# Search for specific tool usage
grep "parse_mta" /Users/I038020/_My_code/SAPCFMCPServer/combined.log
```

## 📊 **What Gets Logged**

### **Standard Logs (combined.log)**
- ✅ Server startup/shutdown
- ✅ Tool invocations (parse_mta, get_service_binding, etc.)
- ✅ Successful operations
- ✅ Error messages
- ✅ File operations

### **Debug Logs (mcp-debug.log)**
*Only when MCP_DEBUG=true*
- ✅ Request IDs and parameters
- ✅ Detailed operation context
- ✅ API call details
- ✅ Authentication flows

### **Sample Log Entries**
```json
{"level":"info","message":"MCP tool called","service":"sap-cf-mcp-server","toolName":"parse_mta","requestId":"abc123","timestamp":"2025-10-03T14:25:35.123Z"}

{"level":"info","message":"Successfully parsed MTA descriptor","service":"sap-cf-mcp-server","file":"examples/my-sample-mta.yaml","modules":2,"resources":4,"timestamp":"2025-10-03T14:25:35.456Z"}

{"level":"info","message":"MCP tool called","service":"sap-cf-mcp-server","toolName":"get_service_binding","serviceName":"bookshop-db","timestamp":"2025-10-03T14:25:40.789Z"}
```

## 🎯 **Recommended Workflow**

### **For Development/Testing:**
1. **Use debug mode:** Set `MCP_DEBUG=true` in mcp.json
2. **Monitor in terminal:** Run the monitor script in a separate terminal
3. **Use GitHub Copilot normally:** Ask questions, make requests
4. **Check logs:** See exactly what tools are being called and results

### **For Production Use:**
1. **Use standard mode:** `LOG_LEVEL=info`, `MCP_DEBUG=false`
2. **Periodic log checks:** Occasionally check combined.log for issues
3. **Error monitoring:** Set up alerts if error.log gets entries

## 🚨 **Troubleshooting**

### **No Logs Appearing?**
- Check that the MCP server is actually starting
- Verify the path in mcp.json is correct
- Look for VS Code error messages in the Output panel

### **Too Much Logging?**
- Set `LOG_LEVEL=error` in mcp.json
- Disable debug mode: `MCP_DEBUG=false`

### **Want More Details?**
- Enable debug mode: `MCP_DEBUG=true`
- Set `LOG_LEVEL=debug`
- Use the real-time monitor script

## 💡 **Pro Tips**

**Multiple Monitors:**
```bash
# Terminal 1: Monitor general logs
/Users/I038020/_My_code/SAPCFMCPServer/scripts/monitor-logs.sh

# Terminal 2: Monitor errors only
tail -f /Users/I038020/_My_code/SAPCFMCPServer/error.log

# Terminal 3: Your VS Code with GitHub Copilot
```

**Log Rotation:**
```bash
# Archive old logs periodically
mv combined.log combined-$(date +%Y%m%d).log
mv error.log error-$(date +%Y%m%d).log
```

This gives you full visibility into what your MCP server is doing, even when it runs silently in MCP mode! 🎉
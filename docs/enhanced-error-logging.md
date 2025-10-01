# Enhanced Error Logging - SAP CF MCP Server

## 🎯 **Overview**
The SAP CF MCP Server now features comprehensive error logging that captures complete error details including stack traces, error properties, and contextual information.

## 🔧 **What Was Changed**

### **Logger Configuration Enhanced**
- **Custom JSON Error Format**: Properly serializes Error objects with all properties
- **Console Error Format**: Human-readable error display with full stack traces
- **Error Property Preservation**: Captures custom error properties like `code`, `status`, `response.data`

### **New Helper Function**
```typescript
logError(message: string, error: unknown, additionalContext?: Record<string, any>)
```

### **All Error Logging Updated**
Updated error logging in all files:
- ✅ `src/index.ts` - Main server error handling
- ✅ `src/utils/mta-parser.ts` - MTA parsing errors
- ✅ `src/services/xsuaa-auth.ts` - Authentication errors
- ✅ `src/services/cf-api.ts` - Cloud Foundry API errors
- ✅ `src/tools/auth-tools.ts` - Auth tool errors
- ✅ `src/tools/cf-tools.ts` - CF resource tool errors
- ✅ `src/tools/parse-mta.ts` - MTA parsing tool errors

## 📊 **Error Log Examples**

### **Before (Incomplete)**
```json
{
  "error": {},
  "level": "error",
  "message": "Failed to read MTA file",
  "service": "sap-cf-mcp-server",
  "timestamp": "2025-10-01T11:46:15.160Z"
}
```

### **After (Complete)**
```json
{
  "error": {
    "code": "ENOENT",
    "message": "ENOENT: no such file or directory, open '/path/file.txt'",
    "name": "Error",
    "stack": "Error: ENOENT: no such file or directory...\n    at async open (node:internal/fs/promises:639:25)..."
  },
  "filePath": "/path/to/file.txt",
  "level": "error",
  "message": "Failed to read MTA file",
  "service": "sap-cf-mcp-server",
  "timestamp": "2025-10-01T16:15:39.567Z"
}
```

## 🚀 **Features**

### **Complete Error Details**
- ✅ **Error Name**: `TypeError`, `SyntaxError`, `ENOENT`, etc.
- ✅ **Error Message**: Full descriptive message
- ✅ **Stack Trace**: Complete call stack for debugging
- ✅ **Error Code**: System error codes (like `ENOENT`, `ECONNREFUSED`)
- ✅ **HTTP Status**: For network errors (404, 500, etc.)
- ✅ **Response Data**: API error responses and details

### **Enhanced Context**
- ✅ **Additional Metadata**: File paths, operation context, user input
- ✅ **Structured Logging**: JSON format for programmatic analysis
- ✅ **Human-Readable Console**: Pretty-printed errors during development

### **Error Types Handled**
- ✅ **File System Errors**: Missing files, permission issues
- ✅ **Network Errors**: API failures, timeout errors
- ✅ **Parsing Errors**: YAML syntax errors, validation failures
- ✅ **Authentication Errors**: XSUAA token failures, credential issues
- ✅ **Custom Application Errors**: Business logic errors with context

## 📁 **Log Files**
- **`error.log`**: Error-level messages only with full details
- **`combined.log`**: All log levels with enhanced error information

## 🛠 **Usage Examples**

### **Using the Enhanced Logger**
```typescript
import { logError } from './utils/logger.js';

try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  // This will log complete error details including stack trace
  logError('Operation failed', error, {
    operationType: 'riskyOperation',
    userId: 'user123',
    timestamp: new Date().toISOString()
  });
}
```

### **Console Output**
```
16:15:39 [sap-cf-mcp-server] error: Failed to read MTA file
Error: ENOENT: no such file or directory, open '/nonexistent/path/file.txt'
Stack: Error: ENOENT: no such file or directory, open '/nonexistent/path/file.txt'
    at async open (node:internal/fs/promises:639:25)
    at async Module.readFile (node:internal/fs/promises:1246:14)
Metadata: {
  "filePath": "/nonexistent/path/file.txt",
  "operation": "parseFromFile"
}
```

## 🎉 **Benefits**
1. **🔍 Easier Debugging**: Complete stack traces show exactly where errors occur
2. **📊 Better Monitoring**: Structured error logs for analysis and alerting
3. **🚀 Faster Resolution**: All error context in one place
4. **📈 Improved Reliability**: Better error tracking and pattern identification
5. **👥 Developer Experience**: Clear, actionable error information

The enhanced error logging provides comprehensive error visibility throughout the SAP CF MCP Server, making debugging and monitoring significantly more effective.
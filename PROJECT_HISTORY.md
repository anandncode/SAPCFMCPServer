# SAP CF MCP Server - Project History & Context

## 🎯 **Project Overview**
This is a complete Node.js Model Context Protocol (MCP) server designed for SAP BTP Cloud Foundry projects. It integrates with GitHub Copilot and VS Code to provide SAP BTP development assistance.

## 📚 **Development History & Context**

### **Original Request**
> "I want to create a local MCP servers that work with SAP BTP Cloud Foundry projects. The MCP server should be able to read the mta.yaml and identify the different resources. For these resources, get a token using xsuaa and call different API to get results."

### **Evolution Timeline**
1. **Initial Development**: Complete TypeScript MCP server for Claude Desktop
2. **VS Code Integration**: Modified for GitHub Copilot integration
3. **Simplified Approach**: Avoided VS Code extension complexity, used script-based integration
4. **Cross-Repository Usage**: Configured for use across multiple Git repositories
5. **Enhanced Error Logging**: Implemented comprehensive error logging with stack traces

### **Key Design Decisions**
- **TypeScript + Node.js**: For type safety and modern JavaScript features
- **MCP Protocol**: Model Context Protocol for AI assistant integration
- **Script-Based Integration**: Simpler than full VS Code extension
- **Cross-Repository Design**: Can be used by multiple SAP BTP projects
- **Comprehensive Error Logging**: Full stack traces and error context

## 🏗 **Architecture Overview**

### **Core Components**
```
src/
├── index.ts              # Main MCP server entry point
├── types/               # TypeScript type definitions
├── services/            # Business logic services
│   ├── xsuaa-auth.ts   # XSUAA OAuth2 authentication
│   └── cf-api.ts       # Cloud Foundry API client
├── tools/              # MCP tool implementations
│   ├── parse-mta.ts    # MTA parsing tool
│   ├── auth-tools.ts   # Authentication tools
│   └── cf-tools.ts     # CF resource tools
└── utils/              # Utility functions
    ├── logger.ts       # Enhanced Winston logger
    └── mta-parser.ts   # MTA descriptor parser
```

### **MCP Tools Implemented**
1. **`parse_mta`** - Parse MTA descriptor files and extract resource information
2. **`get_access_token`** - Get OAuth2 tokens from XSUAA service
3. **`get_cf_resources`** - Query Cloud Foundry API for applications, services, spaces, orgs

## 🔧 **Technical Implementation**

### **MCP Server Configuration**
- **Transport**: stdio (for GitHub Copilot integration)
- **Protocol Version**: Latest MCP specification
- **Error Handling**: Comprehensive with full stack traces
- **Logging**: Winston logger with JSON and console formats

### **Authentication Flow**
1. Read XSUAA credentials from MTA descriptor or environment
2. Perform OAuth2 client credentials flow
3. Cache tokens with expiration handling
4. Use tokens for authenticated CF API calls

### **Key Features**
- ✅ **MTA Parsing**: Complete MTA descriptor analysis
- ✅ **XSUAA Integration**: OAuth2 token management
- ✅ **CF API Client**: Full Cloud Foundry API access
- ✅ **Error Logging**: Enhanced error tracking with stack traces
- ✅ **Cross-Repository**: Works across multiple Git repos
- ✅ **VS Code Integration**: GitHub Copilot compatible

## 📁 **File Structure & Purpose**

### **Source Code**
- **`src/index.ts`**: Main MCP server with stdio transport and tool handlers
- **`src/types/index.ts`**: TypeScript definitions for MTA, XSUAA, CF API
- **`src/services/xsuaa-auth.ts`**: XSUAA OAuth2 service with token caching
- **`src/services/cf-api.ts`**: Cloud Foundry API client with error handling
- **`src/tools/*.ts`**: Individual MCP tool implementations
- **`src/utils/logger.ts`**: Enhanced Winston logger with error serialization
- **`src/utils/mta-parser.ts`**: MTA descriptor parsing and validation

### **Integration Files**
- **`scripts/mcp-cli.js`**: CLI tool for testing MCP server
- **`scripts/sap-cf-tools.sh`**: Interactive shell menu for tools
- **`examples/`**: Sample configurations and usage examples

### **Documentation**
- **`docs/enhanced-error-logging.md`**: Error logging implementation details
- **`.copilot-instructions.md`**: GitHub Copilot context and instructions

## 🚀 **Usage Patterns**

### **Cross-Repository Setup**
1. **Reference the MCP server** from other projects using absolute paths
2. **Copy wrapper scripts** to individual project repositories
3. **Use VS Code tasks** to integrate MCP tools into development workflow
4. **Configure GitHub Copilot** with project-specific instructions

### **Integration Options**
1. **Direct CLI**: `node /path/to/mcp-server/scripts/mcp-cli.js parse mta.yaml`
2. **VS Code Tasks**: Configured tasks in `.vscode/tasks.json`
3. **Shell Wrapper**: Simple wrapper script for common operations
4. **GitHub Copilot**: AI-assisted development with SAP BTP context

## 🔍 **Recent Major Changes**

### **Enhanced Error Logging (Latest)**
- **Problem**: Error objects were showing as empty `{}` in logs
- **Solution**: Implemented custom Winston formats with proper Error serialization
- **Result**: Complete error details including stack traces, error codes, and context
- **Files Updated**: All source files now use `logError()` helper function

### **Cross-Repository Design**
- **Problem**: MCP server was tied to single repository
- **Solution**: Configured for use across multiple Git repositories
- **Implementation**: Absolute path references, wrapper scripts, portable configuration

## 🛠 **Development Guidelines**

### **Error Handling**
```typescript
import { logError } from './utils/logger.js';

try {
  // risky operation
} catch (error) {
  logError('Operation failed', error, { context: 'additional info' });
  throw new Error(`Operation failed: ${error.message}`);
}
```

### **Adding New MCP Tools**
1. Create tool definition in `src/tools/`
2. Add handler function with proper error handling
3. Register in main server (`src/index.ts`)
4. Update TypeScript types if needed
5. Add CLI support in `scripts/mcp-cli.js`

### **Testing**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Full MCP server communication
- **Manual Testing**: CLI tools and VS Code integration

## 📋 **TODO / Future Enhancements**
- [ ] Add unit tests for all components
- [ ] Implement configuration file support
- [ ] Add more CF API endpoints
- [ ] Create VS Code extension (optional)
- [ ] Add monitoring and metrics
- [ ] Implement caching for CF API responses

## 🎯 **Key Success Metrics**
- ✅ Complete MCP server implementation
- ✅ GitHub Copilot integration working
- ✅ Cross-repository usage enabled
- ✅ Enhanced error logging implemented
- ✅ All three MCP tools functional
- ✅ VS Code integration without extension complexity

## 💡 **Important Notes for Future Development**
1. **Error Logging**: Always use `logError()` for consistent error handling
2. **Cross-Repository**: Keep absolute path references for portability
3. **MCP Protocol**: Follow MCP specification for tool definitions
4. **SAP BTP Context**: Maintain focus on Cloud Foundry and XSUAA integration
5. **TypeScript**: Maintain strict typing for better development experience

This document serves as a comprehensive context for any future AI assistant or developer working on this project. All the chat history context and design decisions are captured here.
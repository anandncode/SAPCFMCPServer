# SAP CF MCP Server - Complete Context & History

## 🎯 **Instant Context for New Repository**

### **What This Is**
Complete Node.js MCP (Model Context Protocol) server for SAP BTP Cloud Foundry development with GitHub Copilot integration. This project has full development history and context preserved for easy continuation in any repository.

### **Core Functionality**
- ✅ Parse MTA descriptor files (`mta.yaml`) and extract all resources/modules
- ✅ Get XSUAA OAuth2 tokens for SAP BTP authentication with caching
- ✅ Query Cloud Foundry API for applications, services, spaces, organizations
- ✅ Enhanced error logging with complete stack traces and context
- ✅ Cross-repository usage (works from any Git repository)
- ✅ GitHub Copilot integration with SAP BTP context awareness

## 🚀 **Immediate Setup (2 minutes)**

### **Quick Test**
```bash
npm install && npm run build
npm run mcp:parse examples/sample-mta.yaml
```

### **Use from Another SAP BTP Project**
```bash
# Copy wrapper to your project
cp examples/sap-cf-wrapper.sh /path/to/your-sap-project/
chmod +x /path/to/your-sap-project/sap-cf-wrapper.sh

# Use it immediately
cd /path/to/your-sap-project
./sap-cf-wrapper.sh parse mta.yaml
./sap-cf-wrapper.sh token
./sap-cf-wrapper.sh resources
```

### **VS Code + GitHub Copilot Integration**
```bash
# Copy MCP configuration to your project
cp examples/vscode-mcp.json /path/to/your-project/.vscode/mcp.json

# Copy tasks and instructions to your project (optional)
cp examples/tlm-main-tasks.json /path/to/your-project/.vscode/tasks.json
cp examples/.copilot-instructions-tlm.md /path/to/your-project/.copilot-instructions.md
```

**Note:** The MCP server automatically disables console logging when running in MCP mode to prevent interference with the stdio-based MCP protocol. All logs are written to files (`combined.log`, `error.log`) for debugging purposes.

## 🔧 **MCP Tools Available**

### **Core MTA & CF Tools**
1. **`parse_mta`** - Parse MTA descriptor files and extract all resource/module information
2. **`get_access_token`** - Get OAuth2 tokens from XSUAA service with caching and validation
3. **`get_cf_resources`** - Query Cloud Foundry API for apps, services, spaces, organizations

### **NEW: Service Binding & API Integration Tools**
4. **`get_service_binding`** - Get CF service binding parameters and credentials
5. **`upload_openapi_spec`** - Register OpenAPI specifications for generic API calls
6. **`call_api`** - Make authenticated API calls using registered OpenAPI specs
7. **`list_api_specs`** - List all registered OpenAPI specifications
8. **`get_api_operations`** - Show available operations for a registered API spec

## 🚀 **Enhanced Workflow: From MTA to API Calls**

### **Complete SAP BTP Development Workflow**
```bash
# 1. Parse your MTA file to identify services
npm run mcp:parse ./mta.yaml

# 2. Login to CF (prerequisite)
cf login

# 3. Get service binding for any service (e.g., bookshop-db)
# Use MCP tool: get_service_binding with serviceName: "bookshop-db"

# 4. Upload OpenAPI spec for any SAP service
# Use MCP tool: upload_openapi_spec with Service Manager, Destination, etc.

# 5. Make authenticated API calls
# Use MCP tool: call_api with automatic token handling
```

## VS Code & GitHub Copilot Integration

### 🎯 Easy VS Code Usage (No Extension Required!)

**Option 1: Interactive Menu**
```bash
npm run tools:menu
```

**Option 2: Direct Commands**
```bash
# List MTA files in workspace
npm run mcp:list

# Parse specific MTA file
npm run mcp:parse ./mta.yaml

# Start MCP server
npm run mcp:server
```

**Option 3: VS Code Tasks**
- Open Command Palette (`Ctrl+Shift+P`)
- Type "Tasks: Run Task"
- Choose "Parse MTA File", "Start MCP Server", or "Build MCP Server"

### 💡 GitHub Copilot Chat Integration

Ask GitHub Copilot context-aware questions:
- "Parse this MTA file and explain the resources"
- "What XSUAA configuration is needed?"
- "Generate CF API calls for this service"
- "Add a new MCP tool for [functionality]"

The repository includes GitHub Copilot instructions that understand SAP BTP patterns, MTA structures, and CF APIs.

## Usage Examples

### Parsing MTA Files

The server can parse `mta.yaml` files and extract useful information:

```yaml
# Example mta.yaml
_schema_version: 3.3.0
ID: my-sap-app
version: 1.0.0
modules:
  - name: my-app
    type: nodejs
    requires:
      - name: my-xsuaa
resources:
  - name: my-xsuaa
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
```

### XSUAA Authentication

Provide XSUAA service credentials to get access tokens:

```json
{
  "credentials": {
    "clientid": "your-client-id",
    "clientsecret": "your-client-secret",
    "url": "https://your-subdomain.authentication.sap.hana.ondemand.com",
    "uaadomain": "authentication.sap.hana.ondemand.com"
  }
}
```

### Cloud Foundry API Queries

Query CF APIs for various resources:

- Organizations: `resourceType: "organizations"`
- Spaces: `resourceType: "spaces"` (requires `parentGuid`)
- Applications: `resourceType: "applications"` (requires `parentGuid` or `resourceName`)
- Services: `resourceType: "services"` (requires `parentGuid` or `resourceName`)

## Configuration

### Environment Variables

- `LOG_LEVEL` - Set logging level (debug, info, warn, error)
- `NODE_ENV` - Set to 'production' for production logging
- `VCAP_SERVICES` - Cloud Foundry service bindings (when running in CF)

### Project Structure

```
src/
├── index.ts           # Main MCP server
├── inspector.ts       # Testing utility
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (logging, MTA parsing)
├── services/         # Service classes (XSUAA, CF API)
└── tools/            # MCP tool implementations
```

## Development

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with auto-reload
- `npm start` - Start the compiled server
- `npm run inspector` - Test the server functionality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run tests (Jest)
- `npm run clean` - Clean build artifacts

### Adding New Tools

1. Create tool definition in `src/tools/`
2. Implement handler function
3. Register in `src/index.ts`
4. Export from `src/tools/index.ts`

### Error Handling

All tools return standardized responses:

```typescript
{
  success: boolean;
  data?: any;        // Success data
  error?: string;    // Error message
  statusCode?: number; // HTTP status (for API calls)
}
```

## Integration with MCP Clients

This server follows the Model Context Protocol specification and can be used with any MCP-compatible client:

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sap-cf": {
      "command": "node",
      "args": ["/path/to/sap-cf-mcp-server/dist/index.js"]
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and can be integrated with any MCP client library.

## Security Considerations

- Never log sensitive information like access tokens or credentials
- Access tokens are cached but not persisted
- Credentials should be provided per-request or via environment variables
- Use HTTPS endpoints for all API calls

## SAP BTP Integration

### Supported Services

- **XSUAA** - Authentication and authorization
- **Destination Service** - External system connectivity
- **Connectivity Service** - On-premise connectivity
- **Application Router** - Multi-tenant applications

### Supported Resource Types

- `org.cloudfoundry.managed-service` - CF managed services
- `org.cloudfoundry.existing-service` - Existing CF services
- `org.cloudfoundry.user-provided-service` - User-provided services

## Troubleshooting

### Common Issues

1. **Module resolution errors** - Ensure you've run `npm install` and `npm run build`
2. **Authentication failures** - Verify XSUAA credentials and network connectivity
3. **API timeouts** - Check Cloud Foundry API endpoint accessibility
4. **MTA parsing errors** - Validate YAML syntax and schema version

### Logging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

Logs are written to:
- `error.log` - Error messages only
- `combined.log` - All log messages
- Console - Development mode

## 📚 **Complete Project Context**

### **Development History Preserved**
This project contains complete development history and context in:
- **`PROJECT_HISTORY.md`** - Full development timeline, decisions, and technical context
- **`.copilot-instructions.md`** - GitHub Copilot integration guidelines and SAP BTP context
- **`docs/enhanced-error-logging.md`** - Error logging implementation and usage

### **Key Success Metrics Achieved**
- ✅ Complete MCP server implementation with all tools functional
- ✅ GitHub Copilot integration working seamlessly
- ✅ Cross-repository usage enabled for multiple SAP BTP projects
- ✅ Enhanced error logging with complete stack traces implemented
- ✅ VS Code integration without extension complexity
- ✅ Production-ready with comprehensive error handling

### **Architecture Overview**
```
📁 MCP Server Core:
├── 🔧 parse_mta tool      → Parse MTA descriptors & extract resources
├── 🔐 get_access_token    → XSUAA OAuth2 token management with caching
└── ☁️ get_cf_resources    → Cloud Foundry API client for all resources

📁 Integration Options:
├── 🖥️ CLI Tools          → Direct command-line usage and testing
├── 📋 VS Code Tasks      → Integrated development workflow
├── 🤖 GitHub Copilot     → AI-assisted SAP BTP development
└── 📜 Shell Wrapper      → Simple cross-project integration
```

### **Recent Major Enhancements**
- **Enhanced Error Logging**: Complete error objects with stack traces, codes, and context
- **Cross-Repository Design**: Use from any Git repository via absolute path references
- **GitHub Copilot Integration**: Comprehensive AI development assistance with SAP BTP context
- **Improved Reliability**: Better error handling, validation, and logging throughout

### **Usage in New Repository**
When you move this to a new repository, everything is preserved:
1. All functionality works immediately after `npm install && npm run build`
2. Cross-repository integration examples are in `examples/` directory
3. Complete development context is documented for AI assistants
4. GitHub Copilot instructions provide full SAP BTP context
5. All error logging includes complete diagnostic information

## 🚀 **Next Steps**
1. **Move to new repository** - All context and functionality preserved
2. **Test with `npm run build && npm run mcp:parse examples/sample-mta.yaml`**
3. **Integrate with other SAP BTP projects using examples**
4. **Use GitHub Copilot with full SAP BTP context awareness**
5. **Extend functionality using established patterns**

## 📋 **Support & Context**
- **PROJECT_HISTORY.md**: Complete development timeline and technical decisions
- **Error logs**: Check `error.log` for complete diagnostic information with stack traces
- **Examples**: All integration patterns documented in `examples/` directory
- **AI Assistant**: GitHub Copilot has full project context via `.copilot-instructions.md`
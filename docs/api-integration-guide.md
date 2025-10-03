# 🎯 Complete SAP BTP API Integration Guide

This guide demonstrates the complete workflow from MTA parsing to API calls using your enhanced MCP server.

## Prerequisites

1. **CF CLI installed and logged in:**
   ```bash
   cf login
   ```

2. **MCP server running in another repository:**
   ```json
   // .vscode/mcp.json
   {
     "mcpServers": {
       "sap-cf": {
         "command": "node",
         "args": ["/Users/I038020/_My_code/SAPCFMCPServer/dist/index.js"],
         "env": {
           "LOG_LEVEL": "error"
         }
       }
     }
   }
   ```

## Step-by-Step Workflow

### 1. Parse MTA File and Identify Services

**Ask GitHub Copilot:**
> "Parse my mta.yaml file and show me all the services"

The MCP server will analyze your MTA file and identify all services like:
- `bookshop-db` (hana-cloud service)
- `bookshop-auth` (xsuaa service)
- `bookshop-registry` (saas-registry service)

### 2. Get Service Binding Parameters

**Ask GitHub Copilot:**
> "Get the service binding parameters for bookshop-db"

**MCP Tool:** `get_service_binding`
```json
{
  "serviceName": "bookshop-db",
  "includeCredentials": true
}
```

**Response includes:**
- Service credentials (database URL, credentials, etc.)
- CF target information (org, space, user)
- Service plan and tags

### 3. Upload OpenAPI Specifications

**For Service Manager API:**

**Ask GitHub Copilot:**
> "Upload the Service Manager OpenAPI spec so I can manage service instances"

**MCP Tool:** `upload_openapi_spec`
```json
{
  "id": "service-manager",
  "name": "SAP Service Manager",
  "specPath": "/path/to/service-manager-api.json",
  "baseUrl": "https://service-manager.cfapps.sap.hana.ondemand.com",
  "authType": "bearer",
  "description": "SAP BTP Service Manager API"
}
```

**For HANA Cloud API (example):**
```json
{
  "id": "hana-cloud",
  "name": "HANA Cloud Management",
  "specContent": { /* OpenAPI spec object */ },
  "authType": "bearer"
}
```

### 4. List Available APIs and Operations

**Ask GitHub Copilot:**
> "Show me all registered API specs and their operations"

**MCP Tool:** `list_api_specs`
**MCP Tool:** `get_api_operations` with `specId: "service-manager"`

### 5. Make Authenticated API Calls

**Example: List Service Instances**

**Ask GitHub Copilot:**
> "List all service instances using the Service Manager API"

**MCP Tool:** `call_api`
```json
{
  "specId": "service-manager",
  "operationId": "listServiceInstances",
  "parameters": {
    "size": 50
  },
  "auth": {
    "type": "xsuaa",
    "xsuaaCredentials": {
      "clientid": "...",
      "clientsecret": "...",
      "url": "...",
      "uaadomain": "..."
    }
  }
}
```

**Example: Get Specific Service Instance**
```json
{
  "specId": "service-manager",
  "operationId": "getServiceInstance",
  "parameters": {
    "instanceId": "abc-123-def"
  },
  "auth": {
    "type": "token",
    "token": "your-bearer-token"
  }
}
```

## Advanced Use Cases

### 3-Step Service Management

1. **Parse MTA** → Identify services
2. **Get Service Binding** → Extract credentials
3. **Call APIs** → Manage service instances programmatically

### Generic API Integration

Upload any OpenAPI spec for:
- **Destination Service API**
- **Connectivity Service API**
- **HANA Cloud Management API**
- **Custom APIs**

### Automated Authentication

The MCP server handles:
- ✅ **XSUAA token retrieval** using service credentials
- ✅ **Token caching** and refresh
- ✅ **Multiple auth types** (Bearer, Basic, OAuth2)
- ✅ **Service binding integration** for automatic credential discovery

## Example Conversations with GitHub Copilot

### MTA Analysis
> **You:** "Parse my MTA file and explain the services"
>
> **Copilot:** Uses `parse_mta` → Shows bookshop-db (HANA), bookshop-auth (XSUAA), etc.

### Service Investigation
> **You:** "Get the binding parameters for bookshop-db and show me the database URL"
>
> **Copilot:** Uses `get_service_binding` → Returns HANA connection details

### API Management
> **You:** "Upload the Service Manager API spec and then list all my service instances"
>
> **Copilot:**
> 1. Uses `upload_openapi_spec` to register the API
> 2. Uses `call_api` with `listServiceInstances` operation
> 3. Automatically handles XSUAA authentication

### Service Operations
> **You:** "Create a new service instance for destination service"
>
> **Copilot:** Uses `call_api` with `createServiceInstance` operation

## Benefits

### 🎯 **Complete SAP BTP Integration**
- **No manual token management** - automatic XSUAA integration
- **Generic API support** - works with any OpenAPI spec
- **CF CLI integration** - leverages existing CF login
- **Service binding discovery** - automatic credential extraction

### 🚀 **AI-Powered Development**
- **Context-aware suggestions** - GitHub Copilot understands your SAP environment
- **Automated workflows** - from MTA parsing to API calls
- **Error handling** - comprehensive error reporting and logging

### 🔧 **Developer Experience**
- **No manual setup** - leverages existing CF login
- **Persistent configuration** - API specs stored locally
- **Cross-repository usage** - works from any project

This makes your MCP server the ultimate SAP BTP development companion! 🎉
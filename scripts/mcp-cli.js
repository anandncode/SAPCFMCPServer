#!/usr/bin/env node

/**
 * CLI tool to interact with the SAP CF MCP Server
 * Usage: node scripts/mcp-cli.js <command> [options]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class MCPClient {
  constructor(options = {}) {
    this.serverProcess = null;
    this.debug = options.debug || false;
    this.timeout = options.timeout || 30000;
  }

  async startServer() {
    console.log('🚀 Starting SAP CF MCP Server...');

    this.serverProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Give server a moment to start up
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ MCP Server started successfully');
  }

  async sendRequest(method, params = {}) {
    if (!this.serverProcess) {
      throw new Error('MCP Server not started');
    }

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let responseData = '';
      let responseReceived = false;

      let timeout;
      if (!this.debug) {
        timeout = setTimeout(() => {
          if (!responseReceived) {
            console.error('❌ Request timeout. Response data received:', responseData.substring(0, 200));
            reject(new Error('Request timeout'));
          }
        }, this.timeout);
      } else {
        console.log('🐛 Debug mode: Timeout disabled');
      }

      this.serverProcess.stdout.on('data', (data) => {
        responseData += data.toString();

        // Try to parse each line as a separate JSON response
        const lines = responseData.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                responseReceived = true;
                if (timeout) clearTimeout(timeout);
                resolve(response);
                return;
              }
            } catch (error) {
              // Not valid JSON, continue
            }
          }
        }

        // Keep the last incomplete line
        responseData = lines[lines.length - 1];
      });

      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async callTool(toolName, args) {
    try {
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args
      });

      if (result.error) {
        throw new Error(result.error.message || 'Unknown error');
      }

      // Extract the text content from MCP response
      if (result.result && result.result.content && result.result.content[0]) {
        return JSON.parse(result.result.content[0].text);
      }

      return result.result;
    } catch (error) {
      throw new Error(`Tool call failed: ${error.message}`);
    }
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      console.log('🛑 MCP Server stopped');
    }
  }
}

// Global options variable (will be set in main())
let globalOptions = { debug: false, timeout: 30000 };

// Helper function to create MCP client with global options
function createMCPClient() {
  return new MCPClient(globalOptions);
}

async function findMTAFiles() {
  const mtaFiles = [];

  async function searchDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await searchDir(fullPath);
        } else if (entry.isFile() && (entry.name === 'mta.yaml' || entry.name === 'mta.yml')) {
          mtaFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  await searchDir(process.cwd());
  return mtaFiles;
}

async function parseMTA(filePath) {
  const client = new MCPClient();

  try {
    await client.startServer();

    // First get the list of tools
    console.log('📋 Getting available tools...');
    const toolsResponse = await client.sendRequest('tools/list', {});
    console.log('🔧 Available tools:', toolsResponse.result?.tools?.map(t => t.name));

    // Then call the parse_mta tool
    console.log('⚙️ Calling parse_mta tool...');
    const response = await client.sendRequest('tools/call', {
      name: 'parse_mta',
      arguments: { filePath }
    });

    if (response.result && response.result.content) {
      const result = JSON.parse(response.result.content[0].text);
      console.log('\n📋 MTA Parsing Results:');
      console.log('━'.repeat(50));
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function listMTAFiles() {
  try {
    const files = await fs.readdir('.');
    const mtaFiles = files.filter(file =>
      file.toLowerCase().includes('mta') &&
      (file.endsWith('.yaml') || file.endsWith('.yml'))
    );

    if (mtaFiles.length === 0) {
      console.log('📂 No MTA files found in current directory');
    } else {
      console.log('📂 Found MTA files:');
      mtaFiles.forEach(file => console.log(`  📄 ${file}`));
    }
  } catch (error) {
    console.error('❌ Error listing files:', error.message);
  }
}

// ============================================================================
// CF Service Commands
// ============================================================================

async function getServiceBinding(serviceName) {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log(`🔍 Getting service binding for: ${serviceName}`);

    const result = await client.callTool('get_service_binding', {
      serviceName,
      includeCredentials: true
    });

    console.log('📋 Service Binding Details:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error getting service binding:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function getAccessToken(credentialsFile) {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log(`🔑 Getting access token using: ${credentialsFile}`);

    // Read credentials file
    const credentialsContent = await fs.readFile(credentialsFile, 'utf-8');
    const credentials = JSON.parse(credentialsContent);

    const result = await client.callTool('get_access_token', {
      credentials
    });

    console.log('🎫 Access Token Details:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function getCFResources(resourceType = 'apps') {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log(`📦 Getting CF resources: ${resourceType}`);

    const result = await client.callTool('get_cf_resources', {
      resourceType
    });

    console.log(`📋 CF ${resourceType} Details::`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error getting CF resources:', error.message);
  } finally {
    await client.stopServer();
  }
}

// ============================================================================
// API Management Commands
// ============================================================================

async function uploadAPISpec(specId, specFile, name, baseUrl) {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log(`📤 Uploading API spec: ${specId} from ${specFile}`);

    const result = await client.callTool('upload_openapi_spec', {
      id: specId,
      name: name || specId,
      specPath: specFile,
      baseUrl
    });

    console.log('📋 Upload Result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error uploading API spec:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function listAPISpecs() {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log('📋 Listing registered API specs...');

    const result = await client.callTool('list_api_specs', {});

    console.log('📋 Registered API Specs:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error listing API specs:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function getAPIOperations(specId) {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log(`🔍 Getting operations for API spec: ${specId}`);

    const result = await client.callTool('get_api_operations', {
      specId
    });

    console.log('📋 API Operations:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error getting API operations:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function callAPI(specId, operationId, parametersJson, requestBodyJson) {
  const client = createMCPClient();
  try {
    await client.startServer();
    console.log(`🚀 Calling API: ${specId}.${operationId}`);

    const parameters = parametersJson ? JSON.parse(parametersJson) : {};
    const requestBody = requestBodyJson ? JSON.parse(requestBodyJson) : undefined;

    const result = await client.callTool('call_api', {
      specId,
      operationId,
      parameters,
      requestBody
    });

    console.log('📋 API Response:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  } finally {
    await client.stopServer();
  }
}

async function showHelp() {
  console.log(`
🔧 SAP CF MCP CLI Tool
━━━━━━━━━━━━━━━━━━━━━━━━

Usage: node scripts/mcp-cli.js <command> [options]

Global Options:
  --debug                        Enable debug mode (disables timeout)
  --timeout <ms>                 Set custom timeout in milliseconds (default: 30000)

MTA Commands:
  parse <file>                    Parse specific MTA file
  list                           List all MTA files in current directory

CF Service Commands:
  get-service-binding <name>     Get CF service binding for a service
  get-access-token <credentials> Get XSUAA access token
  get-cf-resources <type>        Get CF resources (apps, services, etc.)

API Management Commands:
  upload-api-spec <id> <file>    Upload OpenAPI specification
  list-api-specs                 List all registered API specs
  get-api-operations <specId>    Get operations for an API spec
  call-api <specId> <opId>       Call an API operation

Server Commands:
  server                         Start MCP server in interactive mode
  help                          Show this help message

Examples:
  node scripts/mcp-cli.js list
  node scripts/mcp-cli.js parse ./mta.yaml
  node scripts/mcp-cli.js get-service-binding bookshop-tlm-deveu21-instance
  node scripts/mcp-cli.js --debug get-service-binding bookshop-tlm-deveu21-instance
  node scripts/mcp-cli.js --timeout 60000 upload-api-spec tlm-api ./api-spec.json
  node scripts/mcp-cli.js server

For VS Code integration:
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Tasks: Run Task"
3. Select "Parse MTA File" or "Start MCP Server"
`);
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    debug: false,
    timeout: 30000
  };

  // Extract options
  const filteredArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--debug') {
      options.debug = true;
    } else if (args[i] === '--timeout') {
      i++; // Skip the value
      if (i < args.length) {
        options.timeout = parseInt(args[i], 10) || 30000;
      }
    } else {
      filteredArgs.push(args[i]);
    }
  }

  const command = filteredArgs[0];
  const arg1 = filteredArgs[1];
  const arg2 = filteredArgs[2];
  const arg3 = filteredArgs[3];
  const arg4 = filteredArgs[4];

  // Set global options for all MCP clients
  globalOptions = options;

  if (options.debug) {
    console.log('🐛 Debug mode enabled - timeouts disabled');
  }

  switch (command) {
    // MTA Commands
    case 'parse':
      if (!arg1) {
        console.error('❌ Please provide MTA file path');
        process.exit(1);
      }
      await parseMTA(arg1);
      break;

    case 'list':
      await listMTAFiles();
      break;

    // CF Service Commands
    case 'get-service-binding':
      if (!arg1) {
        console.error('❌ Please provide service name');
        process.exit(1);
      }
      await getServiceBinding(arg1);
      break;

    case 'get-access-token':
      if (!arg1) {
        console.error('❌ Please provide credentials file path');
        process.exit(1);
      }
      await getAccessToken(arg1);
      break;

    case 'get-cf-resources':
      await getCFResources(arg1 || 'apps');
      break;

    // API Management Commands
    case 'upload-api-spec':
      if (!arg1 || !arg2) {
        console.error('❌ Please provide spec ID and file path');
        console.error('Usage: upload-api-spec <specId> <filePath> [name] [baseUrl]');
        process.exit(1);
      }
      await uploadAPISpec(arg1, arg2, arg3, arg4);
      break;

    case 'list-api-specs':
      await listAPISpecs();
      break;

    case 'get-api-operations':
      if (!arg1) {
        console.error('❌ Please provide API spec ID');
        process.exit(1);
      }
      await getAPIOperations(arg1);
      break;

    case 'call-api':
      if (!arg1 || !arg2) {
        console.error('❌ Please provide spec ID and operation ID');
        console.error('Usage: call-api <specId> <operationId> [parameters-json] [requestBody-json]');
        process.exit(1);
      }
      await callAPI(arg1, arg2, arg3, arg4);
      break;

    // Server Commands
    case 'server':
      const client = createMCPClient();
      await client.startServer();
      console.log('🎯 MCP Server running. Press Ctrl+C to stop.');

      process.on('SIGINT', async () => {
        await client.stopServer();
        process.exit(0);
      });
      break;

    case 'help':
    default:
      await showHelp();
      break;
  }
}

main().catch(console.error);
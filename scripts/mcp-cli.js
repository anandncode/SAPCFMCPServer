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
  constructor() {
    this.serverProcess = null;
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

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          console.error('❌ Request timeout. Response data received:', responseData.substring(0, 200));
          reject(new Error('Request timeout'));
        }
      }, 10000);

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
                clearTimeout(timeout);
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

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      console.log('🛑 MCP Server stopped');
    }
  }
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
  console.log('🔍 Searching for MTA files in current directory...');
  const mtaFiles = await findMTAFiles();

  if (mtaFiles.length === 0) {
    console.log('📄 No MTA files found in current directory');
    return;
  }

  console.log(`\n📁 Found ${mtaFiles.length} MTA file(s):`);
  console.log('━'.repeat(50));
  mtaFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
}

async function showHelp() {
  console.log(`
🔧 SAP CF MCP CLI Tool
━━━━━━━━━━━━━━━━━━━━━━━━

Usage: node scripts/mcp-cli.js <command> [options]

Commands:
  parse <file>     Parse specific MTA file
  list            List all MTA files in current directory
  server          Start MCP server in interactive mode
  help            Show this help message

Examples:
  node scripts/mcp-cli.js list
  node scripts/mcp-cli.js parse ./mta.yaml
  node scripts/mcp-cli.js server

For VS Code integration:
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Tasks: Run Task"
3. Select "Parse MTA File" or "Start MCP Server"
`);
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'parse':
      if (!arg) {
        console.error('❌ Please provide MTA file path');
        process.exit(1);
      }
      await parseMTA(arg);
      break;

    case 'list':
      await listMTAFiles();
      break;

    case 'server':
      const client = new MCPClient();
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
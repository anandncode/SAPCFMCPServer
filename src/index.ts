#!/usr/bin/env node

// Set MCP server mode to disable console logging (MCP protocol uses stdio)
process.env.MCP_SERVER_MODE = 'true';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger, logError } from './utils/logger.js';
import {
  parseMTATool,
  handleParseMTA,
  getAccessTokenTool,
  handleGetAccessToken,
  getCFResourcesTool,
  handleGetCFResources,
  getServiceBindingTool,
  handleGetServiceBinding,
  uploadOpenAPISpecTool,
  handleUploadOpenAPISpec,
  callAPITool,
  handleCallAPI,
  listAPISpecsTool,
  handleListAPISpecs,
  getAPIOperationsTool,
  handleGetAPIOperations,
} from './tools/index.js';

class SAPCFMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'sap-cf-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          parseMTATool,
          getAccessTokenTool,
          getCFResourcesTool,
          getServiceBindingTool,
          uploadOpenAPISpecTool,
          callAPITool,
          listAPISpecsTool,
          getAPIOperationsTool,
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Debug logging for MCP tool calls
      logger.info('MCP tool called', {
        toolName: name,
        requestId: request.params.id,
        args: process.env.MCP_DEBUG === 'true' ? args : Object.keys(args || {})
      });

      try {
        switch (name) {
          case 'parse_mta':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleParseMTA(args), null, 2),
                },
              ],
            };

          case 'get_access_token':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleGetAccessToken(args), null, 2),
                },
              ],
            };

          case 'get_cf_resources':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleGetCFResources(args), null, 2),
                },
              ],
            };

          case 'get_service_binding':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleGetServiceBinding(args), null, 2),
                },
              ],
            };

          case 'upload_openapi_spec':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleUploadOpenAPISpec(args), null, 2),
                },
              ],
            };

          case 'call_api':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleCallAPI(args), null, 2),
                },
              ],
            };

          case 'list_api_specs':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleListAPISpecs(args), null, 2),
                },
              ],
            };

          case 'get_api_operations':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleGetAPIOperations(args), null, 2),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logError('Tool execution failed', error, { toolName: name });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('SAP CF MCP Server started successfully');

    // Log debug mode status
    if (process.env.MCP_DEBUG === 'true') {
      logger.debug('Debug mode enabled - verbose logging active');
      logger.debug(`Environment: NODE_ENV=${process.env.NODE_ENV}, LOG_LEVEL=${process.env.LOG_LEVEL}`);
    }

    // Handle process signals
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await this.server.close();
      process.exit(0);
    });
  }
}

// Start the server
const server = new SAPCFMCPServer();
server.run().catch((error) => {
  logError('Failed to start server', error);
  process.exit(1);
});
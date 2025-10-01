#!/usr/bin/env node

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
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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
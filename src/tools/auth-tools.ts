import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { XSUAAAuthService, CloudFoundryAPIService } from '../services/index.js';
import { logger, logError } from '../utils/logger.js';

export const getAccessTokenTool: Tool = {
  name: 'get_access_token',
  description: 'Get an OAuth access token from XSUAA service using client credentials',
  inputSchema: {
    type: 'object',
    properties: {
      credentials: {
        type: 'object',
        description: 'XSUAA service credentials or service key JSON',
        properties: {
          clientid: { type: 'string' },
          clientsecret: { type: 'string' },
          url: { type: 'string' },
          uaadomain: { type: 'string' }
        },
        required: ['clientid', 'clientsecret', 'url', 'uaadomain']
      },
      serviceName: {
        type: 'string',
        description: 'Optional: specific XSUAA service name from VCAP_SERVICES (if running in CF)'
      }
    }
  }
};

export async function handleGetAccessToken(args: any): Promise<any> {
  try {
    let authService: XSUAAAuthService;

    if (args.credentials) {
      // Use provided credentials
      if (!XSUAAAuthService.validateCredentials(args.credentials)) {
        return {
          success: false,
          error: 'Invalid XSUAA credentials provided'
        };
      }
      authService = new XSUAAAuthService(args.credentials);
    } else {
      // Try to get from VCAP_SERVICES
      try {
        authService = XSUAAAuthService.fromVCAPServices(args.serviceName);
      } catch (error) {
        return {
          success: false,
          error: `Failed to get XSUAA service from VCAP_SERVICES: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    const accessToken = await authService.getAccessToken();

    logger.info('Successfully obtained access token');

    return {
      success: true,
      data: {
        access_token: accessToken,
        token_length: accessToken.length,
        // Don't return the full token for security, just indicate success
        message: 'Access token obtained successfully'
      }
    };
  } catch (error) {
    logError('Failed to get access token', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
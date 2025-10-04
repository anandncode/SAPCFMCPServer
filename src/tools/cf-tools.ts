import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { XSUAAAuthService, CloudFoundryAPIService, CFServiceManager } from '../services/index.js';
import { logger, logError } from '../utils/logger.js';

export const getCFResourcesTool: Tool = {
  name: 'get_cf_resources',
  description: 'Get Cloud Foundry resources using current CF login session',
  inputSchema: {
    type: 'object',
    properties: {
      resourceType: {
        type: 'string',
        enum: ['apps', 'services', 'spaces', 'orgs', 'target'],
        description: 'Type of CF resources to retrieve',
        default: 'apps'
      }
    },
    required: ['resourceType']
  }
};

export async function handleGetCFResources(args: any): Promise<any> {
  try {
    // Check CF login status first
    const isLoggedIn = await CFServiceManager.checkCFLogin();
    if (!isLoggedIn) {
      return {
        success: false,
        error: 'CF CLI not logged in. Please run "cf login" first.'
      };
    }

    // If credentials are provided, use XSUAA auth, otherwise rely on CF login session
    let cfService: CloudFoundryAPIService;

    if (args.credentials && XSUAAAuthService.validateCredentials(args.credentials)) {
      const authService = new XSUAAAuthService(args.credentials);
      cfService = new CloudFoundryAPIService(args.apiUrl, authService);
    } else {
      // Use CF login session - create a minimal auth service that uses cf curl
      // For now, return an error asking for credentials since we need the full API service
      return {
        success: false,
        error: 'XSUAA credentials are required for CF resources operations. Please provide valid credentials.'
      };
    }

    let result;

    switch (args.resourceType) {
      case 'organizations':
        result = await cfService.getOrganizations();
        break;

      case 'spaces':
        if (!args.parentGuid) {
          return { success: false, error: 'parentGuid (organization GUID) is required for spaces' };
        }
        result = await cfService.getSpaces(args.parentGuid);
        break;

      case 'applications':
        if (args.resourceName) {
          result = await cfService.findApplicationByName(args.resourceName, args.parentGuid);
        } else if (args.parentGuid) {
          result = await cfService.getApplications(args.parentGuid);
        } else {
          return { success: false, error: 'parentGuid (space GUID) or resourceName is required for applications' };
        }
        break;

      case 'services':
        if (args.resourceName) {
          result = await cfService.findServiceByName(args.resourceName, args.parentGuid);
        } else if (args.parentGuid) {
          result = await cfService.getServices(args.parentGuid);
        } else {
          return { success: false, error: 'parentGuid (space GUID) or resourceName is required for services' };
        }
        break;

      case 'app-details':
        if (!args.resourceGuid) {
          return { success: false, error: 'resourceGuid (application GUID) is required for app-details' };
        }
        result = await cfService.getApplicationDetails(args.resourceGuid);
        break;

      case 'service-details':
        if (!args.resourceGuid) {
          return { success: false, error: 'resourceGuid (service GUID) is required for service-details' };
        }
        result = await cfService.getServiceDetails(args.resourceGuid);
        break;

      default:
        return {
          success: false,
          error: `Unknown resource type: ${args.resourceType}`
        };
    }

    if (result.success) {
      logger.info('Successfully retrieved CF resources', {
        resourceType: args.resourceType,
        count: Array.isArray(result.data) ? result.data.length : 1
      });
    } else {
      logError('Failed to retrieve CF resources', new Error(result.error), {
        resourceType: args.resourceType
      });
    }

    return result;
  } catch (error) {
    logError('Failed to get CF resources', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
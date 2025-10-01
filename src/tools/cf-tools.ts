import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { XSUAAAuthService, CloudFoundryAPIService } from '../services/index.js';
import { logger, logError } from '../utils/logger.js';

export const getCFResourcesTool: Tool = {
  name: 'get_cf_resources',
  description: 'Get Cloud Foundry resources (applications, services, spaces, orgs) using authenticated API calls',
  inputSchema: {
    type: 'object',
    properties: {
      apiUrl: {
        type: 'string',
        description: 'Cloud Foundry API URL (e.g., https://api.cf.sap.hana.ondemand.com)'
      },
      credentials: {
        type: 'object',
        description: 'XSUAA service credentials for authentication',
        properties: {
          clientid: { type: 'string' },
          clientsecret: { type: 'string' },
          url: { type: 'string' },
          uaadomain: { type: 'string' }
        },
        required: ['clientid', 'clientsecret', 'url', 'uaadomain']
      },
      resourceType: {
        type: 'string',
        enum: ['organizations', 'spaces', 'applications', 'services', 'app-details', 'service-details'],
        description: 'Type of resources to retrieve'
      },
      parentGuid: {
        type: 'string',
        description: 'Parent GUID (required for spaces, applications, services)'
      },
      resourceGuid: {
        type: 'string',
        description: 'Specific resource GUID (required for app-details, service-details)'
      },
      resourceName: {
        type: 'string',
        description: 'Search for resources by name'
      }
    },
    required: ['apiUrl', 'credentials', 'resourceType']
  }
};

export async function handleGetCFResources(args: any): Promise<any> {
  try {
    // Validate credentials
    if (!XSUAAAuthService.validateCredentials(args.credentials)) {
      return {
        success: false,
        error: 'Invalid XSUAA credentials provided'
      };
    }

    // Create services
    const authService = new XSUAAAuthService(args.credentials);
    const cfService = new CloudFoundryAPIService(args.apiUrl, authService);

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
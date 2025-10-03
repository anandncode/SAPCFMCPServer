import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CFServiceManager } from '../services/cf-service-manager.js';
import { APIManager } from '../services/api-manager.js';
import { XSUAAAuthService } from '../services/xsuaa-auth.js';
import { logger, logError } from '../utils/logger.js';
import fs from 'fs/promises';

// ============================================================================
// CF Service Binding Tool
// ============================================================================

export const getServiceBindingTool: Tool = {
  name: 'get_service_binding',
  description: 'Get Cloud Foundry service binding parameters for a specific service',
  inputSchema: {
    type: 'object',
    properties: {
      serviceName: {
        type: 'string',
        description: 'Name of the CF service to get binding information for'
      },
      includeCredentials: {
        type: 'boolean',
        description: 'Whether to include service credentials in the response (default: true)',
        default: true
      }
    },
    required: ['serviceName']
  }
};

export async function handleGetServiceBinding(args: any): Promise<any> {
  try {
    const { serviceName, includeCredentials = true } = args;

    // Check CF login status
    const isLoggedIn = await CFServiceManager.checkCFLogin();
    if (!isLoggedIn) {
      return {
        success: false,
        error: 'Not logged in to Cloud Foundry. Please run "cf login" first.'
      };
    }

    const target = await CFServiceManager.getCFTarget();
    const binding = await CFServiceManager.getServiceBinding(serviceName);

    const result = {
      success: true,
      data: {
        cfTarget: target,
        service: {
          name: binding.serviceName,
          label: binding.label,
          plan: binding.plan,
          tags: binding.tags,
          credentials: includeCredentials ? binding.credentials : {
            available: Object.keys(binding.credentials).length > 0,
            keys: Object.keys(binding.credentials)
          }
        }
      }
    };

    logger.info('Successfully retrieved service binding', { serviceName });
    return result;

  } catch (error) {
    logError('Failed to get service binding', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// Upload OpenAPI Spec Tool
// ============================================================================

export const uploadOpenAPISpecTool: Tool = {
  name: 'upload_openapi_spec',
  description: 'Upload and register an OpenAPI specification for API calls',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Unique identifier for this API spec'
      },
      name: {
        type: 'string',
        description: 'Human-readable name for this API'
      },
      specPath: {
        type: 'string',
        description: 'Path to the OpenAPI spec file (JSON or YAML)'
      },
      specContent: {
        type: 'object',
        description: 'OpenAPI spec content as JSON object (alternative to specPath)'
      },
      baseUrl: {
        type: 'string',
        description: 'Base URL for API calls (overrides spec servers)'
      },
      authType: {
        type: 'string',
        enum: ['bearer', 'basic', 'oauth2', 'none'],
        description: 'Authentication type for this API',
        default: 'bearer'
      },
      description: {
        type: 'string',
        description: 'Description of this API'
      }
    },
    required: ['id', 'name'],
    oneOf: [
      { required: ['specPath'] },
      { required: ['specContent'] }
    ]
  }
};

export async function handleUploadOpenAPISpec(args: any): Promise<any> {
  try {
    const { id, name, specPath, specContent, baseUrl, authType = 'bearer', description } = args;

    let spec: any;

    if (specContent) {
      spec = specContent;
    } else if (specPath) {
      // Read spec from file
      const content = await fs.readFile(specPath, 'utf-8');

      if (specPath.endsWith('.json')) {
        spec = JSON.parse(content);
      } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
        // For YAML, we'd need a YAML parser, but for now assume JSON
        try {
          spec = JSON.parse(content);
        } catch {
          return {
            success: false,
            error: 'YAML support not implemented yet. Please convert to JSON or provide specContent directly.'
          };
        }
      } else {
        return {
          success: false,
          error: 'Unsupported file format. Please use .json files.'
        };
      }
    } else {
      return {
        success: false,
        error: 'Either specPath or specContent must be provided'
      };
    }

    const apiManager = APIManager.getInstance();
    await apiManager.uploadSpec(id, name, spec, {
      description,
      baseUrl,
      authType
    });

    const operations = apiManager.getOperations(id);

    return {
      success: true,
      data: {
        id,
        name,
        description: description || spec.info?.description,
        baseUrl: baseUrl || spec.servers?.[0]?.url,
        authType,
        operationCount: operations.length,
        operations: operations.slice(0, 10) // Show first 10 operations
      }
    };

  } catch (error) {
    logError('Failed to upload OpenAPI spec', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// Call API Tool
// ============================================================================

export const callAPITool: Tool = {
  name: 'call_api',
  description: 'Call an API operation using a registered OpenAPI specification',
  inputSchema: {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'ID of the registered OpenAPI spec'
      },
      operationId: {
        type: 'string',
        description: 'Operation ID from the OpenAPI spec'
      },
      parameters: {
        type: 'object',
        description: 'Path, query, and header parameters for the API call',
        additionalProperties: true
      },
      requestBody: {
        type: 'object',
        description: 'Request body for POST/PUT/PATCH operations'
      },
      auth: {
        type: 'object',
        description: 'Authentication configuration',
        properties: {
          type: {
            type: 'string',
            enum: ['token', 'xsuaa', 'basic', 'none'],
            description: 'Authentication type'
          },
          token: {
            type: 'string',
            description: 'Bearer token for authentication'
          },
          xsuaaCredentials: {
            type: 'object',
            description: 'XSUAA credentials for automatic token retrieval'
          },
          username: {
            type: 'string',
            description: 'Username for basic authentication'
          },
          password: {
            type: 'string',
            description: 'Password for basic authentication'
          }
        }
      }
    },
    required: ['specId', 'operationId']
  }
};

export async function handleCallAPI(args: any): Promise<any> {
  try {
    const { specId, operationId, parameters = {}, requestBody, auth } = args;

    const apiManager = APIManager.getInstance();

    // Prepare authentication
    let authConfig: any = {};

    if (auth) {
      switch (auth.type) {
        case 'token':
          authConfig.token = auth.token;
          break;

        case 'xsuaa':
          if (auth.xsuaaCredentials) {
            const xsuaaService = new XSUAAAuthService(auth.xsuaaCredentials);
            authConfig.xsuaaService = xsuaaService;
          }
          break;

        case 'basic':
          authConfig.credentials = {
            username: auth.username,
            password: auth.password
          };
          break;

        case 'none':
          // No authentication
          break;
      }
    }

    const result = await apiManager.callAPI(
      specId,
      operationId,
      parameters,
      requestBody,
      authConfig
    );

    logger.info('API call completed', {
      specId,
      operationId,
      success: result.success,
      status: result.status
    });

    return result;

  } catch (error) {
    logError('Failed to call API', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// List API Specs Tool
// ============================================================================

export const listAPISpecsTool: Tool = {
  name: 'list_api_specs',
  description: 'List all registered OpenAPI specifications',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function handleListAPISpecs(args: any): Promise<any> {
  try {
    const apiManager = APIManager.getInstance();
    const specs = apiManager.listSpecs();

    return {
      success: true,
      data: {
        count: specs.length,
        specs: specs.map(spec => ({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          baseUrl: spec.baseUrl,
          authType: spec.authType,
          uploadedAt: spec.uploadedAt
        }))
      }
    };

  } catch (error) {
    logError('Failed to list API specs', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// Get API Operations Tool
// ============================================================================

export const getAPIOperationsTool: Tool = {
  name: 'get_api_operations',
  description: 'List all available operations for a registered OpenAPI specification',
  inputSchema: {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'ID of the registered OpenAPI spec'
      }
    },
    required: ['specId']
  }
};

export async function handleGetAPIOperations(args: any): Promise<any> {
  try {
    const { specId } = args;

    const apiManager = APIManager.getInstance();
    const operations = apiManager.getOperations(specId);

    return {
      success: true,
      data: {
        specId,
        operationCount: operations.length,
        operations: operations.map(op => ({
          operationId: op.operationId,
          method: op.method,
          path: op.path,
          summary: op.summary,
          description: op.description,
          parameters: op.parameters?.map(p => ({
            name: p.name,
            in: p.in,
            required: p.required,
            type: p.type || p.schema?.type,
            description: p.description
          }))
        }))
      }
    };

  } catch (error) {
    logError('Failed to get API operations', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
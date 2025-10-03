import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import { logger, logError } from '../utils/logger.js';
import { XSUAAAuthService } from './xsuaa-auth.js';

export interface OpenAPISpec {
  id: string;
  name: string;
  description?: string;
  spec: any;
  baseUrl?: string;
  authType: 'bearer' | 'basic' | 'oauth2' | 'none';
  uploadedAt: Date;
  filePath?: string;
}

export interface APIOperation {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

export class APIManager {
  private static instance: APIManager;
  private specs: Map<string, OpenAPISpec> = new Map();
  private specsDir = path.join(process.cwd(), '.mcp-api-specs');

  private constructor() {
    this.ensureSpecsDirectory();
    this.loadExistingSpecs();
  }

  public static getInstance(): APIManager {
    if (!APIManager.instance) {
      APIManager.instance = new APIManager();
    }
    return APIManager.instance;
  }

  private async ensureSpecsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.specsDir, { recursive: true });
    } catch (error) {
      logError('Failed to create specs directory', error);
    }
  }

  private async loadExistingSpecs(): Promise<void> {
    try {
      const files = await fs.readdir(this.specsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.specsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const spec = JSON.parse(content) as OpenAPISpec;
          this.specs.set(spec.id, spec);
        }
      }
      logger.info(`Loaded ${this.specs.size} OpenAPI specs`);
    } catch (error) {
      logError('Failed to load existing specs', error);
    }
  }

  public async uploadSpec(
    id: string,
    name: string,
    specContent: any,
    options: {
      description?: string;
      baseUrl?: string;
      authType?: 'bearer' | 'basic' | 'oauth2' | 'none';
    } = {}
  ): Promise<void> {
    try {
      // Validate OpenAPI spec
      if (!specContent.openapi && !specContent.swagger) {
        throw new Error('Invalid OpenAPI specification: missing openapi or swagger version');
      }

      const spec: OpenAPISpec = {
        id,
        name,
        description: options.description || specContent.info?.description,
        spec: specContent,
        baseUrl: options.baseUrl || this.extractBaseUrl(specContent),
        authType: options.authType || 'bearer',
        uploadedAt: new Date(),
        filePath: path.join(this.specsDir, `${id}.json`)
      };

      // Save to file
      await fs.writeFile(spec.filePath!, JSON.stringify(spec, null, 2));

      // Store in memory
      this.specs.set(id, spec);

      logger.info('OpenAPI spec uploaded successfully', {
        id,
        name,
        operationCount: this.getOperationCount(specContent)
      });
    } catch (error) {
      logError('Failed to upload OpenAPI spec', error, { id, name });
      throw error;
    }
  }

  private extractBaseUrl(spec: any): string {
    // OpenAPI 3.0
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }

    // OpenAPI 2.0 (Swagger)
    if (spec.host) {
      const scheme = spec.schemes?.[0] || 'https';
      const basePath = spec.basePath || '';
      return `${scheme}://${spec.host}${basePath}`;
    }

    return '';
  }

  private getOperationCount(spec: any): number {
    let count = 0;
    for (const path in spec.paths || {}) {
      for (const method in spec.paths[path]) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          count++;
        }
      }
    }
    return count;
  }

  public getSpec(id: string): OpenAPISpec | undefined {
    return this.specs.get(id);
  }

  public listSpecs(): OpenAPISpec[] {
    return Array.from(this.specs.values()).map(spec => ({
      ...spec,
      spec: undefined // Don't include full spec in list
    }));
  }

  public getOperations(specId: string): APIOperation[] {
    const spec = this.specs.get(specId);
    if (!spec) {
      throw new Error(`OpenAPI spec not found: ${specId}`);
    }

    const operations: APIOperation[] = [];
    const paths = spec.spec.paths || {};

    for (const [pathPattern, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          operations.push({
            operationId: (operation as any).operationId || `${method}_${pathPattern.replace(/[^a-zA-Z0-9]/g, '_')}`,
            method: method.toUpperCase(),
            path: pathPattern,
            summary: (operation as any).summary,
            description: (operation as any).description,
            parameters: (operation as any).parameters,
            requestBody: (operation as any).requestBody,
            responses: (operation as any).responses
          });
        }
      }
    }

    return operations;
  }

  public async callAPI(
    specId: string,
    operationId: string,
    parameters: Record<string, any> = {},
    requestBody?: any,
    authConfig?: {
      token?: string;
      credentials?: any;
      xsuaaService?: XSUAAAuthService;
    }
  ): Promise<any> {
    try {
      const spec = this.specs.get(specId);
      if (!spec) {
        throw new Error(`OpenAPI spec not found: ${specId}`);
      }

      const operation = this.findOperation(spec, operationId);
      if (!operation) {
        throw new Error(`Operation not found: ${operationId}`);
      }

      // Build URL
      let url = this.buildUrl(spec.baseUrl || '', operation.path, parameters);

      // Build request config
      const config: AxiosRequestConfig = {
        method: operation.method.toLowerCase() as any,
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      // Add authentication
      if (authConfig) {
        await this.addAuthentication(config, spec, authConfig);
      }

      // Add query parameters
      const queryParams = this.extractQueryParams(operation, parameters);
      if (Object.keys(queryParams).length > 0) {
        config.params = queryParams;
      }

      // Add request body
      if (requestBody && ['POST', 'PUT', 'PATCH'].includes(operation.method)) {
        config.data = requestBody;
      }

      logger.info('Making API call', {
        specId,
        operationId,
        method: operation.method,
        url: config.url
      });

      const response = await axios(config);

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };

    } catch (error) {
      logError('API call failed', error, { specId, operationId });

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.message,
          data: error.response?.data
        };
      }

      throw error;
    }
  }

  private findOperation(spec: OpenAPISpec, operationId: string): APIOperation | null {
    const operations = this.getOperations(spec.id);
    return operations.find(op => op.operationId === operationId) || null;
  }

  private buildUrl(baseUrl: string, pathPattern: string, parameters: Record<string, any>): string {
    let url = baseUrl + pathPattern;

    // Replace path parameters
    for (const [key, value] of Object.entries(parameters)) {
      url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
    }

    return url;
  }

  private extractQueryParams(operation: APIOperation, parameters: Record<string, any>): Record<string, any> {
    const queryParams: Record<string, any> = {};

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === 'query' && parameters[param.name] !== undefined) {
          queryParams[param.name] = parameters[param.name];
        }
      }
    }

    return queryParams;
  }

  private async addAuthentication(
    config: AxiosRequestConfig,
    spec: OpenAPISpec,
    authConfig: {
      token?: string;
      credentials?: any;
      xsuaaService?: XSUAAAuthService;
    }
  ): Promise<void> {
    switch (spec.authType) {
      case 'bearer':
        let token = authConfig.token;
        if (!token && authConfig.xsuaaService) {
          token = await authConfig.xsuaaService.getAccessToken();
        }
        if (token) {
          config.headers!['Authorization'] = `Bearer ${token}`;
        }
        break;

      case 'basic':
        if (authConfig.credentials?.username && authConfig.credentials?.password) {
          const auth = Buffer.from(
            `${authConfig.credentials.username}:${authConfig.credentials.password}`
          ).toString('base64');
          config.headers!['Authorization'] = `Basic ${auth}`;
        }
        break;

      case 'oauth2':
        // Handle OAuth2 flows if needed
        if (authConfig.token) {
          config.headers!['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;

      case 'none':
        // No authentication needed
        break;
    }
  }

  public async deleteSpec(id: string): Promise<void> {
    const spec = this.specs.get(id);
    if (!spec) {
      throw new Error(`OpenAPI spec not found: ${id}`);
    }

    // Delete file
    if (spec.filePath) {
      try {
        await fs.unlink(spec.filePath);
      } catch (error) {
        logError('Failed to delete spec file', error, { id });
      }
    }

    // Remove from memory
    this.specs.delete(id);

    logger.info('OpenAPI spec deleted', { id });
  }
}
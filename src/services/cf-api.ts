import axios, { AxiosResponse } from 'axios';
import { CFApplication, CFService, CFSpace, CFOrganization, APIResponse } from '../types/index.js';
import { XSUAAAuthService } from './xsuaa-auth.js';
import { logger, logError } from '../utils/logger.js';

export class CloudFoundryAPIService {
  private baseUrl: string;
  private authService: XSUAAAuthService;

  constructor(baseUrl: string, authService: XSUAAAuthService) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authService = authService;
  }

  /**
   * Get authorization headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.authService.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make authenticated request to CF API
   */
  private async makeRequest<T>(endpoint: string, method = 'GET', data?: any): Promise<APIResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseUrl}${endpoint}`;

      logger.debug('Making CF API request', { method, url });

      const response: AxiosResponse<T> = await axios({
        method,
        url,
        headers,
        data,
        timeout: 30000,
      });

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      logError('CF API request failed', error, { endpoint });
      return {
        success: false,
        error: error.response?.data?.description || error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Get all organizations
   */
  async getOrganizations(): Promise<APIResponse<CFOrganization[]>> {
    const response = await this.makeRequest<{ resources: CFOrganization[] }>('/v2/organizations');
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }

  /**
   * Get spaces in an organization
   */
  async getSpaces(orgGuid: string): Promise<APIResponse<CFSpace[]>> {
    const response = await this.makeRequest<{ resources: CFSpace[] }>(`/v2/organizations/${orgGuid}/spaces`);
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }

  /**
   * Get applications in a space
   */
  async getApplications(spaceGuid: string): Promise<APIResponse<CFApplication[]>> {
    const response = await this.makeRequest<{ resources: CFApplication[] }>(`/v2/spaces/${spaceGuid}/apps`);
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }

  /**
   * Get services in a space
   */
  async getServices(spaceGuid: string): Promise<APIResponse<CFService[]>> {
    const response = await this.makeRequest<{ resources: CFService[] }>(`/v2/spaces/${spaceGuid}/service_instances`);
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }

  /**
   * Get application details with environment
   */
  async getApplicationDetails(appGuid: string): Promise<APIResponse<CFApplication>> {
    const response = await this.makeRequest<CFApplication>(`/v2/apps/${appGuid}`);
    if (response.success && response.data) {
      // Also fetch environment
      const envResponse = await this.makeRequest<any>(`/v2/apps/${appGuid}/env`);
      if (envResponse.success && envResponse.data) {
        response.data.system_env_json = envResponse.data.system_env_json;
        response.data.environment_json = envResponse.data.environment_json;
      }
    }
    return response;
  }

  /**
   * Get service instance details
   */
  async getServiceDetails(serviceGuid: string): Promise<APIResponse<CFService>> {
    return this.makeRequest<CFService>(`/v2/service_instances/${serviceGuid}`);
  }

  /**
   * Get service bindings for an application
   */
  async getServiceBindings(appGuid: string): Promise<APIResponse<any[]>> {
    const response = await this.makeRequest<{ resources: any[] }>(`/v2/apps/${appGuid}/service_bindings`);
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }

  /**
   * Search for applications by name
   */
  async findApplicationByName(name: string, spaceGuid?: string): Promise<APIResponse<CFApplication[]>> {
    let endpoint = `/v2/apps?q=name:${encodeURIComponent(name)}`;
    if (spaceGuid) {
      endpoint += `&q=space_guid:${spaceGuid}`;
    }

    const response = await this.makeRequest<{ resources: CFApplication[] }>(endpoint);
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }

  /**
   * Search for services by name
   */
  async findServiceByName(name: string, spaceGuid?: string): Promise<APIResponse<CFService[]>> {
    let endpoint = `/v2/service_instances?q=name:${encodeURIComponent(name)}`;
    if (spaceGuid) {
      endpoint += `&q=space_guid:${spaceGuid}`;
    }

    const response = await this.makeRequest<{ resources: CFService[] }>(endpoint);
    if (response.success && response.data) {
      return {
        success: response.success,
        data: response.data.resources,
        statusCode: response.statusCode,
      };
    }
    return {
      success: false,
      error: response.error,
      statusCode: response.statusCode,
    };
  }
}
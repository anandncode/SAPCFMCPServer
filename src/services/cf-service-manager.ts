import { exec } from 'child_process';
import { promisify } from 'util';
import { logger, logError } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface CFServiceBinding {
  serviceName: string;
  credentials: Record<string, any>;
  label: string;
  plan: string;
  tags: string[];
}

export interface CFServiceInfo {
  name: string;
  service: string;
  plan: string;
  bound_apps: string[];
  last_operation: {
    type: string;
    state: string;
    description: string;
    updated_at: string;
  };
}

export class CFServiceManager {
  /**
   * Check if user is logged in to CF
   */
  public static async checkCFLogin(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('cf target');
      return stdout.includes('API endpoint:') && stdout.includes('user:');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get CF target information
   */
  public static async getCFTarget(): Promise<{
    api: string;
    user: string;
    org: string;
    space: string;
  }> {
    try {
      const { stdout } = await execAsync('cf target');

      const apiMatch = stdout.match(/API endpoint:\s+(.+)/);
      const userMatch = stdout.match(/user:\s+(.+)/);
      const orgMatch = stdout.match(/org:\s+(.+)/);
      const spaceMatch = stdout.match(/space:\s+(.+)/);

      return {
        api: apiMatch?.[1]?.trim() || '',
        user: userMatch?.[1]?.trim() || '',
        org: orgMatch?.[1]?.trim() || '',
        space: spaceMatch?.[1]?.trim() || ''
      };
    } catch (error) {
      logError('Failed to get CF target info', error);
      throw new Error('Not logged in to Cloud Foundry. Please run "cf login" first.');
    }
  }

  /**
   * Get service binding information
   */
  public static async getServiceBinding(serviceName: string): Promise<CFServiceBinding> {
    try {
      // First check if logged in
      const isLoggedIn = await this.checkCFLogin();
      if (!isLoggedIn) {
        throw new Error('Not logged in to Cloud Foundry. Please run "cf login" first.');
      }

      // Get service information
      const { stdout: serviceInfo } = await execAsync(`cf service "${serviceName}"`);

      // Check if service exists
      if (serviceInfo.includes('Service instance not found')) {
        throw new Error(`Service "${serviceName}" not found in current space`);
      }

      // Parse service info
      const labelMatch = serviceInfo.match(/service:\s+(.+)/);
      const planMatch = serviceInfo.match(/plan:\s+(.+)/);
      const tagsMatch = serviceInfo.match(/tags:\s+(.+)/);

      // Get service key (credentials)
      let credentials: Record<string, any> = {};

      try {
        // Try to get existing service key
        const { stdout: keysOutput } = await execAsync(`cf service-keys "${serviceName}"`);

        // Check if there are any service keys
        if (!keysOutput.includes('No service keys')) {
          // Get the first service key name
          const keyLines = keysOutput.split('\n').filter(line => line.trim() && !line.includes('Getting keys') && !line.includes('name'));
          if (keyLines.length > 0) {
            const keyName = keyLines[0].trim();
            const { stdout: keyData } = await execAsync(`cf service-key "${serviceName}" "${keyName}"`);

            // Parse JSON from service key
            const jsonMatch = keyData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              credentials = JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (keyError) {
        // If no service keys exist, try to create a temporary one
        try {
          const tempKeyName = `mcp-temp-key-${Date.now()}`;
          await execAsync(`cf create-service-key "${serviceName}" "${tempKeyName}"`);

          const { stdout: keyData } = await execAsync(`cf service-key "${serviceName}" "${tempKeyName}"`);
          const jsonMatch = keyData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            credentials = JSON.parse(jsonMatch[0]);
          }

          // Clean up temporary key
          await execAsync(`cf delete-service-key "${serviceName}" "${tempKeyName}" -f`);
        } catch (tempKeyError) {
          logError('Failed to create temporary service key', tempKeyError);
          // Continue without credentials
        }
      }

      const binding: CFServiceBinding = {
        serviceName,
        credentials,
        label: labelMatch?.[1]?.trim() || '',
        plan: planMatch?.[1]?.trim() || '',
        tags: tagsMatch?.[1]?.split(',').map(tag => tag.trim()) || []
      };

      logger.info('Retrieved service binding', {
        serviceName,
        label: binding.label,
        plan: binding.plan,
        hasCredentials: Object.keys(credentials).length > 0
      });

      return binding;

    } catch (error) {
      logError('Failed to get service binding', error, { serviceName });
      throw error;
    }
  }

  /**
   * List all services in current space
   */
  public static async listServices(): Promise<CFServiceInfo[]> {
    try {
      const isLoggedIn = await this.checkCFLogin();
      if (!isLoggedIn) {
        throw new Error('Not logged in to Cloud Foundry. Please run "cf login" first.');
      }

      const { stdout } = await execAsync('cf services');

      const services: CFServiceInfo[] = [];
      const lines = stdout.split('\n');

      let dataStarted = false;
      for (const line of lines) {
        if (line.includes('name') && line.includes('service') && line.includes('plan')) {
          dataStarted = true;
          continue;
        }

        if (dataStarted && line.trim()) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            services.push({
              name: parts[0],
              service: parts[1],
              plan: parts[2],
              bound_apps: parts[3] === 'none' ? [] : parts[3].split(','),
              last_operation: {
                type: parts[4] || '',
                state: parts[5] || '',
                description: parts.slice(6).join(' ') || '',
                updated_at: ''
              }
            });
          }
        }
      }

      logger.info('Listed CF services', { count: services.length });
      return services;

    } catch (error) {
      logError('Failed to list CF services', error);
      throw error;
    }
  }

  /**
   * Get VCAP_SERVICES equivalent from service bindings
   */
  public static async getVCAPServices(serviceNames?: string[]): Promise<Record<string, CFServiceBinding[]>> {
    try {
      const services = await this.listServices();
      const vcapServices: Record<string, CFServiceBinding[]> = {};

      const servicesToProcess = serviceNames || services.map(s => s.name);

      for (const serviceName of servicesToProcess) {
        try {
          const binding = await this.getServiceBinding(serviceName);
          const serviceType = binding.label;

          if (!vcapServices[serviceType]) {
            vcapServices[serviceType] = [];
          }

          vcapServices[serviceType].push(binding);
        } catch (error) {
          logError('Failed to get binding for service', error, { serviceName });
          // Continue with other services
        }
      }

      return vcapServices;

    } catch (error) {
      logError('Failed to get VCAP services', error);
      throw error;
    }
  }
}
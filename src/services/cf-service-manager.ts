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
   * Check if user is logged in to CF using CF API
   */
  public static async checkCFLogin(): Promise<boolean> {
    try {
      // Try to get API info - this will fail if not logged in
      const { stdout } = await execAsync('cf curl /v2/info');
      const apiInfo = JSON.parse(stdout);

      // If we can parse the response and have a user field, we're logged in
      return !!apiInfo.user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get CF target information using CF API
   */
  public static async getCFTarget(): Promise<{
    api: string;
    user: string;
    org: string;
    space: string;
  }> {
    try {
      // Get API info
      const { stdout: apiInfoOutput } = await execAsync('cf curl /v2/info');
      const apiInfo = JSON.parse(apiInfoOutput);

      // Get current user info
      const { stdout: userInfoOutput } = await execAsync('cf curl /v3/users');
      const userInfo = JSON.parse(userInfoOutput);

      // Get current org info
      const { stdout: orgsOutput } = await execAsync('cf curl /v3/organizations');
      const orgsData = JSON.parse(orgsOutput);

      // Get current space info
      const { stdout: spacesOutput } = await execAsync('cf curl /v3/spaces');
      const spacesData = JSON.parse(spacesOutput);

      // Extract information
      const api = apiInfo.api_endpoint || '';
      const user = userInfo.resources?.[0]?.username || '';
      const org = orgsData.resources?.[0]?.name || '';
      const space = spacesData.resources?.[0]?.name || '';

      return {
        api,
        user,
        org,
        space
      };
    } catch (error) {
      logError('Failed to get CF target info via API', error);
      throw new Error('Not logged in to Cloud Foundry. Please run "cf login" first.');
    }
  }

  /**
   * Get service binding information using CF API
   */
  public static async getServiceBinding(serviceName: string): Promise<CFServiceBinding> {
    try {
      // First check if logged in
      const isLoggedIn = await this.checkCFLogin();
      if (!isLoggedIn) {
        throw new Error('Not logged in to Cloud Foundry. Please run "cf login" first.');
      }

      // Get service instances using CF API
      const { stdout: serviceInstancesOutput } = await execAsync('cf curl /v3/service_instances');
      const serviceInstancesData = JSON.parse(serviceInstancesOutput);

      // Find the service instance by name
      const serviceInstance = serviceInstancesData.resources?.find((instance: any) =>
        instance.name === serviceName
      );

      if (!serviceInstance) {
        throw new Error(`Service "${serviceName}" not found in current space`);
      }

      // Get service plan details
      let servicePlan: any = { name: '', relationships: null };
      if (serviceInstance.relationships?.service_plan?.data?.guid) {
        try {
          const { stdout: planOutput } = await execAsync(`cf curl /v3/service_plans/${serviceInstance.relationships.service_plan.data.guid}`);
          servicePlan = JSON.parse(planOutput);
        } catch (planError) {
          logger.debug('Could not fetch service plan details', { error: planError });
        }
      }

      // Get service offering details for tags
      let serviceOffering: any = { tags: [], name: '' };
      if (servicePlan.relationships?.service_offering?.data?.guid) {
        try {
          const { stdout: offeringOutput } = await execAsync(`cf curl /v3/service_offerings/${servicePlan.relationships.service_offering.data.guid}`);
          serviceOffering = JSON.parse(offeringOutput);
        } catch (offeringError) {
          logger.debug('Could not fetch service offering details', { error: offeringError });
        }
      }

      // Get service credentials (service keys)
      let credentials: Record<string, any> = {};

      try {
        // Get service keys using CF API
        const { stdout: serviceKeysOutput } = await execAsync(`cf curl /v3/service_credential_bindings?service_instance_guids=${serviceInstance.guid}&type=key`);
        const serviceKeysData = JSON.parse(serviceKeysOutput);

        if (serviceKeysData.resources && serviceKeysData.resources.length > 0) {
          // Get the first service key's details
          const firstKey = serviceKeysData.resources[0];
          const { stdout: keyDetailsOutput } = await execAsync(`cf curl /v3/service_credential_bindings/${firstKey.guid}/details`);
          const keyDetails = JSON.parse(keyDetailsOutput);
          credentials = keyDetails.credentials || {};
        }
      } catch (keyError) {
        logger.debug('Could not fetch service key details, trying to create temporary key', { error: keyError });

        // If no service keys exist, try to create a temporary one
        try {
          const tempKeyName = `mcp-temp-key-${Date.now()}`;

          // Create service key using CF API
          const createKeyPayload = {
            type: 'key',
            name: tempKeyName,
            relationships: {
              service_instance: {
                data: {
                  guid: serviceInstance.guid
                }
              }
            }
          };

          const { stdout: createKeyOutput } = await execAsync(`cf curl /v3/service_credential_bindings -X POST -d '${JSON.stringify(createKeyPayload)}'`);
          const createdKey = JSON.parse(createKeyOutput);

          // Wait a moment for the key to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Get the created key's details
          const { stdout: tempKeyDetailsOutput } = await execAsync(`cf curl /v3/service_credential_bindings/${createdKey.guid}/details`);
          const tempKeyDetails = JSON.parse(tempKeyDetailsOutput);
          credentials = tempKeyDetails.credentials || {};

          // Clean up the temporary key
          try {
            await execAsync(`cf curl /v3/service_credential_bindings/${createdKey.guid} -X DELETE`);
          } catch (deleteError) {
            logger.warn('Could not delete temporary service key', { keyGuid: createdKey.guid, error: deleteError });
          }
        } catch (tempKeyError) {
          logError('Failed to create temporary service key', tempKeyError);
          // Continue without credentials
        }
      }

      // Prepare the service binding response
      const binding: CFServiceBinding = {
        serviceName,
        credentials,
        label: serviceOffering.name || '',
        plan: servicePlan.name || '',
        tags: serviceOffering.tags || []
      };

      logger.info('Retrieved service binding via CF API', {
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
   * List all CF services in the current space using CF API
   */
  public static async listServices(): Promise<CFServiceInfo[]> {
    try {
      const isLoggedIn = await this.checkCFLogin();
      if (!isLoggedIn) {
        throw new Error('Not logged in to Cloud Foundry. Please run "cf login" first.');
      }

      // Get service instances using CF API
      const { stdout: serviceInstancesOutput } = await execAsync('cf curl /v3/service_instances');
      const serviceInstancesData = JSON.parse(serviceInstancesOutput);

      const services: CFServiceInfo[] = [];

      for (const instance of serviceInstancesData.resources || []) {
        // Get service plan details
        let planName = '';
        let serviceName = '';

        if (instance.relationships?.service_plan?.data?.guid) {
          try {
            const { stdout: planOutput } = await execAsync(`cf curl /v3/service_plans/${instance.relationships.service_plan.data.guid}`);
            const plan = JSON.parse(planOutput);
            planName = plan.name || '';

            // Get service offering name
            if (plan.relationships?.service_offering?.data?.guid) {
              const { stdout: offeringOutput } = await execAsync(`cf curl /v3/service_offerings/${plan.relationships.service_offering.data.guid}`);
              const offering = JSON.parse(offeringOutput);
              serviceName = offering.name || '';
            }
          } catch (planError) {
            logger.debug('Could not fetch plan details for service instance', { instanceGuid: instance.guid, error: planError });
          }
        }

        // Get bound apps
        const boundApps: string[] = [];
        try {
          const { stdout: bindingsOutput } = await execAsync(`cf curl /v3/service_credential_bindings?service_instance_guids=${instance.guid}&type=app`);
          const bindingsData = JSON.parse(bindingsOutput);

          for (const binding of bindingsData.resources || []) {
            if (binding.relationships?.app?.data?.guid) {
              try {
                const { stdout: appOutput } = await execAsync(`cf curl /v3/apps/${binding.relationships.app.data.guid}`);
                const app = JSON.parse(appOutput);
                if (app.name) {
                  boundApps.push(app.name);
                }
              } catch (appError) {
                logger.debug('Could not fetch app name for binding', { bindingGuid: binding.guid, error: appError });
              }
            }
          }
        } catch (bindingError) {
          logger.debug('Could not fetch app bindings for service instance', { instanceGuid: instance.guid, error: bindingError });
        }

        services.push({
          name: instance.name,
          service: serviceName,
          plan: planName,
          bound_apps: boundApps,
          last_operation: {
            type: instance.last_operation?.type || '',
            state: instance.last_operation?.state || '',
            description: instance.last_operation?.description || '',
            updated_at: instance.last_operation?.updated_at || instance.updated_at || ''
          }
        });
      }

      logger.info('Listed CF services via API', { count: services.length });
      return services;

    } catch (error) {
      logError('Failed to list CF services via API', error);
      throw error;
    }
  }  /**
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
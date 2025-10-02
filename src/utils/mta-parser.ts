import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import { MTADescriptor } from '../types/index.js';
import { logger, logError } from './logger.js';

export class MTAParser {
  /**
   * Parse MTA descriptor from file path
   */
  static async parseFromFile(filePath: string): Promise<MTADescriptor> {
    try {
      const absolutePath = path.resolve(filePath);

      // Check if file exists
      try {
        await fs.access(absolutePath);
      } catch (accessError) {
        logError('MTA file not accessible', accessError, { filePath: absolutePath });
        throw new Error(`MTA file not found or not accessible: ${absolutePath}`);
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      logger.info('Successfully read MTA file', {
        filePath: absolutePath,
        contentLength: content.length,
        contentPreview: content.substring(0, 100).replace(/\n/g, '\\n')
      });

      return this.parseFromString(content);
    } catch (error) {
      if (error instanceof Error && error.message.includes('MTA file not found')) {
        throw error; // Re-throw file access errors as-is
      }
      logError('Failed to read MTA file', error, { filePath });
      throw new Error(`Failed to read MTA file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse MTA descriptor from string content
   */
  static parseFromString(content: string): MTADescriptor {
    try {
      // Configure YAML parser to be more flexible for BTP CF mta.yaml files
      const parsed = YAML.parse(content, {
        strict: false,
        uniqueKeys: false,
        maxAliasCount: -1,
        prettyErrors: true
      }) as MTADescriptor;

      this.validateMTADescriptor(parsed);
      return parsed;
    } catch (error) {
      logError('Failed to parse MTA YAML', error, {
        contentPreview: content.substring(0, 200) + '...',
        contentLength: content.length
      });
      throw new Error(`Failed to parse MTA YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find MTA file in directory
   */
  static async findMTAFile(directory: string = '.'): Promise<string | null> {
    const possibleFiles = ['mta.yaml', 'mta.yml'];

    for (const filename of possibleFiles) {
      const filePath = path.join(directory, filename);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // File doesn't exist, continue
      }
    }

    return null;
  }

  /**
   * Extract resources by type
   */
  static getResourcesByType(mta: MTADescriptor, type: string): any[] {
    return mta.resources.filter(resource => resource.type === type);
  }

  /**
   * Get detailed analysis of MTA structure for debugging
   */
  static analyzeStructure(mta: MTADescriptor): any {
    const resourceTypes = [...new Set(mta.resources.map(r => r.type))];
    const moduleTypes = [...new Set(mta.modules.map(m => m.type))];

    const resourcesByType = resourceTypes.reduce((acc, type) => {
      acc[type] = this.getResourcesByType(mta, type);
      return acc;
    }, {} as Record<string, any[]>);

    const serviceResources = mta.resources
      .filter(r => r.parameters?.service || r.parameters?.['service-name'])
      .map(r => ({
        name: r.name,
        type: r.type,
        service: r.parameters?.service || r.parameters?.['service-name'],
        plan: r.parameters?.['service-plan'] || r.parameters?.plan || r.parameters?.['service_plan']
      }));

    return {
      metadata: {
        id: mta.ID,
        version: mta.version,
        schemaVersion: mta._schema_version,
        description: mta.description
      },
      counts: {
        modules: mta.modules.length,
        resources: mta.resources.length,
        resourceTypes: resourceTypes.length,
        moduleTypes: moduleTypes.length
      },
      resourceTypes,
      moduleTypes,
      resourcesByType,
      serviceResources,
      xsuaaResources: this.getXSUAAResources(mta),
      destinationResources: this.getDestinationResources(mta),
      connectivityResources: this.getConnectivityResources(mta)
    };
  }

  /**
   * Extract XSUAA resources - flexible matching for BTP CF variations
   */
  static getXSUAAResources(mta: MTADescriptor): any[] {
    const managedServices = this.getResourcesByType(mta, 'org.cloudfoundry.managed-service');
    const existingServices = this.getResourcesByType(mta, 'org.cloudfoundry.existing-service');

    const allServices = [...managedServices, ...existingServices];

    return allServices.filter(resource => {
      const params = resource.parameters || {};
      const service = params.service || params['service-name'];
      const plan = params['service-plan'] || params.plan || params['service_plan'];

      // Check for XSUAA service
      if (service === 'xsuaa') return true;

      // Check for XSUAA plans
      if (plan === 'application' || plan === 'broker' || plan === 'space') return true;

      // Check resource name patterns
      if (resource.name && resource.name.toLowerCase().includes('xsuaa')) return true;

      return false;
    });
  }

  /**
   * Extract all service resources
   */
  static getServiceResources(mta: MTADescriptor): any[] {
    return mta.resources.filter(resource =>
      resource.type === 'org.cloudfoundry.managed-service' ||
      resource.type === 'org.cloudfoundry.existing-service'
    );
  }

  /**
   * Extract destination resources - flexible matching for BTP CF variations
   */
  static getDestinationResources(mta: MTADescriptor): any[] {
    const managedServices = this.getResourcesByType(mta, 'org.cloudfoundry.managed-service');
    const existingServices = this.getResourcesByType(mta, 'org.cloudfoundry.existing-service');

    const allServices = [...managedServices, ...existingServices];

    return allServices.filter(resource => {
      const params = resource.parameters || {};
      const service = params.service || params['service-name'];

      // Check for destination service
      if (service === 'destination') return true;

      // Check resource name patterns
      if (resource.name && resource.name.toLowerCase().includes('destination')) return true;

      return false;
    });
  }

  /**
   * Extract connectivity resources - flexible matching for BTP CF variations
   */
  static getConnectivityResources(mta: MTADescriptor): any[] {
    const managedServices = this.getResourcesByType(mta, 'org.cloudfoundry.managed-service');
    const existingServices = this.getResourcesByType(mta, 'org.cloudfoundry.existing-service');

    const allServices = [...managedServices, ...existingServices];

    return allServices.filter(resource => {
      const params = resource.parameters || {};
      const service = params.service || params['service-name'];

      // Check for connectivity service
      if (service === 'connectivity') return true;

      // Check resource name patterns
      if (resource.name && resource.name.toLowerCase().includes('connectivity')) return true;

      return false;
    });
  }

  /**
   * Flexible validation of MTA descriptor for BTP CF files
   */
  private static validateMTADescriptor(mta: any): void {
    // Check if it's a valid object
    if (!mta || typeof mta !== 'object') {
      throw new Error('Invalid MTA descriptor: not a valid object');
    }

    // Schema version - be flexible with variations (including _schema-version with hyphen)
    if (!mta._schema_version && !mta.schema_version && !mta['schema-version'] && !mta['_schema-version']) {
      throw new Error('Missing schema version in MTA descriptor (expected _schema_version, schema_version, schema-version, or _schema-version)');
    }

    // ID field - be flexible with case variations
    if (!mta.ID && !mta.id && !mta.Id) {
      throw new Error('Missing ID in MTA descriptor (expected ID, id, or Id)');
    }

    // Version field
    if (!mta.version) {
      throw new Error('Missing version in MTA descriptor');
    }

    // Modules - ensure it exists and is an array, or create empty array
    if (!mta.modules) {
      logger.info('No modules found in MTA descriptor, creating empty array');
      mta.modules = [];
    } else if (!Array.isArray(mta.modules)) {
      throw new Error('Invalid modules in MTA descriptor: must be an array');
    }

    // Resources - ensure it exists and is an array, or create empty array
    if (!mta.resources) {
      logger.info('No resources found in MTA descriptor, creating empty array');
      mta.resources = [];
    } else if (!Array.isArray(mta.resources)) {
      throw new Error('Invalid resources in MTA descriptor: must be an array');
    }

    // Normalize the schema version field
    if (!mta._schema_version) {
      mta._schema_version = mta.schema_version || mta['schema-version'] || mta['_schema-version'];
    }

    // Normalize the ID field
    if (!mta.ID) {
      mta.ID = mta.id || mta.Id;
    }

    logger.info('MTA descriptor validation successful', {
      id: mta.ID,
      version: mta.version,
      schemaVersion: mta._schema_version,
      moduleCount: mta.modules.length,
      resourceCount: mta.resources.length
    });
  }
}
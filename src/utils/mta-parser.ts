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
      const content = await fs.readFile(absolutePath, 'utf-8');
      return this.parseFromString(content);
    } catch (error) {
      logError('Failed to read MTA file', error, { filePath });
      throw new Error(`Failed to read MTA file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse MTA descriptor from string content
   */
  static parseFromString(content: string): MTADescriptor {
    try {
      const parsed = YAML.parse(content) as MTADescriptor;
      this.validateMTADescriptor(parsed);
      return parsed;
    } catch (error) {
      logError('Failed to parse MTA YAML', error);
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
   * Extract XSUAA resources
   */
  static getXSUAAResources(mta: MTADescriptor): any[] {
    return this.getResourcesByType(mta, 'org.cloudfoundry.managed-service')
      .filter(resource =>
        resource.parameters?.service === 'xsuaa' ||
        resource.parameters?.['service-plan'] === 'application'
      );
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
   * Extract destination resources
   */
  static getDestinationResources(mta: MTADescriptor): any[] {
    return this.getResourcesByType(mta, 'org.cloudfoundry.managed-service')
      .filter(resource => resource.parameters?.service === 'destination');
  }

  /**
   * Extract connectivity resources
   */
  static getConnectivityResources(mta: MTADescriptor): any[] {
    return this.getResourcesByType(mta, 'org.cloudfoundry.managed-service')
      .filter(resource => resource.parameters?.service === 'connectivity');
  }

  /**
   * Basic validation of MTA descriptor
   */
  private static validateMTADescriptor(mta: any): void {
    if (!mta._schema_version) {
      throw new Error('Missing _schema_version in MTA descriptor');
    }
    if (!mta.ID) {
      throw new Error('Missing ID in MTA descriptor');
    }
    if (!mta.version) {
      throw new Error('Missing version in MTA descriptor');
    }
    if (!Array.isArray(mta.modules)) {
      throw new Error('Missing or invalid modules array in MTA descriptor');
    }
    if (!Array.isArray(mta.resources)) {
      throw new Error('Missing or invalid resources array in MTA descriptor');
    }
  }
}
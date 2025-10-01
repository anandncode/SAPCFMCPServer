import { Tool } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { MTAParser } from '../utils/mta-parser.js';
import { logger, logError } from '../utils/logger.js';

export const parseMTATool: Tool = {
  name: 'parse_mta',
  description: 'Parse an MTA (Multi-Target Application) descriptor file and extract information about modules and resources',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the mta.yaml file. If not provided, will search in current directory'
      }
    }
  }
};

export async function handleParseMTA(args: any): Promise<any> {
  try {
    let filePath = args.filePath;

    // If no file path provided, try to find mta.yaml in current directory
    if (!filePath) {
      filePath = await MTAParser.findMTAFile();
      if (!filePath) {
        return {
          success: false,
          error: 'No mta.yaml file found in current directory'
        };
      }
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return {
        success: false,
        error: `MTA file not found: ${filePath}`
      };
    }

    // Parse the MTA descriptor
    const mta = await MTAParser.parseFromFile(filePath);

    // Extract useful information
    const result = {
      success: true,
      data: {
        metadata: {
          id: mta.ID,
          version: mta.version,
          description: mta.description,
          schemaVersion: mta._schema_version
        },
        modules: mta.modules.map(module => ({
          name: module.name,
          type: module.type,
          path: module.path,
          requires: module.requires?.map(req => req.name) || [],
          provides: module.provides?.map(prov => prov.name) || []
        })),
        resources: mta.resources.map(resource => ({
          name: resource.name,
          type: resource.type,
          service: resource.parameters?.service,
          servicePlan: resource.parameters?.['service-plan'] || resource.parameters?.plan,
          parameters: resource.parameters
        })),
        summary: {
          totalModules: mta.modules.length,
          totalResources: mta.resources.length,
          xsuaaResources: MTAParser.getXSUAAResources(mta).length,
          serviceResources: MTAParser.getServiceResources(mta).length,
          destinationResources: MTAParser.getDestinationResources(mta).length,
          connectivityResources: MTAParser.getConnectivityResources(mta).length
        }
      }
    };

    logger.info('Successfully parsed MTA descriptor', {
      file: filePath,
      modules: result.data.summary.totalModules,
      resources: result.data.summary.totalResources
    });

    return result;
  } catch (error) {
    logError('Failed to parse MTA', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
import axios, { AxiosResponse } from 'axios';
import { AuthToken, XSUAACredentials } from '../types/index.js';
import { logger, logError } from '../utils/logger.js';

export class XSUAAAuthService {
  private credentials: XSUAACredentials;
  private cachedToken: AuthToken | null = null;

  constructor(credentials: XSUAACredentials) {
    this.credentials = credentials;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return this.cachedToken.access_token;
    }

    logger.info('Fetching new access token from XSUAA');
    const token = await this.fetchAccessToken();
    this.cachedToken = token;
    return token.access_token;
  }

  /**
   * Fetch a new access token from XSUAA
   */
  private async fetchAccessToken(): Promise<AuthToken> {
    const tokenUrl = `${this.credentials.url}/oauth/token`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentials.clientid,
      client_secret: this.credentials.clientsecret,
    });

    try {
      const response: AxiosResponse<any> = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      const tokenData = response.data;
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const token: AuthToken = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        jti: tokenData.jti,
        expires_at: expiresAt,
      };

      logger.info('Successfully fetched access token', {
        scope: token.scope,
        expires_in: token.expires_in
      });

      return token;
    } catch (error) {
      logError('Failed to fetch access token', error);
      throw new Error(`Failed to fetch access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if token is still valid (with 5 minute buffer)
   */
  private isTokenValid(token: AuthToken): boolean {
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return token.expires_at.getTime() > Date.now() + bufferTime;
  }

  /**
   * Create XSUAAAuthService from VCAP_SERVICES
   */
  static fromVCAPServices(serviceName?: string): XSUAAAuthService {
    const vcapServices = process.env.VCAP_SERVICES;
    if (!vcapServices) {
      throw new Error('VCAP_SERVICES environment variable not found');
    }

    let services: any;
    try {
      services = JSON.parse(vcapServices);
    } catch (error) {
      throw new Error('Failed to parse VCAP_SERVICES JSON');
    }

    // Look for XSUAA service
    const xsuaaServices = services.xsuaa || services['xsuaa-application'] || [];
    if (xsuaaServices.length === 0) {
      throw new Error('No XSUAA service found in VCAP_SERVICES');
    }

    // Use specific service name or first available
    let xsuaaService;
    if (serviceName) {
      xsuaaService = xsuaaServices.find((service: any) => service.name === serviceName);
      if (!xsuaaService) {
        throw new Error(`XSUAA service '${serviceName}' not found`);
      }
    } else {
      xsuaaService = xsuaaServices[0];
    }

    return new XSUAAAuthService(xsuaaService.credentials);
  }

  /**
   * Create XSUAAAuthService from service key
   */
  static fromServiceKey(serviceKey: string): XSUAAAuthService {
    let credentials: XSUAACredentials;
    try {
      credentials = JSON.parse(serviceKey);
    } catch (error) {
      throw new Error('Failed to parse service key JSON');
    }

    return new XSUAAAuthService(credentials);
  }

  /**
   * Validate credentials structure
   */
  static validateCredentials(credentials: any): credentials is XSUAACredentials {
    const required = ['clientid', 'clientsecret', 'url', 'uaadomain'];
    return required.every(field => field in credentials && credentials[field]);
  }
}
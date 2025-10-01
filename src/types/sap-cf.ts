// SAP BTP Cloud Foundry MTA and Resource Types

export interface MTAResource {
  name: string;
  type: string;
  parameters?: Record<string, any>;
  properties?: Record<string, any>;
  'properties-metadata'?: Record<string, any>;
}

export interface MTAModule {
  name: string;
  type: string;
  path?: string;
  parameters?: Record<string, any>;
  properties?: Record<string, any>;
  requires?: MTARequirement[];
  provides?: MTAProvision[];
  'build-parameters'?: Record<string, any>;
}

export interface MTARequirement {
  name: string;
  parameters?: Record<string, any>;
  properties?: Record<string, any>;
}

export interface MTAProvision {
  name: string;
  parameters?: Record<string, any>;
  properties?: Record<string, any>;
}

export interface MTADescriptor {
  _schema_version: string;
  ID: string;
  version: string;
  description?: string;
  provider?: string;
  copyright?: string;
  modules: MTAModule[];
  resources: MTAResource[];
  parameters?: Record<string, any>;
  'module-types'?: Record<string, any>;
  'resource-types'?: Record<string, any>;
}

export interface XSUAACredentials {
  clientid: string;
  clientsecret: string;
  url: string;
  uaadomain: string;
  verificationkey: string;
  xsappname: string;
  identityzone: string;
  identityzoneid: string;
  tenantid: string;
  tenantmode: string;
}

export interface CFService {
  guid: string;
  name: string;
  service_plan_guid: string;
  space_guid: string;
  type: string;
  tags: string[];
  service_plan: {
    guid: string;
    name: string;
    service: {
      guid: string;
      label: string;
      description: string;
    };
  };
  credentials?: Record<string, any>;
}

export interface CFApplication {
  guid: string;
  name: string;
  state: string;
  memory: number;
  instances: number;
  disk_quota: number;
  space_guid: string;
  urls: string[];
  version: string;
  command?: string;
  buildpack?: string;
  detected_buildpack?: string;
  environment_json: Record<string, any>;
  system_env_json: {
    VCAP_SERVICES: Record<string, CFService[]>;
  };
}

export interface CFSpace {
  guid: string;
  name: string;
  organization_guid: string;
  allow_ssh: boolean;
  isolation_segment_guid?: string;
}

export interface CFOrganization {
  guid: string;
  name: string;
  quota_definition_guid: string;
  default_isolation_segment_guid?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  jti: string;
  expires_at: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
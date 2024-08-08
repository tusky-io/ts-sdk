import { ApiKey } from "../types/api-key";
import { Service, ServiceConfig } from "./service/service";

class ApiKeyModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get user api keys
   */
  public async get(): Promise<ApiKey[]> {
    return await this.service.api.getApiKeys();
  }

  /**
   * Generate new api key
   */
  public async generate(): Promise<ApiKey> {
    return await this.service.api.generateApiKey();
  }

  /**
   * Revoke existing api key
   */
  public async revoke(key: string): Promise<ApiKey> {
    return await this.service.api.revokeApiKey(key);
  }
}

export {
  ApiKeyModule
}
import { ApiKey } from "../types/api-key";
import { Paginated } from "../types/paginated";
import { paginate } from "./common";
import { Service, ServiceConfig } from "./service/service";

class ApiKeyModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * List all user api keys
   */
  public async listAll(): Promise<Array<ApiKey>> {
    const list = async () => {
      return this.list();
    }
    return paginate<ApiKey>(list, {});
    // return (await this.service.api.getApiKeys()).items?.map((apiKey: ApiKey) => new ApiKey(apiKey));
  }

  /**
   * List paginated user api keys
   */
  public async list(): Promise<Paginated<ApiKey>> {
    const result = await this.service.api.getApiKeys();
    return {
      items: result.items?.map((apiKey: ApiKey) => new ApiKey(apiKey)),
      nextToken: result.nextToken,
      errors: result.errors
    }
  }

  /**
   * Generate new api key
   */
  public async generate(): Promise<ApiKey> {
    return new ApiKey(await this.service.api.generateApiKey());
  }

  /**
   * Revoke existing api key
   */
  public async revoke(key: string): Promise<ApiKey> {
    return new ApiKey(await this.service.api.revokeApiKey(key));
  }
}

export {
  ApiKeyModule
}
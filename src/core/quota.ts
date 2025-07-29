import { Service, ServiceConfig } from "./service/service";
import { QuotaLimits } from "../types/quota";

class QuotaModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get currenlty authenticated user storage balance
   * @returns {Promise<Storage>}
   */
  public async get(): Promise<QuotaLimits> {
    return await this.service.api.getQuota();
  }
}

export { QuotaModule };

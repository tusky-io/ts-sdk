import { Service, ServiceConfig } from "./service/service";
import { Storage } from "../types/storage";

class StorageModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get currenlty authenticated user storage balance
   */
  public async get(): Promise<Storage> {
    return await this.service.api.getStorage();
  }
}

export { StorageModule };

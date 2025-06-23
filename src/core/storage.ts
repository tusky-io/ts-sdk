import { Service, ServiceConfig } from "./service/service";
import { Storage } from "../types/storage";
import { logger } from "../logger";

class StorageModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get currenlty authenticated user storage balance
   * @returns {Promise<Storage>}
   */
  public async get(): Promise<Storage> {
    logger.info(`[time] Api call storage.get() start`);
    const start = performance.now();

    const storage = await this.service.api.getStorage();
    const end = performance.now();
    logger.info(`[time] Api call storage.get() end - took ${end - start} ms`);
    return storage;
  }
}

export { StorageModule };

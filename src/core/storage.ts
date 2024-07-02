import { Service, ServiceConfig } from "./service/service";
import { Storage, StorageBuyOptions, StorageBuyResponse } from "../types/storage";


class StorageModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get storage balance
   */
  public async get(): Promise<Storage> {
    return await this.service.api.getStorageBalance();
  }

  /**
   * @param  {string} amountInGbs Number of gigabytes of storage to purchase
   * @param  {StorageBuyOptions} [options] simulate, confirm, etc.
   */
  public async buy(amountInGbs: number, options: StorageBuyOptions = {}): Promise<StorageBuyResponse> {
    if (!options.paymentId) {
      return await this.service.api.initPayment(amountInGbs, options);
    } else {
      return await this.service.api.confirmPayment(options.paymentId);
    }
  }
};

export {
  StorageModule
}

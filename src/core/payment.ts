import { Service, ServiceConfig } from "./service/service";
import { PaymentSession, PaymentSessionOptions } from "../types/payment";

class PaymentModule {
  protected service: Service;

  protected defaultSessionOptions = {
    priceLookupKey: 'monthly',
    quantity: 1000,
  } as PaymentSessionOptions;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Create a new payment session
   */
  public async session(options: PaymentSessionOptions = this.defaultSessionOptions): Promise<PaymentSession> {
    return await this.service.api.createPaymentSession(options);
  }
}

export {
  PaymentModule
}

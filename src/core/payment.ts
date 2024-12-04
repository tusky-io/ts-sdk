import { Service, ServiceConfig } from "./service/service";
import {
  PaymentPlan,
  PaymentSession,
  PaymentSessionOptions,
} from "../types/payment";

class PaymentModule {
  protected service: Service;

  protected defaultSessionOptions = {
    priceLookupKey: "monthly",
    quantity: 50,
  } as PaymentSessionOptions;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  public async plans(): Promise<PaymentPlan[]> {
    return await this.service.api.getPaymentPlans();
  }

  /**
   * Create a new payment session
   */
  public async session(
    options: PaymentSessionOptions = this.defaultSessionOptions,
  ): Promise<PaymentSession> {
    return await this.service.api.createSubscriptionPaymentSession(options);
  }
}

export { PaymentModule };

export class PaymentSession {
  url: string

  constructor(json: any) {
    this.url = json.sessionUrl
  }
}

export type PaymentSessionOptions = {
  priceLookupKey?: PaymentSessionPriceLookupKey,
  quantity?: PaymentSessionQuantity,
  redirectUrl?: string,
  cancelUrl?: string,
}

export type PaymentSessionPriceLookupKey = 'monthly' | 'yearly'
export type PaymentSessionQuantity = 1000 | 2000

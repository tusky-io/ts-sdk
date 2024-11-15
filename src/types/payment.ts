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
export type PaymentSessionQuantity = 1 | 2 | 5 | 10


export type PaymentPlan = {
  createdAt: number,
  currentPeriodStart: number,
  currentPeriodEnd: number,
  cancelledAt: number | null,
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid',
  interval: 'month' | 'year',
  amount: number,
  currency: 'usd',
  quantity: number,
}

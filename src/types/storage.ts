export class Storage {
    cloudStorageAvailable: number
    cloudStorageTotal: number
    permanentStorageAvailable: number
    permanentStorageTotal: number

    constructor(json: any) {
        this.cloudStorageAvailable = json.cloudStorageAvailable
        this.cloudStorageTotal = json.cloudStorageTotal
        this.permanentStorageAvailable = json.permanentStorageAvailable
        this.permanentStorageTotal = json.permanentStorageTotal
    }
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP'


export type StorageBuyOptions = {
    /**
     * Currency code used in payment.
     */
    currencyCode?: CurrencyCode
    /**
     * If true, there is no real payment done. Use this flag to check the price of storage.
     */
    simulate?: boolean
    /**
     * If true, payment is done in single step. Otherwise the payment requires confirmation (execute same method, providing paymentId).
     */
    confirm?: boolean 
    /**
     * Provide it to confirm initiated payment. 
     */
    paymentId?: string
}

export type StorageBuyResponse = {
    paymentId?: string
    amount: number
    currencyCode: CurrencyCode
}

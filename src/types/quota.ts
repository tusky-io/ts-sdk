export class QuotaLimits {
  transactions: number;
  bandwidth: number;
  allowedTransactions: number;
  allowedBandwidth: number;
  transactionResetTime: number;
  bandwidthResetTime: number;

  constructor(json: any) {
    this.transactions = json.transactions;
    this.bandwidth = json.bandwidth;
    this.allowedTransactions = json.allowedTransactions;
    this.allowedBandwidth = json.allowedBandwidth;
    this.transactionResetTime = json.transactionResetTime;
    this.bandwidthResetTime = json.bandwidthResetTime;
  }
}

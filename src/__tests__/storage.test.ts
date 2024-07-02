import { BadRequest } from "../errors/bad-request";
import { Akord } from "../index";
import { initInstance } from './common';


let akord: Akord;

jest.setTimeout(3000000);

const testIfProd = process.env.ENV === 'v2' ? test : test.skip;
const testIfDev = process.env.ENV === 'dev' ? test : test.skip;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe("Testing storage functions", () => {

  beforeAll(async () => {
    akord = await initInstance();
  });

  it("should get storage balance", async () => {
    const storageBalance = await akord.storage.get();
    expect(storageBalance).toBeTruthy();
    expect(storageBalance.cloudStorageTotal).toBeGreaterThan(0);
    expect(storageBalance.permanentStorageTotal).toBeGreaterThan(0);
    expect(storageBalance.cloudStorageAvailable).toBeGreaterThanOrEqual(0);
    expect(storageBalance.permanentStorageAvailable).toBeGreaterThanOrEqual(0);
  });

  testIfProd("should fail on storage purchase without billing details", async () => {
    await expect(async () =>
      await akord.storage.buy(1)
    ).rejects.toThrow(BadRequest);
  });

  testIfDev("should simulate payment", async () => {
    const result = await akord.storage.buy(1, { simulate: true });
    expect(result).toBeTruthy();
    expect(result.amount).toBeGreaterThan(0);
    expect(result.currencyCode).toBeTruthy();
  });

  testIfDev("should auto-confirm payment", async () => {
    const quantity = 2
    const storageBalanceBeforePurchase = await akord.storage.get();
    
    const result = await akord.storage.buy(quantity, { confirm: true });
    expect(result.amount).toBeGreaterThan(0);
    expect(result.currencyCode).toBeTruthy();
    expect(result.paymentId).toBeTruthy();

    await delay(3000); // wait for async payment webhook
    
    const storageBalanceAfterPurchase = await akord.storage.get();
    expect(storageBalanceAfterPurchase.permanentStorageAvailable - storageBalanceBeforePurchase.permanentStorageAvailable).toBe(quantity * 1000 * 1000 * 1000)
    expect(storageBalanceAfterPurchase.permanentStorageTotal - storageBalanceBeforePurchase.permanentStorageTotal).toBe(quantity * 1000 * 1000 * 1000)
  });

  testIfDev("should 2-step payment", async () => {
    const quantity = 2
    const storageBalanceBeforePurchase = await akord.storage.get();
    
    const paymentInit = await akord.storage.buy(quantity);
    expect(paymentInit.amount).toBeGreaterThan(0);
    expect(paymentInit.currencyCode).toBeTruthy();
    expect(paymentInit.paymentId).toBeTruthy();

    const storageBalanceAfterPaymentInit = await akord.storage.get();
    expect(storageBalanceAfterPaymentInit.permanentStorageAvailable).toBe(storageBalanceBeforePurchase.permanentStorageAvailable)
    expect(storageBalanceAfterPaymentInit.permanentStorageTotal).toBe(storageBalanceBeforePurchase.permanentStorageTotal)
    
    const paymentConfirm = await akord.storage.buy(quantity, { paymentId: paymentInit.paymentId });
    expect(paymentConfirm.amount).toBeGreaterThan(0);
    expect(paymentConfirm.currencyCode).toBeTruthy();
    expect(paymentConfirm.paymentId).toBeTruthy();

    await delay(3000); // wait for async payment webhook

    const storageBalanceAfterPurchase = await akord.storage.get();
    expect(storageBalanceAfterPurchase.permanentStorageAvailable - storageBalanceBeforePurchase.permanentStorageAvailable).toBe(quantity * 1000 * 1000 * 1000)
    expect(storageBalanceAfterPurchase.permanentStorageTotal - storageBalanceBeforePurchase.permanentStorageTotal).toBe(quantity * 1000 * 1000 * 1000)
  });

});

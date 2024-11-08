import faker from '@faker-js/faker';
import { Tusky } from "../../index";
import { cleanup, ENV_TEST_RUN, LOG_LEVEL } from '../common';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

let tusky: Tusky;

describe("Testing auth functions", () => {
  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should authenticate with Sui wallet", async () => {
    const keypair = new Ed25519Keypair();
    tusky = Tusky
      .withWallet({ walletSigner: keypair })
      .withLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .withApi({ env: ENV_TEST_RUN })

    await tusky.signIn();
  });

  it("should create vault", async () => {
    const vault = await tusky.vault.create(faker.random.words(), { encrypted: false });
    expect(vault).toBeTruthy();
    expect(vault.name).toBeTruthy();
  });
});
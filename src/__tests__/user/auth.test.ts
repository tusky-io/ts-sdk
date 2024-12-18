import faker from '@faker-js/faker';
import { Tusky } from "../../index";
import { cleanup, ENV_TEST_RUN, LOG_LEVEL } from '../common';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { TuskyBuilder } from '../../tusky-builder';

let tusky: Tusky;

describe("Testing auth functions", () => {
  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should authenticate with Sui wallet", async () => {
    const keypair = new Ed25519Keypair();
    tusky = await new TuskyBuilder()
      .useWallet({ keypair: keypair })
      .useLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .useEnv(ENV_TEST_RUN)
      .build();

    await tusky.auth.signIn();
  });

  it("should create vault", async () => {
    const vault = await tusky.vault.create(faker.random.words(), { encrypted: false });
    expect(vault).toBeTruthy();
    expect(vault.name).toBeTruthy();
  });
});
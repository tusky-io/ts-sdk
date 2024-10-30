import faker from '@faker-js/faker';
import { Akord } from "../../index";
import { cleanup, ENV_TEST_RUN, LOG_LEVEL } from '../common';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing auth functions", () => {
  afterAll(async () => {
    await cleanup(akord);
  });

  it("should authenticate with Sui wallet", async () => {
    const keypair = new Ed25519Keypair();
    akord = Akord
      .withWallet({ walletSigner: keypair })
      .withLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .withApi({ env: ENV_TEST_RUN })

    await akord.signIn();
  });

  it("should create vault", async () => {
    const vault = await akord.vault.create(faker.random.words(), { public: true });
    expect(vault).toBeTruthy();
    expect(vault.name).toBeTruthy();
  });
});
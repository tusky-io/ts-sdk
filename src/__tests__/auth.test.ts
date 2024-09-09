import faker from '@faker-js/faker';
import { Akord } from "../index";
import { cleanup } from './common';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiSigner from './enoki/signer';

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing auth functions", () => {

  let authToken: string;
  let signer: EnokiSigner;

  afterAll(async () => {
    await cleanup(akord);
  });

  it("should authenticate with Sui wallet", async () => {
    const keypair = new Ed25519Keypair();
    const message = new TextEncoder().encode("hello");
    const { signature } = await keypair.signPersonalMessage(message);
    const address = keypair.getPublicKey().toSuiAddress();
    signer = new EnokiSigner({ address: address, keypair: keypair });
    akord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any });
    const jwt = await akord.api.generateJWT({ signature });
    console.log("JWT: " + jwt);
    authToken = jwt;
  });

  it("should create vault", async () => {
    akord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider: async () => authToken, signer: signer });
    const vault = await akord.vault.create(faker.random.words(), { public: true });
    expect(vault).toBeTruthy();
    expect(vault.name).toBeTruthy();
  });
});
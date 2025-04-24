import { Tusky } from '../';
import { ENV_TEST_RUN, LOG_LEVEL } from './common';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { TuskyBuilder } from '../tusky-builder';

describe("Testing init functions", () => {
  it("should init Tusky instance with init function", async () => {
    const keypair = new Ed25519Keypair();
    const tusky = await Tusky.init({ wallet: { keypair: keypair }});
    expect(tusky).toBeTruthy();
    await tusky.auth.signIn();
    const me = await tusky.me.get();
    expect(me).toBeTruthy();
  });

  it("should init Tusky instance with simple constructor", async () => {
    const tusky = new Tusky({ apiKey: process.env.API_KEY });
    expect(tusky).toBeTruthy();
    const me = await tusky.me.get();
    expect(me).toBeTruthy();
  });

  it("should init Tusky instance with builder", async () => {
    const keypair = new Ed25519Keypair();
    const tusky = await new TuskyBuilder()
      .useEnv(ENV_TEST_RUN)
      .useLogger({ logLevel: LOG_LEVEL })
      .useWallet({ keypair: keypair })
      .build();
    expect(tusky).toBeTruthy();
    await tusky.auth.signIn();
    const me = await tusky.me.get();
    expect(me).toBeTruthy();
  });
});
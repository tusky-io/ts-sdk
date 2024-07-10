import { AkordWallet } from "@akord/crypto";
import { Auth } from "..";
import faker from '@faker-js/faker';
import jwtDecode from "jwt-decode";

jest.setTimeout(3000000);

describe("Testing auth functions", () => {
  let email: string;
  let password: string;

  beforeAll(async () => {
    email = "michal+deploy3@akord.com";
    password = "michal kaliszewski";
    Auth.configure({ env: "dev" });
  });

  it("should sign in", async () => {
    const { wallet, jwt } = await Auth.signIn(email, password);
    const decodedJWT = jwtDecode(jwt) as any;
    expect(decodedJWT['custom:address']).toEqual(await wallet.getAddress());
    expect(decodedJWT['custom:publicKey']).toEqual(wallet.publicKey());
    expect(decodedJWT['custom:publicSigningKey']).toEqual(wallet.signingPublicKey());
  });
});

describe("Testing passwordless auth functions", () => {
  let wallet: AkordWallet;
  let email: string;

  beforeAll(async () => {
    wallet = await AkordWallet.create("password");
    email = faker.internet.email();
    Auth.configure({ env: "dev" });
  });

  it("should sign up", async () => {
    await Auth.signUpWithWallet(wallet);
    expect(wallet).toBeTruthy();
  });

  it("should sign in", async () => {
    const { jwt } = await Auth.signInWithWallet(wallet);
    const decodedJWT = jwtDecode(jwt) as any;
    expect(decodedJWT['custom:address']).toEqual(await wallet.getAddress());
    expect(decodedJWT['custom:publicKey']).toEqual(wallet.publicKey());
    expect(decodedJWT['custom:publicSigningKey']).toEqual(wallet.signingPublicKey());
  });
});
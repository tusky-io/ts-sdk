import { SodiumInstance } from "@env/util/libsodium";
let libsodium: Sodium;
export interface Sodium {
  crypto_box_open_easy(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array>;
  crypto_box_easy(
    plaintext: string | Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array>;
  randombytes_buf(crypto_box_NONCEBYTES: number): Promise<Uint8Array>;
  crypto_box_keypair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }>;
  crypto_pwhash_ALG_ARGON2ID13: number;
  crypto_box_NONCEBYTES: number;
  ready(): Promise<void>;

  generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }>;

  randomNonce(): Promise<string>;

  encrypt(
    message: string,
    nonceB64: string,
    publicKeyB64: string,
    privateKeyB64: string,
  ): Promise<string>;

  decrypt(
    ciphertextB64: string,
    nonceB64: string,
    publicKeyB64: string,
    privateKeyB64: string,
  ): Promise<string>;

  pwHash(passwordB64: string, saltB64: string): Promise<string>;

  fromBase64(string: string): Uint8Array;
  toBase64(array: Uint8Array): string;
}

export async function loadSodium(): Promise<Sodium> {
  if (libsodium) return libsodium;
  const sodium = SodiumInstance;
  await sodium.ready();
  return sodium;
}

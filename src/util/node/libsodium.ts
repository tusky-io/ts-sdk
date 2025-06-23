import libsodium from "libsodium-wrappers-sumo";
import { Sodium } from "../../crypto/libsodium";
import { arrayToBase64, base64ToArray } from "../../crypto";

export const SodiumInstance: Sodium = {
  crypto_pwhash_ALG_ARGON2ID13: libsodium.crypto_pwhash_ALG_ARGON2ID13,
  crypto_box_NONCEBYTES: libsodium.crypto_box_NONCEBYTES,

  toBase64(array: Uint8Array) {
    return libsodium.to_base64(array);
  },

  fromBase64(string: string) {
    return libsodium.from_base64(string);
  },

  async ready() {
    await libsodium.ready;
  },

  async generateKeyPair() {
    return libsodium.crypto_box_keypair("base64");
  },

  async randomNonce() {
    return libsodium.randombytes_buf(libsodium.crypto_box_NONCEBYTES, "base64");
  },

  async randombytes_buf(crypto_box_NONCEBYTES: number): Promise<Uint8Array> {
    return libsodium.randombytes_buf(libsodium.crypto_box_NONCEBYTES);
  },
  async crypto_box_keypair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }> {
    return libsodium.crypto_box_keypair();
  },

  async encrypt(
    message: string,
    nonceB64: string,
    publicKeyB64: string,
    privateKeyB64: string,
  ): Promise<string> {
    const nonce = libsodium.from_base64(nonceB64);
    const publicKey = libsodium.from_base64(publicKeyB64);
    const privateKey = libsodium.from_base64(privateKeyB64);

    const ciphertext = libsodium.crypto_box_easy(
      message,
      nonce,
      publicKey,
      privateKey,
      "base64",
    );

    return ciphertext;
  },

  async crypto_box_open_easy(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    const decrypted = libsodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      publicKey,
      privateKey,
    );
    return decrypted;
  },

  async crypto_box_easy(
    plaintext: Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    const ciphertext = libsodium.crypto_box_easy(
      plaintext,
      nonce,
      publicKey,
      privateKey,
    );
    return ciphertext;
  },

  async decrypt(
    ciphertextB64: string,
    nonceB64: string,
    publicKeyB64: string,
    privateKeyB64: string,
  ): Promise<string> {
    const ciphertext = libsodium.from_base64(ciphertextB64);
    const nonce = libsodium.from_base64(nonceB64);
    const publicKey = libsodium.from_base64(publicKeyB64);
    const privateKey = libsodium.from_base64(privateKeyB64);

    const decrypted = libsodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      publicKey,
      privateKey,
      "base64",
    );

    return decrypted;
  },

  async pwHash(passwordB64: string, saltB64: string): Promise<string> {
    const hash = libsodium.crypto_pwhash(
      32, // output length
      passwordB64,
      base64ToArray(saltB64),
      4, // opsLimit (CPU cost)
      128 * 1024 * 1024, // memLimit (128 MB)
      libsodium.crypto_pwhash_ALG_ARGON2ID13,
    );
    return arrayToBase64(hash);
  },
};

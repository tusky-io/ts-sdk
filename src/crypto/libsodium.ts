let sodium: Sodium;
import libsodium from "libsodium-wrappers-sumo";
import { arrayToBase64, base64ToArray } from "./encoding";
import { logger } from "../logger";

export interface Sodium {
  crypto_pwhash_ALG_ARGON2ID13: number;

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

const SodiumWrappers: Sodium = {
  crypto_pwhash_ALG_ARGON2ID13: libsodium.crypto_pwhash_ALG_ARGON2ID13,

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

export async function loadSodium(customSodium?: Sodium): Promise<Sodium> {
  logger.info("[load-sodium]");
  if (customSodium) {
    logger.info("[load-sodium] in custom sodium");

    sodium = customSodium;
    return sodium;
  }
  logger.info("[load-sodium] return sodium");

  if (sodium) return sodium;
  logger.info("[load-sodium] no sodium found, using sodium wrappers");

  await SodiumWrappers.ready();
  logger.info(
    "[load-sodium] no sodium found, using sodium wrappers - sodium ready",
  );

  sodium = SodiumWrappers;
  return sodium;
}

function getRuntime() {
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }

  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return "react-native";
  }

  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    return "browser";
  }

  return "unknown";
}

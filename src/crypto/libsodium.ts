import { arrayToBase64, base64ToArray } from "./encoding";

let sodium: Sodium;

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

export const SodiumNative = (): Sodium => {
  const libsodium = require("react-native-libsodium");

  return {
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
      return libsodium.randombytes_buf(
        libsodium.crypto_box_NONCEBYTES,
        "base64",
      );
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
      const start = performance.now();
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
      const end = performance.now();
      console.log(`[time] Sodium native encryption took ${end - start} ms`);
      return ciphertext;
    },

    async crypto_box_open_easy(
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      privateKey: Uint8Array,
    ): Promise<Uint8Array> {
      const start = performance.now();
      const decrypted = libsodium.crypto_box_open_easy(
        ciphertext,
        nonce,
        publicKey,
        privateKey,
      );
      const end = performance.now();
      console.log(`[time] Sodium native decryption took ${end - start} ms`);
      return decrypted;
    },

    async crypto_box_easy(
      plaintext: Uint8Array,
      nonce: Uint8Array,
      publicKey: Uint8Array,
      privateKey: Uint8Array,
    ): Promise<Uint8Array> {
      const start = performance.now();

      const ciphertext = libsodium.crypto_box_easy(
        plaintext,
        nonce,
        publicKey,
        privateKey,
      );
      const end = performance.now();
      console.log(`[time] Sodium native encryption took ${end - start} ms`);
      return ciphertext;
    },

    async decrypt(
      ciphertextB64: string,
      nonceB64: string,
      publicKeyB64: string,
      privateKeyB64: string,
    ): Promise<string> {
      const start = performance.now();

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
      const end = performance.now();
      console.log(`[time] Sodium native decryption took ${end - start} ms`);
      return decrypted;
    },

    async pwHash(passwordB64: string, saltB64: string): Promise<string> {
      const start = performance.now();

      const hash = libsodium.crypto_pwhash(
        32, // output length
        passwordB64,
        base64ToArray(saltB64),
        4, // opsLimit (CPU cost)
        128 * 1024 * 1024, // memLimit (128 MB)
        2,
      );
      const end = performance.now();
      console.log(
        `[time] Sodium native password hashing took ${end - start} ms`,
      );

      return arrayToBase64(hash);
    },
  };
};

// const SodiumWrappers: Sodium = {
//   crypto_pwhash_ALG_ARGON2ID13: libsodium.crypto_pwhash_ALG_ARGON2ID13,
//   crypto_box_NONCEBYTES: libsodium.crypto_box_NONCEBYTES,

//   toBase64(array: Uint8Array) {
//     return libsodium.to_base64(array);
//   },

//   fromBase64(string: string) {
//     return libsodium.from_base64(string);
//   },

//   async ready() {
//     await libsodium.ready;
//   },

//   async generateKeyPair() {
//     return libsodium.crypto_box_keypair("base64");
//   },

//   async randomNonce() {
//     return libsodium.randombytes_buf(libsodium.crypto_box_NONCEBYTES, "base64");
//   },

//   async randombytes_buf(crypto_box_NONCEBYTES: number): Promise<Uint8Array> {
//     return libsodium.randombytes_buf(libsodium.crypto_box_NONCEBYTES);
//   },
//   async crypto_box_keypair(): Promise<{
//     publicKey: Uint8Array;
//     privateKey: Uint8Array;
//   }> {
//     return libsodium.crypto_box_keypair();
//   },

//   async encrypt(
//     message: string,
//     nonceB64: string,
//     publicKeyB64: string,
//     privateKeyB64: string,
//   ): Promise<string> {
//     const nonce = libsodium.from_base64(nonceB64);
//     const publicKey = libsodium.from_base64(publicKeyB64);
//     const privateKey = libsodium.from_base64(privateKeyB64);

//     const ciphertext = libsodium.crypto_box_easy(
//       message,
//       nonce,
//       publicKey,
//       privateKey,
//       "base64",
//     );

//     return ciphertext;
//   },

//   async crypto_box_open_easy(
//     ciphertext: Uint8Array,
//     nonce: Uint8Array,
//     publicKey: Uint8Array,
//     privateKey: Uint8Array,
//   ): Promise<Uint8Array> {
//     const decrypted = libsodium.crypto_box_open_easy(
//       ciphertext,
//       nonce,
//       publicKey,
//       privateKey,
//     );
//     return decrypted;
//   },

//   async crypto_box_easy(
//     plaintext: Uint8Array,
//     nonce: Uint8Array,
//     publicKey: Uint8Array,
//     privateKey: Uint8Array,
//   ): Promise<Uint8Array> {
//     const ciphertext = libsodium.crypto_box_easy(
//       plaintext,
//       nonce,
//       publicKey,
//       privateKey,
//     );
//     return ciphertext;
//   },

//   async decrypt(
//     ciphertextB64: string,
//     nonceB64: string,
//     publicKeyB64: string,
//     privateKeyB64: string,
//   ): Promise<string> {
//     const ciphertext = libsodium.from_base64(ciphertextB64);
//     const nonce = libsodium.from_base64(nonceB64);
//     const publicKey = libsodium.from_base64(publicKeyB64);
//     const privateKey = libsodium.from_base64(privateKeyB64);

//     const decrypted = libsodium.crypto_box_open_easy(
//       ciphertext,
//       nonce,
//       publicKey,
//       privateKey,
//       "base64",
//     );

//     return decrypted;
//   },

//   async pwHash(passwordB64: string, saltB64: string): Promise<string> {
//     const hash = libsodium.crypto_pwhash(
//       32, // output length
//       passwordB64,
//       base64ToArray(saltB64),
//       4, // opsLimit (CPU cost)
//       128 * 1024 * 1024, // memLimit (128 MB)
//       libsodium.crypto_pwhash_ALG_ARGON2ID13,
//     );
//     return arrayToBase64(hash);
//   },
// };

export async function loadSodium(customSodium?: Sodium): Promise<Sodium> {
  if (customSodium) {
    sodium = customSodium;
    return sodium;
  }

  if (sodium) return sodium;

  sodium = SodiumNative();
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

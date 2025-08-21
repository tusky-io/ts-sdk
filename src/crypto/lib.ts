import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";
import { gcm } from "@noble/ciphers/aes";
import {
  arrayToBase64,
  base64ToArray,
  base64ToJson,
  jsonToBase64,
  stringToArray,
} from "./encoding";

import { AESEncryptedPayload, X25519EncryptedPayload } from "./types";
import { logger } from "../logger";
import {
  DecryptStreamController,
  StreamSlicer,
  transformStream,
} from "./stream";
import { ReadableStream } from "web-streams-polyfill";
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";
import { loadSodium } from "./libsodium";

export const SYMMETRIC_KEY_LENGTH = 32;

export const KEY_DERIVATION_ITERATION_COUNT = 1000000;

export const AUTH_TAG_LENGTH_IN_BYTES = 16;
export const IV_LENGTH_IN_BYTES = 12;

/**
 * Signature generation using sodium library: https://github.com/jedisct1/libsodium
 * @param {BufferSource} msgHash buffer message hash to be signed
 * @param {Uint8Array} privateKey private key used to sign message hash
 * @returns {Promise.<string>} signature as base64 string
 */
async function signHash(
  msgHash: Uint8Array,
  privateKey: Uint8Array,
): Promise<string> {
  const msgHashByteArray = new Uint8Array(msgHash);
  const sodium = await loadSodium();
  const signature = sodium.crypto_sign_detached(msgHashByteArray, privateKey);
  return arrayToBase64(signature);
}

/**
 * Digest generation
 * @param {string} payload string payload to be signed
 * @returns {Promise.<string>} payload digest as base64 string
 */
async function digest(payload: string): Promise<string> {
  return digestRaw(stringToArray(payload));
}

async function digestRaw(payload: Uint8Array): Promise<string> {
  const msgHash = sha256(payload);
  return arrayToBase64(msgHash);
}

/**
 * Signature generation
 * @param {string} payload string payload to be signed
 * @param {Uint8Array} privateKey private key used to sign string payload
 * @returns {Promise.<string>} signature as base64 string
 */
async function signString(
  payload: string,
  privateKey: Uint8Array,
): Promise<string> {
  const msgHash = sha256(stringToArray(payload));
  const signature = await signHash(msgHash, privateKey);
  return signature;
}

/**
 * Encryption using WebCrypto
 * - generate a random initialization vector (iv)
 * - encrypt plaintext using key and iv
 * @param {Uint8Array} plaintext
 * @param {CryptoKey} key
 * @returns {Promise.<string>} Promise of base64 string represents the ciphertext along with iv
 */
async function encryptAes(
  plaintext: Uint8Array,
  key: Uint8Array,
  encode: boolean = true,
): Promise<string | Uint8Array> {
  try {
    const iv = randomBytes(IV_LENGTH_IN_BYTES);
    const aes = gcm(key, iv);
    const ciphertextArray = await aes.encrypt(plaintext);

    if (encode) {
      return encodeAesPayload(ciphertextArray, iv);
    }
    const combinedArray = new Uint8Array(
      iv.length + ciphertextArray.byteLength,
    );
    combinedArray.set(iv, 0);
    combinedArray.set(new Uint8Array(ciphertextArray), iv.length);
    return combinedArray;
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto encryption error."));
  }
}

/**
 * Decryption using WebCrypto
 * - decrypt ciphertext using key and iv
 * @param {Object} encryptedPayload
 * @param {CryptoKey} key
 * @returns {Promise.<ArrayBuffer>} Promise of ArrayBuffer represents the plaintext
 */
async function decryptAes(
  encryptedPayload: string | AESEncryptedPayload,
  key: Uint8Array,
): Promise<Uint8Array> {
  try {
    const payload = (<AESEncryptedPayload>encryptedPayload)?.ciphertext
      ? (encryptedPayload as AESEncryptedPayload)
      : decodeAesPayload(encryptedPayload as string);
    const aes = gcm(key, payload.iv);
    const plaintext = await aes.decrypt(payload.ciphertext as Uint8Array);
    return plaintext;
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto decryption error."));
  }
}

function encodeAesPayload(
  ciphertextArray: Uint8Array,
  iv: ArrayBuffer | Uint8Array,
): string {
  const encryptedPayload = {
    ciphertext: arrayToBase64(ciphertextArray),
    iv: arrayToBase64(iv),
  };
  return jsonToBase64(encryptedPayload);
}

function decodeAesPayload(payload: string): AESEncryptedPayload {
  const parsedPayload = base64ToJson(payload) as any;
  const decodedPayload = {
    ciphertext: base64ToArray(parsedPayload.ciphertext),
    iv: base64ToArray(parsedPayload.iv),
  };
  return decodedPayload;
}

/**
 * Key derivation using WebCrypto
 * - PBKDF2 with iterations of SHA-256
 * @param {string} password
 * @param {BufferSource} salt
 * @returns {Promise.<CryptoKey>} Promise of CryptoKey object with AES 256-bit symmetric key
 */
async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterationCount: number = KEY_DERIVATION_ITERATION_COUNT,
): Promise<Uint8Array> {
  try {
    const key = await pbkdf2Async(
      sha256,
      new TextEncoder().encode(password),
      salt,
      {
        c: iterationCount,
        dkLen: 32,
      },
    );
    return key;
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(
      new Error("Web Crypto key derivation error."),
    );
  }
}

/**
 * Public key pair generation
 * - generate a Curve25519 key pair
 * @returns {Promise.<any>}
 */
async function generateKeyPair(): Promise<any> {
  try {
    const sodium = await loadSodium();
    const keyPair = sodium.crypto_box_keypair();

    return keyPair;
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(
      new Error("Sodium box key pair generation error."),
    );
  }
}

/**
 * Encryption using sodium library: https://github.com/jedisct1/libsodium
 * @param {Uint8Array} publicKey public key used to encrypt the data
 * @param {Uint8Array} plaintext raw plaintext byte array
 * @returns {Promise.<string>} Promise of base64 string represents the encrypted payload
 */
async function encryptWithPublicKey(
  publicKey: Uint8Array,
  plaintext: string | Uint8Array,
): Promise<X25519EncryptedPayload> {
  try {
    const sodium = await loadSodium();
    const ephemeralKeyPair = sodium.crypto_box_keypair();
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

    const ciphertext = sodium.crypto_box_easy(
      plaintext,
      nonce,
      publicKey,
      ephemeralKeyPair.privateKey,
    );

    return {
      ciphertext: arrayToBase64(ciphertext),
      ephemPublicKey: arrayToBase64(ephemeralKeyPair.publicKey),
      nonce: arrayToBase64(nonce),
      publicKey: arrayToBase64(publicKey),
    };
  } catch (error) {
    logger.debug(publicKey);
    logger.debug(plaintext);
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Sodium encryption error."));
  }
}

/**
 * Decryption using sodium library: https://github.com/jedisct1/libsodium
 * @param {Uint8Array} privateKey private key used to decrypt the data
 * @param {string} encryptedPayload base64 string represents the encrypted payload
 * @returns {Promise.<Uint8Array>} Promise of raw plaintext byte array
 */
async function decryptWithPrivateKey(
  privateKey: Uint8Array,
  encryptedPayload: X25519EncryptedPayload,
): Promise<Uint8Array> {
  try {
    const sodium = await loadSodium();
    const plaintext = sodium.crypto_box_open_easy(
      base64ToArray(encryptedPayload.ciphertext),
      base64ToArray(encryptedPayload.nonce),
      base64ToArray(encryptedPayload.ephemPublicKey),
      privateKey,
    );
    return plaintext;
  } catch (error) {
    logger.debug(encryptedPayload);
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Sodium decryption error."));
  }
}

async function decryptStream(
  stream: ReadableStream<Uint8Array>,
  aesKey: Uint8Array,
  chunkSize: number,
): Promise<any> {
  if (stream === null) return null;
  try {
    const slicesStream = transformStream(stream, new StreamSlicer(chunkSize));
    return transformStream(slicesStream, new DecryptStreamController(aesKey));
  } catch (error) {
    logger.error(error);
  }
  return null;
}

export {
  digest,
  digestRaw,
  signHash,
  signString,
  encryptAes,
  decryptAes,
  deriveAesKey,
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  decryptStream,
  decodeAesPayload,
};

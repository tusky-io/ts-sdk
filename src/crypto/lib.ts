import {
  ready,
  crypto_sign_detached,
  crypto_box_keypair,
  crypto_box_open_easy,
  randombytes_buf,
  crypto_box_NONCEBYTES,
  crypto_box_easy,
  KeyPair
} from 'libsodium-wrappers'
import {
  arrayToBase64,
  base64ToArray,
  base64ToJson,
  jsonToBase64,
  stringToArray
} from './encoding'

import jsSHA from 'jssha';
import { AESEncryptedPayload, X25519EncryptedPayload } from './types';
import { logger } from '../logger';
import { DecryptStreamController, StreamSlicer, transformStream } from './stream';
import { ReadableStream } from "web-streams-polyfill/ponyfill";
import { IncorrectEncryptionKey } from '../errors/incorrect-encryption-key';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';

const HASH_ALGORITHM = 'SHA-256'

const SYMMETRIC_KEY_ALGORITHM = 'AES-GCM'
const SYMMETRIC_KEY_LENGTH = 256

const KEY_DERIVATION_FUNCTION = 'PBKDF2'
const KEY_DERIVATION_ITERATION_COUNT = 150000

export const AUTH_TAG_LENGTH_IN_BYTES = 16;
export const IV_LENGTH_IN_BYTES = 12;

/**
 * Export CryptoKey object to base64 encoded string
 * @param {CryptoKey} key
 * @returns {Promise.<string>} string containing crypto key
 */
async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const keyBuffer = await exportKeyToArray(key);
  return arrayToBase64(keyBuffer);
}

/**
 * Export CryptoKey object to buffer key material
 * @param {CryptoKey} key
 * @returns {Promise.<Uint8Array>} buffer containing crypto key
 */
async function exportKeyToArray(key: CryptoKey): Promise<Uint8Array> {
  try {
    const rawKeyBuffer = await crypto.subtle.exportKey('raw', key)
    return new Uint8Array(rawKeyBuffer);
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto key export error."));
  }
}

/**
 * Import CryptoKey object from base64 encoded string
 * @param {string} keyBase64
 * @returns {Promise.<CryptoKey>} crypto key object
 */
async function importKeyFromBase64(keyBase64: string, extractable = false): Promise<CryptoKey> {
  return importKeyFromArray(base64ToArray(keyBase64), extractable);
}

/**
 * Import CryptoKey object from key buffer material
 * @param {Uint8Array} keyBuffer
 * @returns {Promise.<CryptoKey>} crypto key object
 */
async function importKeyFromArray(keyBuffer: Uint8Array, extractable = false): Promise<CryptoKey> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        length: SYMMETRIC_KEY_LENGTH,
      },
      extractable,
      ['encrypt', 'decrypt'],
    )
    return key
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto key import error."));
  }
}

/**
 * Import key from a random seed
 * @param {Uint8Array} seed
 * @returns {Promise.<CryptoKey>} crypto key object
 */
async function importKeyFromSeed(seed: Uint8Array): Promise<CryptoKey> {
  try {
    const seedHash = await crypto.subtle.digest(HASH_ALGORITHM, seed)
    const key = await crypto.subtle.importKey(
      'raw',
      seedHash,
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        length: SYMMETRIC_KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt'],
    )
    return key
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto key import error."));
  }
}

/**
 * Signature generation using sodium library: https://github.com/jedisct1/libsodium
 * @param {BufferSource} msgHash buffer message hash to be signed
 * @param {Uint8Array} privateKey private key used to sign message hash
 * @returns {Promise.<string>} signature as base64 string
 */
async function signHash(msgHash: ArrayBuffer, privateKey: Uint8Array): Promise<string> {
  const msgHashByteArray = new Uint8Array(msgHash)
  await ready
  const signature = crypto_sign_detached(msgHashByteArray, privateKey)
  return arrayToBase64(signature)
}

/**
 * Digest generation
 * @param {string} payload string payload to be signed
 * @returns {Promise.<string>} payload digest as base64 string
 */
async function digest(payload: string): Promise<string> {
  return digestRaw(stringToArray(payload))
}

async function digestRaw(payload: Uint8Array): Promise<string> {
  const msgHash = await crypto.subtle.digest(
    HASH_ALGORITHM,
    payload,
  )
  return arrayToBase64(msgHash)
}

function initDigest(): jsSHA {
  return new jsSHA(HASH_ALGORITHM, "UINT8ARRAY");
}

function chainDigest(digestObject: jsSHA, payload: Uint8Array): jsSHA {
  return digestObject.update(payload);
}

/**
 * Signature generation
 * @param {string} payload string payload to be signed
 * @param {Uint8Array} privateKey private key used to sign string payload
 * @returns {Promise.<string>} signature as base64 string
 */
async function signString(payload: string, privateKey: Uint8Array): Promise<string> {
  const msgHash = await crypto.subtle.digest(
    HASH_ALGORITHM,
    stringToArray(payload),
  )
  const signature = await signHash(msgHash, privateKey)
  return signature
}

/**
 * Encryption using WebCrypto
 * - generate a random initialization vector (iv)
 * - encrypt plaintext using key and iv
 * @param {Uint8Array} plaintext
 * @param {CryptoKey} key
 * @returns {Promise.<string>} Promise of base64 string represents the ciphertext along with iv
 */
async function encryptAes(plaintext: Uint8Array, key: CryptoKey, encode: boolean = true): Promise<string | Uint8Array> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_IN_BYTES))

    let ciphertextArray = await crypto.subtle.encrypt(
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        iv: iv,
      },
      key,
      plaintext,
    )
    if (encode) {
      return encodeAesPayload(ciphertextArray, iv)
    }
    const combinedArray = new Uint8Array(iv.length + ciphertextArray.byteLength);
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
async function decryptAes(encryptedPayload: string | AESEncryptedPayload, key: CryptoKey): Promise<ArrayBuffer> {
  try {
    const payload = (<AESEncryptedPayload>encryptedPayload)?.ciphertext
      ? encryptedPayload as AESEncryptedPayload
      : decodeAesPayload(encryptedPayload as string);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        iv: payload.iv,
      },
      key,
      payload.ciphertext as ArrayBufferLike,
    )
    return plaintext
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto decryption error."));
  }
}

function encodeAesPayload(ciphertextArray: ArrayBuffer, iv: ArrayBuffer | Uint8Array): string {
  const encryptedPayload = {
    ciphertext: arrayToBase64(ciphertextArray),
    iv: arrayToBase64(iv),
  }
  return jsonToBase64(encryptedPayload)
}

function decodeAesPayload(payload: string): AESEncryptedPayload {
  const parsedPayload = base64ToJson(payload) as any;
  const decodedPayload = {
    ciphertext: base64ToArray(parsedPayload.ciphertext),
    iv: base64ToArray(parsedPayload.iv)
  }
  return decodedPayload;
}

/**
 * Key derivation using WebCrypto
 * - PBKDF2 with 150000 iterations of SHA-256
 * @param {string} password
 * @param {BufferSource} salt
 * @returns {Promise.<CryptoKey>} Promise of CryptoKey object with AES 256-bit symmetric key
 */
async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  try {
    const keyBase = await crypto.subtle.importKey(
      'raw',
      stringToArray(password),
      KEY_DERIVATION_FUNCTION,
      false,
      ['deriveBits', 'deriveKey'],
    )

    return crypto.subtle.deriveKey(
      {
        name: KEY_DERIVATION_FUNCTION,
        salt: salt,
        iterations: KEY_DERIVATION_ITERATION_COUNT,
        hash: HASH_ALGORITHM,
      },
      keyBase,
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        length: SYMMETRIC_KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt'],
    )
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto key derivation error."));
  }
}

/**
 * Symmetric key generation
 * - generate an extractable AES 256-bit symmetric key
 * @returns {Promise.<CryptoKey>}
 */
async function generateKey(extractable = false): Promise<CryptoKey> {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        length: SYMMETRIC_KEY_LENGTH,
      },
      extractable,
      ['encrypt', 'decrypt'],
    )
    return key
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Web Crypto key generation error."));
  }
}

/**
 * Public key pair generation
 * - generate a Curve25519 key pair
 * @returns {Promise.<_sodium.KeyPair>}
 */
async function generateKeyPair(): Promise<KeyPair> {
  try {
    await ready;
    const keyPair = crypto_box_keypair()

    return keyPair
  } catch (error) {
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Sodium box key pair generation error."));
  }
}

/**
 * Encryption using sodium library: https://github.com/jedisct1/libsodium
 * @param {Uint8Array} publicKey public key used to encrypt the data
 * @param {Uint8Array} plaintext raw plaintext byte array
 * @returns {Promise.<string>} Promise of base64 string represents the encrypted payload
 */
async function encryptWithPublicKey(publicKey: Uint8Array, plaintext: string | Uint8Array): Promise<X25519EncryptedPayload> {
  try {
    await ready;
    const ephemeralKeyPair = crypto_box_keypair();
    const nonce = randombytes_buf(crypto_box_NONCEBYTES);

    const ciphertext = crypto_box_easy(
      plaintext,
      nonce,
      publicKey,
      ephemeralKeyPair.privateKey,
    );

    return {
      ciphertext: arrayToBase64(ciphertext),
      ephemPublicKey: arrayToBase64(ephemeralKeyPair.publicKey),
      nonce: arrayToBase64(nonce),
      publicKey: arrayToBase64(publicKey)
    }
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
async function decryptWithPrivateKey(privateKey: Uint8Array, encryptedPayload: X25519EncryptedPayload): Promise<Uint8Array> {
  try {
    await ready;
    const plaintext = crypto_box_open_easy(
      base64ToArray(encryptedPayload.ciphertext),
      base64ToArray(encryptedPayload.nonce),
      base64ToArray(encryptedPayload.ephemPublicKey),
      privateKey,
    )
    return plaintext
  } catch (error) {
    logger.debug(encryptedPayload);
    logger.error(error);
    throw new IncorrectEncryptionKey(new Error("Sodium decryption error."));
  }
}

async function decryptStream(stream: ReadableStream<Uint8Array>, aesKey: CryptoKey, chunkSize: number): Promise<any> {
  if (stream === null) return null
  try {
    const slicesStream = transformStream(stream, new StreamSlicer(chunkSize));
    return transformStream(slicesStream, new DecryptStreamController(aesKey));
  } catch (error) {
    logger.error(error)
  }
  return null;
}

async function deriveAesKeyFromMnemonic(mnemonic: string): Promise<CryptoKey> {
  // generate seed from the mnemonic
  const seed: Buffer = await bip39.mnemonicToSeed(mnemonic);

  // derive master key from the seed
  const bip32 = BIP32Factory(ecc);
  const root = bip32.fromSeed(seed);
  // const child = root.derivePath("m/44'/0'/0'/0/0");

  const masterKey = root.privateKey;

  const aesKey = await importKeyFromArray(masterKey);
  return aesKey;
}

export {
  exportKeyToArray,
  importKeyFromArray,
  exportKeyToBase64,
  importKeyFromBase64,
  importKeyFromSeed,
  digest,
  digestRaw,
  initDigest,
  chainDigest,
  signHash,
  signString,
  encryptAes,
  decryptAes,
  deriveAesKey,
  generateKey,
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  decryptStream,
  deriveAesKeyFromMnemonic,
  decodeAesPayload
}

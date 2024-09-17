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
import { AsymEncryptedPayload, EncryptedData } from './types';
import { logger } from '../logger';

const HASH_ALGORITHM = 'SHA-256'

const SYMMETRIC_KEY_ALGORITHM = 'AES-GCM'
const SYMMETRIC_KEY_LENGTH = 256

const ASYMMETRIC_KEY_ALGORITHM = 'RSA-OAEP'
const ASYMMETRIC_PUBLIC_EXPONENT = "AQAB"

const KEY_DERIVATION_FUNCTION = 'PBKDF2'
const KEY_DERIVATION_ITERATION_COUNT = 150000

export const AUTH_TAG_LENGTH_IN_BYTES = 16;
export const IV_LENGTH_IN_BYTES = 12;
export const PROXY_DOWNLOAD_URL = '/api/proxy/download'

/**
 * Export CryptoKey object to base64 encoded string
 * @param {CryptoKey} key
 * @returns {Promise.<string>} string containing crypto key
 */
async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  try {
    const rawKeyBuffer = await crypto.subtle.exportKey('raw', key)
    return arrayToBase64(rawKeyBuffer)
  } catch (error) {
    throw new Error("Web Crypto key export error: " + error)
  }
}

/**
 * Import CryptoKey object from base64 encoded string
 * @param {string} keyBase64
 * @returns {Promise.<CryptoKey>} crypto key object
 */
async function importKeyFromBase64(keyBase64: string): Promise<CryptoKey> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      base64ToArray(keyBase64),
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        length: SYMMETRIC_KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt'],
    )
    return key
  } catch (error) {
    throw new Error("Web Crypto key import error: " + error)
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
    throw new Error("Web Crypto key import error: " + error)
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
async function encrypt(plaintext: Uint8Array, key: CryptoKey): Promise<string | EncryptedData> {
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
    return encodePayload(ciphertextArray, iv)
    // return {
    //   ciphertext: ciphertextArray,
    //   iv: iv,
    // }
  } catch (error) {
    throw new Error("Web Crypto encryption error: " + error)
  }
}

/**
 * Decryption using WebCrypto
 * - decrypt ciphertext using key and iv
 * @param {Object} encryptedPayload
 * @param {CryptoKey} key
 * @returns {Promise.<ArrayBuffer>} Promise of ArrayBuffer represents the plaintext
 */
async function decrypt(encryptedPayload: string | EncryptedData, key: CryptoKey): Promise<ArrayBuffer> {
  try {
    const payload = (<EncryptedData>encryptedPayload)?.ciphertext ? encryptedPayload as EncryptedData : decodePayload(encryptedPayload as string);
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
    throw new Error("Web Crypto decryption error: " + error)
  }
}

function encodePayload(ciphertextArray: ArrayBuffer, iv: ArrayBuffer | Uint8Array): string {
  const encryptedPayload = {
    ciphertext: arrayToBase64(ciphertextArray),
    iv: arrayToBase64(iv),
  }
  return jsonToBase64(encryptedPayload)
}

function decodePayload(payload: string): EncryptedData {
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
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      false,
      ['encrypt', 'decrypt'],
    )
  } catch (error) {
    throw new Error("Web Crypto key derivation error: " + error)
  }
}

/**
 * Symmetric key generation
 * - generate an extractable AES 256-bit symmetric key
 * @returns {Promise.<CryptoKey>}
 */
async function generateKey(): Promise<CryptoKey> {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: SYMMETRIC_KEY_ALGORITHM,
        length: SYMMETRIC_KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt'],
    )
    return key
  } catch (error) {
    throw new Error("Web Crypto key generation error: " + error)
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
    throw new Error("Sodium box key pair generation error: " + error)
  }
}

async function deriveAddress(publicKey: Uint8Array) {
  const sha512Digest = await crypto.subtle.digest(
    "SHA-512",
    publicKey,
  );
  return arrayToBase64(sha512Digest);
}

/**
 * Encryption using sodium library: https://github.com/jedisct1/libsodium
 * @param {Uint8Array} publicKey public key used to encrypt the data
 * @param {Uint8Array} plaintext raw plaintext byte array
 * @returns {Promise.<string>} Promise of base64 string represents the encrypted payload
 */
async function encryptWithPublicKey(publicKey: Uint8Array, plaintext: string | Uint8Array): Promise<AsymEncryptedPayload> {
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
    logger.debug(error);
    throw new Error("Sodium encryption error: " + error);
  }
}

/**
 * Decryption using sodium library: https://github.com/jedisct1/libsodium
 * @param {Uint8Array} privateKey private key used to decrypt the data
 * @param {string} encryptedPayload base64 string represents the encrypted payload
 * @returns {Promise.<Uint8Array>} Promise of raw plaintext byte array
 */
async function decryptWithPrivateKey(privateKey: Uint8Array, encryptedPayload: AsymEncryptedPayload): Promise<Uint8Array> {
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
    logger.debug(error);
    throw new Error("Sodium decryption error: " + error)
  }
}

// /**
//    * CryptoKey object encryption
//    * - export CryptoKey object to base64 encoded string
//    * - encrypts encoded key string with the given public key
//    * @param {CryptoKey} key
//    * @param {Uint8Array} publicKey
//    * @returns {Promise.<string>}
//    */
// async function encryptKeyWithPublicKey(key: CryptoKey, publicKey: Uint8Array): Promise<string> {
//   const keyString = await exportKeyToBase64(key)
//   const encryptedKey = await encryptStringWithPublicKey(
//     publicKey,
//     keyString
//   )
//   return encryptedKey
// }

// /**
//  * CryptoKey object decryption
//  * - decrypts encoded key string with the given private key
//  * - import CryptoKey object from the encoded string
//  * @param {string} encryptedKey
//  * @param {Uint8Array} privateKey
//  * @returns {Promise.<CryptoKey>}
//  */
// async function decryptKeyWithPrivateKey(encryptedKey: string, privateKey: Uint8Array): Promise<CryptoKey> {
//   const decryptedKey = await decryptStringWithPrivateKey(privateKey, encryptedKey)
//   const key = await importKeyFromBase64(decryptedKey)
//   return key
// }

// /**
//  * Hybrid encryption
//  * - generate a symmetric access key
//  * - encrypt data with the access key
//  * - encrypt the access key with the public key
//  * @param {Uint8Array} plaintext raw plaintext byte array
//  * @param {Uint8Array} publicKey public key used to encrypt the data
//  * @returns {Promise.<Uint8Array>} Promise of raw plaintext byte array
//  */
// async function encryptHybridRaw(plaintext: Uint8Array, publicKey: Uint8Array, accessKey?: CryptoKey, options?: EncryptOptions)
//   : Promise<string | EncryptedPayload> {
//   const key = accessKey || await generateKey()

//   const encryptedData = await encrypt(
//     plaintext,
//     key,
//   )

//   const encAccessKey = await encryptKeyWithPublicKey(
//     key,
//     publicKey
//   )

//   const encryptedPayload = {
//     encryptedData: encryptedData as EncryptedData,
//     encryptedKey: encAccessKey,
//     publicKey: arrayToBase64(publicKey)
//   }
//   if (options?.encode) {
//     return jsonToBase64(encryptedPayload)
//   }
//   return encryptedPayload
// }

// async function encryptHybridString(plaintext: string, publicKey: Uint8Array) {
//   return encryptHybridRaw(stringToArray(plaintext), publicKey)
// }

// /**
//  * Hybrid decryption
//  * - decrypt the access key with the private key
//  * - decrypt the data with the access key
//  * @param {string} encryptedPayload base64 string represents the encrypted payload
//  * @param {Uint8Array} privateKey private key used to decrypt the data key
//  * @returns {Promise.<ArrayBuffer>} Promise of raw plaintext byte array
//  */
// async function decryptHybridRaw(encryptedPayload: string | EncryptedPayload, privateKey: Uint8Array, decode = true)
//   : Promise<ArrayBuffer> {
//   if (encryptedPayload === null) return null
//   try {
//     const payload = (decode ? base64ToJson(encryptedPayload as string) : encryptedPayload) as EncryptedPayload;
//     const accessKey = await decryptKeyWithPrivateKey(
//       payload.encryptedKey,
//       privateKey
//     );
//     const decryptedDataArray = await decrypt(
//       payload.encryptedData,
//       accessKey,
//     )
//     return decryptedDataArray
//   } catch (err) {
//     throw new Error("Hybrid decryption error: " + err)
//   }
// }

// async function decryptHybridString(encryptedPayload: string, privateKey: Uint8Array): Promise<string> {
//   const decryptedDataArray = await decryptHybridRaw(encryptedPayload, privateKey, true)
//   return arrayToString(decryptedDataArray)
// }

// async function decryptStream(encryptedPayload: EncryptedPayload, privateKey: Uint8Array): Promise<string> {
//   const decryptedDataArray = await decryptHybridRaw(encryptedPayload, privateKey, true)
//   return arrayToString(decryptedDataArray)
// }

/**
 * Derive two passwords from input password
 * @param {string} password
 * @returns {Promise.<{string, string}>} Promise of derived passwords
 */
async function derivePasswords(password: string): Promise<{ authPassword: string, walletPassword: string }> {
  try {
    const passwordHashBuffer = await crypto.subtle.digest(
      "SHA-512",
      stringToArray(password),
    )
    const authPasswordBuffer = passwordHashBuffer.slice(0, 32)
    const walletPasswordBuffer = passwordHashBuffer.slice(32, 64)
    const authPassword = arrayToBase64(authPasswordBuffer)
    const walletPassword = arrayToBase64(walletPasswordBuffer)
    return { authPassword, walletPassword }
  } catch (err) {
    throw new Error("Password derivation error: " + err)
  }
}

const importRSAPublicKey = async (publicKey: string): Promise<CryptoKey> => {
  if (publicKey) {
    return await crypto.subtle.importKey(
      "jwk",
      {
        kty: 'RSA',
        e: ASYMMETRIC_PUBLIC_EXPONENT,
        n: publicKey,
        alg: 'RSA-OAEP-256',
        ext: true
      },
      {
        name: ASYMMETRIC_KEY_ALGORITHM,
        hash: {
          name: HASH_ALGORITHM
        },
      },
      false,
      ['encrypt']
    );
  } else {
    return null
  }
}

const importRSACryptoKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: ASYMMETRIC_KEY_ALGORITHM,
      hash: {
        name: HASH_ALGORITHM
      },
    },
    false,
    ["decrypt"]
  );
}

export {
  exportKeyToBase64,
  importKeyFromBase64,
  importKeyFromSeed,
  importRSAPublicKey,
  digest,
  digestRaw,
  initDigest,
  chainDigest,
  signHash,
  signString,
  encrypt,
  decrypt,
  deriveKey,
  generateKey,
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  derivePasswords,
  deriveAddress,
  importRSACryptoKey,
}

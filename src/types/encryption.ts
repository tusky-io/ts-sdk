export type EncryptionMetadata = {
  encryptedKey?: string,
  iv?: string
}

export type EncryptedPayload = {
  encryptedData: EncryptedData,
  encryptedKey: string,
  publicKey?: string
}

export type EncryptedData = {
  ciphertext: ArrayBufferLike | ReadableStream,
  iv?: ArrayBufferLike
}

export type EncryptOptions = {
  encode?: boolean,
  encryptedKey?: string,
  prefixCiphertextWithIv?: boolean
}

export type AsymmetricEncryptedPayload = {
  ciphertext: ArrayBufferLike,
  nonce: ArrayBufferLike,
  ephemPublicKey: ArrayBufferLike
}
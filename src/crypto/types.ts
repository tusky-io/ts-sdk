export type EncryptedPayload = {
  encryptedData: EncryptedData,
  encryptedKey: AsymEncryptedPayload,
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

export type AsymEncryptedPayload = {
  ciphertext: string,
  nonce: string,
  ephemPublicKey: string,
  publicKey: string,
}

export type EncryptionMetadata = {
  encryptedKey?: string,
  iv?: string
}
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

export type AsymEncryptedPayload = {
  ciphertext: string,
  nonce: string,
  ephemPublicKey: string,
  publicKey: string,
}
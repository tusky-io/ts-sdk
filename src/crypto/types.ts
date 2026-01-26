export type X25519EncryptedPayload = {
  ciphertext: string;
  nonce: string;
  ephemPublicKey: string;
  publicKey: string;
};

export type AESEncryptedPayload = {
  ciphertext: ArrayBufferLike | ReadableStream;
  iv?: ArrayBufferLike;
};

export type EncryptedPayload = {
  encryptedData: AESEncryptedPayload;
  encryptedKey: X25519EncryptedPayload;
};

export type EncryptOptions = {
  encode?: boolean;
  encryptedKey?: string;
  prefixCiphertextWithIv?: boolean;
};

export type EncryptionMetadata = {
  encryptedKey?: string;
  iv?: string;
};

export type EncryptedUserBackupPayload = {
  encryptedPayload: string | AESEncryptedPayload;
  salt: string;
  iterationCount?: number;
};

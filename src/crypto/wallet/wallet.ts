export interface Wallet {

  encrypt(input: Uint8Array): Promise<string>

  decrypt(input: string): Promise<Uint8Array>

  encryptToPublicKey(input: Uint8Array, publicKey: Uint8Array): Promise<string>

  privateKeyRaw(): Uint8Array

  publicKey(): string

  publicKeyRaw(): Uint8Array

  signingPublicKeyRaw(): Uint8Array

  signingPublicKey(): string

  signingPrivateKeyRaw(): Uint8Array

  signingPrivateKey(): string

  sign(data: Uint8Array | string): Promise<string>

  getAddress(): Promise<string>
}

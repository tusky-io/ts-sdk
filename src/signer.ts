export interface Signer {
  signingPublicKey(): string | Promise<string>

  sign(data: Uint8Array | string): Promise<string>

  getAddress(): Promise<string>
}
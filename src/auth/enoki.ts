import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Unauthorized } from '../errors/unauthorized';
import { logger } from '../logger';

export const ENOKI_API_URL = 'https://api.enoki.mystenlabs.com/v1';
export const ENOKI_PUBLIC_API_KEY = "enoki_public_ab093e91616fc8fe6125017946ea2548";

export interface EnokiClientConfig {
  apiKey: string;
  network?: string;
}

export interface ZkLoginResponse {
  salt: string;
  address: string;
}

export interface ZkLoginNonceResponse {
  nonce: string;
  randomness: string;
  epoch: number;
  maxEpoch: number;
  estimatedExpiration: number;
}

export default class EnokiClient {

  apiKey: string;
  network: string;

  constructor(config: EnokiClientConfig) {
    this.apiKey = config.apiKey
    this.network = config.network || "devnet";
    if (!this.apiKey) {
      throw new Error("Missing api key configuration. Please provide Enoki API key.");
    }
  }

  async getZkLogin(jwt: string): Promise<ZkLoginResponse> {
    const response = await fetch(
      ENOKI_API_URL + '/zklogin',
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "zklogin-jwt": jwt,
          "Authorization": `Bearer ${this.apiKey}`
        },
      }
    );
    if (!response.ok) {
      logger.error(response);
      throw new Unauthorized("Invalid authorization.");
    }
    return (await response.json()).data;
  };

  async createZkLoginNonce(ephemeralKeyPair: Ed25519Keypair): Promise<ZkLoginNonceResponse> {
    const response = await fetch(
      ENOKI_API_URL + '/zklogin/nonce',
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          "network": this.network,
          "ephemeralPublicKey": ephemeralKeyPair.getPublicKey().toSuiPublicKey(),
          "additionalEpochs": 2
        })
      }
    );
    if (!response.ok) {
      logger.error(response);
      throw new Unauthorized("Invalid authorization.");
    }
    return (await response.json()).data;
  };
}

export {
  EnokiClient
}
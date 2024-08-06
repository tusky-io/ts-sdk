import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Unauthorized } from '../../errors/unauthorized';

export const ENOKI_API_URL = 'https://api.enoki.mystenlabs.com/v1';

export interface EnokiClientConfig {
  apiKey: string;
  network?: string;
}

export interface ZkLoginResponse {
  data: {
    salt: string;
    address: string;
  }
}

export interface ZkLoginNonceResponse {
  data: {
    nonce: string;
    randomness: string;
    epoch: number;
    maxEpoch: number;
    estimatedExpiration: number;
  };
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

  async getZkLogin (jwt: string): Promise<ZkLoginResponse>{
    // TODO: call it only on first login/signup to retrieve user address
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
      console.error(response)
      throw new Unauthorized("Invalid authorization.");
    }
    return await response.json();
  };
  
  async createZkLoginNonce (ephemeralKeyPair: Ed25519Keypair): Promise<ZkLoginNonceResponse> {
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
      console.error(response)
      throw new Unauthorized("Invalid authorization.");
    }
    return await response.json();
  };
}

export {
  EnokiClient
}
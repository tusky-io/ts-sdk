import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Unauthorized } from "../errors/unauthorized";
import { logger } from "../logger";
import { Env, Envs } from "../types";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { BadRequest } from "../errors/bad-request";

export const ENOKI_API_URL = "https://api.enoki.mystenlabs.com/v1";

export type SUI_NETWORK = "mainnet" | "testnet" | "devnet";

export interface EnokiClientConfig {
  apiKey?: string;
  network?: SUI_NETWORK;
  env?: Env;
  suiClient?: SuiClient;
}

export const enokiConfig = (env: Env) => {
  switch (env) {
    case Envs.PROD:
      return {
        publicApiKey: "enoki_public_5313f34194cbfb93bb60354118d85ada",
      };
    case Envs.DEV:
    default:
      return {
        publicApiKey: "enoki_public_b0c8cf52ada845c7dfbfe8eef1e9ded2",
      };
  }
};

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

export interface ZkLoginProofResponse {
  proofPoints: any;
  issBase64Details: { value: string; indexMod4: number };
  headerBase64: string;
  addressSeed: string;
}

export default class EnokiClient {
  apiKey: string;
  network: SUI_NETWORK;
  suiClient: SuiClient;

  constructor(config: EnokiClientConfig) {
    this.apiKey = config.apiKey || enokiConfig(config.env).publicApiKey;
    this.network = config.network || "testnet";
    this.suiClient =
      config.suiClient || new SuiClient({ url: getFullnodeUrl(this.network) });
    if (!this.apiKey) {
      throw new Error(
        "Missing api key configuration. Please provide Enoki API key.",
      );
    }
  }

  async getZkLogin(jwt: string): Promise<ZkLoginResponse> {
    const response = await fetch(ENOKI_API_URL + "/zklogin", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "zklogin-jwt": jwt,
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!response.ok) {
      logger.error(response);
      throw new Unauthorized("Invalid authorization.");
    }
    return (await response.json()).data;
  }

  async createZkLoginNonce(
    ephemeralKeyPair: Ed25519Keypair,
  ): Promise<ZkLoginNonceResponse> {
    const response = await fetch(ENOKI_API_URL + "/zklogin/nonce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        network: this.network,
        ephemeralPublicKey: ephemeralKeyPair.getPublicKey().toSuiPublicKey(),
        additionalEpochs: 2,
      }),
    });
    if (!response.ok) {
      logger.error(response);
      throw new Unauthorized("Invalid authorization.");
    }
    return (await response.json()).data;
  }

  async createZKProof(
    jwt: string,
    ephemeralKeyPair: Ed25519Keypair,
    maxEpoch: number,
    randomness: string,
  ): Promise<ZkLoginProofResponse> {
    const response = await fetch(ENOKI_API_URL + "/zklogin/zkp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "zklogin-jwt": jwt,
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        network: this.network,
        ephemeralPublicKey: ephemeralKeyPair.getPublicKey().toSuiPublicKey(),
        maxEpoch: maxEpoch,
        randomness: randomness,
      }),
    });
    if (!response.ok) {
      console.log(response);
      console.log(await response.json());
      logger.error(await response.json());
      throw new BadRequest("Creating ZKProof failed.");
    }
    return (await response.json()).data;
  }
}

export { EnokiClient };

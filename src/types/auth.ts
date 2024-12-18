import { SignPersonalMessage, Account } from "../auth";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Env } from "../types/env";

export type AuthType = "OAuth" | "Wallet" | "ApiKey";

export type AuthProvider = "Google" | "Twitch";

export interface OAuthConfig {
  authProvider?: AuthProvider;
  redirectUri?: string;
  clientId?: string;
  storage?: Storage;
  env?: Env;
}

export interface WalletConfig {
  signPersonalMessage?: SignPersonalMessage; // mutation hook for prompting the user to sign a message
  account?: Account | null;
  keypair?: Ed25519Keypair;
  privateKey?: string; // private key in hex format
}

export type CreateChallengeRequestPayload = {
  address: string;
};

export type VerifyChallengeRequestPayload = {
  address: string;
  signature: string;
};

export type GenerateJWTRequestPayload = {
  grantType: string;
  authProvider: AuthProvider;
  authCode?: string;
  refreshToken?: string;
  redirectUri?: string;
};

export type GenerateJWTResponsePayload = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
};

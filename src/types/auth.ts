import { SignPersonalMessageClient, WalletAccount } from "../auth"
import { Ed25519Keypair } from "@mysten/sui/dist/cjs/keypairs/ed25519"
import { Env } from "../types/env";

export type AuthType = "OAuth" | "Wallet" | "ApiKey" | "AuthTokenProvider";

export type AuthProvider = "Google" | "Twitch" | "Facebook";

export type WalletType = "Sui";

export interface OAuthConfig {
  authProvider?: AuthProvider
  redirectUri?: string
  clientId?: string,
  storage?: Storage,
  env?: Env,
}

export interface WalletConfig {
  walletType?: "Sui"
  walletSignFnClient?: SignPersonalMessageClient
  walletAccount?: WalletAccount | null
  walletSigner?: Ed25519Keypair
}

export interface ApiKeyConfig {
  apiKey: string
}

export interface AuthTokenProviderConfig {
  authTokenProvider: AuthTokenProvider
}

export type AuthTokenProvider = () => string;

export type CreateChallengeRequestPayload = {
  address: string
}

export type VerifyChallengeRequestPayload = {
  address: string,
  signature: string,
}

export type GenerateJWTRequestPayload = {
  grantType: string,
  authProvider: AuthProvider,
  authCode?: string,
  refreshToken?: string,
  redirectUri?: string
}

export type GenerateJWTResponsePayload = {
  accessToken: string,
  idToken: string,
  refreshToken?: string,
}
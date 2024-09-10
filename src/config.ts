import { Api } from "./api/api"
import { Plugin } from "./plugin"
import { Signer } from "./signer"
import { Env } from "./env"
import { Encrypter } from "./encrypter"
import { SignPersonalMessageClient } from "./auth"
import { Ed25519Keypair } from "@mysten/sui/dist/cjs/keypairs/ed25519"

export interface ClientConfig {
  env?: Env
  signer?: Signer,
  encrypter?: Encrypter,
  debug?: boolean
  logToFile?: boolean
  cache?: boolean
  api?: Api
  storage?: Storage
  plugins?: [Plugin]
  authTokenProvider?: () => Promise<string>
  apiKey?: string,
  userAgent?: string,
  autoExecute?: boolean // if set to true, transactions will be admin signed & executed,
  authType?: AuthType
}

export type AuthType = "OAuth" | "Wallet" | "ApiKey" | "AuthTokenProvider";

export type AuthProvider = "Google" | "Twitch" | "Facebook";

export type WalletType = "Sui";

export interface OAuthConfig {
  authProvider: AuthProvider
  clientId: string,
}

export interface WalletConfig {
  walletType?: "Sui"
  walletSignFnClient?: SignPersonalMessageClient
  walletSigner?: Ed25519Keypair
}

export interface ApiKeyConfig {
  apiKey: string
}

export interface LoggerConfig {
  debug: boolean
  logToFile: boolean
}

export interface AuthTokenProviderConfig {
  authTokenProvider: () => Promise<string>
}
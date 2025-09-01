import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";
import { logger } from "../logger";
import {
  Account,
  AuthProvider,
  AuthType,
  OAuthConfig,
  SignPersonalMessage,
  WalletConfig,
} from "../types/auth";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { OAuth } from "./oauth";
import { TuskyApi } from "../api/tusky-api";
import { Env } from "../types/env";
import { defaultStorage, JWTClient } from "./jwt";
import { BadRequest } from "../errors/bad-request";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { retry } from "../api/api-client";
import EnokiClient, { ZkLoginNonceResponse } from "./enoki";
import { Storage } from "../util/storage";

const AUTH_MESSAGE_PREFIX = "tusky:connect:";

export class Auth {
  private env: Env;

  private authType: AuthType;

  private jwtClient: JWTClient;

  // OAuth
  private authProvider: AuthProvider;
  private clientId: string;
  private redirectUri: string; // OAuth callback url
  private storage: Storage; // tokens storage

  // Wallet-based auth
  private signPersonalMessage: SignPersonalMessage | null;
  private account: Account | null;
  private keypair: Ed25519Keypair | null;

  // API key auth
  private apiKey: string;

  constructor(options: AuthConfig = {}) {
    this.env = options.env;

    this.storage = options.storage || defaultStorage();
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });

    // walet-based auth
    if (options.wallet) {
      this.signPersonalMessage = options.wallet.signPersonalMessage;
      this.account = options.wallet.account;
      this.keypair =
        options.wallet.keypair ||
        (options.wallet.privateKey &&
          Ed25519Keypair.fromSecretKey(
            decodeSuiPrivateKey(options.wallet.privateKey).secretKey,
          ));
      this.authType = "Wallet";
    }
    // Oauth
    if (options.oauth) {
      this.authProvider = options.oauth.authProvider;
      this.clientId = options.oauth.clientId;
      this.redirectUri = options.oauth.redirectUri;
      this.authType = "OAuth";
    }

    // api key
    if (options.apiKey) {
      this.apiKey = options.apiKey;
      this.authType = "ApiKey";
    }
  }

  /*
   * NOTE: by signing in to Tusky, the user accepts the following terms: https://tusky.com/terms-of-service-consumer
   */
  public async signIn(): Promise<{ address?: string }> {
    switch (this.authType) {
      case "Wallet": {
        let address: string;
        if (this.signPersonalMessage && this.account) {
          address = this.account.address;
        } else if (this.keypair) {
          address = this.keypair.toSuiAddress();
        } else {
          throw new Unauthorized(
            "Missing wallet signing function for Wallet based auth.",
          );
        }
        const api = new TuskyApi({ env: this.env });
        const { nonce } = await api.createAuthChallenge({ address });

        const message = new TextEncoder().encode(AUTH_MESSAGE_PREFIX + nonce);

        let signature: string;
        if (this.signPersonalMessage) {
          const res = await new Promise<string>((resolve, reject) => {
            this.signPersonalMessage(
              {
                message: message,
              },
              {
                onSuccess: (data: { signature: string }) => {
                  logger.info("Message signed on client: " + data.signature);
                  resolve(data.signature);
                },
                onError: (error: Error) => {
                  logger.info("Error signing on client: " + error);
                  reject(error);
                },
              },
            );
          });
          signature = res;
        } else if (this.keypair) {
          const { signature: res } =
            await this.keypair.signPersonalMessage(message);
          signature = res;
        } else {
          throw new Unauthorized(
            "Missing wallet signing function for Wallet based auth.",
          );
        }
        // const publicKey = await verifyPersonalMessageSignature(message, signature);
        // const address = publicKey.toSuiAddress();

        const { idToken } = await api.verifyAuthChallenge({
          signature,
          address,
        });

        await this.jwtClient.setAddress(address);
        await this.jwtClient.setIdToken(idToken);
        return { address };
      }
      case "OAuth": {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const code = urlParams.get("code");

        const aOuthClient = new OAuth({
          clientId: this.clientId,
          redirectUri: this.redirectUri,
          authProvider: this.authProvider,
          storage: this.storage,
          env: this.env,
        });

        if (code) {
          // step 2: if code is in the URL, exchange it for tokens
          const { address } = await aOuthClient.handleOAuthCallback();
          return { address };
        } else {
          // step 1: if no code in the URL, initiate the OAuth flow
          logger.info(
            "No authorization code found, redirecting to OAuth provider...",
          );
          await aOuthClient.initOAuthFlow();
          return {};
        }
      }
      default:
        throw new BadRequest(
          `Missing or unsupported auth type for sign in: ${this.authType}`,
        );
    }
  }

  public async signOut(): Promise<void> {
    // clear auth tokens from the storage
    await this.jwtClient.clearTokens();
  }

  public async createAuthorizationUrl(
    ephemeralKeyPair?: Ed25519Keypair,
  ): Promise<{
    oauthUrl: string;
    zkLoginResponse: ZkLoginNonceResponse;
  }> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage,
      env: this.env,
    });
    return aOuthClient.createAuthorizationUrl(ephemeralKeyPair);
  }

  public async initOAuthFlow(): Promise<void> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage,
      env: this.env,
    });
    await aOuthClient.initOAuthFlow();
  }

  public async handleOAuthCallback(): Promise<{ address: string }> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage,
      env: this.env,
    });
    return aOuthClient.handleOAuthCallback();
  }

  public async getAuthorizationHeader(): Promise<AxiosRequestHeaders> {
    switch (this.authType) {
      case "ApiKey": {
        if (this.apiKey) {
          return {
            "Api-Key": this.apiKey,
          };
        }
        throw new Unauthorized("Please add apiKey into config.");
      }
      case "OAuth": {
        let idToken = await this.jwtClient.getIdToken();
        if (!idToken) {
          throw new Unauthorized("Invalid session, please log in again.");
        }
        if (this.jwtClient.isTokenExpiringSoon(idToken)) {
          await retry(async () => {
            if (!this.jwtClient.getRefreshInProgress()) {
              logger.info(
                "Token is expired or about to expire. Refreshing tokens...",
              );
              const oauthClient = new OAuth({
                clientId: this.clientId,
                redirectUri: this.redirectUri,
                authProvider: this.authProvider,
                storage: this.storage,
                env: this.env,
              });
              await oauthClient.refreshTokens();
              logger.info("Tokens refreshed successfully.");
              idToken = await this.jwtClient.getIdToken();
            } else {
              logger.info("Refresh already in progress...");
              let idToken = await this.jwtClient.getIdToken();
              if (!idToken) {
                throw new Unauthorized("Invalid session, please log in again.");
              }
            }
          }, true);
        }
        return {
          Authorization: `Bearer ${idToken}`,
        };
      }
      // TODO: consolidate OAuth & Wallet flow with refresh token logic
      case "Wallet": {
        const idToken = await this.jwtClient.getIdToken();
        if (!idToken) {
          throw new Unauthorized("Invalid session, please log in again.");
        }
        if (this.jwtClient.isTokenExpiringSoon(idToken, 0)) {
          throw new Unauthorized("JWT is expired, please log in again.");
        }
        return {
          Authorization: `Bearer ${idToken}`,
        };
      }
      default:
        throw new Unauthorized(
          `Missing or unsupported auth type: ${this.authType}`,
        );
    }
  }

  public async getAddress(): Promise<string> {
    switch (this.authType) {
      case "OAuth":
      case "Wallet": {
        return await this.jwtClient.getAddress();
      }
      default:
        return undefined;
    }
  }
}

export { EnokiClient };

export type AuthConfig = {
  env?: Env;
  storage?: Storage;
  wallet?: WalletConfig; // Wallet-based auth
  oauth?: OAuthConfig; // OAuth
  apiKey?: string; // Api key auth
};

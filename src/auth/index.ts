import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";
import { logger } from "../logger";
import { AuthProvider, AuthTokenProvider, AuthType, OAuthConfig, WalletConfig, WalletType } from "../types/auth";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { OAuth } from "./oauth";
import AkordApi from "../api/akord-api";
import { Env } from "../types/env";
import { decode, DEFAULT_STORAGE, JWTClient } from "./jwt";
import { BadRequest } from "../errors/bad-request";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

export type SignPersonalMessageClient = (
  message: { message: Uint8Array },
  callbacks: {
    onSuccess: (data: { signature: string }) => void;
    onError: (error: Error) => void;
  }
) => void;

export type WalletAccount = {
  address: string,
  publicKey: Uint8Array
}

export class Auth {
  private env: Env;

  public authTokenProvider: AuthTokenProvider;

  private authType: AuthType;

  private jwtClient: JWTClient;

  // OAuth
  private authProvider: AuthProvider;
  private clientId: string;
  private redirectUri: string; // OAuth callback url
  private storage: Storage; // tokens storage

  // Wallet-based auth
  private walletType: WalletType;
  private walletSignFnClient: SignPersonalMessageClient | null;
  private walletAccount: WalletAccount | null;
  private walletSigner: Ed25519Keypair | null;

  // API key auth
  private apiKey: string

  constructor(options: AuthOptions = { authType: "OAuth" }) {
    // reset previous configuration
    this.authType = options.authType;
    this.apiKey = options.apiKey;
    this.env = options.env;
    this.authTokenProvider = options.authTokenProvider;
    // walet-based auth
    this.walletType = options.walletType;
    this.walletSignFnClient = options.walletSignFnClient;
    this.walletAccount = options.walletAccount;
    this.walletSigner = options.walletSigner || options.walletPrivateKey && Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(options.walletPrivateKey).secretKey);
    // Oauth
    this.authProvider = options.authProvider;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.storage = options.storage || DEFAULT_STORAGE;
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
  }

  public setEnv(env: Env) {
    this.env = env;
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
  }

  public async signIn(): Promise<{ address?: string }> {
    switch (this.authType) {
      case "Wallet": {
        let address: string;
        if (this.walletSignFnClient && this.walletAccount) {
          address = this.walletAccount.address;
        } else if (this.walletSigner) {
          address = this.walletSigner.toSuiAddress();
        } else {
          throw new Unauthorized("Missing wallet signing function for Wallet based auth.");
        }
        const api = new AkordApi({ env: this.env });
        const { nonce } = await api.createAuthChallenge({ address });

        const message = new TextEncoder().encode("akord:login:" + nonce);

        let signature: string;
        if (this.walletSignFnClient) {
          const res = await new Promise<string>((resolve, reject) => {
            this.walletSignFnClient(
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
              }
            );
          });
          signature = res;
        } else if (this.walletSigner) {
          const { signature: res } = await this.walletSigner.signPersonalMessage(message);
          signature = res;
        } else {
          throw new Unauthorized("Missing wallet signing function for Wallet based auth.");
        }
        // const publicKey = await verifyPersonalMessageSignature(message, signature);
        // const address = publicKey.toSuiAddress();

        const { idToken } = await api.verifyAuthChallenge({ signature, address });

        this.jwtClient.setAddress(address);
        this.jwtClient.setIdToken(idToken);
        return { address };
      }
      case "OAuth": {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const code = urlParams.get('code');

        const aOuthClient = new OAuth({
          clientId: this.clientId,
          redirectUri: this.redirectUri,
          authProvider: this.authProvider,
          storage: this.storage
        });

        if (code) {
          // step 2: if code is in the URL, exchange it for tokens
          const { address } = await aOuthClient.handleOAuthCallback();
          return { address };
        } else {
          // step 1: if no code in the URL, initiate the OAuth flow
          logger.info('No authorization code found, redirecting to OAuth provider...');
          await aOuthClient.initOAuthFlow();
          return {};
        }
      }
      default:
        throw new BadRequest(`Missing or unsupported auth type for sign in: ${this.authType}`);
    }
  }

  public signOut(): void {
    // clear auth tokens from the storage
    this.jwtClient.clearTokens();
  }

  public async initOAuthFlow(): Promise<void> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage
    });
    await aOuthClient.initOAuthFlow();
  }

  public async handleOAuthCallback(): Promise<{ address: string }> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage
    });
    return aOuthClient.handleOAuthCallback();
  }

  public async getAuthorizationHeader(): Promise<AxiosRequestHeaders> {
    switch (this.authType) {
      case "ApiKey": {
        if (this.apiKey) {
          return {
            "Api-Key": this.apiKey
          }
        }
        throw new Unauthorized("Please add apiKey into config.");
      }
      case "OAuth": {
        let idToken = this.jwtClient.getIdToken();
        const oauthClient = new OAuth({
          clientId: this.clientId,
          redirectUri: this.redirectUri,
          authProvider: this.authProvider,
          storage: this.storage
        });
        if (!idToken) {
          logger.info('Id token not found. Trying to use refresh token...');
          await oauthClient.refreshTokens();
          logger.info('Tokens refreshed successfully.');
          idToken = this.jwtClient.getIdToken();
        }
        if (this.jwtClient.isTokenExpiringSoon(idToken)) {
          logger.info('Token is expired or about to expire. Refreshing tokens...');
          await oauthClient.refreshTokens();
          logger.info('Tokens refreshed successfully.');
          idToken = this.jwtClient.getIdToken();
        }
        return {
          "Authorization": `Bearer ${idToken}`
        }
      }
      // TODO: consolidate OAuth & Wallet flow with refresh token logic
      case "Wallet": {
        let idToken = this.jwtClient.getIdToken();
        if (!idToken) {
          throw new Unauthorized("Invalid authorization.");
        }
        if (this.jwtClient.isTokenExpiringSoon(idToken, 0)) {
          throw new Unauthorized("JWT is expired, please log in again.");
        }
        return {
          "Authorization": `Bearer ${idToken}`
        }
      }
      case "AuthTokenProvider": {
        try {
          const token = this.authTokenProvider();
          if (token) {
            return {
              "Authorization": `Bearer ${token}`
            }
          }
          throw new Unauthorized("Please add authTokenProvider into config.");
        } catch (e) {
          logger.error(e)
          throw new Unauthorized("Invalid authorization.");
        }
      }
      default:
        throw new Unauthorized(`Missing or unsupported auth type: ${this.authType}`);
    }
  }

  public getAddress(): string {
    switch (this.authType) {
      case "OAuth":
      case "Wallet": {
        return this.jwtClient.getAddress();
      }
      case "AuthTokenProvider": {
        const token = this.authTokenProvider();
        if (token) {
          const address = decode(token).address;
          return address;
        }
        break;
      }
      default:
        return undefined;
    }
    return undefined;
  }
}

export type AuthOptions = {
  authType?: AuthType,
  env?: Env,
  authTokenProvider?: AuthTokenProvider
  apiKey?: string,
} & OAuthConfig & WalletConfig
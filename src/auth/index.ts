import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";
import { logger } from "../logger";
import { AuthProvider, AuthTokenProvider, AuthType, OAuthConfig, WalletConfig, WalletType } from "../types/auth";
import { Conflict } from "../errors/conflict";
import { Ed25519Keypair } from "@mysten/sui/dist/cjs/keypairs/ed25519";
import { OAuth } from "./oauth";
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import AkordApi from "../api/akord-api";
import { Env } from "../env";
import { decode, DEFAULT_STORAGE, JWTClient } from "./jwt";

export type SignPersonalMessageClient = (
  message: { message: Uint8Array },
  callbacks: {
    onSuccess: (data: { signature: string }) => void;
    onError: (error: Error) => void;
  }
) => void;

export class Auth {
  private static env: Env;

  public static authTokenProvider: AuthTokenProvider;

  private static authType: AuthType;

  private static jwtClient: JWTClient;

  // OAuth
  private static authProvider: AuthProvider;
  private static clientId: string;
  private static redirectUri: string; // OAuth callback url
  private static storage: Storage; // tokens storage

  // Wallet-based auth
  private static walletType: WalletType;
  private static walletSignFnClient: SignPersonalMessageClient | null;
  private static walletSigner: Ed25519Keypair | null;

  // API key auth
  private static apiKey: string

  private constructor() { }

  public static configure(options: AuthOptions = { authType: "OAuth" }) {
    // reset previous configuration
    this.authType = options.authType;
    this.apiKey = options.apiKey;
    this.env = options.env;
    this.authTokenProvider = options.authTokenProvider;
    // walet-based auth
    this.walletType = options.walletType;
    this.walletSignFnClient = options.walletSignFnClient;
    this.walletSigner = options.walletSigner;
    // Oauth
    this.authProvider = options.authProvider;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.storage = options.storage || DEFAULT_STORAGE;
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
  }

  public static setEnv(env: Env) {
    this.env = env;
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
  }

  public static async signIn(): Promise<{ address?: string }> {
    switch (this.authType) {
      case "Wallet": {
        const message = new TextEncoder().encode("hello");
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
          throw new Conflict("Missing wallet signing function for Wallet based auth.");
        }
        const publicKey = await verifyPersonalMessageSignature(message, signature);
        const address = publicKey.toSuiAddress();
        const jwt = await new AkordApi({ debug: true, logToFile: true, env: this.env }).verifyAuthChallenge({ signature });
        this.jwtClient.setIdToken(jwt);
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
        throw new Error(`Missing or unsupported auth type for sign in: ${this.authType}`);
    }
  }

  public static signOut(): void {
    // clear auth tokens from the storage
    this.jwtClient.clearTokens();
  }

  public static async initOAuthFlow(): Promise<void> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage
    });
    await aOuthClient.initOAuthFlow();
  }

  public static async handleOAuthCallback(): Promise<{ address: string }> {
    const aOuthClient = new OAuth({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      authProvider: this.authProvider,
      storage: this.storage
    });
    return aOuthClient.handleOAuthCallback();
  }

  public static async getAuthorizationHeader(): Promise<AxiosRequestHeaders> {
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
        if (!idToken) {
          throw new Unauthorized("Invalid authorization.");
        }
        if (this.jwtClient.isTokenExpiringSoon(idToken)) {
          logger.info('Token is expired or about to expire. Refreshing tokens...');
          const oauthClient = new OAuth({
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            authProvider: this.authProvider,
            storage: this.storage
          });
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

  public static getAddress(): string {
    switch (this.authType) {
      case "OAuth":
      case "Wallet": {
        let idToken = this.jwtClient.getIdToken();
        if (idToken) {
          const address = decode(idToken).address;
          return address;
        }
        break;
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
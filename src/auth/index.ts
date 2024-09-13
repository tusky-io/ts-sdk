import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";
import { Logger } from "../logger";
import { AuthProvider, AuthType, OAuthConfig, WalletConfig, WalletType } from "../types/auth";
import { Conflict } from "../errors/conflict";
import { Ed25519Keypair } from "@mysten/sui/dist/cjs/keypairs/ed25519";
import { OAuth } from "./oauth";
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import AkordApi from "../api/akord-api";
import { Env } from "../env";

export const STORAGE_PATH_ACCESS_TOKEN = "carmella_access_token";
export const STORAGE_PATH_ID_TOKEN = "carmella_id_token";
export const STORAGE_PATH_REFRESH_TOKEN = "carmella_refresh_token";

export type SignPersonalMessageClient = (
  message: { message: Uint8Array },
  callbacks: {
    onSuccess: (data: { signature: string }) => void;
    onError: (error: Error) => void;
  }
) => void;

export class Auth {
  private static env: Env

  public static authTokenProvider: () => Promise<string>

  private static authType: AuthType;

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
    this.authTokenProvider = options.authTokenProvider;
    // walet-based auth
    this.walletType = options.walletType;
    this.walletSignFnClient = options.walletSignFnClient;
    this.walletSigner = options.walletSigner;
    // Oauth
    this.authProvider = options.authProvider;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
    this.storage = options.storage || sessionStorage;
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
                  Logger.log("Message signed on client: " + data.signature);
                  resolve(data.signature);
                },
                onError: (error: Error) => {
                  Logger.log("Error signing on client: " + error);
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
        this.authTokenProvider = async () => jwt;
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
          Logger.log('No authorization code found, redirecting to OAuth provider...');
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
    this.storage.removeItem(STORAGE_PATH_ACCESS_TOKEN);
    this.storage.removeItem(STORAGE_PATH_ID_TOKEN);
    this.storage.removeItem(STORAGE_PATH_REFRESH_TOKEN);
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
        const aOuthClient = new OAuth({
          clientId: this.clientId,
          redirectUri: this.redirectUri,
          authProvider: this.authProvider,
          storage: this.storage
        });
        let idToken = aOuthClient.getIdToken();
        if (!idToken) {
          throw new Unauthorized("Invalid authorization.");
        }
        if (aOuthClient.isTokenExpiringSoon(idToken)) {
          Logger.log('Token is expired or about to expire. Refreshing tokens...');
          await aOuthClient.refreshTokens();
          Logger.log('Tokens refreshed successfully.');
          idToken = aOuthClient.getIdToken();
        }
        return {
          "Authorization": `Bearer ${idToken}`
        }
      }
      case "Wallet":
      case "AuthTokenProvider": {
        try {
          const token = await this.authTokenProvider();
          if (token) {
            return {
              "Authorization": `Bearer ${token}`
            }
          }
          throw new Unauthorized("Please add authTokenProvider into config.");
        } catch (e) {
          Logger.error(e)
          throw new Unauthorized("Invalid authorization.");
        }
      }
      default:
        throw new Unauthorized(`Missing or unsupported auth type: ${this.authType}`);
    }
  }
}

type AuthOptions = {
  authType?: AuthType,
  env?: Env,
  authTokenProvider?: () => Promise<string>
  apiKey?: string,
} & OAuthConfig & WalletConfig

Auth.configure()

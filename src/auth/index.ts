import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";
import { Logger } from "../logger";
import { AuthProvider, AuthType, OAuthConfig, WalletConfig, WalletType } from "../config";
import { Akord } from "../akord";
import { Conflict } from "../errors/conflict";
import { Ed25519Keypair } from "@mysten/sui/dist/cjs/keypairs/ed25519";
import { OAuth } from "./oauth";

export type SignPersonalMessageClient = (
  message: { message: Uint8Array },
  callbacks: {
    onSuccess: (data: { signature: string }) => void;
    onError: (error: Error) => void;
  }
) => void;

export class Auth {
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
    this.storage = options.storage;
  }

  public static async signIn(): Promise<void> {
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
                  console.log("Message signed on client: " + data.signature);
                  resolve(data.signature);
                },
                onError: (error: Error) => {
                  console.log("Error signing on client:", error);
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
        const publicAkord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any });
        const jwt = await publicAkord.api.generateJWT({ signature });
        this.authTokenProvider = async () => jwt;
        break;
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
          await aOuthClient.handleOAuthCallback();
        } else {
          // step 1: if no code in the URL, initiate the OAuth flow
          console.log('No authorization code found, redirecting to OAuth provider...');
          await aOuthClient.redirectToOAuthProvider();
        }
        break;
      }
      default:
        throw new Error(`Missing or unsupported auth type for sign in: ${this.authType}`);
    }
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
        if (aOuthClient.isTokenExpired(idToken)) {
          console.log('Token is expired or about to expire. Refreshing tokens...');

          await aOuthClient.refreshTokens();

          console.log('Tokens refreshed successfully.');

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
  authTokenProvider?: () => Promise<string>
  apiKey?: string,
} & OAuthConfig & WalletConfig

Auth.configure()

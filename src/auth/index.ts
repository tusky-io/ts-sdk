import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";
import { Logger } from "../logger";
import { AuthProvider, AuthType, WalletType } from "../config";
import { Akord } from "../akord";
import { Conflict } from "../errors/conflict";
import { Ed25519Keypair } from "@mysten/sui/dist/cjs/keypairs/ed25519";

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
  private static authClientId: string;

  // Wallet-based auth
  private static walletType: WalletType;
  private static walletSignFnClient: SignPersonalMessageClient | null;
  private static walletSigner: Ed25519Keypair | null;

  // API key auth
  private static apiKey: string

  private static accessToken: string;
  private static refreshToken: string;

  private constructor() { }

  public static configure(options: AuthOptions = { authType: "OAuth" }) {
    // reset previous configuration
    this.apiKey = options.apiKey;
    this.authTokenProvider = options.authTokenProvider;
    this.authType = options.authType;
    this.walletType = options.walletType;
    this.walletSignFnClient = options.walletSignFnClient;
    this.walletSigner = options.walletSigner;
    this.authProvider = options.authProvider;
    this.authClientId = options.authClientId;
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
        this.accessToken = jwt;
        this.authTokenProvider = async () => jwt;
        break;
      }
      case "OAuth": {
        break;
      }
      default:
        throw new Error(`Missing or unsupported auth type for sign in: ${this.authType}`);
    }
  }

  public static async getAuthorizationHeader(): Promise<AxiosRequestHeaders> {
    if (this.apiKey) {
      return {
        "Api-Key": this.apiKey
      }
    } else if (this.authTokenProvider) {
      try {
        const token = await this.authTokenProvider();
        // return token
        if (token) {
          return {
            "Authorization": `Bearer ${token}`
          }
        }
        throw new Unauthorized("Please add authTokenProvider or apiKey into config.")
      } catch (e) {
        Logger.error(e)
        throw new Unauthorized("Invalid authorization.")
      }
    } else {
      throw new Unauthorized("Please add authTokenProvider or apiKey into config.")
    }
  }
}

type AuthOptions = {
  authTokenProvider?: () => Promise<string>
  apiKey?: string,
  authType?: AuthType,
  walletType?: WalletType,
  walletSignFnClient?: SignPersonalMessageClient
  walletSigner?: Ed25519Keypair
  authProvider?: AuthProvider,
  authClientId?: string
}

Auth.configure()

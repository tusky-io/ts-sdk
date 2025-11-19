import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { EnokiClient } from "./enoki";
import { AuthProvider, OAuthConfig } from "../types/auth";
import { BadRequest } from "../errors/bad-request";
import { logger } from "../logger";
import { TuskyApi } from "../api/tusky-api";
import { Unauthorized } from "../errors/unauthorized";
import { defaultStorage, JWTClient } from "./jwt";
import { Env, Envs } from "../types/env";
import { retry } from "../api/api-client";
import { throwError } from "../errors/error-factory";

interface AuthProviderConfig {
  CLIENT_ID: string;
  AUTH_URL: string;
  SCOPES: string;
}

interface AuthProviderConfigType {
  Google: AuthProviderConfig;
  Twitch: AuthProviderConfig;
  Apple: AuthProviderConfig;
}

export const authProviderConfig = (env?: string): AuthProviderConfigType => {
  return {
    Google: {
      CLIENT_ID:
        env === Envs.PROD
          ? "426736059844-ut21sgi6j7fhai51hlk9nq1785198tcq.apps.googleusercontent.com"
          : "426736059844-2o0vvj882fvvris0kqpfuh1vi47js7he.apps.googleusercontent.com",
      AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
      SCOPES: "openid email profile",
    },
    Twitch: {
      CLIENT_ID:
        env === Envs.PROD
          ? "zjvek40acgbaade27yrwdsvsslx0e4"
          : "6h9wlqcwu01ve4al9qs04zeul7znj7",
      AUTH_URL: "https://id.twitch.tv/oauth2/authorize",
      SCOPES: "openid user:read:email",
    },
    Apple: {
      CLIENT_ID: env === Envs.PROD ? "com.tusky.web" : "com.tusky.web.dev",
      AUTH_URL: "https://appleid.apple.com/auth/authorize",
      SCOPES: "openid email name",
    },
  };
};

class OAuth {
  private env: Env;

  private redirectUri: string;
  private authProvider: AuthProvider;

  private jwtClient: JWTClient;
  private enokiClient: EnokiClient;

  private storage: Storage;
  private authProviderConfig: AuthProviderConfig;

  constructor(config: OAuthConfig) {
    if (!config.authProvider) {
      throw new BadRequest(
        "Missing auth provider, please provide in the OAuth config.",
      );
    }
    this.env = config.env;
    this.authProviderConfig = authProviderConfig(config.env)[
      config.authProvider
    ];

    if (!this.authProviderConfig) {
      throw new BadRequest(
        "Unsupported authProvider, valid providers: " +
          Object.keys(authProviderConfig(config.env)).join(", "),
      );
    }
    this.redirectUri = config.redirectUri;
    this.authProvider = config.authProvider;
    this.storage = config.storage || defaultStorage();
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
    this.enokiClient = new EnokiClient({ env: config.env });
  }

  // redirect to OAuth provider's authorization URL
  async initOAuthFlow() {
    const { oauthUrl } = await this.createAuthorizationUrl();
    window.location.href = oauthUrl;
  }

  // handle callback, extract authorization code from URL & exchange it for tokens
  async handleOAuthCallback(): Promise<{ address: string }> {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const code = urlParams.get("code");

    if (code) {
      logger.info("Authorization Code:" + code);
      // exchange the authorization code for tokens
      await this.exchangeCodeForTokens(code);

      const { address } = await retry(async () => {
        try {
          const idToken = this.jwtClient.getIdToken();
          if (!idToken) {
            throw new Unauthorized("Invalid session, please log in again.");
          }
          return this.enokiClient.getZkLogin(idToken);
        } catch (error) {
          throwError(error.response?.status, error.response?.data?.msg, error);
        }
      });
      this.jwtClient.setAddress(address);
      return { address };
    } else {
      logger.warn("Authorization code not found.");
    }
  }

  async exchangeCodeForTokens(code: string) {
    try {
      if (!this.redirectUri) {
        throw new BadRequest(
          "Missing redirect uri, please provide your app auth callback URL.",
        );
      }
      const { idToken, accessToken, refreshToken } = await new TuskyApi({
        env: this.env,
      }).generateJWT({
        authProvider: this.authProvider,
        grantType: "code",
        redirectUri: this.redirectUri,
        authCode: code,
      });

      this.jwtClient.setAccessToken(accessToken);
      this.jwtClient.setRefreshToken(refreshToken);
      this.jwtClient.setIdToken(idToken);
    } catch (error) {
      logger.error(error);
    }
  }

  async createAuthorizationUrl(ephemeralKeyPair?: Ed25519Keypair) {
    // use ephemeral key pair from config or generate new one
    const keypair = ephemeralKeyPair || new Ed25519Keypair();

    const createZkLoginResponse = await retry(async () => {
      try {
        return this.enokiClient.createZkLoginNonce(keypair);
      } catch (error) {
        throwError(error.response?.status, error.response?.data?.msg, error);
      }
    });

    if (!this.redirectUri) {
      throw new BadRequest(
        "Missing redirect uri, please provide your app auth callback URL.",
      );
    }
    const params = new URLSearchParams({
      nonce: createZkLoginResponse.nonce,
      client_id: this.authProviderConfig.CLIENT_ID,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: this.authProviderConfig.SCOPES,
      access_type: "offline",
      prompt: "consent",
    });

    if (this.authProvider === "Apple") {
      params.set("response_mode", "form_post");
    }

    const oauthUrl = `${this.authProviderConfig.AUTH_URL}?${params}`;
    return { oauthUrl, zkLoginResponse: createZkLoginResponse };
  }

  async refreshTokens(): Promise<void> {
    if (!this.jwtClient.getRefreshInProgress()) {
      this.jwtClient.setRefreshInProgress(true);
      try {
        const refreshToken = this.jwtClient.getRefreshToken();
        if (!refreshToken) {
          throw new Unauthorized("Session expired, please log in again.");
        }
        const result = await new TuskyApi({ env: this.env }).generateJWT({
          authProvider: this.authProvider,
          grantType: "refreshToken",
          refreshToken: refreshToken,
        });

        if (!result || !result.accessToken || !result.idToken) {
          throw new Unauthorized("Invalid session, please log in again.");
        }

        this.jwtClient.setAccessToken(result.accessToken);
        this.jwtClient.setIdToken(result.idToken);
        if (result.refreshToken) {
          this.jwtClient.setRefreshToken(result.refreshToken);
        }
        this.jwtClient.setRefreshInProgress(false);
      } catch (error) {
        logger.error(error);
        this.jwtClient.setRefreshInProgress(false);
        throw new Unauthorized("Failed to refresh tokens.");
      }
    }
  }
}

export { OAuth };

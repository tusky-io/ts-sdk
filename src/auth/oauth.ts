import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { EnokiClient } from './enoki';
import { AuthProvider, OAuthConfig } from '../types/auth';
import { BadRequest } from '../errors/bad-request';
import { logger } from '../logger';
import AkordApi from '../api/akord-api';
import { Unauthorized } from '../errors/unauthorized';
import { DEFAULT_STORAGE, JWTClient } from './jwt';
import { Env } from '../types/env';
import { retry } from '../api/api-client';
import { throwError } from '../errors/error-factory';

interface AuthProviderConfig {
  CLIENT_ID: string;
  AUTH_URL: string;
  SCOPES: string;
}

interface AuthProviderConfigType {
  Google: AuthProviderConfig;
  Facebook: AuthProviderConfig;
  Twitch: AuthProviderConfig;
}

export const authProviderConfig = (env?: string): AuthProviderConfigType => {
  return {
    "Google": {
      "CLIENT_ID": env === "mainnet" ? "426736059844-ut21sgi6j7fhai51hlk9nq1785198tcq.apps.googleusercontent.com" : "426736059844-2o0vvj882fvvris0kqpfuh1vi47js7he.apps.googleusercontent.com",
      "AUTH_URL": "https://accounts.google.com/o/oauth2/v2/auth",
      "SCOPES": "openid email profile",
    },
    "Facebook": {
      "CLIENT_ID": env === "mainnet" ? "1030800888399080" : "1030800888399080",
      "AUTH_URL": "https://www.facebook.com/v11.0/dialog/oauth",
      "SCOPES": "email public_profile",
    },
    "Twitch": {
      "CLIENT_ID": env === "mainnet" ? "zjvek40acgbaade27yrwdsvsslx0e4" : "6h9wlqcwu01ve4al9qs04zeul7znj7",
      "AUTH_URL": "https://id.twitch.tv/oauth2/authorize",
      "SCOPES": "openid user:read:email",
    }
  }
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
      throw new BadRequest("Missing auth provider, please provide in the OAuth config.");
    }
    this.env = config.env;
    this.authProviderConfig = authProviderConfig(config.env)[config.authProvider];

    if (!this.authProviderConfig) {
      throw new BadRequest("Unsupported authProvider, valid providers: " + Object.keys(authProviderConfig(config.env)).join(', '));
    }
    this.redirectUri = config.redirectUri;
    this.authProvider = config.authProvider;
    this.storage = config.storage || DEFAULT_STORAGE;
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
    this.enokiClient = new EnokiClient({ env: config.env });
  }

  // redirect to OAuth provider's authorization URL
  async initOAuthFlow() {
    const oauthUrl = await this.createAuthorizationUrl();
    window.location.href = oauthUrl;
  }

  // handle callback, extract authorization code from URL & exchange it for tokens
  async handleOAuthCallback(): Promise<{ address: string }> {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const code = urlParams.get('code');

    if (code) {
      logger.info('Authorization Code:' + code);
      // exchange the authorization code for tokens
      await this.exchangeCodeForTokens(code);

      const { address } = await retry(async () => {
        try {
          return this.enokiClient.getZkLogin(this.jwtClient.getIdToken());
        } catch (error) {
          throwError(error.response?.status, error.response?.data?.msg, error);
        }
      });
      this.jwtClient.setAddress(address);
      return { address };
    } else {
      logger.warn('Authorization code not found.');
    }
  }

  async exchangeCodeForTokens(code: string) {
    try {
      if (!this.redirectUri) {
        throw new BadRequest("Missing redirect uri, please provide your app auth callback URL.");
      }
      const { idToken, accessToken, refreshToken } = await new AkordApi({ env: this.env }).generateJWT({
        authProvider: this.authProvider,
        grantType: "code",
        redirectUri: this.redirectUri,
        authCode: code
      });

      this.jwtClient.setAccessToken(accessToken);
      this.jwtClient.setRefreshToken(refreshToken);
      this.jwtClient.setIdToken(idToken);
    } catch (error) {
      logger.error(error);
    }
  }

  async createAuthorizationUrl() {
    // generate ephemeral key pair
    const ephemeralKeyPair = new Ed25519Keypair();

    const createZkLoginResponse = await retry(async () => {
      try {
        return this.enokiClient.createZkLoginNonce(ephemeralKeyPair);
      } catch (error) {
        throwError(error.response?.status, error.response?.data?.msg, error);
      }
    });

    if (!this.redirectUri) {
      throw new BadRequest("Missing redirect uri, please provide your app auth callback URL.");
    }
    const params = new URLSearchParams({
      nonce: createZkLoginResponse.nonce,
      client_id: this.authProviderConfig.CLIENT_ID,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: this.authProviderConfig.SCOPES,
      access_type: "offline",
      prompt: "consent"
    });

    const oauthUrl = `${this.authProviderConfig.AUTH_URL}?${params}`;
    return oauthUrl;
  }

  async refreshTokens(): Promise<void> {
    try {
      const refreshToken = this.jwtClient.getRefreshToken();
      if (!refreshToken) {
        throw new Unauthorized("Session expired. Please log in again.");
      }

      const { idToken, accessToken } = await new AkordApi({ env: this.env }).generateJWT({
        authProvider: this.authProvider,
        grantType: "refreshToken",
        refreshToken: refreshToken
      });

      this.jwtClient.setAccessToken(accessToken);
      this.jwtClient.setIdToken(idToken);

    } catch (error) {
      logger.error(error);
      throw new Unauthorized("Failed to refresh tokens.");
    }
  };
}

export {
  OAuth
}
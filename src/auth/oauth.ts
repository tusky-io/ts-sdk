import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiClient from './enoki';
import { AuthProvider, OAuthConfig } from '../types/auth';
import { BadRequest } from '../errors/bad-request';
import { Logger } from '../logger';
import AkordApi from '../api/akord-api';
import { Unauthorized } from '../errors/unauthorized';
import { DEFAULT_STORAGE, JWTClient } from './jwt';
import { Env } from '../env';

export const AuthProviderConfig = {
  "Google": {
    "CLIENT_ID": "52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com",
    "AUTH_URL": "https://accounts.google.com/o/oauth2/v2/auth",
    "SCOPES": "openid email profile",
  },
  "Facebook": {
    "CLIENT_ID": "1030800888399080",
    "AUTH_URL": "https://www.facebook.com/v11.0/dialog/oauth",
    "SCOPES": "email public_profile",
  },
  "Twitch": {
    "CLIENT_ID": "g924m6acqg8w9gw9hxstdl5q2uugup",
    "AUTH_URL": "https://id.twitch.tv/oauth2/authorize",
    "SCOPES": "openid user:read:email",
  },
  // TODO: configure Apple
  // "Apple": {
  //   "CLIENT_ID": "",
  //   "AUTH_URL": "https://appleid.apple.com/auth/authorize",
  // }
}

class OAuth {
  private env: Env;

  private clientId: string;
  private redirectUri: string;
  private authProvider: AuthProvider;

  private jwtClient: JWTClient;

  private storage: Storage;

  constructor(config: OAuthConfig) {
    if (!config.authProvider) {
      throw new BadRequest("Missing auth provider, please provide in the OAuth config.");
    }
    if (!AuthProviderConfig[config.authProvider]) {
      throw new BadRequest("Unsupported authProvider, valid providers: " + Object.keys(AuthProviderConfig).join(', '));
    }
    this.env = config.env;
    this.redirectUri = config.redirectUri;
    this.authProvider = config.authProvider;
    this.clientId = config.clientId || AuthProviderConfig[this.authProvider].CLIENT_ID;
    this.storage = config.storage || DEFAULT_STORAGE;
    this.jwtClient = new JWTClient({ storage: this.storage, env: this.env });
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
      Logger.log('Authorization Code:' + code);
      // exchange the authorization code for tokens
      await this.exchangeCodeForTokens(code);

      const enokiClient = new EnokiClient({ apiKey: "enoki_public_ab093e91616fc8fe6125017946ea2548" });

      const { address } = await enokiClient.getZkLogin(this.jwtClient.getIdToken());
      return { address };
    } else {
      throw new Error('Authorization code not found.');
    }
  }

  async exchangeCodeForTokens(code: string) {
    try {
      if (!this.redirectUri) {
        throw new BadRequest("Missing redirect uri, please provide your app auth callback URL.");
      }
      const { idToken, accessToken, refreshToken } = await new AkordApi({ debug: true, logToFile: true, env: this.env }).generateJWT({
        authProvider: this.authProvider,
        grantType: "code",
        redirectUri: this.redirectUri,
        authCode: code
      });

      this.jwtClient.setAccessToken(accessToken);
      this.jwtClient.setRefreshToken(refreshToken);
      this.jwtClient.setIdToken(idToken);
    } catch (error) {
      Logger.error(error);
    }
  }

  async createAuthorizationUrl() {
    // generate ephemeral key pair
    const ephemeralKeyPair = new Ed25519Keypair();

    const enokiClient = new EnokiClient({ apiKey: "enoki_public_ab093e91616fc8fe6125017946ea2548" });

    const createZkLoginResponse = await enokiClient.createZkLoginNonce(ephemeralKeyPair);

    if (!this.redirectUri) {
      throw new BadRequest("Missing redirect uri, please provide your app auth callback URL.");
    }
    const params = new URLSearchParams({
      nonce: createZkLoginResponse.nonce,
      client_id: AuthProviderConfig[this.authProvider].CLIENT_ID,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: AuthProviderConfig[this.authProvider].SCOPES,
      access_type: "offline",
      prompt: "consent"
    });

    const oauthUrl = `${AuthProviderConfig[this.authProvider].AUTH_URL}?${params}`;
    return oauthUrl;
  }

  async refreshTokens(): Promise<void> {
    try {
      const refreshToken = this.jwtClient.getRefreshToken();
      if (!refreshToken) {
        throw new Unauthorized("Session expired. Please login again.");
      }

      const { idToken, accessToken } = await new AkordApi({ debug: true, logToFile: true }).generateJWT({
        authProvider: this.authProvider,
        grantType: "refreshToken",
        refreshToken: refreshToken
      });

      this.jwtClient.setAccessToken(accessToken);
      this.jwtClient.setIdToken(idToken);

    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error}`);
    }
  };
}

export {
  OAuth
}
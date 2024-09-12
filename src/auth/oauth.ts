import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiClient from './enoki';
import { AuthProvider, OAuthConfig } from '../types/auth';
import { BadRequest } from '../errors/bad-request';
import { Logger } from '../logger';
import AkordApi from '../api/akord-api';
import { Unauthorized } from '../errors/unauthorized';

export const AuthProviderConfig = {
  "Google": {
    "CLIENT_ID": "52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com",
    "AUTH_URL": "https://accounts.google.com/o/oauth2/v2/auth",
  },
  "Facebook": {
    "CLIENT_ID": "1030800888399080",
    "AUTH_URL": "https://www.facebook.com/v11.0/dialog/oauth",
  },
  "Twitch": {
    "CLIENT_ID": "g924m6acqg8w9gw9hxstdl5q2uugup",
    "AUTH_URL": "https://id.twitch.tv/oauth2/authorize",
  },
  // TODO: configure Apple
  // "Apple": {
  //   "CLIENT_ID": "",
  //   "AUTH_URL": "https://appleid.apple.com/auth/authorize",
  // }
}

const STORAGE_PATH_ACCESS_TOKEN = "access_token";
const STORAGE_PATH_ID_TOKEN = "id_token";
const STORAGE_PATH_REFRESH_TOKEN = "refresh_token";

class OAuth {
  private clientId: string;
  private redirectUri: string;
  private authProvider: AuthProvider;

  private accessToken: string;
  private idToken: string;
  private refreshToken: string;

  private storage: Storage;

  constructor(config: OAuthConfig) {
    if (!config.authProvider) {
      throw new BadRequest("Missing auth provider, please provide in the OAuth config.");
    }
    if (!AuthProviderConfig[config.authProvider]) {
      throw new BadRequest("Unsupported authProvider, valid providers: " + Object.keys(AuthProviderConfig).join(', '));
    }
    if (!config.redirectUri) {
      throw new BadRequest("Missing redirect uri, please provide your app auth callback URL.");
    }
    this.redirectUri = config.redirectUri;
    this.authProvider = config.authProvider;
    this.clientId = config.clientId || AuthProviderConfig[this.authProvider].CLIENT_ID;
    this.storage = config.storage || sessionStorage;
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

      const { address } = await enokiClient.getZkLogin(this.getIdToken());
      return { address };
    } else {
      throw new Error('Authorization code not found.');
    }
  }

  async exchangeCodeForTokens(code: string) {
    try {
      const { idToken, accessToken, refreshToken } = await new AkordApi({ debug: true, logToFile: true }).generateJWT({
        authProvider: this.authProvider,
        grantType: "code",
        redirectUri: this.redirectUri,
        authCode: code
      });
      this.accessToken = accessToken;
      this.idToken = idToken;
      this.refreshToken = refreshToken;

      this.storage.setItem(STORAGE_PATH_ACCESS_TOKEN, this.accessToken);
      this.storage.setItem(STORAGE_PATH_ID_TOKEN, this.idToken);
      this.storage.setItem(STORAGE_PATH_REFRESH_TOKEN, this.refreshToken);
    } catch (error) {
      Logger.error(error);
    }
  }

  async createAuthorizationUrl() {
    // generate ephemeral key pair
    const ephemeralKeyPair = new Ed25519Keypair();

    const enokiClient = new EnokiClient({ apiKey: "enoki_public_ab093e91616fc8fe6125017946ea2548" });

    const createZkLoginResponse = await enokiClient.createZkLoginNonce(ephemeralKeyPair);

    const params = new URLSearchParams({
      nonce: createZkLoginResponse.nonce,
      client_id: AuthProviderConfig[this.authProvider].CLIENT_ID,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });

    const oauthUrl = `${AuthProviderConfig[this.authProvider].AUTH_URL}?${params}`;
    return oauthUrl;
  }

  async refreshTokens(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Unauthorized("Session expired. Please login again.");
      }

      const { idToken, accessToken } = await new AkordApi({ debug: true, logToFile: true }).generateJWT({
        authProvider: this.authProvider,
        grantType: "refreshToken",
        refreshToken: refreshToken
      });
      this.accessToken = accessToken;
      this.idToken = idToken;

      this.storage.setItem(STORAGE_PATH_ACCESS_TOKEN, this.accessToken);
      this.storage.setItem(STORAGE_PATH_ID_TOKEN, this.idToken);
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error}`);
    }
  };

  isTokenExpiringSoon(token: string, bufferTime: number = 10): boolean {
    // function to decode a JWT
    const decode = (token: string): any => {
      // split the JWT into its parts (header, payload, signature)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // decode the base64 encoded payload
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    };
    const decoded = decode(token) as any;
    const currentTime = Math.floor(Date.now() / 1000);
    // check if the token will expire within the next `bufferTime` seconds
    const tokenExpiringSoon = currentTime >= (decoded.exp - bufferTime);
    return tokenExpiringSoon;
  };

  getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = this.storage.getItem('access_token');
    }
    return this.accessToken;
  }

  getRefreshToken() {
    if (!this.refreshToken) {
      this.refreshToken = this.storage.getItem('refresh_token');
    }
    return this.refreshToken;
  }

  getIdToken() {
    if (!this.idToken) {
      this.idToken = this.storage.getItem('id_token');
    }
    return this.idToken;
  }
}

export {
  OAuth
}
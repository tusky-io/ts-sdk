// require("dotenv").config();
import axios from 'axios';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiClient from './enoki';
import { AuthProvider, OAuthConfig } from '../config';
import { BadRequest } from '../errors/bad-request';
import { decode, JwtPayload } from 'jsonwebtoken';

export const AuthProviderConfig = {
  "Google": {
    "CLIENT_ID": "52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com",
    "CLIENT_SECRET": "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",
    "OAUTH_URL": "https://accounts.google.com/o/oauth2/v2/auth",
    "TOKEN_URL": "https://oauth2.googleapis.com/token"
  },
  "Facebook": {
    "CLIENT_ID": "1030800888399080",
    "CLIENT_SECRET": process.env.FACEBOOK_CLIENT_SECRET,
    "OAUTH_URL": "https://www.facebook.com/v11.0/dialog/oauth",
    "TOKEN_URL": "https://graph.facebook.com/v11.0/oauth/access_token"
  },
  "Twitch": {
    "CLIENT_ID": "g924m6acqg8w9gw9hxstdl5q2uugup",
    "CLIENT_SECRET": process.env.TWITCH_CLIENT_SECRET,
    "OAUTH_URL": "https://id.twitch.tv/oauth2/authorize",
    "TOKEN_URL": "https://id.twitch.tv/oauth2/token"
  },
  // TODO: configure Apple
  // "Apple": {
  //   "CLIENT_ID": "",
  //   "CLIENT_SECRET": "",
  //   "OAUTH_URL": "https://appleid.apple.com/auth/authorize",
  //   "TOKEN_ENDPOINT": "https://appleid.apple.com/auth/token"
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
  async redirectToOAuthProvider() {
    const oauthUrl = await this.createAuthorizationUrl();
    window.location.href = oauthUrl;
  }

  // handle callback, extract authorization code from URL & exchange it for tokens
  async handleOAuthCallback() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const code = urlParams.get('code');

    if (code) {
      console.log('Authorization Code:', code);
      // exchange the authorization code for tokens
      await this.exchangeCodeForTokens(code);

      const enokiClient = new EnokiClient({ apiKey: "enoki_public_ab093e91616fc8fe6125017946ea2548" });

      const { salt, address } = await enokiClient.getZkLogin(this.getIdToken());
      return { salt, address };
    } else {
      throw new Error('Authorization code not found.');
    }
  }

  async exchangeCodeForTokens(code: string) {
    const params = new URLSearchParams({
      code: code,
      client_id: AuthProviderConfig[this.authProvider].CLIENT_ID,
      client_secret: AuthProviderConfig[this.authProvider].CLIENT_SECRET,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    } as any).toString()

    try {
      const tokenResponse = await axios.post(AuthProviderConfig[this.authProvider].TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokens = tokenResponse.data;
      console.log(tokens)
      console.log(`JWT: ${tokens.id_token}`);
      this.accessToken = tokens.access_token;
      this.idToken = tokens.id_token;
      this.refreshToken = tokens.refresh_token;
      this.storage.setItem(STORAGE_PATH_ACCESS_TOKEN, this.accessToken);
      this.storage.setItem(STORAGE_PATH_ID_TOKEN, this.idToken);
      this.storage.setItem(STORAGE_PATH_REFRESH_TOKEN, this.refreshToken);
      return tokens;
    } catch (error) {
      console.log(error);
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
      scope: "openid profile",
      access_type: "offline",
      prompt: "consent"
    });

    const oauthUrl = `${AuthProviderConfig[this.authProvider].OAUTH_URL}?${params}`;
    return oauthUrl;
  }

  async refreshTokens(): Promise<void> {
    try {
      const response = await axios.post(AuthProviderConfig[this.authProvider].TOKEN_URL, new URLSearchParams({
        client_id: this.clientId,
        refresh_token: this.getRefreshToken(),
        grant_type: 'refresh_token',
        scope: 'openid email profile'
      }));

      const tokens = response.data;

      this.accessToken = tokens.access_token;
      this.idToken = tokens.id_token;
      this.storage.setItem(STORAGE_PATH_ACCESS_TOKEN, this.accessToken);
      this.storage.setItem(STORAGE_PATH_ID_TOKEN, this.idToken);
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error}`);
    }
  };

  isTokenExpired(token: string): boolean {
    const decoded = decode(token) as JwtPayload;
    const currentTime = Math.floor(Date.now() / 1000);
    console.log("TOKEN EXPIRED: " + (currentTime >= decoded.exp));
    return true;
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
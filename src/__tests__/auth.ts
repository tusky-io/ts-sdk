require("dotenv").config();
import axios from 'axios';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { startServer } from "./server";
import { keyInSelect } from 'readline-sync';
import { GenerateJWTResponsePayload } from "../types/auth";
import { EnokiClient } from '../auth/enoki';
import { authProviderConfig } from '../auth/oauth';

const REDIRECT_URI = 'http://localhost:3000/auth';

function getAuthProvider() {
  const options = ['Google', 'Twitch'];
  const index = keyInSelect(options, 'Please choose your auth provider:');
  return options[index];
}

export const AuthProvider = {
  "Google": {
    ...authProviderConfig().Google,
    "CLIENT_SECRET": process.env.GOOGLE_CLIENT_SECRET,
  },
  "Twitch": {
    ...authProviderConfig().Twitch,
    "CLIENT_SECRET": process.env.TWITCH_CLIENT_SECRET,
  }
}

const defaultAuthProvider = 'Google';

export async function getAuthorizationCode(nonce: string, authProvider = defaultAuthProvider) {
  const params = new URLSearchParams({
    nonce: nonce,
    client_id: AuthProvider[authProvider].CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid profile",
    access_type: "offline",
    // prompt: "consent"
  });

  const oauthUrl = `${AuthProvider[authProvider].OAUTH_URL}?${params}`;

  console.log(`Sign in with ${authProvider} first with the following url and come back later: `);
  console.log(oauthUrl);

  // Wait for the authorization code to be captured by the local server
  const { getAuthCode } = startServer();
  let authorizationCode;
  while (!authorizationCode) {
    authorizationCode = getAuthCode();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return authorizationCode;
}

export async function getTokensWithAuthorizationCode(code: string, authProvider = defaultAuthProvider): Promise<GenerateJWTResponsePayload> {
  if (!AuthProvider[authProvider].CLIENT_SECRET) {
    throw new Error(`Missing ${authProvider} client secret, please configure it in .env file.`);
  }
  const params = new URLSearchParams({
    code: code,
    client_id: AuthProvider[authProvider].CLIENT_ID,
    client_secret: AuthProvider[authProvider].CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  } as any).toString()

  // Exchange the authorization code for an access token
  try {
    const tokenResponse = await axios.post(AuthProvider[authProvider].TOKEN_ENDPOINT, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokens = tokenResponse.data;
    console.log(tokens)
    console.log(`JWT: ${tokens.id_token}`);
    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token
    }
  } catch (error) {
    console.log(error)
    throw new Error(error);
  }
}

export async function getIdTokenWithImplicitFlow(nonce: string, authProvider = defaultAuthProvider) {
  if (!AuthProvider[authProvider].CLIENT_SECRET) {
    throw new Error(`Missing ${authProvider} client secret, please configure it in .env file.`);
  }
  const params = new URLSearchParams({
    nonce: nonce,
    client_id: AuthProvider[authProvider].CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    access_type: "offline",
    response_type: "code token",
    scope: "openid",
  }).toString()

  const oauthUrl = `${AuthProvider[authProvider].OAUTH_URL}?${params}`;

  console.log(`Sign in with ${authProvider} first with the following url and come back later: `);
  console.log(oauthUrl);

  // Wait for the authorization code to be captured by the local server
  const { getAuthCode } = startServer();
  let authorizationCode;
  while (!authorizationCode) {
    authorizationCode = getAuthCode();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return authorizationCode;
}

export const mockEnokiFlow = async (authProvider = defaultAuthProvider): Promise<{ tokens: GenerateJWTResponsePayload, keyPair: Ed25519Keypair, address: string }> => {
  // generate ephemeral key pair
  const ephemeralKeyPair = new Ed25519Keypair();

  const enokiClient = new EnokiClient({ apiKey: process.env.ENOKI_PUB_KEY as string });

  const createZkLoginResponse = await enokiClient.createZkLoginNonce(ephemeralKeyPair);

  const authorizationCode = await getAuthorizationCode(createZkLoginResponse.nonce, authProvider);

  const tokens = await getTokensWithAuthorizationCode(authorizationCode, authProvider);
  return { tokens, address: ephemeralKeyPair.toSuiAddress(), keyPair: ephemeralKeyPair };
};
require("dotenv").config();
import axios from 'axios';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiClient from "./enoki/client";
import { getAuthCode } from './server';
import { keyInSelect } from 'readline-sync';

const REDIRECT_URI = 'http://localhost:3000/auth';

function getAuthProvider() {
  const options = ['Google', 'Twitch', 'Facebook'];
  const index = keyInSelect(options, 'Please choose your auth provider:');
  return options[index];
}

export const AuthProvider = {
  "Google": {
    "CLIENT_ID": "52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com",
    "CLIENT_SECRET": process.env.GOOGLE_CLIENT_SECRET,
    "OAUTH_URL": "https://accounts.google.com/o/oauth2/v2/auth",
    "TOKEN_ENDPOINT": "https://oauth2.googleapis.com/token"
  },
  "Facebook": {
    "CLIENT_ID": "1030800888399080",
    "CLIENT_SECRET": process.env.FACEBOOK_CLIENT_SECRET,
    "OAUTH_URL": "https://www.facebook.com/v11.0/dialog/oauth",
    "TOKEN_ENDPOINT": "https://graph.facebook.com/v11.0/oauth/access_token"
  },
  "Twitch": {
    "CLIENT_ID": "g924m6acqg8w9gw9hxstdl5q2uugup",
    "CLIENT_SECRET": process.env.TWITCH_CLIENT_SECRET,
    "OAUTH_URL": "https://id.twitch.tv/oauth2/authorize",
    "TOKEN_ENDPOINT": "https://id.twitch.tv/oauth2/token"
  },
  // TODO: configure Apple
  // "Apple": {
  //   "CLIENT_ID": "",
  //   "CLIENT_SECRET": "",
  //   "OAUTH_URL": "https://appleid.apple.com/auth/authorize",
  //   "TOKEN_ENDPOINT": "https://appleid.apple.com/auth/token"
  // }
}

const defaultAuthProvider = 'Google';

export async function getAuthorizationCode(nonce: string, authProvider = defaultAuthProvider) {
  const params = new URLSearchParams({
    nonce: nonce,
    client_id: AuthProvider[authProvider].CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid",
  });

  const oauthUrl = `${AuthProvider[authProvider].OAUTH_URL}?${params}`;

  console.log(`Sign in with ${authProvider} first with the following url and come back later: `);
  console.log(oauthUrl);

  // Wait for the authorization code to be captured by the local server
  let authorizationCode;
  while (!authorizationCode) {
    authorizationCode = getAuthCode();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return authorizationCode;
}

export async function getIdTokenWithAuthorizationCode(code: string, authProvider = defaultAuthProvider) {
  if (!AuthProvider[authProvider].CLIENT_SECRET) {
    throw new Error(`Missing ${authProvider} client secret, please configure it in .env file.`);
  }
  const params = new URLSearchParams({
    code: code,
    client_id: AuthProvider[authProvider].CLIENT_ID,
    client_secret: AuthProvider[authProvider].CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  } as any).toString()

  // Exchange the authorization code for an access token
  try {
    const tokenResponse = await axios.post(AuthProvider[authProvider].TOKEN_ENDPOINT, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokens = tokenResponse.data;
    console.log(`JWT: ${tokens.id_token}`);
    return tokens.id_token
  } catch (error) {
    console.log(error)
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
  let authorizationCode;
  while (!authorizationCode) {
    authorizationCode = getAuthCode();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return authorizationCode;
}

export const mockEnokiFlow = async (authProvider = defaultAuthProvider): Promise<{ jwt: string, keyPair: Ed25519Keypair, address: string }> => {
  // generate ephemeral key pair
  const ephemeralKeyPair = new Ed25519Keypair();

  const enokiClient = new EnokiClient({ apiKey: process.env.ENOKI_PUB_KEY as string });

  const createZkLoginResponse = await enokiClient.createZkLoginNonce(ephemeralKeyPair);

  // const idToken = await getIdTokenWithImplicitFlow(createZkLoginResponse.data.nonce, authProvider);

  const authorizationCode = await getAuthorizationCode(createZkLoginResponse.data.nonce, authProvider);

  const idToken = await getIdTokenWithAuthorizationCode(authorizationCode, authProvider);
  return { jwt: idToken, address: ephemeralKeyPair.toSuiAddress(), keyPair: ephemeralKeyPair };
};
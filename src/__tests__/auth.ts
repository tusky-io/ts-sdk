require("dotenv").config();
import axios from 'axios';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiClient from "./enoki/client";
import { getAuthCode } from './server';

export const GOOGLE_CLIENT_ID = '52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com';
export const GOOGLE_API_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI = 'http://localhost:3000/auth';

export async function getAuthorizationCode(nonce: string) {
  const params = new URLSearchParams({
    nonce: nonce,
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    // TODO: Eventually fetch the scopes for this client ID from the Enoki service:
    scope: [
      "openid",
      // Merge the requested scopes in with the required openid scopes:
    ].filter(Boolean).join(" ")
  });

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  console.log("Sign in with google first with the following url and come back later: ");
  console.log(oauthUrl);

  // Wait for the authorization code to be captured by the local server
  let authorizationCode;
  while (!authorizationCode) {
    authorizationCode = getAuthCode();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return authorizationCode;
}

export async function getIdTokenWithAuthorizationCode(code: string) {

  const params = new URLSearchParams({
    code: code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  } as any).toString()

  // Exchange the authorization code for an access token
  try {
    const tokenResponse = await axios.post(GOOGLE_API_TOKEN_ENDPOINT, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokens = tokenResponse.data;
    console.log(tokens)
    console.log(`Id token: ${tokens.id_token}`);
    return tokens.id_token
  } catch (error) {
    console.log(error)
  }
}

export const mockEnokiFlow = async (): Promise<{ jwt: string, keyPair: Ed25519Keypair, address: string }> => {
  // generate ephemeral key pair
  const ephemeralKeyPair = new Ed25519Keypair();

  const enokiClient = new EnokiClient({ apiKey: process.env.ENOKI_PUB_KEY as string });

  const createZkLoginResponse = await enokiClient.createZkLoginNonce(ephemeralKeyPair);

  const authorizationCode = await getAuthorizationCode(createZkLoginResponse.data.nonce);

  const idToken = await getIdTokenWithAuthorizationCode(authorizationCode);
  return { jwt: idToken, address: ephemeralKeyPair.toSuiAddress(), keyPair: ephemeralKeyPair };
};
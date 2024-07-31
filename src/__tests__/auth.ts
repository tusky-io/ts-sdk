// import { GoogleAuth, JWT } from 'google-auth-library';
import fs from "fs";
import path from "path";
import { Unauthorized } from '../errors/unauthorized';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';

export const GOOGLE_CLIENT_ID = '52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com';
export const GOOGLE_API_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const ENOKI_ZKLOGIN_ENDPOINT = 'https://api.enoki.mystenlabs.com/v1/zklogin';

export interface EnokiResponse {
  salt: string;
  address: string;
}

export const mockEnokiFlow = async () => {
  const keyFilePath = path.join(__dirname, '../../.google_admin_key.json');
  const keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

  // generate JWT assertion

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: keys.client_email,
    aud: GOOGLE_API_TOKEN_ENDPOINT,
    exp: now + 3600,
    iat: now,
    nonce: crypto.randomBytes(16).toString('base64'),
    target_audience: GOOGLE_CLIENT_ID
  };

  const assertion = jwt.sign(payload, keys.private_key, { algorithm: 'RS256' });

  try {
    const response = await axios.post(GOOGLE_API_TOKEN_ENDPOINT, {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
      nonce: crypto.randomBytes(16).toString('base64')
    });
    console.log(response.data)
    return response.data.id_token;
  } catch (error) {
    console.log(error)
  }

  // const targetAudience = GOOGLE_CLIENT_ID;

  // const auth = new GoogleAuth({
  //   keyFile: keyFilePath,
  // });

  // const client = await auth.getIdTokenClient(targetAudience);
  // const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);
  // return idToken;
};

export const validateJWTWithEnoki = async (jwt: string): Promise<EnokiResponse> => {
  // TODO: call it only on first login/signup to retrieve user address
  const response = await fetch(
    ENOKI_ZKLOGIN_ENDPOINT,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "zklogin-jwt": jwt,
      },
    }
  );
  if (!response.ok) {
    console.error(response)
    throw new Unauthorized("Invalid authorization.");
  }
  return await response.json();
};
require("dotenv").config();
// import { GoogleAuth, JWT } from 'google-auth-library';
import fs from "fs";
import path from "path";
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import EnokiClient from "./enoki/client";

export const GOOGLE_CLIENT_ID = '52977920067-5hf88uveake073ent9s5snn0d8kfrf0t.apps.googleusercontent.com';
export const GOOGLE_API_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const mockEnokiFlow = async (): Promise<{ jwt: string, keyPair: Ed25519Keypair, address: string }> => {
  const keyFilePath = path.join(__dirname, '../../.google_admin_key.json');
  const keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

  // generate ephemeral key pair
  const ephemeralKeyPair = new Ed25519Keypair();

  const enokiClient = new EnokiClient({ apiKey: process.env.ENOKI_PUB_KEY as string });

  const createZkLoginResponse = await enokiClient.createZkLoginNonce(ephemeralKeyPair);
  // generate JWT assertion

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: keys.client_email,
    aud: GOOGLE_API_TOKEN_ENDPOINT,
    exp: now + 3600,
    iat: now,
    nonce: createZkLoginResponse.data.nonce,
    target_audience: GOOGLE_CLIENT_ID
  };

  const assertion = jwt.sign(payload, keys.private_key, { algorithm: 'RS256' });

  try {
    const response = await axios.post(GOOGLE_API_TOKEN_ENDPOINT, {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
      nonce: createZkLoginResponse.data.nonce,
    });

    const jwt = response.data.id_token;


    // TODO: make sure JWT contains nonce value
    // const getZkLoginResponse = await enokiClient.getZkLogin(jwt);

    // return { jwt: jwt, keyPair: ephemeralKeyPair, address: getZkLoginResponse.data.address };

    return { jwt: jwt, keyPair: ephemeralKeyPair, address: ephemeralKeyPair.getPublicKey().toSuiAddress() };
  } catch (error) {
    console.log(error)
    throw new Error("Unable to authenticate.");
  }

  // const targetAudience = GOOGLE_CLIENT_ID;

  // const auth = new GoogleAuth({
  //   keyFile: keyFilePath,
  // });

  // const client = await auth.getIdTokenClient(targetAudience);
  // const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);
  // return idToken;
};
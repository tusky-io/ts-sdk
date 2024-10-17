import { ApiConfig, apiConfig } from "./config";
import { PubSubConfig } from "../config";
import { Amplify } from "@aws-amplify/core";
import { generateClient } from "@aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql';

export default class PubSub {
  
  public client: V6Client;
  private config: ApiConfig;

  constructor(config: PubSubConfig) {
    this.config = apiConfig(config.env);
    Amplify.configure({
      API: {
          GraphQL: {
              endpoint: this.config.gqlUrl,
              region: 'eu-central-1',
              defaultAuthMode: 'lambda'
          }
      }
    });
    this.client = generateClient({
      authMode: 'lambda',
      authToken: 'custom'
    });
  }
}

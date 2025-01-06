import { Env, Envs } from "../types";

export const apiConfig = (env: Env) => {
  switch (env) {
    case Envs.PROD:
      return {
        apiUrl: "https://api.tusky.io",
        cdnUrl: "https://cdn.tusky.io",
        gqlUrl:
          "https://zt4r4p7omrgmrfirr6322xawee.appsync-api.eu-central-1.amazonaws.com/graphql",
      };
    case Envs.DEV:
    default:
      return {
        apiUrl: "https://dev-api.tusky.io",
        cdnUrl: "https://dev-cdn.tusky.io",
        gqlUrl:
          "https://oruws6zna5adpg7dhbubrof2je.appsync-api.eu-central-1.amazonaws.com/graphql",
      };
    case Envs.LOCAL:
      return {
        apiUrl: "http://localhost:3000",
        cdnUrl: "http://localhost:3000/data",
        gqlUrl:
          "https://oruws6zna5adpg7dhbubrof2je.appsync-api.eu-central-1.amazonaws.com/graphql",
      };
  }
};

export interface ApiConfig {
  apiUrl: string;
  cdnUrl: string;
  gqlUrl: string;
}

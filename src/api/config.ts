import { Env, Envs } from "../types";

export const apiConfig = (env: Env) => {
  switch (env) {
    case Envs.PROD:
    default:
      return {
        apiUrl: "https://api.tusky.io",
        cdnUrl: "https://cdn.tusky.io",
      };
    case Envs.DEV:
      return {
        apiUrl: "https://dev-api.tusky.io",
        cdnUrl: "https://dev-cdn.tusky.io",
      };
    case Envs.LOCAL:
      return {
        apiUrl: "http://localhost:3100",
        cdnUrl: "http://localhost:3200",
      };
  }
};

export interface ApiConfig {
  apiUrl: string;
  cdnUrl: string;
}

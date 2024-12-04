export type Env = "prod" | "dev" | "local";

export enum Envs {
  PROD = "prod",
  DEV = "dev",
  LOCAL = "local",
}

export const DEFAULT_ENV = Envs.PROD;

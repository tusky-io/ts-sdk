export const apiConfig = (env: string) => {
  switch (env) {
    case "mainnet":
      return {
        apiUrl: "https://api.tusky.io",
        cdnUrl: "https://cdn.tusky.io",
        gqlUrl: "https://zt4r4p7omrgmrfirr6322xawee.appsync-api.eu-central-1.amazonaws.com/graphql",
      };
    case "testnet":
    default:
      return {
        apiUrl: "https://dev-api.tusky.io",
        cdnUrl: "https://dev-cdn.tusky.io",
        gqlUrl: "https://oruws6zna5adpg7dhbubrof2je.appsync-api.eu-central-1.amazonaws.com/graphql",
      };
    case "local":
      return {
        apiUrl: "http://localhost:3001",
        cdnUrl: "http://localhost:3001/data",
        gqlUrl: "https://oruws6zna5adpg7dhbubrof2je.appsync-api.eu-central-1.amazonaws.com/graphql",
      };
  }
};

export interface ApiConfig {
  apiUrl: string,
  cdnUrl: string,
  gqlUrl: string
}

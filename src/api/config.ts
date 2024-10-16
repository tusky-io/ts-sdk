export const apiConfig = (env: string) => {
  switch (env) {
    case "mainnet":
      return {
        apiUrl: "https://api.tusky.io",
        cdnUrl: "https://cdn.tusky.io",
      };
    case "testnet":
    default:
      return {
        apiUrl: "https://dev-api.tusky.io",
        cdnUrl: "https://dev-cdn.tusky.io",
      };
    case "local":
      return {
        apiUrl: "http://localhost:3001",
        cdnUrl: "http://localhost:3001/data",
      };
  }
};

export interface ApiConfig {
  apiUrl: string,
  cdnUrl: string,
}

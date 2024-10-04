export const apiConfig = (env: string) => {
  switch (env) {
    case "mainnet":
      return {
        apiUrl: "https://api.akrd.io",
        cdnUrl: "https://cdn.akrd.io",
      };
    case "testnet":
    default:
      return {
        apiUrl: "https://dev-api.akrd.io",
        cdnUrl: "https://dev-cdn.akrd.io",
      };
    case "local":
      return {
        apiUrl: "http://localhost:3001",
        cdnUrl: "http://localhost:3001/data"
      };
  }
};

export interface ApiConfig {
  apiUrl: string,
  cdnUrl: string
}

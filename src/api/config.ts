export const apiConfig = (env: string) => {
  switch (env) {
    case "mainnet":
      return {
        apiUrl: "https://dev-api.carmella.io",
        cdnUrl: "https://dev-cdn.carmella.io",
      };
    case "testnet":
    default:
      return {
        apiUrl: "https://api.carmella.io",
        cdnUrl: "https://cdn.carmella.io",
      };
    case "local":
      return {
        apiUrl: "http://localhost:3000",
        cdnUrl: "http://localhost:3000/cached"
      };
  }
};

export interface ApiConfig {
  apiUrl: string,
  cdnUrl: string
}

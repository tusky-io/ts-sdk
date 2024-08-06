export const apiConfig = (env: string) => {
  switch (env) {
    case "mainnet":
      return {
        apiUrl: "https://carmella-storage.akord.link",
        cdnUrl: "https://akrd.io",
      };
    case "testnet":
    default:
      return {
        apiUrl: "https://carmella-storage.akord.link",
        cdnUrl: "https://akrd.io",
      };
    case "local":
      return {
        apiUrl: "http://localhost:3000",
        cdnUrl: "https://akrd.io"
      };
  }
};

export interface ApiConfig {
  apiUrl: string,
  cdnUrl: string
}

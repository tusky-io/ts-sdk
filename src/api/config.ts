export const apiConfig = (env: string) => {
  switch (env) {
    case "v2":
      return {
        apiurl: "https://api.akord.com",
        gatewayurl: "https://akrd.net",
        uploadsurl: "https://uploads.akord.com"
      };
    case "dev":
      return {
        apiurl: "https://api.akord.link",
        gatewayurl: "https://akrd.io",
        uploadsurl: "https://uploads.akord.link"
      };
    case "local":
      return {
        apiurl: "http://localhost:3000",
        gatewayurl: "https://akrd.io",
        uploadsurl: "http://localhost:3000"
      };
    case "carmella":
    default:
      return {
        apiurl: "https://carmella-storage.akord.link",
        gatewayurl: "https://akrd.io",
        uploadsurl: "https://carmella-storage.akord.link"
      };
  }
};

export interface ApiConfig {
  apiurl: string,
  gatewayurl: string,
  uploadsurl: string
}

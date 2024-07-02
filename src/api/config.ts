export const apiConfig = (env: string) => {
  switch (env) {
    case "v2":
    default:
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
  }
};

export interface ApiConfig {
  apiurl: string,
  gatewayurl: string,
  uploadsurl: string
}

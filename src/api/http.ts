// import Agent, { HttpsAgent } from "agentkeepalive";
import axios from "axios";

// const keepAliveAgent = new Agent({
//   maxSockets: 160,
//   maxFreeSockets: 160,
//   timeout: 60000,
//   freeSocketTimeout: 30000,
//   keepAliveMsecs: 60000,
// });

// const httpsKeepAliveAgent = new HttpsAgent({
//   maxSockets: 160,
//   maxFreeSockets: 160,
//   timeout: 60000,
//   freeSocketTimeout: 30000,
//   keepAliveMsecs: 60000,
// });

// export const httpClient = axios.create({
//   httpAgent: keepAliveAgent,
//   httpsAgent: httpsKeepAliveAgent,
// });

export const httpClient = axios.create({
  timeout: 60000,
});

// TODO: make it work with import { Tusky } from "@tusky-io/ts-sdk";

const { Tusky } = require("@tusky-io/ts-sdk");

const main = async () => {
  const tusky = await Tusky.init({ apiKey: process.env.TUSKY_API_KEY });
}

main().catch(console.error);
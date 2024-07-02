require("dotenv").config();
// User 1
export const email = process.env.EMAIL || "";
export const password = process.env.PASSWORD || "";
// User 2
export const email2 = process.env.EMAIL_2 || "";
export const password2 = process.env.PASSWORD_2 || "";
// User 3
export const email3 = process.env.EMAIL_3 || "";
export const password3 = process.env.PASSWORD_3 || "";
// Arweave wallet
export const wallet = process.env.WALLET_KEYFILE || "";
export const address = process.env.WALLET_ADDRESS || "";
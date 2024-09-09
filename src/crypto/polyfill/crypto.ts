let crypto;
// if (typeof window === 'undefined') {
//     crypto = require('crypto');
//     const nobleCrypto = require("@noble/hashes/crypto");
//     // globalThis.crypto = crypto;
//     nobleCrypto.crypto.node = crypto
// }
export default globalThis.crypto || crypto;

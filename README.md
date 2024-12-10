# Tusky SDK

The Tusky TypeScript SDK is the official client for [Tusky API](https://docs.tusky.io/).\
Compatible with both Node.js and web browsers.

- [Usage](#usage)
  - [Import](#import)
  - [Quick Start](#quick-start)
  - [Examples](#examples)
  - [Auth](#authentication)
- [Development](#development)

## Usage

> requires Node.js >= 18

### Import

```js
import { Tusky } from "@tusky/ts-sdk";
```

or

```js
const { Tusky } = require("@tusky/ts-sdk");
```

### Quick start

#### Init Tusky

```js
import { Tusky } from "@tusky/ts-sdk";

const tusky = Tusky.use({
  authProvider: "Google",
  redirectUri: "http://localhost:3000",
});
```

#### Upload file with Tusky

```js
const path = "/path/to/my/file.jpg";
const { uri, fileId } = await tusky.file.upload(path);
```

#### Download the file

```js
const file = await tusky.file.download(uri);
```

#### List all user files

```js
const files = await tusky.file.listAll();
```

### Examples

- See example flows under [tests](src/__tests__).

- See different setups under [examples](examples).

## Authentication

##### use Sui Wallet

```js
// on the browser
import { Tusky } from "@tusky/ts-sdk";
import { useSignPersonalMessage } from "@mysten/dapp-kit";

const { mutate: signPersonalMessage } = useSignPersonalMessage();

const tusky = await Tusky.withWallet({
  walletSignFnClient: signPersonalMessage,
}).withLogger({ debug: true, logToFile: true });

// sign-in to Tusky (this will prompt the wallet & ask for user signature)
await tusky.signIn();
```

```js
// on the server
import { Tusky } from "@tusky/ts-sdk";
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
// generate new Sui Key Pair
 const keypair = new Ed25519Keypair();
 const tusky = await Tusky
      .withWallet({ walletSigner: keypair })
      .withLogger({ debug: true, logToFile: true });
      .signIn();
```

##### use API key

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = Tusky.init().useApiKey({ apiKey: "you-api-key" });
```

##### use self-managed auth token provider

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = Tusky.withAuthTokenProvider({
  authTokenProvider: async () => "your-self-managed-jwt",
});
```

##### use OAuth (Google, Twitch, Facebook)

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = Tusky.withOAuth({
  authProvider: "Google",
  redirectUri: "http://localhost:3000/redirect",
});

// init OAuth flow
await tusky.initOAuthFlow();

// handle OAuth callback on redirect page
await tusky.handleOAuthCallback();
```

```js
// or perform the entire flow in one go
import { Tusky } from "@tusky/ts-sdk";
const tusky = await Tusky.init()
  .useOAuth({
    authProvider: "Google",
    redirectUri: "http://localhost:3000",
  })
  .build();

await tusky.signIn();
```

##### clear current auth session

```js
import { Tusky } from "@tusky/ts-sdk";
Tusky.signOut();
```

### Development

```
yarn install
yarn build
```

To run all tests:

```
yarn test
```

To run test groups:

```
yarn test:user

yarn test:vault

yarn test:vault:private
```

To run single test file with direct log output:

```
node --inspect node_modules/.bin/jest <path-to-test-file>

node --inspect node_modules/.bin/jest ./src/__tests__/vault/folder.test.ts
node --inspect node_modules/.bin/jest ./src/__tests__/vault/folder.test.ts -- --encrypted
```

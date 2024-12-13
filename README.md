<p align="center">
<img src="./og-image.png" alt="Logo">
</p>

# Tusky SDK

The Tusky TypeScript SDK is the official client for [Tusky API](https://docs.tusky.io/).\
Compatible with both Node.js and web browsers.

- [Usage](#usage)
- [Import](#import)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
  - [Sui wallet](#use-sui-wallet)
  - [OAuth](#use-oauth-google-twitch)
  - [Api key](#use-api-key)
- [Examples](#examples)

## Usage

> requires Node.js >= 18

<CodeGroup>
  <CodeGroupItem title="yarn">

```console:no-line-numbers
yarn add @tusky/ts-sdk
```

  </CodeGroupItem>
  <CodeGroupItem title="npm">

```console:no-line-numbers
npm install @tusky/ts-sdk
```

  </CodeGroupItem>
</CodeGroup>

## Import

<CodeGroup>
  <CodeGroupItem title="ES Modules">

```js
import { Tusky } from "@tusky/ts-sdk";
```

  </CodeGroupItem>
  <CodeGroupItem title="CommonJS">

```js
const { Tusky } = require("@tusky/ts-sdk");
```

  </CodeGroupItem>
</CodeGroup>

## Quick start

### Init Tusky

```js
import { Tusky } from "@tusky/ts-sdk";

const tusky = Tusky
  .init()
  .useOAuth({
    authProvider: "Google",
    redirectUri: "http://localhost:3000",
  });
```

### Upload file with Tusky

```js
const path = "/path/to/my/file.jpg";
const uploadId = await tusky.file.upload(path);
```

### Download the file

```js
const fileBuffer = await tusky.file.download(uploadId);
```

### List all user files

```js
const files = await tusky.file.listAll();
```

## Authentication

### use OAuth (Google, Twitch)

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = await Tusky
  .init()
  .useOAuth({
    authProvider: "Google",
    redirectUri: "http://localhost:3000",
  })
  .build();

// init OAuth flow
await tusky.auth.initOAuthFlow();

// handle OAuth callback
await tusky.auth.handleOAuthCallback();

// or perform the entire flow in one go
await tusky.auth.signIn();
```

### use Sui Wallet

```js
// on the browser
import { Tusky } from "@tusky/ts-sdk";
import { useSignPersonalMessage } from "@mysten/dapp-kit";

const { mutate: signPersonalMessage } = useSignPersonalMessage();

const tusky = await Tusky
  .init()
  .useWallet({ walletSignFnClient: signPersonalMessage })
  .useLogger({ debug: true, logToFile: true });

// sign-in to Tusky (this will prompt the wallet & ask for user signature)
await tusky.auth.signIn();
```

```js
// on the server
import { Tusky } from "@tusky/ts-sdk";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
// generate new Sui Key Pair
const keypair = new Ed25519Keypair();
const tusky = await Tusky
  .init()
  .useWallet({ walletSigner: keypair })
  .useLogger({ debug: true, logToFile: true })
  .build();

await tusky.auth.signIn();
```

##### use API key

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = await Tusky
  .init()
  .useApiKey({ apiKey: "you-api-key" })
  .build();
```

### use self-managed auth token provider

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = await Tusky
  .init()
  .useAuthTokenProvider({
    authTokenProvider: async () => "your-self-managed-jwt",
  })
  .build();
```

### clear current auth session

```js
import { Tusky } from "@tusky/ts-sdk";
Tusky.signOut();
```

## Examples

- See example flows under [tests](src/__tests__).

- See different setups under [examples](examples).

## Documentation

- See all SDK modules & methods documented [here](DOCS.md)

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

// You can generate fresh api key here: https://app.tusky.io/account/api-keys

const tusky = await Tusky.init({ apiKey: "your-api-key" });
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

### use Sui Wallet

```js
// on the browser
import { Tusky } from "@tusky/ts-sdk";
import { useSignPersonalMessage, useCurrentAccount } from "@mysten/dapp-kit";

const { mutate: signPersonalMessage } = useSignPersonalMessage();
const account = useCurrentAccount();

const tusky = await Tusky.init({ wallet: { signPersonalMessage, account } });

// sign-in to Tusky (this will prompt the wallet & ask for user signature)
await tusky.auth.signIn();
```

```js
// on the server
import { Tusky } from "@tusky/ts-sdk";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
// generate new Sui Key Pair
const keypair = new Ed25519Keypair();
const tusky = await Tusky.init({ wallet: { keypair } });

await tusky.auth.signIn();
```

### use OAuth (Google, Twitch)

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = await Tusky.init({ oauth: { authProvider: "Google", redirectUri: "http://localhost:3000" } });

// init OAuth flow
await tusky.auth.initOAuthFlow();

// handle OAuth callback
await tusky.auth.handleOAuthCallback();

// or perform the entire flow in one go
await tusky.auth.signIn();
```

##### use API key

```js
import { Tusky } from "@tusky/ts-sdk";
const tusky = await Tusky.init({ apiKey: "your-api-key" });
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

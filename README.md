# Carmella SDK

Carmella SDK is a set of tools designed for integrating file and folder uploads into secure digital vaults that are stored on-chain with [Akord](https://docs.akord.com/).

This package can be used in both browser and Node.js environments.

- [Usage](#usage)
  - [Import](#import)
  - [Quick Start](#quick-start)
  - [Plugins](#plugins)
  - [Examples](#examples)
- [Modules](#modules)
  - [Auth](#authentication)
  - [Vault](#vault)
  - [File](#file)
  - [Folder](#folder)
  - [Zip](#zip)
  - [Membership](#membership)
  - [Stack](#stack)
  - [Profile](#profile)
  - [Storage](#storage)
- [Development](#development)
- [Deployment](#deployment)

## Usage
> requires Node.js >= 18

### Import
```js
import { Akord } from "@akord/akord-js";
```
or
```js
const { Akord } = require("@akord/akord-js");
```

### Quick start

#### Init Akord
```js
import { Akord, Auth } from "@akord/akord-js";
const { wallet } = await Auth.signIn(email, password);
const akord = new Akord({ signer: wallet, encrypter: wallet });
```

#### Upload file to Akord
```js
const path = "/path/to/my/file.jpg";
const { uri, fileId } = await akord.file.upload(path);
```

#### Download the file
```js
const file = await akord.file.download(uri);
```

#### Query user files
```js
const files = await akord.file.listAll();
```

#### Plugins

Some methods require plugins installation. 
This design is motivated by bundle size care: increase the package bundle size only if feature is used.
Official supported plugins can be found at: [plugins](plugins)
```javascript 
import { PubSubPlugin } from "@akord/akord-js-pubsub-plugin"
import { Akord, Auth } from "@akord/akord-js";

const { wallet } = await Auth.signIn('your_username', 'your_password');
const akord = new Akord({ encrypter: wallet, signer: wallet, plugins: [new PubSubPlugin()] });
```


### Examples
- See our [demo app tutorial](https://js.akord.com) and learn how to create,
contribute and access an Akord Vault from.

- See example flows under [tests](src/__tests__).

- See different setups under [examples](examples).

## Authentication
Use `Auth` module to handle authentication.

```js
import { Auth } from "@akord/akord-js";
```

- By default `Auth` is using SRP authentication
- `Auth` stores tokens in `Storage` implementation 
- `Storage` defaults to localStorage on web & memoryStorage on nodeJs
- `Storage` implementation can be configured with `Auth.configure({ storage: window.sessionStorage })`
- `Auth` is automatically refreshing tokens in SRP mode
- On server side it is recommended to use API keys: `Auth.configure({ apiKey: 'your_api_key' })`
- API key: can be generated over web app & over CLI

##### use short living token with refresh
```js
import { Auth } from "@akord/akord-js";
Auth.configure({ storage: window.sessionStorage }); // optionally - configure tokens store
```
##### use API key
```js
import { Auth } from "@akord/akord-js";
Auth.configure({ apiKey: "api_key" });
```
##### use self-managed auth token
```js
import { Akord, Auth } from "@akord/akord-js";
Auth.configure({ authToken: "auth_token" });
```

#### `signIn(email, password)`

- `email` (`string`, required)
- `password` (`string`, required)
- returns `Promise<{ wallet, jwt }>` - Promise with JWT token & Akord Wallet

<details>
  <summary>example</summary>

```js
const { wallet } = await Auth.signIn("winston@gmail.com", "1984");
```
</details>

#### `signUp(email, password)`

- `email` (`string`, required)
- `password` (`string`, required)
- `clientMetadata` (`any`, optional) - JSON client metadata, ex: { clientType: "CLI" }
- returns `Promise<{ wallet }>` - Promise with Akord Wallet

<details>
  <summary>example</summary>

```js
const { wallet } = await Auth.signUp("winston@gmail.com", "1984");
```
</details>

#### `verifyAccount(email, code)`

- `email` (`string`, required)
- `code` (`string`, required)
- returns `Promise<void>`

<details>
  <summary>example</summary>

```js
await Auth.verifyAccount("winston@gmail.com", 123456);
```
</details>


## Modules

### vault

#### `create(name, options)`

- `name` (`string`, required) - new vault name
- `options` (`VaultCreateOptions`, optional) - public/private, terms of access, etc.
- returns `Promise<{ vaultId, membershipId, transactionId }>` - Promise with new vault id, owner membership id & corresponding transaction id

<details>
  <summary>example</summary>

```js
// create a private vault
const { vaultId, membershipId } = await akord.vault.create("my first private vault");

// create a public vault with terms of access
const { vaultId, membershipId } = await akord.vault.create(
  "my first public vault",
  { public: true, termsOfAccess: "terms of access here - if the vault is intended for professional or legal use, you can add terms of access and they must be digitally signed before accessing the vault" }
);

// create a public vault with description & tags for easier lookup
const { vaultId, membershipId } = await akord.vault.create("Arty podcast", {
    public: true,
    description: "A permanent podcast dedicated to art history",
    tags: ["art", "podcast", "archive"]
  });

// create a cloud storage vault 
const { vaultId, membershipId } = await akord.vault.create("Non permanent stuff", {
    cloud: true
  });
```
</details>

#### `update(vaultId, options)`

- `vaultId` (`string`, required)
- `options` (`VaultUpdateOptions`, required) - name, description & tags
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.vault.update(vaultId, {
  name: "color palette",
  description: "color inspiration for design and art projects",
  tags: ["taupe", "burgundy", "mauve"]
});
```
</details>

#### `rename(vaultId, name)`

- `vaultId` (`string`, required)
- `name` (`string`, required) - new vault name
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.vault.rename(vaultId, "updated name");
```
</details>

#### `archive(vaultId)`

- `vaultId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.vault.archive(vaultId);
```
</details>

#### `restore(vaultId)`

- `vaultId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.vault.restore(vaultId);
```
</details>

#### `delete(vaultId)`

- `vaultId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.vault.delete(vaultId);
```
</details>

#### `get(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`VaultGetOptions`][vault-get-options], optional)
- returns `Promise<Vault>` - Promise with the vault object

<details>
  <summary>example</summary>

```js
const vault = await akord.vault.get(vaultId);
```
</details>

#### `listAll(options)`

- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<Vault>>` - Promise with currently authenticated user vaults

<details>
  <summary>example</summary>

```js
const vaults = await akord.vault.listAll();
```
</details>

#### `list(listOptions)`

- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<{ items, nextToken }>` - Promise with paginated user vaults

<details>
  <summary>example</summary>

```js
// retrieve first 100 user vaults
const { items } = await akord.vault.list();

// retrieve first 20 user vaults
const { items } = await akord.vault.list({ limit: 20 });

// iterate through all user vaults
let token = null;
let vaults = [];
do {
  const { items, nextToken } = await akord.vault.list({ nextToken: token });
  vaults = vaults.concat(items);
  token = nextToken;
} while (token);
```
</details>

### membership

#### `airdrop(vaultId, members)`

Airdrop access to the vault to the batch of public keys. New members can access/contribute the vault using their private/public key pair. \
NOTE: If the new members are contributors, what they contribute is under the domain of the vault owner.

<details>
  <summary>example</summary>

```js
import { Akord, Auth } from "@akord/akord-js";
import { AkordWallet } from "@akord/crypto";

const wallet1 = await AkordWallet.create();
const wallet2 = await AkordWallet.create();
const wallet3 = await AkordWallet.create();
const wallet4 = await AkordWallet.create();

const tomorrowSameHour = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
const inOneMinute = new Date(new Date().getTime() + 60 * 1000);

await akord.membership.airdrop(vaultId, [
   { 
    publicSigningKey: wallet1.signingPublicKey(), 
    publicKey: wallet1.publicKey(), 
    role: "VIEWER", // view only access to vault
    options: {
      expirationDate: tomorrowSameHour // access valid for 24 hours
    }
   },
   { 
    publicSigningKey: wallet2.signingPublicKey(), 
    publicKey: wallet2.publicKey(), 
    role: "CONTRIBUTOR", // can edit / add / delete
    options: {
      expirationDate: inOneMinute, // access valid for 1 minute
      allowedStorage: 10 // can use up to 10Mb from host account
    }
   },
   { 
    publicSigningKey: wallet3.signingPublicKey(), 
    publicKey: wallet3.publicKey(), 
    role: "CONTRIBUTOR",
    options: {
      expirationDate: null, // valid until manual revoke
      allowedStorage: 0 // can't upload (but can edit e.g. move, rename)
    }
   },
   { 
    publicSigningKey: wallet4.signingPublicKey(), 
    publicKey: wallet4.publicKey(), 
    role: "CONTRIBUTOR",
    options: {
      allowedStorage: null // can upload using full storage balance of the host
    }
   }
]);

// access the vault as user 1
await Auth.signInWithWallet(wallet1);
const akord1 = new Akord(wallet1);
console.log(await akord1.vault.get(vaultId));

// access the vault as user 2
await Auth.signInWithWallet(wallet2);
const akord2 = new Akord(wallet2);
console.log(await akord2.vault.get(vaultId));
```
</details>

#### `leave(membershipId)`

Leave a vault

- `membershipId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.membership.leave(membershipId);
```
</details>

#### `revoke(membershipId)`

Revoke a membership, update also each valid membership with new rotated keys

- `membershipId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.membership.revoke(membershipId);
```
</details>

#### `changeRole(membershipId, role)`

- `membershipId` (`string`, required)
- `role` ([`RoleType`][role-type], required) - VIEWER/CONTRIBUTOR/OWNER
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.membership.changeRole(membershipId, "CONTRIBUTOR");
```
</details>

#### `get(membershipId, options)`

- `membershipId` (`string`, required)
- `options` ([`GetOptions`][get-options], optional)
- returns `Promise<Membership>` - Promise with the membership object

<details>
  <summary>example</summary>

```js
const membership = await akord.membership.get(membershipId);
```
</details>

#### `listAll(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<Membership>>` - Promise with all memberships within given vault

<details>
  <summary>example</summary>

```js
const memberships = await akord.membership.listAll(vaultId);
```
</details>

#### `list(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<{ items, nextToken }>` - Promise with paginated memberships within given vault

<details>
  <summary>example</summary>

```js
// retrieve first 100 memberships for the vault
const { items } = await akord.membership.list(vaultId);

// retrieve first 20 memberships for the vault
const { items } = await akord.membership.list(vaultId, { limit: 20 });

// iterate through all memberships
let token = null;
let memberships = [];
do {
  const { items, nextToken } = await akord.membership.list(vaultId, { nextToken: token });
  memberships = memberships.concat(items);
  token = nextToken;
} while (token);
```
</details>

### stack

#### `create(vaultId, file, name)`

- `vaultId` (`string`, required)
- `file` ([`FileSource`][file-source], required) - file source: web File object, file path, buffer or stream
- `name` (`string`, required) - stack name
- `options` (`StackCreateOptions`, optional)
- returns `Promise<{ stackId, transactionId }>` - Promise with new stack id & corresponding transaction id

<details>
  <summary>example</summary>

```js
// create a stack from file path with custom arweave tags
const { stackId, uri } = await akord.stack.create(vaultId, "path to your file", {
   arweaveTags: [
      { name: "Type", value: "music" },
      { name: "Genre", value: "rock" },
      { name: "Genre", value: "new wave" }
   ]
});
// Once the transaction is accepted on Arweave network (it takes 5-15 minutes on average),
// you can access your file on ViewBlock by visiting the following URL: https://viewblock.io/arweave/tx/{uri}
```

```js
import { UDL_LICENSE_TX_ID } from "@akord/akord-js";

// create a file stack with UDL

// first let's define terms of UDL
const udl = {
  license: UDL_LICENSE_TX_ID,
  licenseFee: {
    type: "Monthly",
    value: 5
  },
  derivations: [
    {
      type: "Allowed-With-RevenueShare",
      value: 30,
    },
    {
      type: "Allowed-With-RevenueShare",
      value: 10,
      duration: {
        type: "After",
        value: 2
      }
    }
  ],
  commercialUses: [{ type: "Allowed-With-Credit" }],
  paymentAddress: "89tR0-C1m3_sCWCoVCChg4gFYKdiH5_ZDyZpdJ2DDRw"
};
// then pass it as an option when creating the file stack
const { stackId } = await akord.stack.create(vaultId, file, { udl: udl });
```
> [See Next.js file upload showcase here][file-upload-example]
</details>

#### `rename(stackId, name)`

- `stackId` (`string`, required)
- `name` (`string`, required) - new stack name
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.stack.rename(stackId, "new name for your stack");
```
</details>

#### `uploadRevision(stackId, file)`

- `stackId` (`string`, required)
- `file` ([`FileSource`][file-source], required) - file source: web File object, file path, buffer or stream
- `options` (`FileUploadOptions`, optional)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.stack.uploadRevision(stackId, "path to your file");
```
</details>

#### `revoke(stackId)`

- `stackId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.stack.revoke(stackId);
```
</details>

#### `move(stackId, parentId)`

- `stackId` (`string`, required)
- `parentId` (`string`, required) - new parent folder id
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
// create new folder
const { folderId } = await akord.folder.create(vaultId, "new folder");
// move the stack to newly created folder
const { transactionId } = await akord.stack.move(stackId, folderId);
```
</details>

#### `restore(stackId)`

- `stackId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.stack.restore(stackId);
```
</details>

#### `delete(stackId)`

- `stackId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.stack.delete(stackId);
```
</details>

#### `get(stackId, options)`

- `stackId` (`string`, required)
- `options` ([`GetOptions`][get-options], optional)
- returns `Promise<Stack>` - Promise with the stack object

<details>
  <summary>example</summary>

```js
const stack = await akord.stack.get(stackId);
```
</details>

#### `listAll(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<Stack>>` - Promise with all stacks within given vault

<details>
  <summary>example</summary>

```js
const stacks = await akord.stack.listAll(vaultId);
```
</details>

#### `list(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<{ items, nextToken }>` - Promise with paginated stacks within given vault

<details>
  <summary>example</summary>

```js
// retrieve first 100 stacks for the vault
const { items } = await akord.stack.list(vaultId);

// retrieve first 20 stacks for the vault
const { items } = await akord.stack.list(vaultId, { limit: 20 });

// iterate through all stacks
let token = null;
let stacks = [];
do {
  const { items, nextToken } = await akord.stack.list(vaultId, { nextToken: token });
  stacks = stacks.concat(items);
  token = nextToken;
} while (token);
```
</details>

#### `getVersion(stackId, index)`

Get file stack version by index, return the latest version by default

- `stackId` (`string`, required)
- `index` (`number`, optional) - file version index
- returns `Promise<{ name: string, data: ArrayBuffer }>` - Promise with file name & data buffer

<details>
  <summary>example</summary>

```js
// get the latest stack version
const { name: fileName, data: fileBuffer } = await akord.stack.getVersion(stackId);

// get the first stack version
const { name: fileName, data: fileBuffer } = await akord.stack.getVersion(stackId, 0);
```
</details>

#### `getUri(stackId, type, index)`

Get stack file uri by index, return the latest file uri by default

- `stackId` (`string`, required)
- `type` (`StorageType`, optional) - storage type, default to arweave
- `index` (`number`, optional) - file version index, default to latest
- returns `Promise<string>` - Promise with stack file uri

<details>
  <summary>example</summary>

```js
// get the arweave uri for the latest file version
const arweaveUri = await akord.stack.getUri(stackId);

// get the arweave uri for the first file version
const arweaveUri = await akord.stack.getUri(stackId, 0);
```
</details>

#### `download(stackId, index, options)`

Download stack version by index, return the latest version by default.
This method can be used for downloading the binary or previewing it in browser (use options.noSave).

- `stackId` (`string`, required)
- `index` (`number`, optional) - file version index, default to latest
- `options` (`FileDownloadOptions`], optional) - control download behavior
- returns `Promise<string>` - Promise with location of downloaded file

<details>
  <summary>example</summary>

```js
    
  // download the file in browser / on server:
  await akord.stack.download(stackId, index)
    
  // preview the file in browser:
  const url = await akord.stack.download(stackId, index, { skipSave: true })
       
  <video src={url} controls />  
```
</details>

### file

Shorcut method for dealing with file uploads.
Will create stack/vault under the hood when needed.

#### `upload(file, options)`

- `file` (`FileSource`, required)
- `options` (`FileUploadOptions`, optional) - cloud/permanent, private/public, vault id, parent id, etc.
- returns `Promise<{ uri, fileId }>` - Promise with file id & uri

<details>
  <summary>example</summary>

```js
const path = "/path/to/my/file.jpg";
const { uri, fileId } = await akord.file.upload(path);
```
</details>

#### `batchUpload(items)`

- `items` (`FileSource`, required)
- returns `Promise<{ uri, fileId }>` - Promise with file id & uri

<details>
  <summary>example</summary>

```js
const { data, errors } = await akord.file.batchUpload(file);
```
</details>

#### `get(fileId, options)`

- `fileId` (`string`, required)
- `options` ([`GetOptions`][get-options], optional)
- returns `Promise<FileVersion>` - Promise with the file object

<details>
  <summary>example</summary>

```js
const file = await akord.file.get(fileId);
```
</details>

#### `listAll(options)`

- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<FileVersion>>` - Promise with all user files

<details>
  <summary>example</summary>

```js
const files = await akord.file.listAll();
```
</details>

#### `list(options)`

- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<{ items, nextToken }>` - Promise with paginated user files

<details>
  <summary>example</summary>

```js
// retrieve first 1000 files
const { items } = await akord.file.list();

// retrieve first 20 files
const { items } = await akord.file.list({ limit: 20 });

// iterate through all user files
let token = null;
let files = [];
do {
  const { items, nextToken } = await akord.file.list({ nextToken: token });
  files = files.concat(items);
  token = nextToken;
} while (token);
```
</details>

### folder

#### `create(vaultId, name)`

- `vaultId` (`string`, required)
- `name` (`string`, required) - folder name
- `options` (`NodeCreateOptions`, optional) - parent id, etc.
- returns `Promise<{ folderId, transactionId }>` - Promise with new folder id & corresponding transaction id

<details>
  <summary>example</summary>

```js
const { folderId } = await akord.folder.create(vaultId, "my first folder");
```
</details>

#### `upload(folder, options)`

upload folder and all its content

- `file` (`FolderSource`, required) folder path / browser folder entry
- `options` (`FolderUploadOptions`, optional) - cloud/permanent, private/public, skip hidden files flag, vault id, parent id, etc.
- returns `Promise<{ folderId }>` - Promise with folder id

<details>
  <summary>example</summary>

```js
const path = "/path/to/my/folder";
const { folderId } = await akord.folder.upload(path);
```
</details>

#### `rename(folderId, name)`

- `folderId` (`string`, required)
- `name` (`string`, required) - new folder name
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.folder.rename(folderId, "my first folder");
```
</details>

#### `move(folderId, parentId)`

Move the given folder along with its content to a different folder (parent)

- `folderId` (`string`, required)
- `parentId` (`string`, required) - new parent folder id
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
// create root folder
const rootFolderId = (await akord.folder.create(vaultId, "root folder")).folderId;
// move the folder to newly created root folder
const { transactionId } = await akord.folder.move(folderId, rootFolderId);
```
</details>

#### `revoke(folderId)`

Revoke the given folder along with the sub-tree of stacks and folders

- `folderId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.folder.revoke(folderId);
```
</details>

#### `restore(folderId)`

Restore the given folder along with the sub-tree of stacks and folders

- `folderId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.folder.restore(folderId);
```
</details>

#### `delete(folderId)`

Remove the folder along with the sub-tree of stacks and folders from the vault

- `folderId` (`string`, required)
- returns `Promise<{ transactionId }>` - Promise with corresponding transaction id

<details>
  <summary>example</summary>

```js
const { transactionId } = await akord.folder.delete(folderId);
```
</details>

#### `get(folderId, options)`

- `folderId` (`string`, required)
- `options` ([`GetOptions`][get-options], optional)
- returns `Promise<Folder>` - Promise with the folder object

<details>
  <summary>example</summary>

```js
const folder = await akord.folder.get(folderId);
```
</details>

#### `listAll(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<Folder>>` - Promise with all folders within given vault

<details>
  <summary>example</summary>

```js
const folders = await akord.folder.listAll(vaultId);
```
</details>

#### `list(vaultId, options)`

- `vaultId` (`string`, required)
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<{ items, nextToken }>` - Promise with paginated folders within given vault

<details>
  <summary>example</summary>

```js
// retrieve first 100 folders for the vault
const { items } = await akord.folder.list(vaultId);

// retrieve first 20 folders for the vault
const { items } = await akord.folder.list(vaultId, { limit: 20 });

// iterate through all folders
let token = null;
let folders = [];
do {
  const { items, nextToken } = await akord.folder.list(vaultId, { nextToken: token });
  folders = folders.concat(items);
  token = nextToken;
} while (token);
```
</details>

### profile

#### `get()`

Fetch currently authenticated user's profile details

- returns `Promise<ProfileDetails>` - Promise with profile details

#### `update(name, avatar)`

Update user profile

- `name` (`string`, required) - new profile name
- `avatar` (`ArrayBuffer`, required) - new avatar buffer
- returns `Promise<boolean>`

### zip

#### `list(options)`

- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<{ items, nextToken }>` - Promise with paginated zips uploaded by user

<details>
  <summary>example</summary>

```js
// retrieve first 100 zips for given user
const { items } = await akord.zip.list();

// retrieve first 20 zips for given user
const { items, nextToken } = await akord.zip.list({ limit: 20 });
// retrieve next 10 zips for given user
const { items } = await akord.zip.list({ limit: 10, nextToken: nextToken });

```
</details>


#### `listAll(options)`

- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<ZipLog>>` - Promise with all zip logs for given account

<details>
  <summary>example</summary>

```js
const zips = await akord.zip.listAll();
```
</details>

#### `upload(vaultId, file, options)`
- `vaultId` (`string`, required)
- `file` ([`FileSource`][file-source], required) - file source: web File object, file path, buffer or stream
- `options` (`ZipUploadOptions`, optional)
- returns `Promise<{ sourceId }>` - Promise with corresponding source id, allowing to query corresponding files

<details>
  <summary>example</summary>

```js
const { sourceId } = await akord.zip.upload(vaultId, "path to your file");
```
</details>


### storage

#### `get()`
- returns `Promise<Storage>` - Promise with user storage balance

<details>
  <summary>example</summary>

```js
const storage = await akord.storage.get();
```
</details>

#### `buy()`
Pay for storage. Increases Permanent Storage balance 
- returns `Promise<StorageBuyResponse>` - Promise with price `amount` & `currencyCode`. Contains `paymentId` for non sumulated payments.

<details>
  <summary>example</summary>

```js
const gigabytesToBuy = 2;
const { amount, currencyCode } = await akord.storage.buy(gigabytesToBuy, { simulate: true }); // no actual payment, just check price
```
</details>

<details>
  <summary>example</summary>

```js
const { paymentId, amount, currencyCode } = await akord.storage.buy(3); // initiate payment for 3 GB's: no storage increase yet, no payment yet

await akord.storage.buy({ paymentId }); // confirm the payment: storage increase after successful payment
```
</details>

<details>
  <summary>example</summary>

```js
const { paymentId, amount, currencyCode } = await akord.storage.buy(3, { currencyCode: 'EUR', confirm: true }); // auto-confirm payment for 3 GB's: storage increase after successful payment
```
</details>

### Development
```
yarn install
yarn build
```

To run all tests:
```
yarn test
```

To run single test file:
```
yarn test <path-to-test-file>

yarn test ./src/__tests__/upload.test.ts
```

To run single test file with direct log output:
```
node --inspect node_modules/.bin/jest <path-to-test-file>

node --inspect node_modules/.bin/jest ./src/__tests__/folder.test.ts
```


[list-options]: https://github.com/Akord-com/akord-js/blob/193062c541ad06c186d5b872ecf9066d15806b43/src/types/query-options.ts#L1
[get-options]: https://github.com/Akord-com/akord-js/blob/193062c541ad06c186d5b872ecf9066d15806b43/src/types/query-options.ts#L9
[vault-get-options]: https://github.com/Akord-com/akord-js/blob/193062c541ad06c186d5b872ecf9066d15806b43/src/types/query-options.ts#L14
[file-source]: https://github.com/Akord-com/akord-js/blob/ccdfd3cd41b8e6fd38ce22cde96529273365e4f6/src/types/file.ts#L48
[storage-type]: https://github.com/Akord-com/akord-js/blob/26d1945bee727a1af45f0f9cc44c7fa9b68c5d75/src/types/node.ts#L149
[role-type]: https://github.com/Akord-com/akord-js/blob/03e28ffd95224dbfd0a8d891a06a154298619378/src/types/membership.ts#L4
[node-type]: https://github.com/Akord-com/akord-js/blob/03e28ffd95224dbfd0a8d891a06a154298619378/src/types/node.ts#L11
[batch-stack-create-response]: https://github.com/Akord-com/akord-js/blob/03e28ffd95224dbfd0a8d891a06a154298619378/src/types/batch-response.ts#L1
[batch-membership-invite-response]: https://github.com/Akord-com/akord-js/blob/03e28ffd95224dbfd0a8d891a06a154298619378/src/types/batch-response.ts#L7
[file-upload-example]: https://github.com/Akord-com/recipes/blob/a2dbc847097973ef08586f32b0ce3192f0581ed4/nextjs-starter/src/pages/index.tsx#L66

# Carmella SDK

> NOTE: docs are OUTDATED
> \
> \
> \
> .


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
  - [Membership](#membership)
- [Development](#development)
- [Deployment](#deployment)

## Usage
> requires Node.js >= 18

### Import
```js
import { Akord } from "@akord/carmella-sdk";
```
or
```js
const { Akord } = require("@akord/carmella-sdk");
```

### Quick start

#### Init Akord
```js
import { Akord, Auth } from "@akord/carmella-sdk";
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
import { PubSubPlugin } from "@akord/carmella-sdk-pubsub-plugin"
import { Akord, Auth } from "@akord/carmella-sdk-js";

const { wallet } = await Auth.signIn('your_username', 'your_password');
const akord = new Akord({ encrypter: wallet, signer: wallet, plugins: [new PubSubPlugin()] });
```

### Examples
- See example flows under [tests](src/__tests__).

- See different setups under [examples](examples).

## Authentication
Use `Auth` module to handle authentication.

```js
import { Auth } from "@akord/carmella-sdk";
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
import { Auth } from "@akord/carmella-sdk";
Auth.configure({ storage: window.sessionStorage }); // optionally - configure tokens store
```
##### use API key
```js
import { Auth } from "@akord/carmella-sdk";
Auth.configure({ apiKey: "api_key" });
```
##### use self-managed auth token
```js
import { Akord, Auth } from "@akord/carmella-sdk";
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
- returns `Promise<Vault>` - Promise with newly created vault

<details>
  <summary>example</summary>

```js
// create a private vault
const { id } = await akord.vault.create("my first private vault");

// create a public vault with terms of access
const { id } = await akord.vault.create(
  "my first public vault",
  { public: true, termsOfAccess: "terms of access here - if the vault is intended for professional or legal use, you can add terms of access and they must be digitally signed before accessing the vault" }
);

// create a public vault with description & tags for easier lookup
const { id } = await akord.vault.create("Arty podcast", {
    public: true,
    description: "A permanent podcast dedicated to art history",
    tags: ["art", "podcast", "archive"]
  });

// create a cloud storage vault 
const { id } = await akord.vault.create("Non permanent stuff", {
    cloud: true
  });
```
</details>

#### `rename(id, name)`

- `id` (`string`, required) vault id
- `name` (`string`, required) - new vault name
- returns `Promise<Vault>` - Promise with the updated vault

<details>
  <summary>example</summary>

```js
const { id, name } = await akord.vault.rename(vaultId, "updated name");
```
</details>

#### `delete(id)`

The vault will be moved to the trash. All vault data will be permanently deleted within 30 days. \
To undo this action, call vault.restore() within the 30-day period.

- `id` (`string`, required) vault id
- returns `Promise<Vault>` - Promise with the updated vault

<details>
  <summary>example</summary>

```js
const { id } = await akord.vault.delete(vaultId);
```
</details>

#### `restore(id)`

- `id` (`string`, required) vault id
- returns `Promise<Vault>` - Promise with the updated vault

<details>
  <summary>example</summary>

```js
const { id } = await akord.vault.restore(vaultId);
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
import { Akord, Auth } from "@akord/carmella-sdk";
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

#### `leave(id)`

Leave a vault

- `id` (`string`, required) membership id
- returns `Promise<Membership>` - Promise with the updated membership

<details>
  <summary>example</summary>

```js
const { id } = await akord.membership.leave(membershipId);
```
</details>

#### `revokeAccess(id)`

Revoke a membership, update also each valid membership with new rotated keys

- `id` (`string`, required) membership id
- returns `Promise<Membership>` - Promise with the updated membership

<details>
  <summary>example</summary>

```js
const { id } = await akord.membership.revokeAccess(membershipId);
```
</details>

#### `changeAccess(id, role)`

- `id` (`string`, required) membership id
- `role` ([`RoleType`][role-type], required) - VIEWER/CONTRIBUTOR/OWNER
- returns `Promise<Membership>` - Promise with the updated membership

<details>
  <summary>example</summary>

```js
const { id } = await akord.membership.changeAccess(membershipId, "CONTRIBUTOR");
```
</details>

#### `get(id, options)`

- `id` (`string`, required)
- `options` ([`GetOptions`][get-options], optional)
- returns `Promise<Membership>` - Promise with the membership object

<details>
  <summary>example</summary>

```js
const membership = await akord.membership.get(membershipId);
```
</details>

#### `listAll(id, options)`

- `id` (`string`, required) vault id
- `options` ([`ListOptions`][list-options], optional)
- returns `Promise<Array<Membership>>` - Promise with all memberships within given vault

<details>
  <summary>example</summary>

```js
const memberships = await akord.membership.listAll(vaultId);
```
</details>

#### `list(id, options)`

- `id` (`string`, required)
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

### file

File management methods

#### `upload(file, options)`

- `file` (`FileSource`, required)
- `options` (`FileUploadOptions`, optional) - cloud/permanent, private/public, vault id, parent id, etc.
- returns `Promise<File>` - Promise with the file object

<details>
  <summary>example</summary>

```js
const path = "/path/to/my/file.jpg";
const { id, blobId } = await akord.file.upload(path);
```
</details>

#### `batchUpload(items)`

- `items` (`FileSource`, required)
- returns `Promise<{ data, errors }>` - Promise with response data & errors array

<details>
  <summary>example</summary>

```js
const { data, errors } = await akord.file.batchUpload(file);
```
</details>

#### `rename(id, name)`

Rename uploaded file

- `id` (`string`, required) file id
- `name` (`string`, required) - new file name
- returns `Promise<File>` - Promise with the updated file

<details>
  <summary>example</summary>

```js
const { id, name } = await akord.file.rename(fileId, "new name for your file");
```
</details>

#### `delete(id)`

The file will be moved to the trash. The file will be permanently deleted within 30 days. \
To undo this action, call file.restore() within the 30-day period.

- `id` (`string`, required) file id
- returns `Promise<File>` - Promise with the updated file

<details>
  <summary>example</summary>

```js
const { id } = await akord.file.delete(id);
```
</details>

#### `restore(id)`

Restores the file from the trash. \
This action must be performed within 30 days of the file being moved to the trash to prevent permanent deletion.

- `id` (`string`, required) file id
- returns `Promise<File>` - Promise with the updated File

<details>
  <summary>example</summary>

```js
const { id } = await akord.file.restore(id);
```
</details>

#### `get(id, options)`

- `id` (`string`, required) file id
- `options` ([`GetOptions`][get-options], optional)
- returns `Promise<File>` - Promise with the file object

<details>
  <summary>example</summary>

```js
const file = await akord.file.get(fileId);
```
</details>

#### `download(id, options)`

Download file data. \
This method can be used for downloading the binary or previewing it in browser (use options.noSave).

- `id` (`string`, required) file id
- `options` (`FileDownloadOptions`, optional) - control download behavior
- returns `Promise<string>` - Promise with location of downloaded file

<details>
  <summary>example</summary>

```js
  // download the file in browser / on server:
  await akord.file.download(id);
    
  // preview the file in browser:
  const url = await akord.file.download(id, { skipSave: true });
  // use it: <video src={url} controls />
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
- returns `Promise<Folder>` - Promise with newly created folder

<details>
  <summary>example</summary>

```js
const { id, name } = await akord.folder.create(vaultId, "my first folder");
```
</details>

#### `upload(folder, options)`

upload folder and all its content

- `file` (`FolderSource`, required) folder path / browser folder entry
- `options` (`FolderUploadOptions`, optional) - cloud/permanent, private/public, skip hidden files flag, vault id, parent id, etc.
- returns `Promise<Folder>` - Promise with newly created folder

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
- returns `Promise<Folder>` - Promise with the updated folder

<details>
  <summary>example</summary>

```js
const { id, name } = await akord.folder.rename(folderId, "my first folder");
```
</details>

#### `move(folderId, parentId)`

Move the given folder along with its content to a different folder (parent)

- `folderId` (`string`, required)
- `parentId` (`string`, required) - new parent folder id
- returns `Promise<Folder>` - Promise with the updated folder

<details>
  <summary>example</summary>

```js
// create root folder
const rootFolderId = (await akord.folder.create(vaultId, "root folder")).folderId;
// move the folder to newly created root folder
const { id, parentId } = await akord.folder.move(folderId, rootFolderId);
```
</details>

#### `delete(id)`

The folder will be moved to the trash. All folder contents will be permanently deleted within 30 days. \
To undo this action, call folder.restore() within the 30-day period.

- `id` (`string`, required)
- returns `Promise<Folder>` - Promise with the updated folder

<details>
  <summary>example</summary>

```js
const { id } = await akord.folder.delete(folderId);
```
</details>

#### `restore(id)`

Restores the folder from the trash, recovering all folder contents. \
This action must be performed within 30 days of the folder being moved to the trash to prevent permanent deletion.

- `id` (`string`, required)
- returns `Promise<Folder>` - Promise with the updated folder

<details>
  <summary>example</summary>

```js
const { id } = await akord.folder.restore(folderId);
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

### storage

#### `get()`
- returns `Promise<Storage>` - Promise with user storage balance

<details>
  <summary>example</summary>

```js
const storage = await akord.storage.get();
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

yarn test ./src/__tests__/file.test.ts
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
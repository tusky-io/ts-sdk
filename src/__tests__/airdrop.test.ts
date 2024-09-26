// TODO: add member flow

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Akord } from "../akord";
import { cleanup, initInstance, setupVault } from "./common";

// import { NotEnoughStorage } from "../errors/not-enough-storage";
// import { Akord } from "../index";
// import { cleanup, initInstance, setupVault, testDataPath } from './common';
// import { password } from './data/test-credentials';
// import { AkordWallet } from "@akord/crypto";
// import fs from "fs";
// import { firstFileName } from "./data/content";
// import { BatchUploadItem } from "../core/batch";
// import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing airdrop actions", () => {
  let vaultId: string;
  let airdropee: Ed25519Keypair;

  beforeEach(async () => {
    akord = await initInstance();
  });

  beforeAll(async () => {
    // set up private vault
    vaultId = await setupVault(false);
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  describe("Airdrop access tests", () => {
    it("should airdrop access", async () => {

      // // generate Sui key pair for identity
      // const suiKeyPair = new Ed25519Keypair();

      // const address = suiKeyPair.toSuiAddress();

      // generate wallet for encryption
      // const wallet = await AkordWallet.create(password);

      const role = "CONTRIBUTOR";
      const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000;

      const { keypair, password } = await akord.vault.airdropAccess(vaultId, { expiresAt: expiresAt, role });
      expect(keypair).toBeTruthy();
      expect(password).toBeTruthy();

      const memberAkord = await Akord
        .withWallet({ walletSigner: keypair })
        .signIn();

      await memberAkord.withEncrypter({ password: password });

      const vault = await memberAkord.vault.get(vaultId);
      expect(vault).toBeTruthy();
      expect(vault.name).toBeTruthy();
    });
  });
});

//   describe("Airdropee upload tests", () => {
//     const storageAllowance = 1;
//     it(`should airdrop access with ${storageAllowance} MB storage allowance`, async () => {

//       airdropee = new Ed25519Keypair();

//       airdropeeWallet = await AkordWallet.create();

//       await akord.membership.airdrop(vaultId, airdropee.toSuiAddress(), {
//         expiresAt: new Date().getTime() + 24 * 60 * 60 * 1000,
//         allowedStorage: storageAllowance,
//         role: "CONTRIBUTOR",
//         publicKey: airdropeeWallet.publicKey()
//       });
//     });

//     it("should upload files to the vault by airdropee", async () => {
//       // Auth.configure({ env: process.env.ENV as any });
//       // await Auth.signInWithWallet(airdropeeWallet);
//       const airdropeeAkordInstance = new Akord({ signer: airdropeeWallet, encrypter: airdropeeWallet, env: process.env.ENV as any, debug: true, logToFile: true });

//       const fileName = "logo.png";
//       const fileBuffer = fs.readFileSync(testDataPath + fileName);

//       const items = [] as BatchUploadItem[];

//       for (let i = 0; i < 10; i++) {
//         items.push({ file: fileBuffer, options: { name: fileName } });
//       }

//       const { data, errors } = await airdropeeAkordInstance.file.batchUpload(vaultId, items);

//       expect(errors.length).toEqual(0);
//       expect(data.length).toEqual(10);
//       for (let item of data) {
//         expect(item.uri).toBeTruthy();
//       }
//     });

//     it.skip(`should fail uploading file bigger than ${storageAllowance} MB`, async () => {
//       await expect(async () => {
//         // Auth.configure({ env: process.env.ENV as any });
//         // await Auth.signInWithWallet(airdropeeWallet);
//         const airdropeeAkordInstance = new Akord({ signer: airdropeeWallet, encrypter: airdropeeWallet, env: process.env.ENV as any, debug: true, logToFile: true });

//         const type = "image/png";
//         const fileName = "screenshot.png";
//         const fileBuffer = fs.readFileSync(testDataPath + fileName);
//         await airdropeeAkordInstance.file.upload(vaultId, fileBuffer, { name: fileName, mimeType: type });
//       }).rejects.toThrow(NotEnoughStorage);
//     });
//   });

//   describe("Airdropee batch upload - stress testing", () => {
//     const batchSize = 1000;
//     it.skip(`should upload a batch of ${batchSize} files by airdropee`, async () => {
//       const batchSize = 1000;

//       const airdropee = new Ed25519Keypair();

//       const airdropeeWallet = await AkordWallet.create();

//       await akord.membership.airdrop(vaultId, airdropee.toSuiAddress(), {
//         expiresAt: new Date().getTime() + 24 * 60 * 60 * 1000,
//         allowedStorage: 100,
//         role: "CONTRIBUTOR",
//         publicKey: airdropeeWallet.publicKey()
//       });

//       const items = [] as BatchUploadItem[];

//       for (let i = 0; i < batchSize; i++) {
//         items.push({ file: testDataPath + firstFileName });
//       }

//       // Auth.configure({ env: process.env.ENV as any });
//       // await Auth.signInWithWallet(airdropeeWallet);
//       const airdropeeAkordInstance = new Akord({ signer: airdropeeWallet, encrypter: airdropeeWallet, env: process.env.ENV as any, debug: true, logToFile: true });

//       const { data, errors } = await airdropeeAkordInstance.file.batchUpload(vaultId, items);

//       expect(errors.length).toEqual(0);
//       expect(data.length).toEqual(batchSize);
//     });
//   });
// });
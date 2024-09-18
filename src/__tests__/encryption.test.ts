import faker from '@faker-js/faker';
import { Akord, AkordWallet } from '../';
import { cleanup, testDataPath } from './common';
import { promises as fs } from 'fs';
import { firstFileName } from './data/content';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

jest.setTimeout(3000000);

describe("Testing encryption functions", () => {
  afterAll(async () => {
    await cleanup();
  });

  let akord: Akord;
  let vaultId: string;
  let password: string;

  // it("should encrypt & decrypt message in the vault", async () => {
  //   const message = faker.random.words();

  //   const userKeyPair = await generateKeyPair();
  //   const vaultKeyPair = await generateKeyPair();

  //   // encrypt message to vault public key
  //   const encryptedMessage = await encryptWithPublicKey(vaultKeyPair.publicKey, message);

  //   // encrypt vault private key to user public key
  //   const encryptedVaultPrivateKey = await encryptWithPublicKey(userKeyPair.publicKey, vaultKeyPair.privateKey);

  //   // decrypt vault private key with user private key
  //   const vaultPrivateKey = await decryptWithPrivateKey(userKeyPair.privateKey, encryptedVaultPrivateKey);

  //   // decrypt message with vault private key
  //   const decryptedMessage = await decryptWithPrivateKey(vaultPrivateKey, encryptedMessage);

  //   expect(message).toEqual(new TextDecoder().decode(decryptedMessage));
  // });

  // it("should encrypt & decrypt message in the vault", async () => {
  //   const message = faker.random.words();

  //   const userKeyPair = await generateKeyPair();
  //   const vaultKeyPair = await generateKeyPair();

  //   const userEncrypter = new Encrypter({ keypair: userKeyPair });
  //   const vaultEncrypter = new Encrypter({ keypair: vaultKeyPair });

  //   // encrypt message to vault public key
  //   const encryptedMessage = await vaultEncrypter.encrypt(message);

  //   // encrypt vault private key to user public key
  //   const encryptedVaultPrivateKey = await userEncrypter.encrypt(vaultKeyPair.privateKey)

  //   // decrypt vault private key with user private key
  //   const vaultPrivateKey = await userEncrypter.decrypt(encryptedVaultPrivateKey);

  //   // decrypt message with vault private key
  //   const decryptedMessage = await vaultEncrypter.decrypt(encryptedMessage);

  //   expect(message).toEqual(arrayToString(decryptedMessage));
  // });

  it("should set user encryption context", async () => {
    const keypair = new Ed25519Keypair();
    akord = Akord
      .withWallet({ walletSigner: keypair })
      .withLogger({ logLevel: "debug", logToFile: true })
      .withApi({ env: process.env.ENV as any })

    await akord.signIn();

    password = faker.random.word();

    const userWallet = await AkordWallet.create(password);

    await akord.me.update({ encPrivateKey: userWallet.encBackupPhrase as any });
  });

  it("should set user encryption context", async () => {
    await akord.withEncrypter({ password: password });
  });

  it("should create a private vault", async () => {
    const name = faker.random.words();

    const vault = await akord.vault.create(name, { public: false });

    vaultId = vault.id;

    const object = await akord.vault.get(vault.id);
    console.log(object);
  });

  // it("should create a private folder", async () => {
  //   const folderName = faker.random.words();
  //   const folder = await akord.folder.create(vaultId, folderName);
  //   console.log(folder)
  // });

  it("should upload a private file", async () => {
    const id = await akord.file.upload(vaultId, testDataPath + firstFileName);
    const file = await akord.file.get(id);
    console.log(file)
    const type = "image/png";
    console.log(file)
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);

    const response = await akord.file.download(file.id, { responseType: 'arraybuffer' });

    const buffer = await fs.readFile(testDataPath + firstFileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    
    expect(response).toEqual(arrayBuffer);
  });
});
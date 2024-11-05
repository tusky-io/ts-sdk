import faker from '@faker-js/faker';
import { Akord } from '../';
import { cleanup, ENV_TEST_RUN, LOG_LEVEL, testDataPath } from './common';
import { promises as fs } from 'fs';
import { firstFileName } from './data/content';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { status } from '../constants';

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
      .withLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .withApi({ env: ENV_TEST_RUN })

    await akord.signIn();

    password = faker.random.word();

    await akord.me.setupPassword(password);
  });

  it("should set user encryption context from password & persist encryption session with keystore", async () => {
    await akord.withEncrypter({ password: password, keystore: true });
  });

  it("should retrieve user context from session", async () => {
    akord = new Akord({ authType: "Wallet", env: ENV_TEST_RUN, logLevel: LOG_LEVEL });
    await akord.withEncrypter({ keystore: true });
  });

  it("should create a private vault", async () => {
    const name = faker.random.words();
    const vault = await akord.vault.create(name, { public: false });
    expect(vault.id).toBeTruthy();
    expect(vault.name).toEqual(name);
    expect(vault.status).toEqual(status.ACTIVE);
    expect(vault.public).toEqual(false);
    vaultId = vault.id;
  });

  it("should create a private folder", async () => {
    const folderName = faker.random.words();
    const folder = await akord.folder.create(vaultId, folderName);
    expect(folder.id).toBeTruthy();
    expect(folder.vaultId).toEqual(vaultId);
    expect(folder.parentId).toEqual(vaultId);
    expect(folder.status).toEqual(status.ACTIVE);
    expect(folder.name).toEqual(folderName);
  });

  it("should upload single-chunk encrypted file", async () => {
    const id = await akord.file.upload(vaultId, testDataPath + firstFileName);
    const type = "image/png";
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);

    const response = await akord.file.arrayBuffer(file.id);
    const buffer = await fs.readFile(testDataPath + firstFileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    expect(response).toEqual(arrayBuffer);
  });

  it("should upload multi-chunk encrypted file", async () => {
    const fileName = "11mb.png";
    const id = await akord.file.upload(vaultId, testDataPath + fileName);

    const type = "image/png";
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(fileName);
    expect(file.mimeType).toEqual(type);

    const response = await akord.file.arrayBuffer(file.id);

    const buffer = await fs.readFile(testDataPath + firstFileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    expect(response).toEqual(arrayBuffer);
  });
});

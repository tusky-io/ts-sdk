import faker from '@faker-js/faker';
import { mockEnokiFlow } from './auth';
import EnokiSigner from './enoki/signer';
import { Akord, AkordWallet, Encrypter } from '../';
import { cleanup, testDataPath } from './common';
import { createFileLike } from '../types/file';
import { firstFileName } from './data/content';
import { KeyPair } from 'libsodium-wrappers';
import { keyInSelect } from 'readline-sync';

function getAuthProvider() {
  const options = ['Google', 'Twitch', 'Facebook'];
  const index = keyInSelect(options, 'Please choose your auth provider:');
  return options[index];
}

jest.setTimeout(3000000);

describe("Testing encryption functions", () => {
  afterAll(async () => {
    await cleanup();
  });

  let akord: Akord;
  let userKeyPair: KeyPair;
  let vaultId: string;
  let authToken: string;
  let signer: EnokiSigner;

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
    const userWallet = await AkordWallet.create("passakordpass");
    console.log(userWallet)
    const userKeyPair = userWallet.encryptionKeyPair;
    const authProvider = getAuthProvider();
    const { jwt, address, keyPair } = await mockEnokiFlow(authProvider);
    authToken = jwt;
    const signer = new EnokiSigner({ address: address, keypair: keyPair });
    akord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider: async () => jwt, signer: signer });

    console.log(userWallet.encBackupPhrase)
    await akord.me.update({ encPrivateKey: userWallet.encBackupPhrase as any });
  });

  it("should retrieve user encryption context", async () => {
    const user = await akord.me.get();
    console.log(user)
    userKeyPair = (await AkordWallet.importFromEncBackupPhrase("passakordpass", user.encPrivateKey as string)).encryptionKeyPair;
  });

  it("should create a private vault", async () => {
    const name = faker.random.words();
    console.log(userKeyPair)
    const encrypter = new Encrypter({ keypair: userKeyPair });

    akord = new Akord({ encrypter: encrypter, debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider: async () => authToken, signer: signer });

    const vault = await akord.vault.create(name, { public: false });

    vaultId = vault.id;

    const object = await akord.vault.get(vault.id);
    console.log(object);
  });

  it("should create a private folder", async () => {
    const folderName = faker.random.words();
    const folder = await akord.folder.create(vaultId, folderName);
    console.log(folder)
  });

  it("should upload a private file", async () => {
    const file = await akord.file.upload(vaultId, testDataPath + firstFileName);
    console.log(file)
    const type = "image/png";
    console.log(file)
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);

    const response = await akord.file.download(file.id);
    console.log(response)
    const filelike = await createFileLike(testDataPath + firstFileName);
    expect(response).toEqual(await filelike.arrayBuffer());
  });
});
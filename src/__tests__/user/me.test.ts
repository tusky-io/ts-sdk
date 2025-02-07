import faker from '@faker-js/faker';
import { Tusky } from "../../index";
import { cleanup, initInstance, vaultCreate } from '../common';

let tusky: Tusky;

describe("Testing me functions", () => {

  beforeAll(async () => {
    tusky = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should get me", async () => {
    const user = await tusky.me.get();
    expect(user).toBeTruthy();
    expect(user.address).toBeTruthy();
  });

  it("should update me", async () => {
    const name = faker.random.words();
    const user = await tusky.me.update({ name: name });
    expect(user).toBeTruthy();
    expect(user.address).toBeTruthy();
    expect(user.name).toEqual(name);
  });
});

describe("Testing user encryption keys backup", () => {

  let password: string;
  let backupPhrase: string;

  beforeAll(async () => {
    tusky = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should check for the user encryption session - falsy", async () => {
    const hasEncryptionSession = await tusky.me.hasEncryptionSession();
    expect(hasEncryptionSession).toBeFalsy();
  });

  it("should setup password", async () => {
    password = faker.random.word();
    const { user } = await tusky.me.setupPassword(password);
    expect(user).toBeTruthy();
    expect(user.publicKey).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
  });

  it("should change password", async () => {
    const newPassword = faker.random.word();
    const user = await tusky.me.changePassword(password, newPassword);
    expect(user).toBeTruthy();
    expect(user.publicKey).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
    password = newPassword;
  });

  it("should backup password", async () => {
    const { backupPhrase: backup, user } = await tusky.me.backupPassword(password);
    expect(backup).toBeTruthy();
    expect(user.publicKey).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
    expect(user.encPrivateKeyBackup).toBeTruthy();
    console.log("User backup phrase: " + backup);
    backupPhrase = backup;
  });

  it("should reset password", async () => {
    const resetPassword = faker.random.word();
    const user = await tusky.me.resetPassword(backupPhrase, resetPassword);
    expect(user).toBeTruthy();
    expect(user.publicKey).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
    expect(user.encPrivateKeyBackup).toBeTruthy();
    // configure the encrypter
    await tusky.addEncrypter({ password: resetPassword });
  });

  it("should check for the user encryption session - truthy", async () => {
    const hasEncryptionSession = await tusky.me.hasEncryptionSession();
    expect(hasEncryptionSession).toBeTruthy();
  });

  it("should create private vault & reset keys", async () => {
    const privateVault = await vaultCreate(tusky, true);
    const publicVault = await vaultCreate(tusky, false);
    const userVaults = await tusky.vault.listAll();
    expect(userVaults).toBeTruthy();
    expect(userVaults.length).toEqual(2);
    expect(userVaults[0]).toBeTruthy();
    expect(userVaults[1]).toBeTruthy();
    expect([userVaults[0].name, userVaults[1].name]).toContain(privateVault.name);
    expect([userVaults[0].name, userVaults[1].name]).toContain(publicVault.name);
    await tusky.me.resetEncryptionKeys();
    const me = await tusky.me.get();
    expect(me.publicKey).toBeFalsy();
    expect(me.encPrivateKey).toBeFalsy();
    expect(me.encPrivateKeyBackup).toBeFalsy();

    const userVaultsAfterReset = await tusky.vault.listAll();
    expect(userVaultsAfterReset.length).toEqual(1);
    expect(userVaultsAfterReset[0]).toBeTruthy();
    expect(userVaultsAfterReset[0].name).toEqual(publicVault.name);

    const newPassword = faker.random.word();
    await tusky.me.setupPassword(newPassword);
    const newPrivateVault = await vaultCreate(tusky, true);
    const userVaultsAfterNewPassword = await tusky.vault.listAll();
    expect(userVaultsAfterNewPassword.length).toEqual(2);
    expect(userVaultsAfterNewPassword[0]).toBeTruthy();
    expect(userVaultsAfterNewPassword[1]).toBeTruthy();
    expect([userVaultsAfterNewPassword[0].name, userVaultsAfterNewPassword[1].name]).toContain(newPrivateVault.name);
    expect([userVaultsAfterNewPassword[0].name, userVaultsAfterNewPassword[1].name]).toContain(publicVault.name);
  });
});
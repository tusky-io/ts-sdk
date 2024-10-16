import faker from '@faker-js/faker';
import { UserEncryption } from '../crypto/user-encryption';
import { ConsoleLogger, setLogger } from '../logger';

jest.setTimeout(3000000);

setLogger(new ConsoleLogger({ logLevel: "debug" }));

describe("Testing account recovery functions", () => {
  afterAll(async () => {
  });

  let password: string;
  let encPrivateKey: string;
  let encPrivateKeyBackup: string;
  let backupPhrase: string;

  it("should generate user key pair & encrypt it with password", async () => {

    password = faker.random.word();

    const userEncryption = new UserEncryption();
    const { encPrivateKey: encryptedPrivateKey } = await userEncryption.setupPassword(password, true);
    encPrivateKey = encryptedPrivateKey;
  });

  it("should change password", async () => {
    const newPassword = faker.random.word();

    const userEncryption = new UserEncryption({ encPrivateKey: encPrivateKey });
    const { encPrivateKey: encryptedPrivateKey } = await userEncryption.changePassword(password, newPassword, true);

    password = newPassword;
    encPrivateKey = encryptedPrivateKey;
  });

  it("should backup user private key", async () => {
    const userEncryption = new UserEncryption({ encPrivateKey: encPrivateKey });
    const { backupPhrase: backup, encPrivateKeyBackup: encryptedPrivateKeyBackup } = await userEncryption.backupPassword(password);
    encPrivateKeyBackup = encryptedPrivateKeyBackup;
    backupPhrase = backup;
  });

  it("should reset password by using the backup phrase", async () => {
    const userEncryption = new UserEncryption({ encPrivateKeyBackup: encPrivateKeyBackup });
    const { encPrivateKey: encryptedPrivateKey } = await userEncryption.resetPassword(backupPhrase, password, true);
    encPrivateKey = encryptedPrivateKey;
  });

  it("should retrieve user private key from keystore", async () => {
    const userEncryption = new UserEncryption({ encPrivateKey: encPrivateKey });
    const { keyPair } = await userEncryption.importFromKeystore();
    expect(keyPair).toBeTruthy();
    expect(keyPair.getPrivateKey()).toBeTruthy();
    expect(keyPair.getPublicKey()).toBeTruthy();
  });

  it("should retrieve user private key from password", async () => {
    const userEncryption = new UserEncryption({ encPrivateKey: encPrivateKey });
    const { keyPair } = await userEncryption.importFromPassword(password);
    expect(keyPair).toBeTruthy();
    expect(keyPair.getPrivateKey()).toBeTruthy();
    expect(keyPair.getPublicKey()).toBeTruthy();
  });

  it("should retrieve user private key from backup", async () => {
    const userEncryption = new UserEncryption({ encPrivateKeyBackup: encPrivateKeyBackup });
    const { keyPair } = await userEncryption.importFromBackupPhrase(backupPhrase);
    expect(keyPair).toBeTruthy();
    expect(keyPair.getPrivateKey()).toBeTruthy();
    expect(keyPair.getPublicKey()).toBeTruthy();
  });
});
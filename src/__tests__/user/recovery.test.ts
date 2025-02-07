import faker from '@faker-js/faker';
import { UserEncryption } from '../../crypto/user-encryption';
import { ConsoleLogger, setLogger } from '../../logger';
import { LOG_LEVEL } from '../common';
import { defaultStorage } from '../../auth/jwt';

setLogger(new ConsoleLogger({ logLevel: LOG_LEVEL }));

const storage = defaultStorage();

describe("Testing account recovery functions", () => {
  afterAll(async () => {
  });

  let password: string;
  let encPrivateKey: string;
  let encPrivateKeyBackup: string;
  let backupPhrase: string;

  it("should generate user key pair & encrypt it with password", async () => {

    password = faker.random.word();

    const userEncryption = new UserEncryption({ storage: storage });
    const { encPrivateKey: encryptedPrivateKey } = await userEncryption.setupPassword(password, true);
    encPrivateKey = encryptedPrivateKey;
  });

  it("should change password", async () => {
    const newPassword = faker.random.word();

    const userEncryption = new UserEncryption({ storage: storage, encPrivateKey: encPrivateKey });
    const { encPrivateKey: encryptedPrivateKey } = await userEncryption.changePassword(password, newPassword, true);

    password = newPassword;
    encPrivateKey = encryptedPrivateKey;
  });

  it("should backup user private key", async () => {
    const userEncryption = new UserEncryption({ storage: storage, encPrivateKey: encPrivateKey });
    const { backupPhrase: backup, encPrivateKeyBackup: encryptedPrivateKeyBackup } = await userEncryption.backupPassword(password);
    encPrivateKeyBackup = encryptedPrivateKeyBackup;
    backupPhrase = backup;
  });

  it("should reset password by using the backup phrase", async () => {
    const userEncryption = new UserEncryption({ storage: storage, encPrivateKeyBackup: encPrivateKeyBackup });
    const { encPrivateKey: encryptedPrivateKey } = await userEncryption.resetPassword(backupPhrase, password, true);
    encPrivateKey = encryptedPrivateKey;
  });

  it("should retrieve user private key from keystore", async () => {
    const userEncryption = new UserEncryption({ storage: storage, encPrivateKey: encPrivateKey });
    const { keypair } = await userEncryption.importFromKeystore();
    expect(keypair).toBeTruthy();
    expect(keypair.getPrivateKey()).toBeTruthy();
    expect(keypair.getPublicKey()).toBeTruthy();
  });

  it("should retrieve user private key from password", async () => {
    const userEncryption = new UserEncryption({ storage: storage, encPrivateKey: encPrivateKey });
    const { keypair } = await userEncryption.importFromPassword(password);
    expect(keypair).toBeTruthy();
    expect(keypair.getPrivateKey()).toBeTruthy();
    expect(keypair.getPublicKey()).toBeTruthy();
  });

  it("should retrieve user private key from backup", async () => {
    const userEncryption = new UserEncryption({ storage: storage, encPrivateKeyBackup: encPrivateKeyBackup });
    const { keypair } = await userEncryption.importFromBackupPhrase(backupPhrase);
    expect(keypair).toBeTruthy();
    expect(keypair.getPrivateKey()).toBeTruthy();
    expect(keypair.getPublicKey()).toBeTruthy();
  });
});
import faker from '@faker-js/faker';
import { Akord } from "../../index";
import { cleanup, initInstance } from '../common';

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing me functions", () => {

  let password: string;
  let backupPhrase: string;

  beforeAll(async () => {
    akord = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(akord);
  });

  it("should get me", async () => {
    const user = await akord.me.get();
    expect(user).toBeTruthy();
    expect(user.address).toBeTruthy();
  });

  it("should update me", async () => {
    const name = faker.random.words();
    const user = await akord.me.update({ name: name, termsAccepted: true });
    expect(user).toBeTruthy();
    expect(user.address).toBeTruthy();
    expect(user.name).toEqual(name);
    expect(user.termsAccepted).toEqual(true);
  });

  it("should setup password", async () => {
    password = faker.random.word();
    const user = await akord.me.setupPassword(password);
    expect(user).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
  });

  it("should change password", async () => {
    const newPassword = faker.random.word();
    const user = await akord.me.changePassword(password, newPassword);
    expect(user).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
    password = newPassword;
  });

  it("should backup password", async () => {
    const { backupPhrase: backup } = await akord.me.backupPassword(password);
    expect(backup).toBeTruthy();
    console.log("User backup phrase: " + backup);
    backupPhrase = backup;
  });

  it("should reset password", async () => {
    const resetPassword = faker.random.word();
    const user = await akord.me.resetPassword(backupPhrase, resetPassword);
    expect(user).toBeTruthy();
    expect(user.encPrivateKey).toBeTruthy();
  });
});
import { Akord } from "../../index";
import faker from '@faker-js/faker';
import { cleanup, initInstance, isEncrypted, vaultCreate } from '../common';
import { status } from "../../constants";
import { BadRequest } from "../../errors/bad-request";

let akord: Akord;

describe(`Testing ${isEncrypted ? "private" : "public"} vault functions`, () => {
  let vaultId: string;
  let anotherVaultId: string;

  beforeAll(async () => {
    akord = await initInstance(isEncrypted);

    const vault = await vaultCreate(akord, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  it(`should create another ${isEncrypted ? "private" : "public"} vault`, async () => {
    anotherVaultId = (await vaultCreate(akord, isEncrypted)).id;
  });

  it("should list user vaults", async () => {

    const vaults = await akord.vault.listAll();

    expect(vaults).toBeTruthy();
    expect(vaults[0]).toBeTruthy();
  });

  it("should rename the vault", async () => {
    const name = faker.random.words();

    await akord.vault.rename(vaultId, name);

    const vault = await akord.vault.get(vaultId);
    expect(vault.status).toEqual(status.ACTIVE);
    expect(vault.name).toEqual(name);
  });

  it("should delete the vault", async () => {
    await akord.vault.delete(anotherVaultId);
  });

  it("should fail renaming the deleted vault", async () => {
    const name = faker.random.words();
    await expect(async () =>
      await akord.vault.rename(anotherVaultId, name)
    ).rejects.toThrow(BadRequest);
  });

  it("should create vault with tags", async () => {
    const name = faker.random.words();

    const tag1 = faker.random.word();
    const tag2 = faker.random.word();
    const vault = await akord.vault.create(name, { public: true, tags: [tag1, tag2] });

    expect(vault.tags).toBeTruthy();
    expect(vault.tags?.length).toEqual(2);
    expect(vault.tags).toContain(tag1);
    expect(vault.tags).toContain(tag2);
  });
});
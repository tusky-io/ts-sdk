import { Tusky } from "../../index";
import faker from '@faker-js/faker';
import { cleanup, initInstance, isEncrypted, vaultCreate } from '../common';
import { status } from "../../constants";
import { BadRequest } from "../../errors/bad-request";

let tusky: Tusky;

describe(`Testing ${isEncrypted ? "private" : "public"} vault functions`, () => {
  let vaultId: string;
  let anotherVaultId: string;
  let publicVaultId: string;

  beforeAll(async () => {
    tusky = await initInstance(isEncrypted);

    const vault = await vaultCreate(tusky, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(tusky, vaultId);
  });

  it(`should create another ${isEncrypted ? "private" : "public"} vault`, async () => {
    anotherVaultId = (await vaultCreate(tusky, isEncrypted)).id;
  });

  it("should list user vaults", async () => {

    const vaults = await tusky.vault.listAll();

    expect(vaults).toBeTruthy();
    expect(vaults[0]).toBeTruthy();
  });

  it("should rename the vault", async () => {
    const name = faker.random.words();

    await tusky.vault.rename(vaultId, name);

    const vault = await tusky.vault.get(vaultId);
    expect(vault.status).toEqual(status.ACTIVE);
    expect(vault.name).toEqual(name);
  });

  it("should delete the vault", async () => {
    await tusky.vault.delete(anotherVaultId);
  });

  it("should fail renaming the deleted vault", async () => {
    const name = faker.random.words();
    await expect(async () =>
      await tusky.vault.rename(anotherVaultId, name)
    ).rejects.toThrow(BadRequest);
  });

  it("should create vault with tags", async () => {
    const name = faker.random.words();

    const tag1 = faker.random.word();
    const tag2 = faker.random.word();
    const vault = await tusky.vault.create(name, { encrypted: false, tags: [tag1, tag2] });

    expect(vault.tags).toBeTruthy();
    expect(vault.tags?.length).toEqual(2);
    expect(vault.tags).toContain(tag1);
    expect(vault.tags).toContain(tag2);

    publicVaultId = vault.id;
  });

  it("should update vault metadata", async () => {
    const description = faker.random.words();

    const tag1 = faker.random.word();
    const tag2 = faker.random.word();
    const vault = await tusky.vault.update(publicVaultId, { description: description, tags: [tag1, tag2] });

    expect(vault.description).toEqual(description);
    expect(vault.tags).toBeTruthy();
    expect(vault.tags?.length).toEqual(2);
    expect(vault.tags).toContain(tag1);
    expect(vault.tags).toContain(tag2);
  });
});
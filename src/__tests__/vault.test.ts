import { Akord } from "../index";
import faker from '@faker-js/faker';
import { cleanup, initInstance, setupVault } from './common';
import { BadRequest } from "../errors/bad-request";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing vault functions", () => {
  let vaultId: string;
  let vaultTag1: string;
  let vaultTag2: string;

  beforeEach(async () => {
    akord = await initInstance();
  });

  beforeAll(async () => {
    vaultId = await setupVault();
  });

  afterAll(async () => {
    await cleanup(vaultId);
  });

  it("should rename the vault", async () => {
    const name = faker.random.words();

    await akord.vault.rename(vaultId, name);

    const vault = await akord.vault.get(vaultId);
    expect(vault.status).toEqual("ACTIVE");
    expect(vault.name).toEqual(name);
  });

  it("should update the vault metadata", async () => {
    const name = faker.random.words();
    const description = faker.lorem.paragraph();
    const tag1 = faker.random.word();
    const tag2 = faker.random.word();

    await akord.vault.update(vaultId, {
      name: name,
      description: description,
      tags: [tag1, tag2]
    });

    const vault = await akord.vault.get(vaultId);
    expect(vault.name).toEqual(name);
    expect(vault.description).toEqual(description);
    expect(vault.tags?.length).toEqual(2);
  });

  it("should archive the vault", async () => {
    await akord.vault.archive(vaultId);

    const vault = await akord.vault.get(vaultId);
    expect(vault.status).toEqual("ARCHIVED");
  });

  it("should fail renaming the archived vault", async () => {
    const name = faker.random.words();
    await expect(async () =>
      await akord.vault.rename(vaultId, name)
    ).rejects.toThrow(BadRequest);
  });

  it("should restore the vault", async () => {
    await akord.vault.restore(vaultId);

    const vault = await akord.vault.get(vaultId);
    expect(vault.status).toEqual("ACTIVE");
  });
});
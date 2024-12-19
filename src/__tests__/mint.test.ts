import { faker } from "@faker-js/faker";
import { Tusky } from "../index";
import { initInstance, cleanup, testDataPath } from './common';
import { firstFileName } from "./data/content";
let tusky: Tusky;

describe(`Testing minting functions`, () => {
  let vaultId: string;

  beforeAll(async () => {
    tusky = await initInstance(false);
    const { id } = await tusky.vault.create(faker.random.words(), { encrypted: false });
    vaultId = id;
  });

  afterAll(async () => {
    await cleanup(tusky, vaultId);
  });

  it("should mint NFT from file", async () => {
    const fileId = await tusky.file.upload(vaultId, testDataPath + firstFileName);

    const { id } = await tusky.nft.mint({
      recipient: "0x17bb4b18b04b48fb9a57d1ee774ec2d6bad212c48b5264780e5eb65bb81c560b",
      name: "Pixels #1",
      fileId: fileId,
      description: "Pixel art",
      link: "External link to the asset",
      projectUrl: "Project website",
      creator: "Pixel guy",
      thumbnailUrl: "https://placehold.co/500x500/567582/567582",
    });
    expect(id).toBeTruthy();
    const nft = await tusky.nft.get(id);
    expect(nft).toBeTruthy();
  });

  it("should mint NFT collection from folder", async () => {
    const { id: folderId } = await tusky.folder.create(vaultId, faker.random.words());
    for (let i = 0; i < 10; i++) {
      await tusky.file.upload(vaultId, testDataPath + firstFileName, { parentId: folderId, name: ("Pixels #" + (i + 1)) });
    }
    const { id } = await tusky.nft.mintCollection({
      folderId: folderId,
      recipient: "0x5d67aa6550635be7a0cc12bf7bfc0ccf54f3fe00afd1ffde5697bad34d159dfe",
      description: "Collection of pixel art",
      link: "External link to the asset",
      projectUrl: "Project website",
      creator: "Pixel guy",
    });
    expect(id).toBeTruthy();
    const collection = await tusky.nft.getCollection(id);
    expect(collection).toBeTruthy();
  });

  it("should query user nfts", async () => {
    const nfts = await tusky.nft.listAll();
    expect(nfts).toBeTruthy();
    expect(nfts.length).toEqual(11);
  });

  it("should query user nfts by collection", async () => {
    const collections = await tusky.nft.listAllCollections();
    expect(collections).toBeTruthy();
    expect(collections.length).toEqual(1);
    const collectionNfts = await tusky.nft.listAll({ parentId: collections[0].id });
    expect(collectionNfts).toBeTruthy();
    expect(collectionNfts.length).toEqual(10);
  });
});
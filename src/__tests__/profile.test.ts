import { Akord } from "../index";
import faker from '@faker-js/faker';
import { initInstance, testDataPath } from './common';
import { firstFileName } from "./data/content";
import { createFileLike } from "../core/file";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing profile functions", () => {
  beforeAll(async () => {
    akord = await initInstance();
  });

  it("should get the profile", async () => {
    const profileDetails = await akord.profile.get();
    expect(profileDetails).toBeTruthy();
  });

  // it("should update the profile", async () => {
  //   const name = faker.random.words();

  //   const file = await createFileLike(testDataPath + firstFileName);
  //   const fileBuffer = await file.arrayBuffer();
  //   await akord.profile.update(name, fileBuffer);

  //   const profileDetails = await akord.profile.get();
  //   expect(profileDetails.name).toEqual(name);
  //   expect(profileDetails.avatar).toEqual(fileBuffer);
  // });
});
import faker from '@faker-js/faker';
import { Akord } from "../index";
import { initInstance } from './common';

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing me functions", () => {

  beforeAll(async () => {
    akord = await initInstance();
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
});
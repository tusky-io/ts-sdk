import { Akord } from "../index";
import { initInstance, testDataPath } from './common';
import { firstFileName } from './data/content';
let akord: Akord;

jest.setTimeout(3000000);

describe("Testing file & folder upload functions", () => {

  let fileId: string;
  let fileUri: string;

  beforeEach(async () => {
    akord = await initInstance();
  });

  it("should upload file from path", async () => {
    const { uri, fileId: responseFileId } = await akord.file.upload(testDataPath + firstFileName, { cloud: true });
    fileId = responseFileId;
    fileUri = uri;
  });

  it("should download file from uri", async () => {
    const response = await akord.file.download(fileUri);
    console.log(response);
  });

  it("should list all user files", async () => {
    const data = await akord.file.list();
  });

  it("should upload folder contents from path", async () => {
    const appDirName = "simple-app"
    const { uri } = await akord.folder.upload(testDataPath + appDirName, { cloud: true });
    console.log(uri)
  });

  const batchSize = 10;
  it(`should upload a batch of ${batchSize} files`, async () => {
    const fileName = "logo.png"

    const items = [] as any;
    for (let i = 0; i < batchSize; i++) {
      items.push({ file: testDataPath + fileName, options: { cloud: true } });
    }

    const { data, errors } = await akord.file.batchUpload(items);

    expect(errors.length).toEqual(0);
    expect(data.length).toEqual(batchSize);
  });
});
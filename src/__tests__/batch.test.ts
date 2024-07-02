// import { Akord } from "../index";
// import { initInstance, folderCreate, testDataPath, setupVault, cleanup } from './common';
// import { email2, email3 } from './data/test-credentials';
// import { firstFileName } from "./data/content";
// import { createFileLike } from "../core/file";
// import { StackCreateItem } from "../core/batch";
// import { EMPTY_FILE_ERROR_MESSAGE } from "../core/stack";

// let akord: Akord;

// jest.setTimeout(3000000);

// describe("Testing batch actions", () => {
//   let vaultId: string;
//   let folderId: string;
//   let noteId: string;
//   let viewerId: string;
//   let contributorId: string;
//   let stackIds: string[];

//   beforeEach(async () => {
//     akord = await initInstance();
//   });

//   beforeAll(async () => {
//     vaultId = await setupVault();
//   });

//   afterAll(async () => {
//     await cleanup(vaultId);
//   });

//   describe("Batch upload", () => {
//     const batchSize = 10;
//     it(`should upload a batch of ${batchSize} files`, async () => {
//       const file = await createFileLike(testDataPath + firstFileName);

//       const items = [] as StackCreateItem[];

//       for (let i = 0; i < batchSize; i++) {
//         if (i % 2 === 0) {
//           items.push({ file });
//         } else {
//           items.push({ file, options: { name: "override-name.png" } });
//         }
//       }

//       const { data, errors } = await akord.batch.stackCreate(vaultId, items);

//       expect(errors.length).toEqual(0);
//       expect(data.length).toEqual(batchSize);
//       stackIds = data.map((item) => item.stackId);
//       let nameCount = 0;
//       for (let index in items) {
//         const stack = await akord.stack.get(data[index].stackId);
//         expect(stack.status).toEqual("ACTIVE");
//         expect(stack.name).toEqual(data[index].object.name);
//         expect(stack.versions.length).toEqual(1);
//         expect([firstFileName, "override-name.png"]).toContain(stack.versions[0].name);
//         if (stack.versions[0].name === firstFileName) {
//           nameCount++;
//         }
//       }
//       expect(nameCount).toEqual(batchSize / 2);
//     });

//     it("should revoke the previously uploaded batch", async () => {
//       await akord.batch.revoke(stackIds.map(stackId => ({ id: stackId, type: "Stack" })));
//     });

//     it(`should try to upload 2 files (the empty one should be skipped)`, async () => {
//       const { data, errors } = await akord.batch.stackCreate(vaultId, [
//         { file: await createFileLike(testDataPath + firstFileName) },
//         { file: testDataPath + "empty-file.md" }
//       ]);

//       expect(errors.length).toEqual(1);
//       expect(errors[0].message).toEqual(EMPTY_FILE_ERROR_MESSAGE);
//       expect(data.length).toEqual(1);
//     });
//   });

//   describe("Batch upload - stress testing", () => {
//     const batchSize = 1000;
//     let folderId: string;
//     it(`should create a root folder`, async () => {
//       folderId = await folderCreate(akord, vaultId);
//     });

//     it(`should upload a batch of ${batchSize} files to the folder`, async () => {
//       const fileName = "logo.png"
//       const file = await createFileLike(testDataPath + fileName);

//       const items = [] as StackCreateItem[];

//       for (let i = 0; i < batchSize; i++) {
//         items.push({ file, options: { parentId: folderId } });
//       }

//       const { data, errors } = await akord.batch.stackCreate(vaultId, items);

//       expect(errors.length).toEqual(0);
//       expect(data.length).toEqual(batchSize);
//     });

//     it(`should list ${batchSize} files in the folder`, async () => {
//       const stacksInFolder = await akord.stack.listAll(vaultId, { parentId: folderId });
//       expect(stacksInFolder?.length).toEqual(batchSize);
//     });
//   });
// });
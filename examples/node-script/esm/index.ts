import { Tusky } from "@tusky-io/ts-sdk";

const main = async () => {
  if (!process.env.TUSKY_API_KEY) {
    throw new Error('TUSKY_API_KEY is not set. Run it like this: TUSKY_API_KEY=your-api-key npm run start');
  }
  const tusky = new Tusky({ apiKey: process.env.TUSKY_API_KEY });
  
  const vault = await tusky.vault.create('test', {
    description: 'test',
    encrypted: false,
  });
  console.log(vault);

  const uploadId = await tusky.file.upload(vault.id, new Blob(['test']), {
    name: 'test.txt',
    mimeType: 'text/plain',
  });
  console.log(uploadId);

  const fileBuffer = await tusky.file.arrayBuffer(uploadId);
  console.log(fileBuffer);
  
  const file = await tusky.file.get(uploadId);
  console.log(file);
}


main().catch(console.error);

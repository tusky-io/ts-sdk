const fs = require('fs');
const axios = require('axios');
const mime = require('mime-types');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';
const TEST_FILE_PATH = './__tests__/pixels-small.png';

async function uploadFileBuffer(filePath) {
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const mimeType = mime.lookup(filename) || 'application/octet-stream';

  const res = await axios.post(`${SERVER_URL}/files`, buffer, {
    headers: {

      'Content-Type': mimeType,
      'Content-Length': buffer.length,
      'File-Name': filename,
    },
  });
  console.log('Uploaded buffer length:', buffer.length);
  return res.data;
}

async function downloadFileBuffer(fileId) {
  const res = await axios.get(`${SERVER_URL}/files/${fileId}`, {
    responseType: 'arraybuffer',
  });

  const buffer = Buffer.from(res.data);
  console.log('Downloaded buffer length:', buffer.length);
  return buffer.length;
}

async function run() {
  try {
    const { id } = await uploadFileBuffer(TEST_FILE_PATH);
    await downloadFileBuffer(id);
  } catch (error) {
    console.log(error);
  }
}

run();
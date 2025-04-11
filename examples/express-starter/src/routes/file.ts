import { Router, raw } from 'express';
import { tusky, vaultId } from '..';
const router = Router();

router.use('/', raw({ type: '*/*', limit: '10mb' }));

router.post('/', async (req, res) => {
  try {
    const fileName = req.headers['file-name'] as string;
    const contentType = req.headers['content-type'] as string;

    if (!fileName || !req.body) {
      return res.status(400).json({ error: 'Please provide file buffer & file name header.' });
    }
    const uploadId = await tusky.file.upload(vaultId, req.body, { name: fileName, mimeType: contentType });
    res.status(201).json({ id: uploadId });
  } catch (error) {
    console.error('Error processing input:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    console.log(req.params)
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Please provide file id in query params.' });
    }
    const fileMetadata = await tusky.file.get(id);

    // to stream file, do:
    // const fileStream = await tusky.file.stream(id);
    const fileBuffer = await tusky.file.arrayBuffer(id);

    const buffer = Buffer.from(fileBuffer);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.name}"`);

    res.send(buffer);
  } catch (error) {
    console.error('Error processing input:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


export default router;
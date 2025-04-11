import express from 'express';
import healthRouter from './routes/health';
import fileRouter from './routes/file';
import { Tusky } from '@tusky-io/ts-sdk';
require('dotenv').config();

export let tusky: Tusky;
export let vaultId: string;

async function initTusky() {
  try {
    tusky = await Tusky.init({ apiKey: process.env.TUSKY_API_KEY });

    const vault = await tusky.vault.create("Vault from express starter - " + new Date().toISOString(), { encrypted: false });
    console.log("Created test vault.");
    console.log(vault);
    vaultId = vault.id;
  } catch (err) {
    console.error('Failed to init Tusky:', err);
    process.exit(1);
  }
}

async function startServer() {
  try {
    await initTusky();

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.json());
    app.use('/status', healthRouter);
    app.use('/files', fileRouter);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

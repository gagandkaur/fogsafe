import 'dotenv/config';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;
// Comma-separated list of allowed frontend origins, e.g. https://fogsafe.vercel.app
// Empty/unset -> allow all (fine for local dev; ALWAYS set it in production).
const origins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const dbUp = await connectDb();
const { server, close } = createApp({ dbUp, origins });
server.listen(PORT, () => console.log(`FogSafe backend on :${PORT}${dbUp ? '' : ' (no DB — in-memory only)'}`));

// Graceful shutdown: Render sends SIGTERM on every deploy.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    console.log(`${sig} received, shutting down`);
    await close();
    await disconnectDb();
    process.exit(0);
  });
}

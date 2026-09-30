import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './app.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Frontend: Vite en dev, estaticos en produccion ----------
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3011;

async function start() {
  if (IS_PROD) {
    const express = (await import('express')).default;
    const distPath = path.resolve(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Inventario Insublimex escuchando en :${PORT} (${IS_PROD ? 'produccion' : 'desarrollo'})`);
  });
}

start();

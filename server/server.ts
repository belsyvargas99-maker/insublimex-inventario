import path from 'path';
import { app } from './app.ts';

// ---------- Frontend: Vite en dev, estaticos en produccion ----------
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3011;

async function start() {
  if (IS_PROD) {
    const express = (await import('express')).default;
    // El build de esbuild empaqueta todo en dist/server.cjs y se ejecuta
    // desde /app (WORKDIR del Dockerfile), asi que dist/ cuelga de cwd().
    const distPath = path.resolve(process.cwd(), 'dist');
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

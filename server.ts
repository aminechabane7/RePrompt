import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app, { isSupabaseConfigured } from './src/server/app.ts';

const PORT = 3000;

// Server Initialization and SPA Routing for local dev and container environments
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      if (_req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'Endpoint not found.' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RePrompt Server active on http://0.0.0.0:${PORT}`);
  });
}

// Only launch standalone HTTP server when not in a serverless environment (e.g. Vercel)
if (process.env.VERCEL !== '1') {
  startServer();
}

export { isSupabaseConfigured };
export default app;

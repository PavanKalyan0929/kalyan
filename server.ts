import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { config } from './server/config.ts';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  let apiAppPromise: Promise<express.Express> | null = null;
  const getApiApp = () => {
    if (!apiAppPromise) {
      apiAppPromise = import('./server/app.ts').then(({ createApiApp }) => createApiApp());
      apiAppPromise.catch((err) => {
        console.error('Failed to initialize API application:', err);
        process.exit(1);
      });
    }
    return apiAppPromise;
  };

  let vitePromise: Promise<import('vite').ViteDevServer> | null = null;
  const getViteServer = () => {
    if (!vitePromise) {
      vitePromise = import('vite').then(({ createServer: createViteServer }) =>
        createViteServer({
          server: {
            middlewareMode: true,
            ws: process.env.DISABLE_HMR === 'true' ? false : undefined,
            hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
          },
          appType: 'spa',
        })
      );
      vitePromise.catch((err) => {
        console.error('Failed to initialize Vite dev server:', err);
        process.exit(1);
      });
    }
    return vitePromise;
  };

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }
    getApiApp()
      .then((apiApp) => apiApp(req, res, next))
      .catch(next);
  });

  if (!config.isProd) {
    app.use((req, res, next) => {
      getViteServer()
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }
      return res.status(404).send('Production build not found. Run npm run build first.');
    });
  }

  httpServer.on('error', (err) => {
    console.error('ASH HTTP server failed to bind:', err);
    process.exit(1);
  });

  httpServer.listen(config.port, config.host, () => {
    console.log(`Andhra Student Hub (ASH) running on http://${config.host}:${config.port} [${config.nodeEnv}]`);
    // Warm API router and Vite middleware immediately after port binding completes.
    void getApiApp();
    if (!config.isProd) {
      void getViteServer();
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start ASH server:', err);
  process.exit(1);
});

import { defineConfig, loadEnv } from 'vite';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const leaderboardHandler = requireCjs('./api/leaderboard.js');

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function localApiPlugin() {
  return {
    name: 'arcscii-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/leaderboard', async (req, res, next) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          req.query = Object.fromEntries(url.searchParams.entries());

          if (req.method === 'POST') {
            try {
              req.body = await readJsonBody(req);
            } catch {
              if (!res.headersSent) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
              } else {
                res.end();
              }
              return;
            }
          } else {
            req.body = {};
          }

          await leaderboardHandler(req, res);
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                ok: false,
                error: String((err && err.message) || err)
              })
            );
          } else {
            res.end();
          }
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL']) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    base: './',
    build: {
      outDir: 'dist'
    },
    plugins: [localApiPlugin()]
  };
});
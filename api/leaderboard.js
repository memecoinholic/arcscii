// Total point leaderboard backed by Postgres (Neon).
// Reads the Neon/Postgres connection string from the environment and keeps
// player totals in a single table. Run scores are permanent.
//
// Env: DATABASE_URL (or POSTGRES_URL / NEON_DATABASE_URL)
//   e.g. postgres://user:pass@host/arcscii?sslmode=require

const { neon } = require('@neondatabase/serverless');

const TABLE = 'arcscii_leaderboard';

function cleanUsername(v) {
  return String(v || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 15)
    .toLowerCase();
}

function sendJson(res, status, body) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(body);
  }

  res.statusCode = status;
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const send = (status, body) => sendJson(res, status, body);

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!dbUrl) {
    return send(501, {
      ok: false,
      error:
        'Postgres not configured. Set the DATABASE_URL (or POSTGRES_URL) env var to your Neon connection string.'
    });
  }

  let sql;
  try {
    sql = neon(dbUrl);
    // Fail fast if the connection string is invalid / unreachable.
    await sql`SELECT 1`;
  } catch (err) {
    return send(500, {
      ok: false,
      error: 'Failed to connect to Postgres. ' + String((err && err.message) || err)
    });
  }

  const ensureTable = () =>
    sql`
      CREATE TABLE IF NOT EXISTS ${sql.unsafe(TABLE)} (
        username   TEXT PRIMARY KEY,
        points     BIGINT NOT NULL DEFAULT 0,
        best       BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

  try {
    // Idempotent: creates the table on first run, cheap no-op afterwards.
    await ensureTable();

    if (req.method === 'GET') {
      const username = cleanUsername(req.query && req.query.username);

      // Single player lookup.
      if (username) {
        const r = await sql`
          SELECT username, points, best, updated_at
          FROM ${sql.unsafe(TABLE)}
          WHERE username = ${username}
          LIMIT 1
        `;
        const entry = r[0]
          ? {
              username: r[0].username,
              points: Number(r[0].points),
              best: Number(r[0].best),
              updatedAt: r[0].updated_at
            }
          : null;
        return send(200, { ok: true, entry });
      }

      // Top 50 total points.
      const r = await sql`
        SELECT username, points, best
        FROM ${sql.unsafe(TABLE)}
        ORDER BY points DESC, best DESC, username ASC
        LIMIT 50
      `;
      const rows = r.map((x) => ({
        username: x.username,
        points: Number(x.points),
        best: Number(x.best)
      }));
      return send(200, { ok: true, rows });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const username = cleanUsername(body.username);
      const score = Math.max(0, Math.floor(Number(body.score) || 0));

      if (!username) {
        return send(400, { ok: false, error: 'Invalid username' });
      }

      // Upsert: total points accumulate, best run is a running max.
      await sql`
        INSERT INTO ${sql.unsafe(TABLE)} (username, points, best)
        VALUES (${username}, ${score}, ${score})
        ON CONFLICT (username) DO UPDATE SET
          points     = ${sql.unsafe(TABLE)}.points + EXCLUDED.points,
          best       = GREATEST(${sql.unsafe(TABLE)}.best, EXCLUDED.best),
          updated_at = now()
      `;

      const r = await sql`
        SELECT username, points, best, updated_at
        FROM ${sql.unsafe(TABLE)}
        WHERE username = ${username}
        LIMIT 1
      `;
      const entry = r[0]
        ? {
            username: r[0].username,
            points: Number(r[0].points),
            best: Number(r[0].best),
            updatedAt: r[0].updated_at
          }
        : null;
      return send(200, { ok: true, entry });
    }

    return send(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return send(500, { ok: false, error: String((err && err.message) || err) });
  }
};
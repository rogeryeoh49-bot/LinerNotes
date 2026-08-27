const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8787;
const DB_PATH = path.join(__dirname, 'database.json');
const PUBLIC = __dirname;

function readDB() {
  if (!fs.existsSync(DB_PATH)) return { artists: [], albums: [], songs: [], samples: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n');
}
function send(res, code, data, type='application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', c => chunks += c);
    req.on('end', () => { try { resolve(chunks ? JSON.parse(chunks) : {}); } catch(e) { reject(e); } });
  });
}
function nextId(items) { return items.reduce((m, x) => Math.max(m, Number(x.id)||0), 0) + 1; }
function normalize(table, item) {
  const clean = { ...item };
  for (const k of Object.keys(clean)) if (clean[k] === '') clean[k] = null;
  for (const k of ['id','artist_id','album_id','song_id','release_year','duration','track_number','timestamp_in_song']) {
    if (clean[k] !== undefined && clean[k] !== null) clean[k] = Number(clean[k]);
  }
  return clean;
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const parsed = url.parse(req.url, true);
  try {
    if (parsed.pathname === '/api/db' && req.method === 'GET') return send(res, 200, readDB());
    if (parsed.pathname === '/api/export/swift' && req.method === 'GET') {
      return send(res, 200, readDB(), 'application/json');
    }
    const m = parsed.pathname.match(/^\/api\/(artists|albums|songs|samples)(?:\/(\d+))?$/);
    if (m) {
      const table = m[1], id = m[2] ? Number(m[2]) : null;
      const db = readDB();
      if (req.method === 'POST') {
        const item = normalize(table, await body(req));
        item.id = item.id || nextId(db[table]);
        db[table].push(item); writeDB(db); return send(res, 200, item);
      }
      if (req.method === 'PUT' && id) {
        const item = normalize(table, await body(req)); item.id = id;
        const idx = db[table].findIndex(x => Number(x.id) === id);
        if (idx < 0) return send(res, 404, { error: 'not found' });
        db[table][idx] = item; writeDB(db); return send(res, 200, item);
      }
      if (req.method === 'DELETE' && id) {
        db[table] = db[table].filter(x => Number(x.id) !== id); writeDB(db); return send(res, 200, { ok: true });
      }
    }
    let file = parsed.pathname === '/' ? 'index.html' : parsed.pathname.slice(1);
    const fp = path.join(PUBLIC, file);
    if (!fp.startsWith(PUBLIC) || !fs.existsSync(fp)) return send(res, 404, 'Not found', 'text/plain');
    const ext = path.extname(fp);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'text/javascript' : 'text/plain';
    send(res, 200, fs.readFileSync(fp), type);
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log(`LinerNotes local database admin: http://localhost:${PORT}`));

import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { normalize } from './src/game.js';

const root = resolve('.');
const starters = JSON.parse(await readFile('data/starter-levels.json', 'utf8')).map(normalize).filter(Boolean);
const levels = new Map(starters.map(l => [l.id, l]));
let pages = 0, total = 0, lastFetch = 0, live = false, inFlight;
try {
  const cache = JSON.parse(await readFile('.cache/catalog.json', 'utf8'));
  for (const item of cache.levels || []) { const l = normalize(item); if (l) levels.set(l.id, l); }
  pages = Number(cache.pages) || 0; total = Number(cache.total) || 0;
} catch {}
async function refresh() {
  if (inFlight) return inFlight;
  if (Date.now() - lastFetch < 10000) return;
  lastFetch = Date.now();
  inFlight = (async () => {
    try {
      // Bootstrap metadata first: never cap the catalog at a guessed page count.
      const page = pages ? Math.floor(Math.random() * pages) : 0;
      const response = await fetch(`https://gdbrowser.com/api/search/*?starred&page=${page}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Upstream unavailable');
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error('Empty upstream response');
      const count = Number(data[0].results), pageCount = Number(data[0].pages);
      if (pageCount > 0) pages = pageCount;
      else if (count > 0) pages = Math.ceil(count / data.length);
      if (count > 0) total = count;
      for (const item of data) { const l = normalize(item); if (l) levels.set(l.id, l); }
      live = true;
      await mkdir('.cache', { recursive: true });
      await writeFile('.cache/catalog.json', JSON.stringify({ pages, total, levels: [...levels.values()] }));
    } catch { live = false; } finally { inFlight = null; }
  })();
  return inFlight;
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/levels') {
    // Return cached levels immediately while one rate-limited request refreshes them.
    void refresh();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ levels: [...levels.values()], total, pages, live, refreshing: !!inFlight }));
  }
  try {
    const path = decodeURIComponent(url.pathname === '/' ? '/public/index.html' : url.pathname);
    const file = resolve(root, '.' + (path.startsWith('/src/') ? path : path.startsWith('/public/') ? path : '/public' + path));
    if (!file.startsWith(root + '/public/') && !file.startsWith(root + '/src/')) throw new Error('Invalid path');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PORT) || 3000;
server.listen(port, '0.0.0.0', () => console.log(`GDRNG:R ready at http://localhost:${port}`));

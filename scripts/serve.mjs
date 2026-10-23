import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
// SERVE_ROOT serves another folder, such as one laid out like gh-pages. By
// default dist/ is the app and previews/ (npm run preview -- <item>) is served
// under /preview/, as on gh-pages.
const root = resolve(process.env.SERVE_ROOT || resolve(import.meta.dirname, '../dist'));
const previews = process.env.SERVE_ROOT ? null : resolve(import.meta.dirname, '../previews');
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4' };
const port = Number(process.env.PORT || 4187);
http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname), base = root;
    if (previews && pathname.startsWith('/preview/')) { base = previews; pathname = pathname.slice('/preview'.length); }
    const file = resolve(base, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(base + sep)) throw new Error('Invalid path');
    const body = await readFile(file), type = types[file.split('.').at(-1)] || 'application/octet-stream';
    // Safari plays video only from servers that answer byte-range requests.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const size = body.length, start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
      const end = range[1] !== '' && range[2] !== '' ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
      res.end(body.subarray(start, end + 1)); return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Small math adventure: http://127.0.0.1:${port}`));

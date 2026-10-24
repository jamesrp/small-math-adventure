import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
// SERVE_ROOT serves another folder, such as one laid out like gh-pages. By
// default dist/ is the app and previews/ (npm run preview -- <item>) is served
// under /preview/, as on gh-pages.
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4' };
// A file that isn't there is a 404. Any other read error (too many open files
// on a busy machine, an interrupted read) is retried, then answered 500 with
// its code and logged, so a suite sees the real error instead of a missing file.
const MISSING = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']), RETRIES = 3;
async function readRetrying(file, read) {
  for (let attempt = 0; ; attempt++) {
    try { return await read(file); }
    catch (error) {
      if (MISSING.has(error.code) || attempt >= RETRIES) throw error;
      await new Promise(done => setTimeout(done, 25 * 2 ** attempt));
    }
  }
}
// The request handler, also used in-process by scripts/reload-stress.mjs.
// `onResponse` hears every answer: {path, status, code} (code: the read error).
export function distHandler({ root = resolve(import.meta.dirname, '../dist'), previews = resolve(import.meta.dirname, '../previews'), onResponse = () => {}, log = console.error, read = readFile } = {}) {
  return async (req, res) => {
    let pathname = req.url;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let base = root, local = pathname;
      if (previews && local.startsWith('/preview/')) { base = previews; local = local.slice('/preview'.length); }
      const file = resolve(base, '.' + (local.endsWith('/') ? local + 'index.html' : local));
      if (!file.startsWith(base + sep)) throw Object.assign(new Error('Invalid path'), { code: 'EINVALIDPATH' });
      const body = await readRetrying(file, read), type = types[file.split('.').at(-1)] || 'application/octet-stream';
      // Safari plays video only from servers that answer byte-range requests.
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (range) {
        const size = body.length, start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
        const end = range[1] !== '' && range[2] !== '' ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); onResponse({ path: pathname, status: 416 }); return; }
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
        res.end(body.subarray(start, end + 1)); onResponse({ path: pathname, status: 206 }); return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' });
      res.end(body); onResponse({ path: pathname, status: 200 });
    } catch (error) {
      const missing = MISSING.has(error.code) || error.code === 'EINVALIDPATH' || error instanceof URIError;
      if (!missing) log(`serve: ${pathname}: ${error.code || error.message}`);
      res.writeHead(missing ? 404 : 500, { 'Content-Type': 'text/plain' });
      res.end(missing ? 'Not found' : `Read error: ${error.code || error.message}`);
      onResponse({ path: pathname, status: missing ? 404 : 500, code: error.code || error.name });
    }
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const root = resolve(process.env.SERVE_ROOT || resolve(import.meta.dirname, '../dist'));
  const previews = process.env.SERVE_ROOT ? null : resolve(import.meta.dirname, '../previews');
  const port = Number(process.env.PORT || 4187);
  http.createServer(distHandler({ root, previews })).listen(port, '0.0.0.0', () => console.log(`Small math adventure: http://127.0.0.1:${port}`));
}

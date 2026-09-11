// Serve the repo root under the production base path so every relative URL is exercised
// exactly as GitHub Pages will serve it:  http://127.0.0.1:8765/3hue-experience/
// Byte ranges work as they do on Pages (206 Partial Content), which Safari needs to play audio.
// PORT=0 picks a free port; the line printed at start names it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/3hue-experience/';
const PORT = process.env.PORT == null || process.env.PORT === '' ? 8765 : Number(process.env.PORT);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.md': 'text/markdown; charset=utf-8',
};

// One byte range from a Range header → {start, end} (inclusive), 'unsatisfiable', or null to send
// the whole file (no header, several ranges, or a header this server does not understand).
function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start, end;
  if (m[1] === '') { const n = Number(m[2]); if (n === 0) return 'unsatisfiable'; start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || end < start) return 'unsatisfiable';
  return { start, end };
}

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === BASE.slice(0, -1)) { res.writeHead(302, { Location: BASE }); return res.end(); }
  if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('outside base path'); }
  let rel = url.slice(BASE.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  const head = req.method === 'HEAD';
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const nf = path.join(ROOT, '404.html');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      if (head) return res.end();
      return fs.existsSync(nf) ? fs.createReadStream(nf).pipe(res) : res.end('not found');
    }
    // Revalidating cache like Pages: a reload sends If-Modified-Since and gets a 304 for unchanged files.
    const lm = st.mtime.toUTCString();
    if (req.headers['if-modified-since'] === lm) { res.writeHead(304, { 'Last-Modified': lm }); return res.end(); }
    const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=0, must-revalidate', 'Last-Modified': lm, 'Accept-Ranges': 'bytes' };
    // If-Range: a range only applies to the version the client already has part of.
    const ifRange = req.headers['if-range'];
    const range = ifRange && ifRange !== lm ? null : byteRange(req.headers.range, st.size);
    if (range === 'unsatisfiable') { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    if (range) {
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${range.start}-${range.end}/${st.size}`, 'Content-Length': range.end - range.start + 1 });
      return head ? res.end() : fs.createReadStream(file, range).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    return head ? res.end() : fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT, '127.0.0.1', () => console.log(`serving ${ROOT} at http://127.0.0.1:${server.address().port}${BASE}`));

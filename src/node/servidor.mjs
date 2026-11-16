// Servidor estático mínimo (serve o projeto para o navegador carregar o motor three.js).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './util.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.otf': 'font/otf', '.css': 'text/css' };

export function servir(porta = 0) {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const arq = path.normalize(path.join(RAIZ, url));
    if (!arq.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
    fs.stat(arq, (e, st) => {
      if (e || !st.isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(arq).pipe(res);
    });
  });
  return new Promise(r => srv.listen(porta, '127.0.0.1', () => r({ srv, url: `http://127.0.0.1:${srv.address().port}` })));
}

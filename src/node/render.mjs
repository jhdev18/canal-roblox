// Renderiza as cenas no navegador (three.js) e codifica cada uma em um clipe MP4 em cache.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { servir } from './servidor.mjs';
import { p, log, garantirDir } from './util.mjs';

function argsGPU(gpu) {
  if (gpu === 'nao') return ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const angle = process.platform === 'win32' ? 'd3d11' : 'default';
  return ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-gpu-rasterization', `--use-angle=${angle}`, '--disable-gpu-sandbox', '--force_high_performance_gpu'];
}

export async function abrirNavegador(cfg) {
  const args = argsGPU(cfg.gpu);
  const tentativas = cfg.navegador && cfg.navegador !== 'auto' ? [cfg.navegador] : ['chromium', 'chrome', 'msedge'];
  let ultimoErro;
  for (const t of tentativas) {
    try {
      const opts = { headless: cfg.headless !== false, args };
      if (t === 'chrome' || t === 'msedge') opts.channel = t;
      else if (t !== 'chromium') opts.executablePath = t;
      else if (cfg.executavel) opts.executablePath = cfg.executavel;
      return await chromium.launch(opts);
    } catch (e) { ultimoErro = e; }
  }
  throw new Error('Não consegui abrir um navegador. Rode "npx playwright install chromium" ou instale o Google Chrome.\n' + ultimoErro?.message);
}

/** Abre a página do motor e devolve { page, fechar, gpuInfo }. */
export async function abrirMotor(cfgRender) {
  const { srv, url } = await servir();
  const nav = await abrirNavegador(cfgRender);
  const page = await nav.newPage({ viewport: { width: 540, height: 960 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message)); page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(url + '/src/motor/index.html');
  await page.waitForFunction(() => window.motor?.pronto, null, { timeout: 60000 }).catch(() => { throw new Error('Motor não carregou: ' + erros.join(' | ')); });
  await page.evaluate(c => window.motor.iniciar(c), cfgRender);
  const gpuInfo = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  return { page, erros, gpuInfo, fechar: async () => { await nav.close(); srv.close(); } };
}

function argsEncoder(enc, fps) {
  if (enc === 'h264_nvenc') return ['-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '19', '-b:v', '0'];
  return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17'];
}

/** Renderiza uma cena para `saida` (mp4). onProgresso(feitos, total). */
export async function renderizarCena(motor, cena, saida, cfg, onProgresso) {
  const { page } = motor;
  const n = await page.evaluate(c => window.motor.montar(c), cena);
  const tmp = saida + '.tmp.mp4';
  const ff = spawn(cfg.ffmpeg || 'ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(cfg.fps), '-c:v', 'mjpeg', '-i', '-',
    ...argsEncoder(cfg.encoder, cfg.fps), '-pix_fmt', 'yuv420p', '-r', String(cfg.fps), '-an', '-f', 'mp4', tmp], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let err = ''; ff.stderr.on('data', d => { err += d; });
  const fim = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg (clipe) falhou: ' + err.slice(-1500)))));
  const lote = 6;
  for (let f = 0; f < n; f += lote) {
    const imgs = await page.evaluate(([a, b]) => window.motor.quadros(a, b), [f, lote]);
    for (const d of imgs) { const buf = Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
    onProgresso?.(Math.min(f + lote, n), n);
  }
  ff.stdin.end(); await fim;
  fs.renameSync(tmp, saida);
  if (motor.erros.length) log('avisos do motor:', motor.erros.slice(-3).join(' | '));
}

export { garantirDir };

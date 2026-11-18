// Detecta "tremor"/pisca entre quadros seguidos (sem gerar vídeo): mede quanto cada quadro difere do anterior.
// Uso: node ferramentas/tremor.mjs roteiros/x.yaml [1-14]   → por cena: mudança média, picos e em que quadros
import { abrirMotor } from '../src/node/render.mjs';
import { carregarRoteiro } from '../src/node/roteiro.mjs';
const rot = carregarRoteiro(process.argv[2]);
const sel = new Set((process.argv[3] || '1-99').split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return Array.from({ length: (b || a) - a + 1 }, (_, k) => a + k); }));
const m = await abrirMotor({ largura: 180, altura: 320, fps: 30, ao: false, sombra: 1024, gpu: 'nao' });
for (const [idx, c] of rot.cenas.entries()) { const i = idx + 1; if (!sel.has(i)) continue;
  const v = { cenario: c.cenario, local: c.local, comodo: c.comodo, decoracao: c.decoracao, dentro: c.dentro, hora: c.hora, tela: c.tela, camera: c.camera, mov: c.mov, angulo: c.angulo, dist: c.dist, altura: c.altura, foco: c.foco, props: c.props, dur: 3, multidao: c.multidao, alcance: c.alcance, alvo_xz: c.alvo_xz,
    atores: c.atores.map(x => ({ ...x, spec: { ...x.spec } })) };
  v.dur = 2.5; await m.page.evaluate(c => window.motor.montar(c), v);
  const difs = await m.page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 180; cv.height = 320; const cx = cv.getContext('2d', { willReadFrequently: true }); let ant = null; const out = [];
    for (let q = 0; q < 60; q++) { const url = window.motor.quadro(q, 'image/png'); const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; }); cx.drawImage(im, 0, 0);
      const d = cx.getImageData(0, 0, 180, 320).data; if (ant) { let s = 0; for (let k = 0; k < d.length; k += 16) s += Math.abs(d[k] - ant[k]) + Math.abs(d[k + 1] - ant[k + 1]) + Math.abs(d[k + 2] - ant[k + 2]); out.push(s / (d.length / 16)); } ant = d; }
    return out; });
  const ord = difs.slice().sort((a, b) => a - b), med = ord[Math.floor(ord.length / 2)], max = ord[ord.length - 1];
  const picos = difs.map((d, q) => [d, q + 1]).filter(([d]) => d > Math.max(6, med * 3)).map(([d, q]) => q);
  console.log(`${i}. ${c.fala.slice(0, 40).padEnd(40)} média ${med.toFixed(1)} máx ${max.toFixed(1)}${picos.length ? '  PICOS nos quadros ' + picos.join(',') : ''}`);
}
await m.fechar();

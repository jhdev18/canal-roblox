// Uma cena em 3 momentos (0 s, 1,5 s, 3 s) para conferir movimento. Avisa no terminal se alguém pararia num obstáculo.
// Uso: node ferramentas/quadros_cena.mjs roteiros/x.yaml saida.jpg 3,7
import { abrirMotor } from '../src/node/render.mjs';
import { carregarRoteiro } from '../src/node/roteiro.mjs';
const rot = carregarRoteiro(process.argv[2]); const ids = process.argv[4].split(',').map(Number);
const m = await abrirMotor({ largura: 360, altura: 640, fps: 30, ao: true, sombra: 2048, gpu: 'nao' });
const logs = []; m.page.on('console', msg => { if (msg.text().includes('[motor]')) logs.push(msg.text()); });
const out = [];
for (const i of ids) { const c = rot.cenas[i - 1];
  const v = { cenario: c.cenario, local: c.local, comodo: c.comodo, decoracao: c.decoracao, dentro: c.dentro, hora: c.hora, tela: c.tela, camera: c.camera, mov: c.mov, angulo: c.angulo, dist: c.dist, altura: c.altura, foco: c.foco, props: c.props, dur: 3, multidao: c.multidao, alcance: c.alcance, alvo_xz: c.alvo_xz,
    atores: c.atores.map(x => ({ ...x, spec: { ...x.spec } })) };
  await m.page.evaluate(c => window.motor.montar(c), v);
  for (const q of [1, 45, 89]) out.push([`${i}. ${c.fala.slice(0, 22)} · ${(q / 30).toFixed(1)}s`, await m.page.evaluate(q => window.motor.quadro(q), q)]); }
const pg = await m.page.context().browser().newPage();
await pg.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(6,200px);gap:4px;background:#111;color:#ffd23f;font:600 12px sans-serif">${out.map(([n, d]) => `<div><img src="${d}" width="200"><div>${n}</div></div>`).join('')}</body>`);
await pg.locator('body').screenshot({ path: process.argv[3], type: 'jpeg', quality: 85 }); await m.fechar(); console.log(logs.join('\n') || 'sem avisos'); console.log('ok');

// Folha de conferência: 1 foto por cena (quadro 30), sem gerar vídeo.
// Uso: node ferramentas/folha_cenas.mjs roteiros/x.yaml saida.jpg [1-16 | 3,5,9]   (até 16 cenas por folha fica legível)
import { abrirMotor } from '../src/node/render.mjs';
import { carregarRoteiro } from '../src/node/roteiro.mjs';
const rot = carregarRoteiro(process.argv[2]);
const m = await abrirMotor({ largura: 360, altura: 640, fps: 30, ao: true, sombra: 2048, gpu: 'nao' });
const out = [];
const sel = new Set((process.argv[4] || "1-99").split(",").flatMap(p => { const [a, b] = p.split("-").map(Number); return Array.from({ length: (b || a) - a + 1 }, (_, k) => a + k); }));
for (const [i, c] of rot.cenas.entries()) { if (!sel.has(i + 1)) continue;
  const v = { cenario: c.cenario, local: c.local, comodo: c.comodo, decoracao: c.decoracao, dentro: c.dentro, hora: c.hora, seed: c.seed, cor: c.cor, chao: c.chao, parede: c.parede, tela: c.tela, camera: c.camera, mov: c.mov,
    angulo: c.angulo, dist: c.dist, altura: c.altura, inclinar: c.inclinar, foco: c.foco, props: c.props, alvo_xz: c.alvo_xz, dur: 2, multidao: c.multidao, texto: c.texto, texto_palanque: c.texto_palanque, palanque: c.palanque, alcance: c.alcance,
    atores: c.atores.map(x => ({ ...x, spec: { ...x.spec } })) };
  await m.page.evaluate(c => window.motor.montar(c), v); out.push([`${i + 1}. ${c.fala}`, await m.page.evaluate(() => window.motor.quadro(30))]); }
const pg = await m.page.context().browser().newPage();
await pg.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(4,270px);gap:4px;background:#111;color:#ffd23f;font:600 12px sans-serif">${out.map(([n, d]) => `<div><img src="${d}" width="270"><div style="height:30px">${n}</div></div>`).join('')}</body>`);
await pg.locator('body').screenshot({ path: process.argv[3], type: 'jpeg', quality: 85 }); await m.fechar(); console.log('ok');

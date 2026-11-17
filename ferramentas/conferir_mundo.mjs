// Conferência automática do mundo integrado (sem imagens): construções sobrepostas, objetos dentro de construções e construções baixas demais.
// Uso: node ferramentas/conferir_mundo.mjs [hora]
import { abrirMotor } from '../src/node/render.mjs';
const m = await abrirMotor({ largura: 180, altura: 320, fps: 30, ao: false, sombra: 512, gpu: 'nao' });
await m.page.evaluate(h => window.motor.montar({ cenario: 'mundo', local: 'vista', hora: h, dur: 1, atores: [] }), process.argv[2] || 'tarde');
const r = await m.page.evaluate(() => window.motor.conferir()); await m.fechar();
console.log(`${r.construcoes} construções`);
for (const [k, t] of [['sobrepostas', 'construções sobrepostas'], ['objeto_dentro', 'objetos dentro de construções'], ['baixas', 'construções com menos de 7 studs'], ['moveis_sobrepostos', 'móveis atravessando móveis (interiores)'], ['janelas_baixas', 'janelas com o topo abaixo da cabeça (base, topo)']]) {
  console.log(`\n${t}: ${r[k].length}`); for (const x of r[k]) console.log('  ' + JSON.stringify(x)); }
process.exitCode = r.sobrepostas.length + r.objeto_dentro.length + r.baixas.length + r.moveis_sobrepostos.length + r.janelas_baixas.length ? 1 : 0;

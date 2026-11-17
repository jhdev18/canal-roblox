// Gera pranchas de catálogo (docs/preview/*.jpg) fotografando cada asset com o próprio motor.
// Rode de novo sempre que criar um asset:   node ferramentas/preview_assets.mjs [categoria...] [--gpu nao]
// Categorias: personagens rostos extras acessorios roupas acoes cenarios telas props
import fs from 'node:fs';
import path from 'node:path';
import { abrirMotor } from '../src/node/render.mjs';
import { carregarPersonagens, resolverSpec, catalogo } from '../src/node/roteiro.mjs';
import { p, garantirDir } from '../src/node/util.mjs';

const args = process.argv.slice(2);
const gpu = args.includes('--gpu') ? args[args.indexOf('--gpu') + 1] : 'auto';
const pedidas = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--gpu');
const tpl = carregarPersonagens(); const cat = catalogo();
const spec = (base, extra = {}) => ({ id: 'a', ...resolverSpec(base, tpl), ...extra });
const NOOB = (extra = {}) => ({ ...spec('noob'), ...extra });
const FUNDO = { cenario: 'vazio', cor: '#eef1f6', chao: '#d5d9e2', mov: 'fixo', dur: 1.2 };
const ator = (s, acao = 'parado', o = {}) => ({ id: 'a', spec: s, acao, p: {}, ...o });
const CENAS_EXEMPLO = { cidade: 'andar_confiante', praca: 'acenar', prefeitura: 'discursar', gabinete: 'sentar', sala: 'sentar', quarto: 'celular', escola: 'falar', hospital: 'deitar', casamento: 'acenar', parque: 'acenar', fachada: 'parado', rua: 'andar' };
const T_ACAO = { cair: 1.0, pular: 0.28, comemorar: 0.26, empurrar: 0.5, andar: 0.15, correr: 0.1, acenar: 0.13, socar: 0.1, palmas: 0.2, dancar: 0.15 };
const COSTAS = ['mochila', 'capa', 'asas', 'rabo_de_cavalo', 'cabelo_longo', 'coque'];
const TORSO = ['gravata', 'mochila', 'capa', 'asas'];

const CATEGORIAS = {
  personagens: () => cat.personagens.map(n => ({ nome: n, cena: { ...FUNDO, camera: 'medio', angulo: 18, atores: [ator(spec(n))] } })),
  rostos: () => cat.rostos.map(n => ({ nome: n, cena: { ...FUNDO, camera: 'detalhe', angulo: 0, atores: [ator(NOOB(), 'parado', { rosto: n })] } })),
  extras: () => cat.extras_rosto.map(n => ({ nome: n, cena: { ...FUNDO, camera: 'detalhe', angulo: 0, atores: [ator(NOOB({ extras: [n] }))] } })),
  acessorios: () => cat.acessorios.map(n => ({ nome: n, cena: { ...FUNDO, camera: TORSO.includes(n) ? 'medio' : 'close', angulo: COSTAS.includes(n) ? 145 : 28,
    atores: [ator(NOOB({ acessorios: [n], cabelo_cor: '#3a2416' }))] } })),
  roupas: () => cat.roupas.map(n => ({ nome: n, cena: { ...FUNDO, camera: 'medio', angulo: 15,
    atores: [ator(NOOB({ roupa: n, camisa: { terno: 'preto', jaleco: 'branco', vestido: 'rosa', uniforme: 'azul', listrada: 'vermelho', regata: 'laranja' }[n] }))] } })),
  acoes: () => cat.acoes.map(n => ({ nome: n, t: T_ACAO[n] ?? 0.5, cena: { ...FUNDO, camera: 'aberto', angulo: 30, atores: [ator(NOOB(), n)] } })),
  cenarios: () => cat.cenarios.filter(n => n !== 'celular').flatMap(n => [{ nome: n, cena: { cenario: n, mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: 10,
    atores: n === 'vazio' ? [] : [ator(NOOB(), CENAS_EXEMPLO[n] || 'parado')] } }]).concat(
    ['rua', 'parque', 'quarto'].map(n => ({ nome: n + ' · noite', cena: { cenario: n, hora: 'noite', mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: 10, atores: [ator(NOOB(), 'parado')] } })),
    [{ nome: 'rua · tarde', cena: { cenario: 'rua', hora: 'tarde', mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: 10, atores: [ator(NOOB(), 'parado')] } }]),
  telas: () => [
    { tipo: 'mensagem', de: 'Mãe', mensagens: [{ texto: 'Cadê você?' }, { texto: 'Tô chegando!', eu: true }] },
    { tipo: 'notificacao', app: 'Destino', titulo: 'Seu inimigo', texto: 'PAI' },
    { tipo: 'alarme', hora: '06:30' }, { tipo: 'ligacao', nome: 'Desconhecido' },
  ].map(t => ({ nome: 'celular · ' + t.tipo, cena: { cenario: 'celular', tela: t, mov: 'fixo', dur: 1.2, atores: [] } })),
  props: () => cat.props.map(n => { const G = { casa: [3, 1], predio: [9, 1.6], poste: [3, 1], arvore: [3, 1], pinheiro: [3, 1], carro: [-0.5, 1], taxi: [-0.5, 1], viatura: [-0.5, 1],
      onibus: [0, 1.5], arranha_ceu: [20, 2.8], bandeira: [3, 1.1], outdoor: [6, 1.2], semaforo: [2.5, 0.9], loja: [1.5, 1.2], palanque: [0, 0.9], estante: [1, 0.8], fonte: [0, 0.9], estatua: [1.5, 0.9], barraca: [0, 0.9] }[n];
    return { nome: n, cena: { ...FUNDO, camera: G ? 'geral' : 'medio', angulo: 30, altura: G ? G[0] : -1.5, dist: G ? G[1] : undefined, props: [{ tipo: n }], atores: [] } }; }),
};

function pagina(titulo, itens, colunas) {
  return `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#14161c;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#fff;padding:22px;width:${colunas * 196 + 44}px}
  h1{font-size:30px;margin:0 0 4px} p{margin:0 0 16px;color:#9aa3b5;font-size:15px}
  .g{display:grid;grid-template-columns:repeat(${colunas},180px);gap:16px}
  figure{margin:0;background:#1f2230;border-radius:12px;overflow:hidden}
  img{width:180px;height:320px;object-fit:cover;display:block}
  figcaption{padding:7px 8px;font:600 15px/1.2 Consolas,monospace;color:#ffd23f;text-align:center}
  </style><h1>${titulo}</h1><p>${itens.length} itens · use o nome em amarelo no roteiro</p><div class="g">
  ${itens.map(i => `<figure><img src="${i.img}"><figcaption>${i.nome}</figcaption></figure>`).join('')}</div>`;
}

const TITULOS = { personagens: 'Personagens (assets/personagens.yaml)', rostos: 'Rostos (rosto:)', extras: 'Extras de rosto (extras:)', acessorios: 'Acessórios (acessorios:)',
  roupas: 'Roupas (roupa:)', acoes: 'Ações (acao:)', cenarios: 'Cenários (onde: + hora:)', telas: 'Telas de celular (onde: celular + tela:)', props: 'Props de cenário (props:)' };

const motor = await abrirMotor({ largura: 360, altura: 640, fps: 30, ao: true, sombra: 2048, gpu });
console.log('GPU:', motor.gpuInfo);
const dir = garantirDir(p('docs', 'preview'));
for (const nomeCat of (pedidas.length ? pedidas : Object.keys(CATEGORIAS))) {
  const itens = CATEGORIAS[nomeCat]();
  for (const [i, it] of itens.entries()) {
    await motor.page.evaluate(c => window.motor.montar(c), it.cena);
    it.img = await motor.page.evaluate(f => window.motor.quadro(f, 'image/jpeg', 0.9), Math.round((it.t ?? 0.5) * 30));
    process.stdout.write(`\r${nomeCat}: ${i + 1}/${itens.length}   `);
  }
  const colunas = itens.length > 12 ? 7 : Math.min(6, itens.length);
  const pg = await motor.page.context().browser().newPage();
  await pg.setContent(pagina(TITULOS[nomeCat], itens, colunas));
  await pg.locator('body').screenshot({ path: path.join(dir, nomeCat + '.jpg'), type: 'jpeg', quality: 85 });
  await pg.close();
  console.log(`→ docs/preview/${nomeCat}.jpg`);
}
await motor.fechar();

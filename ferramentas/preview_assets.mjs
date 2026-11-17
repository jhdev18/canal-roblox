// Gera pranchas de catálogo (docs/preview/*.jpg) fotografando cada asset com o próprio motor.
// Rode de novo sempre que criar um asset:   node ferramentas/preview_assets.mjs [categoria...] [--gpu nao]
// Categorias: personagens rostos extras acessorios roupas acoes cenarios predios locais interiores casa ambientes telas props
// Rodando todas (sem argumentos), também gera docs/preview/geral.jpg com tudo junto.
import fs from 'node:fs';
import path from 'node:path';
import { abrirMotor } from '../src/node/render.mjs';
import { carregarPersonagens, resolverSpec, catalogo, MULTIDAO_PADRAO } from '../src/node/roteiro.mjs';
import { p, garantirDir } from '../src/node/util.mjs';
import { LOCAIS, NOMES_PREDIOS } from '../src/motor/cidade.js';

const args = process.argv.slice(2);
const gpu = args.includes('--gpu') ? args[args.indexOf('--gpu') + 1] : 'auto';
const pedidas = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--gpu');
const tpl = carregarPersonagens(); const cat = catalogo();
const spec = (base, extra = {}) => ({ id: 'a', ...resolverSpec(base, tpl), ...extra });
const NOOB = (extra = {}) => ({ ...spec('noob'), ...extra });
const FUNDO = { cenario: 'vazio', cor: '#eef1f6', chao: '#d5d9e2', mov: 'fixo', dur: 1.2 };
const ator = (s, acao = 'parado', o = {}) => ({ id: 'a', spec: s, acao, p: {}, ...o });
const COM_MULTIDAO = (n) => MULTIDAO_PADRAO[n] ? { multidao: { ...MULTIDAO_PADRAO[n], specs: Object.keys(tpl).map(k => ({ id: k, ...resolverSpec(k, tpl) })) } } : {};
const CENAS_EXEMPLO = { interior_farmacia: 'atender', interior_loterica: 'atender', interior_padaria: 'atender', interior_mercado: 'atender', interior_banco: 'atender', interior_prefeitura: 'atender', interior_igreja: 'rezar', interior_posto_saude: 'sentar', interior_delegacia: 'segurar_grade', interior_bar: 'sentar', interior_posto_gasolina: 'atender', cidade_pequena: null, praca_cheia: 'acenar', centro: 'parado', bairro: 'passear_cachorro', quintal: 'sentar', cozinha: 'lavar_louca', campinho: 'chutar', cidade: 'andar_confiante', praca: 'acenar', prefeitura: 'discursar', gabinete: 'sentar', sala: 'sentar', quarto: 'celular', escola: 'falar', hospital: 'deitar', casamento: 'acenar', parque: 'acenar', fachada: 'parado', rua: 'andar' };
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
  cenarios: () => cat.cenarios.filter(n => n !== 'celular').flatMap(n => [{ nome: n, cena: { cenario: n, mov: 'fixo', dur: 1.2, ...COM_MULTIDAO(n),
    camera: { praca_cheia: 'alto', centro: 'geral', cidade_pequena: 'alto' }[n] || 'aberto', dist: { praca_cheia: 2.8, cidade_pequena: 6 }[n], altura: { centro: 4 }[n], angulo: n === 'cidade_pequena' ? 25 : 10,
    local: n === 'cidade_pequena' ? 'vista' : undefined,
    atores: n === 'vazio' || n === 'cidade_pequena' ? [] : [ator(NOOB(), CENAS_EXEMPLO[n] || 'parado')] } }]).concat(
    ['rua', 'bairro', 'quarto'].map(n => ({ nome: n + ' · noite', cena: { cenario: n, hora: 'noite', mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: 10, atores: [ator(NOOB(), 'parado')] } })),
    [{ nome: 'rua · tarde', cena: { cenario: 'rua', hora: 'tarde', mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: 10, atores: [ator(NOOB(), 'parado')] } }]),
  predios: () => NOMES_PREDIOS.map(n => { const T = { igreja: [8, 2.0], escola: [2, 1.9], posto_gasolina: [2, 1.9], mercado: [1.5, 1.7], prefeitura: [3, 1.9], coreto: [1.5, 1.1] }[n] || [1.5, 1.4];
    return { nome: n, cena: { ...FUNDO, camera: 'geral', angulo: 28, altura: T[0], dist: T[1], props: [{ tipo: n, z: n === 'coreto' ? 0 : 4 }], atores: [] } }; }),
  interiores: () => cat.cenarios.filter(n => n.startsWith('interior_')).map(n => ({ nome: n.replace('interior_', '') + ' · dentro', cena: { cenario: n, mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: n === 'interior_delegacia' ? -28 : 18, altura: 1, dist: 1.15,
    atores: n === 'interior_igreja' ? [ator(spec('idosa'), 'rezar')] : n === 'interior_delegacia' ? [ator(spec('policial'), 'atender'), ator(spec('ladrao'), 'segurar_grade')]
      : [ator(spec({ farmacia: 'medico', posto_saude: 'medico', bar: 'vizinho', prefeitura: 'assessor', banco: 'assessor' }[n.replace('interior_', '')] || 'cidada'), 'atender')] } })),
  casa: () => [['quarto', 'jogar_pc', 'garoto'], ['quarto_pais', 'dormir', 'mae'], ['sala', 'sentar', 'pai'], ['cozinha', 'cozinhar', 'mae'], ['banheiro', 'parado', 'garoto'], ['garagem', 'parado', 'pai'], ['vista', null, null]]
    .map(([c, a, p]) => ({ nome: 'comodo: ' + c, cena: { cenario: 'casa_protagonista', comodo: c, mov: 'fixo', dur: 1.2, camera: c === 'vista' ? 'geral' : 'aberto', dist: c === 'vista' ? 3.2 : 1.05,
      angulo: c === 'vista' ? 0 : 12, altura: c === 'vista' ? 0 : 1, atores: a ? [ator(spec(p), a)] : [] } })),
  ambientes: () => {
    const todos = Object.keys(tpl).map(k => ({ id: k, ...resolverSpec(k, tpl) }));
    const fila = (cen, n, quem) => ({ cenario: cen, mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: -55, dist: 1.5, altura: 0.5, atores: [ator(spec(quem), 'atender')], multidao: { modo: 'fila', n, specs: todos } });
    return [{ nome: 'fila: lotérica', cena: fila('interior_loterica', 6, 'cidada') }, { nome: 'fila: banco', cena: fila('interior_banco', 5, 'assessor') },
      { nome: 'fila: mercado', cena: { ...fila('interior_mercado', 5, 'cidada'), angulo: 20 } }, { nome: 'fila: padaria', cena: fila('interior_padaria', 4, 'cidada') },
      { nome: 'gabinete (prefeito)', cena: { cenario: 'gabinete', mov: 'fixo', dur: 1.2, camera: 'aberto', angulo: 20, dist: 1.2, atores: [ator(spec('prefeito'), 'assinar'), ator(spec('assessor'), 'cochichar', { x: 4, z: -5, vira: -40 })] } }]; },
  mundo: () => { const todos = Object.keys(tpl).map(k => ({ id: k, ...resolverSpec(k, tpl) }));
    const M = (nome, o, atores = [], t = 0.5) => ({ nome, t, cena: { cenario: 'mundo', mov: 'fixo', dur: 2, camera: 'aberto', ...o, atores } });
    return [M('vista (cidade inteira)', { local: 'vista', camera: 'alto', dist: 7.5, angulo: 25 }), M('praca', { local: 'praca', camera: 'geral', dist: 1.1, altura: 4 }, [ator(spec('garoto'), 'acenar')]),
      M('coreto', { local: 'coreto' }, [ator(spec('prefeito'), 'discursar')]), M('fonte', { local: 'fonte' }, [ator(spec('menina'), 'comemorar')]),
      M('entrando na farmácia', { local: 'farmacia', angulo: 35 }, [ator(spec('idosa'), 'andar', { x: -3, z: 1.5, vira: 180, caminho: [[-3, -6]] })], 0.75),
      M('farmácia por dentro', { local: 'farmacia', dentro: true }, [ator(spec('medico'), 'atender')]),
      M('lotérica: fila', { local: 'loterica', dentro: true, angulo: -50, dist: 1.2, multidao: { modo: 'fila', n: 4, specs: todos } }, [ator(spec('cidada'), 'atender')]),
      M('igreja por dentro', { local: 'igreja', dentro: true, angulo: 20 }, [ator(spec('idosa'), 'rezar')]),
      M('prefeitura: gabinete', { local: 'prefeitura', dentro: true, angulo: 15 }, [ator(spec('prefeito'), 'assinar')]),
      M('bar por dentro', { local: 'bar', dentro: true }, [ator(spec('vizinho'), 'atender')]),
      M('casa do protagonista', { local: 'casa', camera: 'geral', dist: 0.9, altura: 2 }, [ator(spec('garoto'), 'acenar')]),
      M('casa: quarto', { local: 'casa', comodo: 'quarto', angulo: 20 }, [ator(spec('garoto'), 'jogar_pc')]),
      M('casa: sala', { local: 'casa', comodo: 'sala' }, [ator(spec('pai'), 'sentar')]),
      M('casa: cozinha', { local: 'casa', comodo: 'cozinha', angulo: -20 }, [ator(spec('mae'), 'cozinhar')])]; },
  locais: () => LOCAIS.filter(l => l !== 'vista').map(l => ({ nome: 'onde: ' + l, cena: { cenario: 'cidade_pequena', local: l, mov: 'fixo', dur: 1.2, camera: 'aberto', dist: 1.3, altura: 2, angulo: 15,
    atores: [ator(NOOB(), 'acenar')] } })),
  telas: () => [
    { tipo: 'mensagem', de: 'Mãe', mensagens: [{ texto: 'Cadê você?' }, { texto: 'Tô chegando!', eu: true }] },
    { tipo: 'notificacao', app: 'Destino', titulo: 'Seu inimigo', texto: 'PAI' },
    { tipo: 'alarme', hora: '06:30' }, { tipo: 'ligacao', nome: 'Desconhecido' },
  ].map(t => ({ nome: 'celular · ' + t.tipo, cena: { cenario: 'celular', tela: t, mov: 'fixo', dur: 1.2, atores: [] } })),
  props: () => cat.props.map(n => { const G = { casa: [3, 1], predio: [9, 1.6], poste: [3, 1], arvore: [3, 1], pinheiro: [3, 1], carro: [-0.5, 1], taxi: [-0.5, 1], viatura: [-0.5, 1],
      onibus: [0, 1.5], arranha_ceu: [20, 2.8], bandeira: [3, 1.1], outdoor: [6, 1.2], semaforo: [2.5, 0.9], loja: [1.5, 1.2], palanque: [0, 0.9], estante: [1, 0.8], fonte: [0, 0.9], estatua: [1.5, 0.9], barraca: [0, 0.9],
      casa_br: [3, 1], sobrado: [5, 1.2], muro: [0, 0.7], balanco: [1, 0.8], escorregador: [0, 0.7], trave: [0, 0.8], geladeira: [0, 0.6], churrasqueira: [0, 0.6], poste_fios: [3, 1], piscina: [-2, 0.8], varal: [0, 0.6] }[n];
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
  roupas: 'Roupas (roupa:)', mundo: 'Mundo integrado (onde: mundo + local: / dentro: / comodo:)', casa: 'Casa do protagonista (onde: casa_protagonista + comodo:)', ambientes: 'Ambientes completos: filas e gabinete do prefeito', interiores: 'Interiores dos prédios (onde: <local> + dentro: true)', predios: 'Prédios da cidade pequena (props: — e cada um é um local em onde:)', locais: 'Locais da cidade pequena (onde: <local>)', acoes: 'Ações (acao:)', cenarios: 'Cenários (onde: + hora:)', telas: 'Telas de celular (onde: celular + tela:)', props: 'Props de cenário (props:)' };

const todos = [];
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
  todos.push([nomeCat, itens]);
}
if (!pedidas.length) { // prancha geral: tudo numa imagem, por categoria
  const cols = 14, w = 104;
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#14161c;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#fff;padding:20px;width:${cols * (w + 6) + 40}px}
    h1{margin:0 0 4px;font-size:34px} h2{margin:22px 0 8px;font-size:21px;color:#ffd23f} p{margin:0;color:#9aa3b5}
    .g{display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px} figure{margin:0;background:#1f2230;border-radius:8px;overflow:hidden}
    img{width:${w}px;height:${Math.round(w * 16 / 9)}px;object-fit:cover;display:block} figcaption{font:600 10px/1.2 Consolas,monospace;padding:3px 2px;text-align:center;color:#e8e8e8;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}</style>
    <h1>Biblioteca de assets — visão geral</h1><p>${todos.reduce((a, [, i]) => a + i.length, 0)} itens · nome = o que se escreve no roteiro</p>
    ${todos.map(([c, i]) => `<h2>${TITULOS[c]} · ${i.length}</h2><div class="g">${i.map(x => `<figure><img src="${x.img}"><figcaption>${x.nome}</figcaption></figure>`).join('')}</div>`).join('')}`;
  const pg = await motor.page.context().browser().newPage(); await pg.setContent(html);
  await pg.locator('body').screenshot({ path: path.join(dir, 'geral.jpg'), type: 'jpeg', quality: 82 }); await pg.close();
  console.log('→ docs/preview/geral.jpg');
}
await motor.fechar();

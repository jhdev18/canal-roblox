// Lê um roteiro YAML curto e devolve as cenas completas e validadas.
import fs from 'node:fs';
import YAML from 'yaml';
import { p, sugerir } from './util.mjs';
import { NOMES_ACOES } from '../motor/acoes.js';
import { NOMES_CAMERAS, MOVIMENTOS } from '../motor/camera.js';
import { NOMES_CENARIOS } from '../motor/cenarios.js';
import { NOMES_PROPS } from '../motor/props.js';
import { NOMES_ACESSORIOS, NOMES_ROUPAS, NOMES_PROPS_MAO } from '../motor/personagem.js';
import { EXPRESSOES, EXTRAS_ROSTO } from '../motor/rostos.js';

export function carregarPersonagens() { return YAML.parse(fs.readFileSync(p('assets', 'personagens.yaml'), 'utf8')) || {}; }

function rostosValidos() {
  const custom = fs.existsSync(p('assets', 'rostos')) ? fs.readdirSync(p('assets', 'rostos')).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)) : [];
  return [...Object.keys(EXPRESSOES), ...custom];
}
export function catalogo() {
  return { cenarios: NOMES_CENARIOS, acoes: NOMES_ACOES, rostos: rostosValidos(), extras_rosto: Object.keys(EXTRAS_ROSTO), acessorios: NOMES_ACESSORIOS,
    roupas: NOMES_ROUPAS, props: NOMES_PROPS, props_mao: NOMES_PROPS_MAO, cameras: NOMES_CAMERAS, movimentos: MOVIMENTOS,
    personagens: Object.keys(carregarPersonagens()), horas: ['dia', 'tarde', 'noite'], telas: ['mensagem', 'notificacao', 'alarme', 'ligacao'] };
}

function checar(tipo, nome, lista, onde) {
  if (nome === undefined || nome === null) return;
  if (!lista.includes(nome)) throw new Error(`${onde}: ${tipo} "${nome}" não existe.${sugerir(String(nome), lista)}  (veja: npm run catalogo)`);
}

/** Resolve um personagem: template (assets/personagens.yaml) + sobrescritas. Suporta herança via `base`. */
export function resolverSpec(def, templates, pilha = []) {
  if (typeof def === 'string') def = { base: def };
  const base = def.base ? templates[def.base] : null;
  if (def.base && !base) throw new Error(`Personagem base "${def.base}" não existe.${sugerir(def.base, Object.keys(templates))}`);
  if (def.base && pilha.includes(def.base)) throw new Error('Herança circular em personagens: ' + pilha.join(' > '));
  const herdado = base ? resolverSpec(base, templates, [...pilha, def.base]) : {};
  const { base: _, ...resto } = def;
  return { ...herdado, ...resto, extras: resto.extras ?? herdado.extras ?? [], acessorios: resto.acessorios ?? herdado.acessorios ?? [] };
}

const CAM_CICLO = [['medio', -18], ['close', 12], ['aberto', 0], ['medio', 22], ['baixo', -8], ['close', -15], ['lado', 0]];

export function carregarRoteiro(arquivo) {
  const r = YAML.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!r?.cenas?.length) throw new Error('O roteiro precisa de uma lista "cenas".');
  const templates = carregarPersonagens(); const cat = catalogo();
  const elenco = {};
  for (const [id, def] of Object.entries(r.elenco || {})) elenco[id] = { id, ...resolverSpec(def, templates) };
  const spec = (id, onde) => {
    if (elenco[id]) return elenco[id];
    if (templates[id]) return (elenco[id] = { id, ...resolverSpec(id, templates) });
    throw new Error(`${onde}: ator "${id}" não está no elenco nem em assets/personagens.yaml.${sugerir(id, [...Object.keys(elenco), ...Object.keys(templates)])}`);
  };
  for (const s of Object.values(elenco)) {
    for (const a of s.acessorios) checar('acessório', a, cat.acessorios, `personagem ${s.id}`);
    for (const e of s.extras) checar('extra de rosto', e, cat.extras_rosto, `personagem ${s.id}`);
    checar('roupa', s.roupa, cat.roupas, `personagem ${s.id}`); checar('rosto', s.rosto, cat.rostos, `personagem ${s.id}`);
  }
  const padrao = r.padrao || {};
  let ant = {};
  const cenas = r.cenas.map((c0, i) => {
    const onde = `cena ${i + 1}`;
    const c = { ...padrao, ...(typeof c0 === 'string' ? { fala: c0 } : c0) };
    const cen = {
      idx: i, fala: c.fala ? String(c.fala) : '', dur: c.dur, som: c.som, audio: c.audio,
      cenario: c.onde ?? c.cenario ?? ant.cenario ?? 'rua', hora: c.hora ?? ant.hora ?? 'dia', seed: c.seed, cor: c.cor, chao: c.chao, parede: c.parede, tela: c.tela,
      camera: c.cam ?? c.camera ?? CAM_CICLO[i % CAM_CICLO.length][0], mov: c.mov, angulo: c.angulo ?? (c.cam || c.camera ? undefined : CAM_CICLO[i % CAM_CICLO.length][1]),
      dist: c.dist, altura: c.altura, inclinar: c.inclinar, foco: c.foco, props: c.props || [],
      multidao: c.multidao,
      texto: c.texto, texto_palanque: c.texto_palanque, palanque: c.palanque,
    };
    if (cen.multidao) {
      if (typeof cen.multidao === 'number') cen.multidao = { n: cen.multidao };
      for (const ac of [].concat(cen.multidao.acao || [])) checar('ação (multidão)', ac, cat.acoes, onde);
      if (cen.multidao.prop) checar('prop de mão (multidão)', cen.multidao.prop, cat.props_mao, onde);
    }
    const lista = c.atores === '=' ? ant.atoresBrutos : (c.atores || []);
    cen.atoresBrutos = lista;
    cen.atores = (lista || []).map(a => {
      if (typeof a === 'string') { const [id, acao, rosto] = a.trim().split(/\s+/); a = { id, acao, rosto }; }
      const s = spec(a.id, onde);
      const ator = { id: a.id, spec: s, acao: a.acao || 'parado', rosto: a.rosto, x: a.x, z: a.z, y: a.y, vira: a.vira, prop: a.prop, atraso: a.atraso,
        prop_texto: a.prop_texto, prop_cor: a.prop_cor, caminho: a.caminho, ate: a.ate, p: { vel: a.vel, ao_chegar: a.ao_chegar } };
      for (const pt of [...(a.caminho || []), ...(a.ate ? [a.ate] : [])]) if (!Array.isArray(pt) || pt.length !== 2 || pt.some(v => typeof v !== 'number'))
        throw new Error(`${onde}: ator ${a.id}: cada ponto de caminho/ate deve ser [x, z], ex.: ate: [6, -2]`);
      if (a.ao_chegar) checar('ação (ao_chegar)', a.ao_chegar, cat.acoes, onde);
      checar('ação', ator.acao, cat.acoes, onde); checar('rosto', ator.rosto, cat.rostos, onde);
      if (ator.prop) checar('prop de mão', ator.prop, cat.props_mao, onde);
      return ator;
    });
    checar('cenário', cen.cenario, cat.cenarios, onde); checar('câmera', cen.camera, cat.cameras, onde); checar('movimento', cen.mov, cat.movimentos, onde);
    checar('hora', cen.hora, cat.horas, onde);
    for (const pr of cen.props) checar('prop', pr.tipo, cat.props, onde);
    if (cen.foco && !cen.atores.some(a => a.id === cen.foco)) throw new Error(`${onde}: foco "${cen.foco}" não está nos atores da cena.`);
    ant = cen; return cen;
  });
  cenas.forEach(c => delete c.atoresBrutos);
  return { titulo: r.titulo || '', saida: r.saida, musica: r.musica, clima: r.clima, voz: r.voz, legenda: r.legenda, destaque: r.destaque || [], cenas };
}

// Baixa músicas gratuitas que viralizaram em vídeos (Kevin MacLeod / incompetech.com, licença CC BY 4.0)
// para assets/musicas/ e registra os créditos em assets/musicas/creditos.json.
// CC BY 4.0 = pode usar e monetizar, mas PRECISA dar crédito (o gerador escreve o texto em saida/<video>_descricao.txt).
//
// Uso:  node ferramentas/baixar_musicas.mjs            (todas)
//       node ferramentas/baixar_musicas.mjs sneaky_snitch investigations
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'musicas');
const BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';

// nome no projeto -> [título exato no incompetech, clima]
export const VIRAIS = {
  sneaky_snitch: ['Sneaky Snitch', 'sorrateiro/cômico — clássico de vídeos de "plano malandro"'],
  monkeys_spinning_monkeys: ['Monkeys Spinning Monkeys', 'bobo/alegre — muito usado em memes'],
  fluffing_a_duck: ['Fluffing a Duck', 'engraçado/fofo'],
  scheming_weasel: ['Scheming Weasel faster', 'trapalhada/vilão cômico'],
  pixel_peeker_polka: ['Pixel Peeker Polka - faster', 'caos cômico'],
  run_amok: ['Run Amok', 'correria cômica'],
  amazing_plan: ['Amazing Plan', 'malandro/planejando algo'],
  investigations: ['Investigations', 'mistério/investigação'],
  hitman: ['Hitman', 'suspense/ação'],
  cipher: ['Cipher', 'tensão/tecnologia'],
  volatile_reaction: ['Volatile Reaction', 'épico/tenso'],
  heartbreaking: ['Heartbreaking', 'triste/emocionante'],
  wallpaper: ['Wallpaper', 'calmo/fundo neutro'],
  local_forecast: ['Local Forecast - Elevator', 'espera/música de elevador (meme)'],
  carefree: ['Carefree', 'alegre/leve'],
};

const credito = (titulo) => `"${titulo}" Kevin MacLeod (incompetech.com)\nLicensed under Creative Commons: By Attribution 4.0 License\nhttp://creativecommons.org/licenses/by/4.0/`;

async function main() {
  const pedidos = process.argv.slice(2);
  const lista = pedidos.length ? pedidos : Object.keys(VIRAIS);
  fs.mkdirSync(DIR, { recursive: true });
  const arqCred = path.join(DIR, 'creditos.json');
  const creditos = fs.existsSync(arqCred) ? JSON.parse(fs.readFileSync(arqCred, 'utf8')) : {};
  let ok = 0, falhas = [];
  for (const nome of lista) {
    const item = VIRAIS[nome];
    if (!item) { console.log(`✖ ${nome}: não está na lista (${Object.keys(VIRAIS).join(', ')})`); continue; }
    const [titulo, clima] = item, dst = path.join(DIR, nome + '.mp3');
    creditos[nome] = { titulo, autor: 'Kevin MacLeod', licenca: 'CC BY 4.0', fonte: 'https://incompetech.com', clima, credito: credito(titulo) };
    if (fs.existsSync(dst)) { console.log(`= ${nome} (já existe)`); ok++; continue; }
    try {
      const r = await fetch(BASE + encodeURIComponent(titulo) + '.mp3', { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 50000) throw new Error('arquivo muito pequeno (link mudou?)');
      fs.writeFileSync(dst, buf); ok++;
      console.log(`✔ ${nome}  ←  "${titulo}" (${(buf.length / 1e6).toFixed(1)} MB) — ${clima}`);
    } catch (e) {
      falhas.push(titulo); delete creditos[nome];
      console.log(`✖ ${nome}: ${e.message}`);
    }
  }
  fs.writeFileSync(arqCred, JSON.stringify(creditos, null, 2));
  console.log(`\n${ok} música(s) prontas em assets/musicas/. Use no roteiro:  musica: <nome>`);
  if (falhas.length) console.log(`Baixe manualmente em https://incompetech.com/music/royalty-free/music.html (busque o título), salve em assets/musicas/<nome>.mp3:\n  ${falhas.join('\n  ')}`);
}
main();

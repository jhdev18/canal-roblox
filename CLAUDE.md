# canal-roblox — gerador local de shorts animados estilo Roblox

Pipeline: roteiro YAML → voz (ElevenLabs via .env; Piper/espeak como alternativa) → cenas 3D (three.js no Chromium, quadro a quadro) → FFmpeg (legenda palavra por palavra + música).

## Comece por aqui
Leia `docs/CONTINUAR.md`: estado atual, roteiros prontos, pendências e regras combinadas (não renderizar vídeos — o usuário gera na máquina dele; conferir só com fotos de cena via `ferramentas/folha_cenas.mjs`, e com moderação).

## Para criar um vídeo novo (economize tokens)
1. Leia **só** `docs/ROTEIRO.md` (formato + catálogo completo) e, para o estilo, `docs/REFERENCIAS.md`. Não leia `src/` para escrever roteiros.
2. Escreva `roteiros/<nome>.yaml` reaproveitando personagens de `assets/personagens.yaml`.
   **Casa / ambiente residencial:** toda cena dentro de uma casa (do protagonista, do avô, da vizinha, de um amigo…) usa a casa do protagonista do mundo (`onde: mundo`, `local: casa`, `comodo: sala | cozinha | quarto | quarto_menina | banheiro | quarto_pais | sotao`). Não crie casa nova: cada história (ou cada casa diferente dentro da mesma história, por cena) recebe outra `decoracao:` (`padrao | vovo | moderna | colorida | simples` ou um número). Antes de escolher, veja as decorações já usadas nos roteiros (`grep -h "^decoracao" roteiros/*.yaml`) e prefira uma diferente. Quarto: `quarto` para menino, `quarto_menina` para menina.
   **Câmera que mostra o lugar:** ao chegar num local novo (praça, rua, escola…), a primeira cena é um plano geral (`cam: geral`, de preferência `dist: 1.4` e `altura: 6`, com `mov: orbita`/`zoom_out`), que mostra o cenário e a multidão. Em discurso ou palco, filme por trás da plateia (`multidao: { modo: espalhado, olhar_z: <z do palco> }`, `cam: aberto`, `angulo: 0`). Alterne geral, médio e close; não faça tudo em close.
3. Valide com o rascunho grátis: `node gerar.mjs roteiros/<nome>.yaml` (erros de nome vêm com sugestão).
   A versão final (`--final`, ElevenLabs) só roda depois de um rascunho do roteiro atual — e quem renderiza é o usuário, na máquina dele. Não renderize sem ele pedir.

## Para criar um asset novo
- Personagem: só YAML em `assets/personagens.yaml` (herança com `base:`).
- Rosto: função em `src/motor/rostos.js` (EXPRESSOES) ou PNG em `assets/rostos/`.
- Ação: função em `src/motor/acoes.js` (pura, sem three.js). Acessório: `src/motor/personagem.js` (ACESSORIOS).
- Cenário: `src/motor/cenarios.js` (CENARIOS). Cidade pequena (prédios, LOTES, LOCAIS): `src/motor/cidade.js`. Interiores + móveis: `src/motor/interiores.js`; casa do protagonista: `src/motor/casa.js`; **mundo integrado** (mapa único, prédios ocos, portas, corte de paredes): `src/motor/mundo.js` (só `cenarios.js` importa esses módulos; corte/portas por quadro em `main.js` → portasECortes). Prop: `src/motor/props.js`. Câmera: `src/motor/camera.js`.
- Depois de criar/alterar assets: `node ferramentas/preview_assets.mjs [categoria]` atualiza `docs/preview/*.jpg`.
- Os catálogos/validação são gerados a partir desses objetos — não há lista duplicada para manter. Atualize `docs/ROTEIRO.md`.

## Mapa
- `gerar.mjs` CLI · `src/node/` (roteiro, tts, legendas, render, montagem) · `src/motor/` (código que roda no navegador)
- Cache em `cache/` (áudio por texto, clipe por hash da cena + código do motor). Saída em `saida/`.
- Convenções 3D: unidades = studs, Y para cima, atores perto da origem, fundo em −Z, câmera em +Z. Direita do personagem = −X.
- Teste sem GPU/voz/créditos: `--voz espeak --gpu nao --rapido`. Nunca commitar `.env`.
- Músicas: `assets/musicas/<clima>/` (escolha automática em `src/node/musica.mjs`); `original_*` são geradas por `ferramentas/compor_musicas.py` (CC0).

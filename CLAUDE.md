# canal-roblox — gerador local de shorts animados estilo Roblox

Pipeline: roteiro YAML → voz (ElevenLabs via .env; Piper/espeak como alternativa) → cenas 3D (three.js no Chromium, quadro a quadro) → FFmpeg (legenda palavra por palavra + música).

## Para criar um vídeo novo (economize tokens)
1. Leia **só** `docs/ROTEIRO.md` (formato + catálogo completo). Não leia `src/` para escrever roteiros.
2. Escreva `roteiros/<nome>.yaml` reaproveitando personagens de `assets/personagens.yaml`.
3. Valide/renderize: `node gerar.mjs roteiros/<nome>.yaml --rapido` (erros de nome vêm com sugestão).

## Para criar um asset novo
- Personagem: só YAML em `assets/personagens.yaml` (herança com `base:`).
- Rosto: função em `src/motor/rostos.js` (EXPRESSOES) ou PNG em `assets/rostos/`.
- Ação: função em `src/motor/acoes.js` (pura, sem three.js). Acessório: `src/motor/personagem.js` (ACESSORIOS).
- Cenário: `src/motor/cenarios.js` (CENARIOS). Prop: `src/motor/props.js`. Câmera: `src/motor/camera.js`.
- Os catálogos/validação são gerados a partir desses objetos — não há lista duplicada para manter. Atualize `docs/ROTEIRO.md`.

## Mapa
- `gerar.mjs` CLI · `src/node/` (roteiro, tts, legendas, render, montagem) · `src/motor/` (código que roda no navegador)
- Cache em `cache/` (áudio por texto, clipe por hash da cena + código do motor). Saída em `saida/`.
- Convenções 3D: unidades = studs, Y para cima, atores perto da origem, fundo em −Z, câmera em +Z. Direita do personagem = −X.
- Teste sem GPU/voz/créditos: `--voz espeak --gpu nao --rapido`. Nunca commitar `.env`.
- Músicas: `assets/musicas/<clima>/` (escolha automática em `src/node/musica.mjs`); `original_*` são geradas por `ferramentas/compor_musicas.py` (CC0).

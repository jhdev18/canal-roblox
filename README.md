# Canal Roblox — gerador local de shorts animados

Gera vídeos verticais (1080×1920) no estilo "animação Roblox": bonecos de bloco, narração em PT-BR, legenda palavra por palavra e cortes rápidos. **Tudo roda no seu PC** (feito para uma GTX 1050 Ti 4 GB).

```
roteiro.yaml ─► voz (ElevenLabs) ─► cenas 3D (three.js) ─► FFmpeg ─► saida/video.mp4
```

Cada vídeo é só um arquivo YAML curto. Personagens, rostos, cenários, ações e câmeras são **assets reutilizáveis**, e cenas e áudios já gerados ficam em cache (refazer um vídeo mudando uma fala só renderiza aquela cena).

## Instalação (Windows)

1. **Node.js 20+**: https://nodejs.org
2. **FFmpeg**: `winget install Gyan.FFmpeg` (feche e abra o terminal depois)
3. **Voz (ElevenLabs):** copie `.env.exemplo` para `.env` e cole sua chave (`ELEVENLABS_API_KEY=...`).
   Depois liste suas vozes e coloque o id escolhido em `voz.voice_id` no `config.yaml`:
   ```bash
   node gerar.mjs --vozes
   ```
   O `.env` fica fora do git. Cada fala é gerada **uma única vez** e guardada em `cache/audio` (não gasta créditos de novo),
   e a legenda usa o tempo **exato** de cada palavra devolvido pelo ElevenLabs.
   Para rascunhos sem gastar créditos: `--voz espeak`. Voz local alternativa: Piper (`pip install piper-tts`, `voz.motor: piper`).
4. Na pasta do projeto:
   ```bash
   npm install
   ```
   ```bash
   npx playwright install chromium
   ```

## Uso

```bash
node gerar.mjs roteiros/exemplo_inimigo.yaml
```

| comando | o que faz |
|---|---|
| `node gerar.mjs <roteiro> --preview` | abre uma prévia ao vivo no navegador (com voz e legenda), sem renderizar |
| `node gerar.mjs <roteiro> --rapido` | 540×960 sem AO, para conferir rápido |
| `node gerar.mjs <roteiro> --cenas 3-5` | só essas cenas (`saida/<nome>_parcial.mp4`) |
| `node gerar.mjs <roteiro> --voz espeak` | voz robótica grátis (rascunho, não gasta créditos) |
| `node gerar.mjs --vozes` | lista as vozes da sua conta ElevenLabs |
| `node gerar.mjs --musicas` | lista as músicas de fundo disponíveis |
| `node gerar.mjs <roteiro> --encoder h264_nvenc` | codifica o vídeo na GPU (mais rápido) |
| `npm run catalogo` | lista todos os cenários, ações, rostos, acessórios, personagens… |

**Ver todos os assets:** `docs/preview/geral.jpg` (tudo numa imagem) e as pranchas por categoria em [`docs/preview/`](docs/preview/) (personagens, rostos, acessórios, roupas, ações, cenários, prédios, locais, telas, props).

**Como escrever roteiros:** veja [`docs/ROTEIRO.md`](docs/ROTEIRO.md) e o exemplo em `roteiros/exemplo_inimigo.yaml`.

## Música (automática)

O vídeo já sai **pronto: imagem + narração + música**. A música é escolhida sozinha:

1. **Clima:** detectado pelas falas e cenários da história ("hospital", "morreu" → triste; "segredo", "inimigo" → suspense…).
   Para forçar, use `clima: triste` no roteiro.
2. **Faixa:** sorteada da pasta `assets/musicas/<clima>/`, em rodízio para não repetir entre vídeos.
   Renderizar o mesmo vídeo de novo mantém a mesma música.
3. **Mixagem:** pula a introdução parada da música, faz fade, e abaixa a música enquanto a voz fala (ducking).

Pastas de clima: `suspense, triste, alegre, engracado, epico, curioso, calmo, perseguicao`.

**Coloque suas músicas populares nessas pastas uma vez**, e todos os vídeos passam a usá-las. Elas têm prioridade sobre
as trilhas `original_*` que vêm com o projeto (que só entram quando a pasta não tem outra faixa).
Para não ter problema de direitos nem precisar de crédito, use músicas **instrumentais** marcadas como
"atribuição não obrigatória", por exemplo:
- **YouTube Studio → Biblioteca de áudio**: filtre por *Atribuição não obrigatória* e escolha gênero/clima.
- **Pixabay Music**: licença livre, sem crédito.

`node gerar.mjs --musicas` mostra o que há em cada pasta. No roteiro: `musica: nenhuma` desliga, e
`musica: <nome do arquivo>` força uma faixa específica.

## GPU (importante)

No início do render aparece uma linha `GPU: ...`.
- `ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti ...)` → ótimo, está usando a placa.
- `SwiftShader` → está renderizando por software (muito mais lento). Tente `--navegador chrome` (usa o Google Chrome instalado) e, no **Painel de Controle NVIDIA → Gerenciar configurações 3D → Configurações de programa**, coloque o Chrome/Chromium em "Processador NVIDIA de alto desempenho".

Referência de velocidade: no servidor de teste, **sem GPU**, 20 s de vídeo levaram ~1 min em `--rapido`. Na 1050 Ti a qualidade final deve ficar perto do tempo real (estimativa).

## Adicionando assets

| quero… | onde |
|---|---|
| novo personagem | `assets/personagens.yaml` (só YAML, herda com `base:`) |
| rosto desenhado por mim | `assets/rostos/<nome>.png` (quadrado, fundo transparente) → `rosto: <nome>` |
| música de fundo | `assets/musicas/<nome>.mp3` → `musica: <nome>` no roteiro |
| efeito sonoro | `assets/sfx/<nome>.mp3` → `som: <nome>` na cena |
| fonte da legenda | `.ttf` em `assets/fontes/` + `legenda.fonte` no `config.yaml` |
| nova ação, cenário, acessório… | `src/motor/` (veja `CLAUDE.md`) |

## Estrutura

```
gerar.mjs            CLI
config.yaml          resolução, voz, legenda, áudio
assets/              personagens.yaml, rostos/, musicas/, sfx/, fontes/, vozes/
roteiros/            um .yaml por vídeo
src/motor/           motor 3D (three.js): personagem, rostos, acoes, cenarios, props, camera
src/node/            roteiro, tts, legendas, render, montagem
cache/  saida/       gerados automaticamente (fora do git)
```

# Canal Roblox — gerador local de shorts animados

Gera vídeos verticais (1080×1920) no estilo "animação Roblox": bonecos de bloco, narração em PT-BR, legenda palavra por palavra e cortes rápidos. **Tudo roda no seu PC** (feito para uma GTX 1050 Ti 4 GB).

```
roteiro.yaml ─► voz (Piper) ─► cenas 3D (three.js) ─► FFmpeg ─► saida/video.mp4
```

Cada vídeo é só um arquivo YAML curto. Personagens, rostos, cenários, ações e câmeras são **assets reutilizáveis**, e cenas e áudios já gerados ficam em cache (refazer um vídeo mudando uma fala só renderiza aquela cena).

## Instalação (Windows)

1. **Node.js 20+**: https://nodejs.org
2. **FFmpeg**: `winget install Gyan.FFmpeg` (feche e abra o terminal depois)
3. **Python 3.10+** e o Piper (voz neural local):
   ```bash
   pip install piper-tts
   ```
4. Na pasta do projeto:
   ```bash
   npm install
   ```
   ```bash
   npx playwright install chromium
   ```
   ```bash
   python -m piper.download_voices pt_BR-faber-medium --download-dir assets/vozes
   ```
   Outras vozes PT-BR: `pt_BR-cadu-medium`, `pt_BR-jeff-medium` (mude `voz.modelo` no `config.yaml`).
   Se `python` não funcionar, troque `voz.comando` para `[py, -m, piper]`.

## Uso

```bash
node gerar.mjs roteiros/exemplo_inimigo.yaml
```

| comando | o que faz |
|---|---|
| `node gerar.mjs <roteiro> --preview` | abre uma prévia ao vivo no navegador (com voz e legenda), sem renderizar |
| `node gerar.mjs <roteiro> --rapido` | 540×960 sem AO, para conferir rápido |
| `node gerar.mjs <roteiro> --cenas 3-5` | só essas cenas (`saida/<nome>_parcial.mp4`) |
| `node gerar.mjs <roteiro> --voz espeak` | voz robótica, sem precisar do Piper |
| `node gerar.mjs <roteiro> --encoder h264_nvenc` | codifica o vídeo na GPU (mais rápido) |
| `npm run catalogo` | lista todos os cenários, ações, rostos, acessórios, personagens… |

**Como escrever roteiros:** veja [`docs/ROTEIRO.md`](docs/ROTEIRO.md) e o exemplo em `roteiros/exemplo_inimigo.yaml`.

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

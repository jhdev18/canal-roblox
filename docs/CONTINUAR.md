# Para continuar numa conversa nova

Leia este arquivo primeiro. Ele resume o que já existe, as regras de trabalho combinadas e o que falta.

## Regras de trabalho (combinadas com o dono do canal)
- **Não renderizar vídeos.** Quem gera os vídeos é o usuário, na GTX 1050 Ti. Para conferir, use só fotos de cena (ferramentas abaixo) e só quando necessário — imagens deixam a conversa cara.
- Todo vídeo tem **rascunho primeiro** (`node gerar.mjs roteiros/x.yaml`, voz grátis). A versão final (`--final`, ElevenLabs) só depois do rascunho aprovado.
- A chave do ElevenLabs fica **só** no `.env` do usuário. Nunca commitar `.env`.
- Responder em português, de forma direta. Agrupar ajustes; evitar ciclos longos de teste.
- Branch de trabalho: `claude/youthful-ride-6o7mku`. Commitar e dar push ao fim de cada etapa.

## Onde está cada coisa
- Formato do roteiro e catálogo completo: `docs/ROTEIRO.md` (leia antes de escrever roteiro; não precisa ler `src/`).
- Concorrentes (narrações reconstruídas e a fórmula): `docs/REFERENCIAS.md`.
- Histórias originais aprovadas: `docs/HISTORIAS.md`.
- Mapa do mundo integrado: `docs/preview/mapa_mundo.jpg`; interiores: `docs/preview/interiores_mundo.jpg`; assentos: `docs/preview/assentos_mundo.jpg`.
- Conferir sem gerar vídeo:
  - `node ferramentas/folha_cenas.mjs roteiros/x.yaml saida.jpg 1-16` → 1 foto por cena (no máx. 16 por folha).
  - `node ferramentas/quadros_cena.mjs roteiros/x.yaml saida.jpg 3,7` → cada cena em 0 s / 1,5 s / 3 s.
  - `node ferramentas/preview_assets.mjs [categoria]` → atualiza `docs/preview/*.jpg`.
  - `node ferramentas/tremor.mjs roteiros/x.yaml [1-14]` → **sem imagens**: mede quanto cada quadro muda do anterior e aponta PICOS (objeto que pisca, câmera entrando em móvel). Rode depois de mexer em câmera, cortes ou cômodos.
  - `node ferramentas/conferir_mundo.mjs [hora]` → **sem imagens**: lista construções sobrepostas, objetos dentro de construções, construções baixas demais , móveis atravessando móveis e janelas abaixo da cabeça. Rode depois de mexer no mundo, em prédios ou em móveis (tem que dar tudo 0).
- Validar roteiro sem render: `node -e "import('./src/node/roteiro.mjs').then(m=>m.carregarRoteiro('roteiros/x.yaml'))"`.

## Roteiros prontos para rascunho (todos no mundo integrado)
| Roteiro | Formato | Situação |
|---|---|---|
| `quem_salva_sua_vida_mundo.yaml` | curto, 15 cenas | conferido cena a cena |
| `fantasmas_seu_nono.yaml` | curto, 14 cenas (comédia em lista) | conferido |
| `numero_do_davi.yaml` | curto, 14 cenas (emoção; substitui o antigo `reflexo_adiantado`, removido porque reflexos não ficam bons) | conferido |
| `nuvem_da_bia.yaml` | curto, 15 cenas (terror → emoção) | conferido |
| `quem_boceja_dorme.yaml` | longo, 48 cenas (~2 min, comédia em cadeia) | conferido |
| `peso_das_promessas.yaml` | longo, 48 cenas (~2 min, aventura) | conferido; cenas do telhado (33–41) ajustadas por último |

Quando o usuário mandar o retorno do rascunho, ajuste **só** as cenas citadas.

## Escala (regra do mundo)
Personagem 5,2 de altura. Andar de casa 7 studs, porta 6,2, janela de 3 a 6 (vitrine de 0,9 a 5,8), prédio com andares de 6,4, toldo de loja a 6,6. Cama de solteiro 2,9×6,2, casal 4,8×6,2.

## Recursos que os roteiros já podem usar (resumo — detalhes em `docs/ROTEIRO.md`)
- Casa do protagonista: cômodos refeitos + `sotao`; cada história nova usa uma `decoracao:` diferente (padrao, vovo, moderna, colorida, simples ou um número). `quarto` = menino, `quarto_menina` = menina.
- Casa do protagonista ampliada (cômodos 1,6× × 1,45×, pé-direito 9) para a câmera caber dentro dos cômodos.
- Mundo integrado: `onde: mundo` + `local:` (+ `dentro: true` / `comodo:`). Prédios grandes, móveis na escala do personagem, assentos reais (`sentar`), filas com curva, portas automáticas, corte de parede, ninguém atravessa obstáculo.
- `sobre:` = a regra visível acima da cabeça (`zzz`, `{ texto }`, ou prop como `nuvem_cabeca`, `pedra`, `saco_pedras`, com `altura/x/z/escala/fixo`).
- `spec:` no ator (ajuste só na cena), `alvo_xz:` na cena (para onde a câmera mira), `hora: vermelho` (céu em chamas).
- Multidão `modo: natural` (sozinhos, conversas soltas, quem passa, quem senta).
- Personagens especiais: `fantasma: true` (evite histórias com reflexo/espelho: ficam estranhas). `pet_sobre:` põe um número/indicador em cima do animal. Ações novas: `bocejar`, `cochilar`, `nadar`.

## Narração pelo site do ElevenLabs (plano grátis)
A API do plano grátis não aceita vozes da biblioteca, por isso `voz.motor: site` no config.yaml (padrão): a versão final NUNCA chama a API; sem `audios/<nome>.mp3` ela para e explica. Fluxo: `node gerar.mjs roteiros/x.yaml --texto-site [v4|corrido]` → `audios/x.txt` (falas separadas por `<break time="1.2s" />`, `[long pause]` no v4, ou sem pausas com `corrido`; o corte acha as trocas de cena pela quantidade de texto + silêncio entre frases) → o usuário cola no site (modelo **Eleven Multilingual v2**), baixa o MP3 e salva como `audios/x.mp3` → `node gerar.mjs roteiros/x.yaml` (rascunho) e `--final`: o áudio é cortado nas pausas (uma parte por cena) e a legenda segue a duração de cada parte. Código: `src/node/narracao_site.mjs`. A pasta `audios/` não vai para o git.

## Música
- Trilha embutida só com faixas livres (originais CC0 em `assets/musicas/`, Biblioteca de áudio do YouTube, Pixabay, NCS). Lançamentos comerciais (ex.: "pickled chicken", DistroKid, ℗ bigfrozenballs) **não** entram no vídeo: o usuário adiciona pelo editor de Shorts do app, e só em Shorts de até 1 min.
- `--sem-musica` gera `_sem_musica.mp4`; `--duas-versoes` gera os dois.

## Efeitos sonoros
- Marcados com moderação (`som:` na cena; toca no início dela): 3–5 nos curtos, 6–7 nos longos — gancho, viradas e ações (freada, ronco, notificação).
- Arquivos esperados em `assets/sfx/` (baixar do Pixabay Sound Effects ou da Biblioteca de áudio do YouTube): boom, whoosh, drama, susto, suspense, pop, boing, notificacao, freada, ronco, bocejo, chuva, trovao, agua. Efeito sem arquivo fica de fora (o `gerar.mjs` avisa).

## Pendências
1. **Músicas:** o usuário vai escolher faixas. Colocar em `assets/musicas/<clima>/` e registrar origem/licença em `assets/musicas/LICENCA.md`.
2. **Escola, hospital e delegacia com vários cômodos** (corredor, salas, cantina, enfermaria…). Atenção: as tentativas anteriores foram cortadas pelo filtro de segurança várias vezes; fazer em passos pequenos, começando pela escola (só paredes internas), e deixar a delegacia por último ou pular.
3. **Movimento automático nas ruas** (figurantes e carros por padrão) — o usuário pediu para deixar de fora por enquanto.
4. Cenários antigos fora do mundo (`hospital`, `escola`, `interior_*`) continuam simples; roteiros novos devem usar `onde: mundo`.

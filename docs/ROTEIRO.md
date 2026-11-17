# Formato do roteiro (referência completa)

Um vídeo = um arquivo `roteiros/<nome>.yaml`. Saída: `saida/<nome>.mp4`.
Lista atualizada de tudo que existe: `npm run catalogo`. **Prévia visual de cada asset:** `docs/preview/*.jpg` (gere de novo com `node ferramentas/preview_assets.mjs`).

```yaml
titulo: Nesse mundo todos sabem quem é seu inimigo
destaque: [inimigo]        # (opcional) palavras da legenda em amarelo
clima: suspense            # (opcional) suspense, triste, alegre, engracado, epico, curioso, calmo, perseguicao (omitido = detectado pelas falas)
musica: auto               # (opcional) auto (padrão) | nenhuma | <nome de um arquivo em assets/musicas>
padrao: { hora: dia }      # (opcional) valores aplicados a todas as cenas
voz: { velocidade: 1.15 }  # (opcional) sobrescreve config.yaml > voz (ex.: outro voice_id do ElevenLabs)
legenda: { tamanho: 100 }  # (opcional) sobrescreve config.yaml > legenda

elenco:                    # (opcional) apelidos -> personagens de assets/personagens.yaml
  garoto: noob
  pai: { base: pai, camisa: vermelho }   # herda e muda o que quiser

cenas:                     # 1 cena = 1 corte (~1–2 s, 3–7 palavras)
  - fala: Nesse mundo, todo mundo recebe uma mensagem
    onde: rua              # cenário (herda da cena anterior se omitido)
    cam: medio             # enquadramento (omitido = alterna automaticamente)
    mov: zoom_in           # movimento de câmera (padrão: zoom_in leve)
    atores: [garoto celular malandro]    # forma curta: "id ação rosto"
```

> Se a fala tiver `:` ou começar com aspas, coloque a fala entre aspas: `fala: "Ele disse: corre!"`

## Campos da cena

| campo | valores | padrão |
|---|---|---|
| `fala` | texto narrado e legendado | — (sem fala = só imagem, use `dur`) |
| `onde` | rua, parque, fachada, sala, quarto, escola, hospital, casamento, **cidade, praca, prefeitura, gabinete**, celular, vazio | cena anterior / rua |
| `hora` | dia, tarde, noite | cena anterior / dia |
| `cam` | detalhe, close, medio, aberto, geral, baixo, alto, lado, costas | alterna |
| `mov` | fixo, zoom_in, zoom_out, zoom_rapido, pan, orbita, tremor, seguir, subir, descer | zoom_in |
| `angulo` | graus em volta do alvo (0 = de frente, 90 = pela direita) | varia |
| `dist` | multiplica a distância da câmera (0.8 = mais perto) | 1 |
| `altura` / `inclinar` | sobe o ponto mirado / gira a câmera (graus, efeito "dutch") | 0 |
| `foco` | id do ator que a câmera segue/mira | centro do grupo |
| `atores` | lista (abaixo) ou `=` para repetir os da cena anterior | [] |
| `props` | `[{tipo: carro, x: 4, z: -6, vira: 90, cor: vermelho}]` | [] |
| `tela` | só com `onde: celular` (abaixo) | — |
| `som` | efeito em assets/sfx/<nome>.mp3 tocado no início da cena | — |
| `dur` | duração fixa em segundos | duração da fala + 0,12 s |
| `audio` | caminho de um áudio gravado por você (substitui a voz gerada) | — |
| `cor`, `chao`, `parede`, `seed` | personalizam o cenário | — |
| `texto` | texto do outdoor (cidade), da estátua (praça) ou da fachada (prefeitura) | — |
| `texto_palanque` / `palanque: false` | placa do palanque da prefeitura / remove o palanque | PREFEITURA |
| `multidao` | figurantes gerados automaticamente (abaixo) | — |

## Atores

Forma curta: `"id ação rosto"`, ex.: `garoto chorar` ou `pai bravo bravo`.
Forma longa: `{ id: pai, acao: andar, rosto: feliz, x: 3, z: 0, vira: 90, vel: 8, prop: espada, atraso: 0.3 }`

### Movimentação (trajetos)

Ações que andam: andar, correr, andar_confiante, andar_celular, correr_medo, fugir, carregar.

```yaml
atores:
  - { id: prefeito, acao: andar_confiante, x: -8, z: 2, ate: [2, 1], ao_chegar: acenar_multidao }   # vai até o ponto e acena
  - { id: ladrao, acao: fugir, x: 4, caminho: [[-6, 0], [-14, 3]], vel: 14 }                        # vários pontos, vira sozinho nas curvas
```

- `ate: [x, z]` = um destino; `caminho: [[x, z], ...]` = vários pontos. O ator começa em `x`/`z` e vira na direção de cada trecho.
- `ao_chegar:` ação ao terminar o trajeto (padrão `parado`). Combine com `mov: seguir` + `foco:` para a câmera acompanhar.

### Multidão (figurantes)

```yaml
multidao: { n: 14, area: [-12, 12, 4, 12], olhar_z: -3, acao: [palmas, comemorar, acenar], prop: bandeirinha }
multidao: { n: 10, acao: [bravo, parado], prop: cartaz, prop_texto: ["FORA!", "QUEREMOS ÁGUA"] }   # protesto
```

`n` (até 40), `area: [x_min, x_max, z_min, z_max]`, `olhar_z` (todos olham para esse ponto em z), `acao` (sorteada entre as da lista), `prop`/`prop_texto`, `rosto`. Figurantes não precisam de elenco, e a câmera não os usa para enquadrar. Para mostrar a multidão inteira, use `cam: geral`.

- `x` esquerda(−)/direita(+) da tela, `z` fundo(−)/frente(+). Sem `x` = distribui automaticamente.
- `vira`: 0 = olha para a câmera, 90 = vira para a direita da tela, −90 = esquerda, 180 = de costas.
- `andar`/`correr` andam na direção de `vira` (`vel` em studs/s). Use `mov: seguir` para a câmera acompanhar.
- `deitar`/`dormir` vão sozinhos para a cama (quarto, hospital) e `sentar` para o sofá/banco/cadeira do cenário; informe `y` para posicionar manualmente.
- Algumas ações já trocam o rosto (chorar→chorando, assustar→assustado…) e põem objeto na mão (celular).

**Ações:** parado, falar, andar, correr, acenar, celular, digitar, sentar, deitar, dormir, assustar, chorar, triste, bravo, comemorar, pular, apontar, abracar, olhar_redor, cair, dancar, pensar, socar, palmas, ajoelhar, empurrar, tremer,
discursar, acenar_multidao, apertar_mao, continencia, andar_confiante, andar_celular, correr_medo, fugir, carregar, entrevistar, filmar, assinar, cochichar, maos_pra_cima, implorar, espiar, agachar, comemorar_vitoria, rir, negar, concordar, cocar_cabeca, girar, desmaiar

**Rostos:** neutro, feliz, sorriso, rindo, malandro, desconfiado, triste, chorando, assustado, surpreso, bravo, dormindo, apaixonado, nervoso, morto, pensativo, confiante (+ qualquer `assets/rostos/<nome>.png`)

**Objetos de mão (`prop`):** celular, espada, presente, flor, livro, dinheiro, microfone, filmadora, caixa, caneta, maleta, prancheta, bandeirinha (`prop_cor`), cartaz (`prop_texto: "FORA!"`)

Âncoras automáticas: `discursar` vai para o palanque (prefeitura), `sentar`/`assinar` para a mesa do gabinete.

## Tela de celular (`onde: celular`)

```yaml
tela: { tipo: mensagem, de: Mãe, mensagens: [{texto: "Cadê você?"}, {texto: "Tô chegando", eu: true}] }
tela: { tipo: notificacao, app: Destino, titulo: Seu inimigo, texto: PAI }
tela: { tipo: alarme, hora: "06:30" }
tela: { tipo: ligacao, nome: Desconhecido }
```

## Personagens (`assets/personagens.yaml`)

Prontos: noob, garoto, amigo, pai, pai_terno, mae, menina, noiva, nerd, valentao, medico, professora, padre, vovo, rei, policial, anjo, demonio, bebe, gamer,
prefeito, primeira_dama, vice_prefeito, candidato_rival, assessor, seguranca, reporter, cinegrafista, empresario, gari, bombeiro, taxista, vendedor, ladrao, cidadao, cidada, idosa, crianca

Campos: `pele, camisa, calca, rosto, extras, acessorios, roupa, cabelo_cor, escala, mangas, bone_cor, laco_cor, capa_cor, gravata_cor, mochila_cor, chifre_cor, vestido_cor`

- **extras (rosto):** barba, bigode, oculos, oculos_escuros, sardas, blush, mascara, cicatriz, cilios
- **acessorios:** cabelo_curto, cabelo_espetado, cabelo_baguncado, cabelo_longo, cabelo_grisalho, rabo_de_cavalo, coque, careca_lados, bone, boina, touca, cartola, coroa, laco, chifres, veu, capacete, capacete_bombeiro, fone, gravata, faixa_prefeito (`faixa_cor`, `faixa_cor2`), broche, colete (`colete_cor`), mochila, capa, asas, aureola
- **roupa:** terno, jaleco, listrada, uniforme, regata, vestido
- **cores:** amarelo, azul, azul_claro, verde, verde_noob, verde_claro, vermelho, vinho, preto, branco, cinza, cinza_escuro, rosa, rosa_claro, roxo, laranja, marrom, bege, ciano, dourado, pele_clara, pele_media, pele_escura — ou `"#rrggbb"`

## Props de cenário

arvore, pinheiro, arbusto, casa, predio, poste, carro, banco, mesa, carteira, cadeira, cama, sofa, tv, computador, planta, presente, caixa_correio, cerca, porta, caixao, bolo,
semaforo (`luz: verde`), onibus (`texto`), taxi, viatura, hidrante, lixeira, faixa_pedestre, loja (`texto`, `cor`), arranha_ceu, fonte, estatua (`texto`), bandeira (`cores`), palanque (`texto`), barraca, outdoor (`texto`), mesa_escritorio, poltrona, estante, quadro_parede (`texto`)

## Música

Automática: escolhe uma faixa de `assets/musicas/<clima>/` (suas faixas antes das `original_*`), em rodízio entre vídeos, pulando a introdução e com ducking. `clima:` força o clima; `musica: nenhuma` desliga.

## Dicas de estilo (o que funciona nesse formato)

- Gancho na 1ª cena ("Nesse mundo…", "E se…"), cortes a cada 1–2 s, 10–16 cenas (~20–30 s).
- Alterne `close` (emoção) com `medio`/`aberto` (situação). `zoom_rapido` + `tremor` em revelações.
- Use `celular` com `tela` para mostrar a informação-chave da história.

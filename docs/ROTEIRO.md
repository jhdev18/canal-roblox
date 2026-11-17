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

## Mundo integrado (recomendado)

Um mapa único e contínuo, como um mapa do Roblox: **praça no centro** (coreto, fonte, estátua, jardins, parquinho, bancos, pipoqueiro),
prédios em volta **ocos por dentro e por fora no mesmo lugar** (prefeitura com gabinete, igreja, banco, **escola, posto de saúde e delegacia
com vários cômodos**, padaria, farmácia, lotérica, bar, mercado), uma rua de bairro a leste com a **casa do protagonista**
(térrea, 5 cômodos ligados por portas) e o posto de gasolina.

```yaml
- onde: mundo
  local: farmacia                 # em frente à fachada, na calçada
  foco: idosa
  mov: seguir
  atores: [{ id: idosa, acao: andar, x: -3, z: 3, vira: 180, caminho: [[-3, -4], [-1, -5.6]], ao_chegar: pagar }]   # entra pela porta, plano contínuo
- dentro: true                    # mesma farmácia, agora por dentro (sem `onde:` continua no mesmo lugar)
  atores: [medico atender]
- onde: mundo
  local: casa
  comodo: quarto                  # sala | cozinha | quarto | banheiro | quarto_pais
  atores: [garoto jogar_pc]
- onde: mundo
  local: escola
  comodo: biblioteca              # corredor | sala_aula | biblioteca | diretoria | cantina
  atores: [menina sentar]
- onde: mundo
  local: posto_saude
  comodo: enfermaria              # recepcao | corredor | consultorio | sala_exames | enfermaria
  atores: [valentao deitar]
- onde: mundo
  local: delegacia
  comodo: carceragem              # recepcao | corredor | sala_delegado | interrogatorio | carceragem
  atores: [ladrao segurar_grade, policial]
- onde: mundo
  local: vista                    # cidade inteira de cima (cam: alto + dist: 7)
```

**Locais:** prefeitura, igreja, banco, escola, posto_saude, padaria, farmacia, loterica, bar, mercado, delegacia, casa (todos com `dentro: true`),
praca, coreto, fonte, parquinho, estatua, rua_bairro, campinho (campo de futebol do bairro, entre o mercadinho e a borracharia, com gramado dos lados), posto_gasolina, vista.

- **Escala:** tudo é medido pelo personagem (5,2 de altura, 2 de largura; ~3 studs por metro). Portas com 6,2 de altura, assentos com 2,2–2,4 de largura na altura da pose `sentar`, bancadas de cozinha na cintura. Ao criar móvel novo, siga essas medidas e não use escala menor que 1 em móveis de uso.
- **Tamanho dos prédios:** ambientes grandes, no estilo Roblox (farmácia 18×18 com teto de 10; prefeitura 32×22; igreja 20×32 com teto de 15; escola 30×40, posto de saúde 24×40 e delegacia 24×34, com cômodos). A praça tem um calçadão arborizado em volta, depois o anel de ruas.
- **Mapa com os nomes:** `docs/preview/mapa_mundo.jpg`. Interiores de todos os prédios: `docs/preview/interiores_mundo.jpg`. Câmera de cima para cenas: `cam: mapa` (e `alvo_xz: [x, z]` para escolher o centro).
- **Só o local gravado existe na cena:** o resto do mundo é removido ao montar cada cena (mais leve para a GPU).
  Alcance padrão: 80 na calçada, 45 dentro de prédio, só a casa num cômodo, mapa inteiro na `vista`. Mude com `alcance: 120` na cena.
- **Portas abrem sozinhas** quando alguém chega perto e fecham depois. A porta fica em `x` = −4,8 na farmácia/padaria, 0 na lotérica/banco/posto de saúde/igreja/prefeitura, −1 na escola, −8,6 no mercado, 0 na delegacia, −3,5 no bar e −6 na casa (em relação ao ponto da calçada).
- **Paredes e tetos somem sozinhos** quando ficam entre a câmera e o ator ou logo ao lado dele (vista em corte), e voltam depois. Com `foco:`, só o ator em foco abre o corte.
- Dentro da casa, os móveis dos outros cômodos ficam escondidos para não atrapalhar a câmera.
- **Cômodos (`comodo:`)** existem na casa, na escola, no posto de saúde e na delegacia (fotos: `docs/preview/comodos.jpg`). `dentro: true` sem `comodo:` entra no cômodo padrão:
  casa → `sala`, escola → `sala_aula`, posto_saude → `recepcao`, delegacia → `recepcao`. Numa cena de cômodo, somem os móveis dos cômodos que ficam entre ele e a câmera, e as âncoras/assentos são só os daquele cômodo.
  - **Escola** (30×40, teto 10): a porta da frente dá no hall, que vira o **corredor** (armários coloridos, bebedouro, portas com placa SALA 1 e BIBLIOTECA);
    na frente ficam a **diretoria** (mesa, poltrona, bandeiras, estante; `sentar`/`assinar` = poltrona da diretora) e a **cantina** (balcão de lanches, `atender` atrás dele, `fila`, mesa de refeitório com bancos);
    no fundo a **sala_aula** (quadro-negro, mesa da professora, 8 carteiras; `sentar` = carteiras, alunos de costas — use `angulo: 180` para vê-los de frente) e a **biblioteca** (estantes de livros, mesa de leitura; `sentar` = cadeiras do lado de lá da mesa, de frente para a câmera).
  - **Posto de saúde** (24×40, teto 10): **recepcao** (balcão com `atender`, `fila`, cadeiras de espera), **corredor** com o **consultorio** à esquerda
    (médico e paciente frente a frente na mesa: `sentar`; maca no fundo: `deitar`) e a **sala_exames** à direita (maca: `deitar`, monitor cardíaco, raio-x, balança), e a **enfermaria** no fundo
    (3 leitos com biombos, soro e monitor; `sentar` = sentado no leito do meio, `deitar` = deitado nele).
  - **Delegacia** (24×34, teto 10): **recepcao** (plantão 24h: balcão com `atender`, `fila`, cadeiras de espera, mural PROCURADOS), **corredor** com a
    **sala_delegado** à esquerda (mesa, poltrona, bandeira; `sentar`/`assinar`/`atender` = poltrona do delegado) e o **interrogatorio** à direita
    (mesa no meio com luz pendente e vidro espelhado; `sentar` = cadeira do suspeito, de perfil — o policial fica do outro lado), e a **carceragem** no fundo
    (3 celas com grades de frente para a câmera; `segurar_grade` = preso na cela do meio, `sentar` = banco da cela, `atender` = carcereiro do lado de fora).
    As grades nunca somem no corte (dá para ver o preso através delas).
- Todas as âncoras continuam funcionando (`atender`, `fila: N`, `rezar`, `segurar_grade`, `sentar`, `deitar`, `jogar_pc`, `cozinhar`…).
- **Assentos de verdade:** no mundo, `sentar` e `rezar` usam os assentos reais (cadeiras, carteiras, cadeiras de espera, bancos da igreja, da praça e do refeitório, sofá, poltrona, banquetas, leitos). Cada personagem pega o assento livre mais perto do ponto principal; vários sentados não se sobrepõem.

## Cidade pequena (cenários separados, versão anterior)

`cidade_pequena` é um modelo de cidade de interior com praça e coreto no centro, igreja matriz e prefeitura de frente para a praça,
comércio em volta, ruas de saída, casas e posto de gasolina. Cada cena escolhe **onde** dentro dessa cidade:

```yaml
- onde: farmacia            # atalho = onde: cidade_pequena + local: farmacia
  atores: [idosa acenar]
- onde: cidade_pequena
  local: vista              # a cidade inteira vista de cima
  cam: alto
  dist: 6
  mov: orbita
```

**Locais:** prefeitura, igreja, banco, escola, posto_saude, padaria, farmacia, loterica, bar, mercado, delegacia, posto_gasolina, praca_central, coreto, vista
(`prefeitura` e `escola` sozinhos continuam sendo os cenários grandes antigos; para a versão da cidade pequena use `onde: cidade_pequena` + `local: prefeitura`).
O ator fica na calçada, em frente à fachada, e a câmera de frente para o prédio.

**Por dentro:** acrescente `dentro: true` (ou use direto `onde: interior_<local>`):
```yaml
- onde: farmacia
  dentro: true
  atores: [medico atender, { id: idosa, acao: pagar, x: 3, vira: -150 }]   # atender vai sozinho para trás do balcão
```
Interiores: farmacia, loterica, padaria, mercado, banco, prefeitura (recepção), igreja (nave com bancos e altar), posto_saude (recepção + maca),
delegacia (balcão + cela), bar (balcão, garrafas, TV no futebol, sinuca), posto_gasolina (conveniência), escola (= sala de aula `escola`).
Âncoras: `atender` vai para trás do balcão/guichê; `sentar` para as cadeiras de espera, banquetas do bar ou mesas da padaria;
`rezar` para o banco da igreja; `segurar_grade` para dentro da cela; `deitar` para a maca do posto de saúde. Cenas seguidas sem `onde:` continuam no mesmo local.
O motor esconde sozinho o que ficar entre a câmera e os atores (postes, árvores, figurantes); use `liberar_visao: false` para desligar.

## Casa do protagonista (ambiente completo)

Uma casa inteira de 2 andares (frente aberta, como set de filmagem): **térreo** garagem · sala · cozinha, **andar de cima** banheiro · quarto · quarto_pais.

```yaml
- onde: casa_protagonista
  comodo: quarto              # quarto | quarto_pais | sala | cozinha | banheiro | garagem | vista
  atores: [garoto jogar_pc]   # vai sozinho para a cadeira gamer, de frente para o PC
- comodo: sala                # sem `onde:` continua na mesma casa
  atores: [pai sentar, mae falar]
- onde: casa_protagonista
  comodo: vista               # a casa inteira em corte (casa de bonecas). Use cam: geral + dist: 2.6
```
Âncoras: quarto (`deitar`/`dormir` na cama, `sentar`/`jogar_pc` na cadeira gamer), quarto_pais (`deitar`/`dormir` na cama de casal),
sala (`sentar` no sofá), cozinha (`sentar` na mesa, `cozinhar` no fogão, `lavar_louca` na pia). A câmera não sai do cômodo.

## Filas

`fila: 6` coloca 6 pessoas do elenco em fila (cada uma olhando para a da frente, esperando, mexendo no celular…)
em lotérica, banco, mercado, padaria, farmácia e posto de saúde (por dentro). Forma longa: `fila: { n: 5, personagens: [idosa, gari], espaco: 2.5 }`.
Dica: `cam: aberto` + `angulo: -55` mostra a fila de lado.

```yaml
- onde: loterica
  dentro: true
  fila: 6
  atores: [cidada atender]
```

## Campos da cena

| campo | valores | padrão |
|---|---|---|
| `fala` | texto narrado e legendado | — (sem fala = só imagem, use `dur`) |
| `onde` | rua, parque, fachada, sala, quarto, escola, hospital, casamento, **cidade_pequena** (+ `local`), cidade, praca, praca_cheia, prefeitura, gabinete, centro, bairro, quintal, cozinha, campinho, celular, vazio | cena anterior / rua |
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
| `fila` | fila de pessoas em interiores com balcão/guichê (`fila: 6`) | — |
| `comodo` | cômodo da `casa_protagonista`; no mundo, cômodo da casa, escola, posto_saude ou delegacia | quarto · padrão do local |
| `alcance` | (mundo/cidade) até onde o mundo existe em volta do local gravado | 80 fora · 45 dentro · casa |

## Atores

Forma curta: `"id ação rosto"`, ex.: `garoto chorar` ou `pai bravo bravo`.
Forma longa: `{ id: pai, acao: andar, rosto: feliz, x: 3, z: 0, vira: 90, vel: 8, prop: espada, atraso: 0.3 }`

### Movimentação (trajetos)

Ações que andam: andar, correr, andar_confiante, andar_celular, correr_medo, fugir, carregar, passear_cachorro.

`pet: cachorro | gato` (+ `pet_cor`) coloca um animal que acompanha o ator; `passear_cachorro` já vem com cachorro e coleira.

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

`modo`: `espalhado` (padrão), `grupos` (rodinhas de 2 a 4 pessoas conversando, viradas umas para as outras) ou `passantes` (andando nas calçadas, alguns no celular ou com cachorro).
`personagens: todos` (ou uma lista, ex.: `[prefeito, gari, vizinha_fofoqueira]`) usa personagens do elenco na multidão; o resto é gerado.

**Cenários que já vêm com multidão:** `praca_cheia` (~10 pessoas em rodinhas em volta da fonte) e `centro` (pedestres nas calçadas da avenida, com padaria, farmácia, mercado, banco… dos lados e a prefeitura no fim). Use `multidao: false` para esvaziar ou `multidao: { n: 40 }` para mudar.
Dica: em vídeo vertical, para mostrar muita gente use `cam: alto` + `dist: 2.8` (praça) ou `cam: geral` + `altura: 4` (centro).

`n` (até 40), `area: [x_min, x_max, z_min, z_max]`, `olhar_z` (todos olham para esse ponto em z), `acao` (sorteada entre as da lista), `prop`/`prop_texto`, `rosto`. Figurantes não precisam de elenco, e a câmera não os usa para enquadrar. Para mostrar a multidão inteira, use `cam: geral`.

- `x` esquerda(−)/direita(+) da tela, `z` fundo(−)/frente(+). Sem `x` = distribui automaticamente.
- `vira`: 0 = olha para a câmera, 90 = vira para a direita da tela, −90 = esquerda, 180 = de costas.
- `andar`/`correr` andam na direção de `vira` (`vel` em studs/s). Use `mov: seguir` para a câmera acompanhar.
- `deitar`/`dormir` vão sozinhos para a cama (quarto, hospital) e `sentar` para o sofá/banco/cadeira do cenário; informe `y` para posicionar manualmente.
- Qualquer ação funciona com qualquer personagem (mesmo esqueleto), inclusive figurantes e personagens com `escala`.
- Algumas ações já trocam o rosto (chorar→chorando, assustar→assustado…) e põem objeto na mão (celular).

**Ações:** parado, falar, andar, correr, acenar, celular, digitar, sentar, deitar, dormir, assustar, chorar, triste, bravo, comemorar, pular, apontar, abracar, olhar_redor, cair, dancar, pensar, socar, palmas, ajoelhar, empurrar, tremer,
discursar, acenar_multidao, apertar_mao, continencia, andar_confiante, andar_celular, correr_medo, fugir, carregar, entrevistar, filmar, assinar, cochichar, maos_pra_cima, implorar, espiar, agachar, comemorar_vitoria, rir, negar, concordar, cocar_cabeca, girar, desmaiar,
chutar, varrer, regar, gritar, bater_porta, espreguicar, cozinhar, comer, lavar_louca, pedir_silencio, sentar_chao, passear_cachorro,
atender, pagar, rezar, segurar_grade, jogar_pc, esperar

**Rostos:** neutro, feliz, sorriso, rindo, malandro, desconfiado, triste, chorando, assustado, surpreso, bravo, dormindo, apaixonado, nervoso, morto, pensativo, confiante (+ qualquer `assets/rostos/<nome>.png`)

**Objetos de mão (`prop`):** celular, espada, presente, flor, livro, dinheiro, microfone, filmadora, caixa, caneta, maleta, prancheta, bandeirinha (`prop_cor`), cartaz (`prop_texto: "FORA!"`), vassoura, regador, colher, garfo, sacola, coleira, bola_mao

Âncoras automáticas: `discursar` vai para o palanque (prefeitura), `sentar`/`assinar` para a mesa do gabinete, `sentar` para a mesa da cozinha e a cadeira do quintal, `cozinhar`/`lavar_louca` para o fogão/pia da cozinha.

## Tela de celular (`onde: celular`)

```yaml
tela: { tipo: mensagem, de: Mãe, mensagens: [{texto: "Cadê você?"}, {texto: "Tô chegando", eu: true}] }
tela: { tipo: notificacao, app: Destino, titulo: Seu inimigo, texto: PAI }
tela: { tipo: alarme, hora: "06:30" }
tela: { tipo: ligacao, nome: Desconhecido }
```

## Personagens (`assets/personagens.yaml`)

Prontos: noob, garoto, amigo, pai, pai_terno, mae, menina, noiva, nerd, valentao, medico, professora, padre, vovo, rei, policial, anjo, demonio, bebe, gamer,
prefeito, primeira_dama, vice_prefeito, candidato_rival, assessor, seguranca, reporter, cinegrafista, empresario, gari, bombeiro, taxista, vendedor, ladrao, cidadao, cidada, idosa, crianca,
vizinho, vizinha_fofoqueira, tia, tio, irmao_mais_velho, irma, entregador, carteiro, pedreiro, jogador

Campos: `pele, camisa, calca, rosto, extras, acessorios, roupa, cabelo_cor, escala, mangas, bone_cor, laco_cor, capa_cor, gravata_cor, mochila_cor, chifre_cor, vestido_cor`

- **extras (rosto):** barba, bigode, oculos, oculos_escuros, sardas, blush, mascara, cicatriz, cilios
- **acessorios:** cabelo_curto, cabelo_espetado, cabelo_baguncado, cabelo_longo, cabelo_grisalho, rabo_de_cavalo, coque, careca_lados, bone, boina, touca, cartola, coroa, laco, chifres, veu, capacete, capacete_bombeiro, fone, gravata, faixa_prefeito (`faixa_cor`, `faixa_cor2`), broche, colete (`colete_cor`), mochila, capa, asas, aureola
- **roupa:** terno, jaleco, listrada, uniforme, regata, vestido
- **cores:** amarelo, azul, azul_claro, verde, verde_noob, verde_claro, vermelho, vinho, preto, branco, cinza, cinza_escuro, rosa, rosa_claro, roxo, laranja, marrom, bege, ciano, dourado, pele_clara, pele_media, pele_escura — ou `"#rrggbb"`

## Props de cenário

arvore, pinheiro, arbusto, casa, predio, poste, carro, banco, mesa, carteira, cadeira, cama, sofa, tv, computador, planta, presente, caixa_correio, cerca, porta, caixao, bolo,
semaforo (`luz: verde`), onibus (`texto`), taxi, viatura, hidrante, lixeira, faixa_pedestre, loja (`texto`, `cor`), arranha_ceu, fonte, estatua (`texto`), bandeira (`cores`), palanque (`texto`), barraca, outdoor (`texto`), mesa_escritorio, poltrona, estante, quadro_parede (`texto`),
**móveis de casa:** cadeira_gamer, guarda_roupa, cortina, cama_casal, criado_mudo, comoda, tapete, mesa_centro, escada, vaso_sanitario, pia_banheiro, box_chuveiro, porta_retrato, painel_ferramentas, luminaria, poster (`texto`),
**móveis de interior:** balcao, prateleira, gondola, geladeira_vitrine, caixa_registradora, carrinho_compras, guiche (`numero`), banco_igreja, altar, cruz_parede, vitral, cela, sinuca, banqueta, prateleira_garrafas, tv_parede, estufa_paes, cadeiras_espera, maca, mesa_trabalho, arquivo, bebedouro, fila_cordao, mural (`texto`), relogio_parede, ventilador_teto, extintor, pilha_caixas (`n`, `cor`), banca_frutas, placa_suspensa (`texto`, `cor`), cofre, castical, suporte_soro, quadro_negro (`texto`, `largura`), armario_escolar (`n`, `cor`), estante_livros (`largura`, `altura`), mesa_refeitorio (`largura`, com bancos e assentos), globo, leito (`cor` do cobertor; assento sentado na cama), biombo, monitor_cardiaco, negatoscopio, balanca, cadeira_rodas, banco_cela (com assentos), luminaria_pendente, espelho_falso, camera_seguranca,
**prédios da cidade pequena (fachada em z=0):** farmacia, loterica, padaria, mercado, agencia_bancaria, prefeitura, igreja, escola, posto_saude, delegacia, bar, posto_gasolina, coreto (todos aceitam `texto` para trocar o letreiro),
casa_br / sobrado (`cor`, `telhado`, `grade: false`, `caixa_dagua: false`), muro (`largura`, `cor`, `portao_x`, `portao: false`), portao, cerca_viva, caixa_dagua, poste_fios, churrasqueira, piscina, varal, casinha_cachorro, cachorro / gato (`cor`), bicicleta, moto (`bau: true`), balanco, escorregador, trave, bola, geladeira, fogao, pia, armario, mesa_jantar, cadeira_plastico, saco_lixo, vaso_flor, lombada

## Música

Automática: escolhe uma faixa de `assets/musicas/<clima>/` (suas faixas antes das `original_*`), em rodízio entre vídeos, pulando a introdução e com ducking. `clima:` força o clima; `musica: nenhuma` desliga.

## Dicas de estilo (o que funciona nesse formato)

- Gancho na 1ª cena ("Nesse mundo…", "E se…"), cortes a cada 1–2 s, 10–16 cenas (~20–30 s).
- Alterne `close` (emoção) com `medio`/`aberto` (situação). `zoom_rapido` + `tremor` em revelações.
- Use `celular` com `tela` para mostrar a informação-chave da história.

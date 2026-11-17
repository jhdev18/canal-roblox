# Músicas de fundo — licença

As faixas `original_*.mp3` destas pastas são **composições originais geradas por código** (`ferramentas/compor_musicas.py`):
sintetizadas do zero, sem samples, loops ou trechos de terceiros. Por isso não há direitos autorais de terceiros
nem risco de reivindicação de Content ID por uma gravação existente.

Elas são liberadas em domínio público (**CC0 1.0**): use, edite e monetize sem precisar dar crédito.

| faixa | clima | bom para |
|---|---|---|
| suspense | tenso, misterioso (Lá menor, batida de coração) | revelações, "nesse mundo…" |
| triste | piano melancólico | perdas, hospital, despedidas |
| alegre | ukulele + chiptune | final feliz, amizade |
| engracado | tuba + pizzicato saltitante | situações cômicas, trapalhadas |
| epico | cordas + tambores | batalhas, viradas, plot twist |
| curioso | caixinha de música | infância, sonhos, mistério leve |
| calmo | piano elétrico lofi relaxado | histórias calmas, rotina |
| perseguicao | baixo acelerado + bateria | fugas, correria |

Todas emendam sem corte (o fim encaixa no começo), então tocam em loop o tempo que o vídeo precisar.

## Gerar mais / variações
```bash
python ferramentas/compor_musicas.py --seed 7          # todas, com melodias diferentes
python ferramentas/compor_musicas.py suspense --seed 3 # só uma
```

## Usar músicas de outras fontes
Coloque o arquivo na pasta do clima (`assets/musicas/<clima>/`, formatos `.mp3`, `.wav`, `.ogg`, `.m4a` ou `.flac`).
O gerador passa a escolher entre as suas faixas automaticamente, e as `original_*` viram reserva.
Fontes gratuitas confiáveis: **Biblioteca de Áudio do YouTube** (YouTube Studio → Biblioteca de áudio; prefira as
faixas "sem atribuição necessária"), **Pixabay Music** e **FreePD** (domínio público). Confira sempre a licença de cada faixa.

# Músicas de fundo — licença

As faixas `.mp3` desta pasta são **composições originais geradas por código** (`ferramentas/compor_musicas.py`):
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
| lofi | piano elétrico relaxado | histórias calmas, rotina |
| perseguicao | baixo acelerado + bateria | fugas, correria |

Todas emendam sem corte (o fim encaixa no começo), então tocam em loop o tempo que o vídeo precisar.

## Gerar mais / variações
```bash
python ferramentas/compor_musicas.py --seed 7          # todas, com melodias diferentes
python ferramentas/compor_musicas.py suspense --seed 3 # só uma
```

## Músicas virais do momento (hits, phonk, funk…)

Essas têm dono: colocar no vídeo gera reivindicação de Content ID. O jeito legal é gerar o vídeo **sem música**
(`musica: nenhuma`) ou com volume baixo e **adicionar o som no app do YouTube** ao publicar o Short
(botão "Adicionar som"). O YouTube licencia essas músicas para Shorts.

## Usar músicas de outras fontes
Coloque o arquivo nesta pasta (`.mp3`, `.wav`, `.ogg`, `.m4a`) e use `musica: <nome do arquivo>` no roteiro.
Fontes gratuitas confiáveis: **Biblioteca de Áudio do YouTube** (YouTube Studio → Biblioteca de áudio; prefira as
faixas "sem atribuição necessária"), **Pixabay Music** e **FreePD** (domínio público). Confira sempre a licença de cada faixa.

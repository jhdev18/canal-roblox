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

## Músicas virais gratuitas (Kevin MacLeod, CC BY 4.0)

Faixas que viralizaram em vídeos e memes. São gratuitas e podem ser monetizadas, **mas exigem crédito**.
Baixe no seu PC (daqui do servidor o site é bloqueado):

```bash
node ferramentas/baixar_musicas.mjs
```

| nome no roteiro | música | clima |
|---|---|---|
| sneaky_snitch | Sneaky Snitch | sorrateiro/cômico, "plano malandro" |
| monkeys_spinning_monkeys | Monkeys Spinning Monkeys | bobo/alegre, memes |
| fluffing_a_duck | Fluffing a Duck | engraçado/fofo |
| scheming_weasel | Scheming Weasel (faster) | trapalhada, vilão cômico |
| pixel_peeker_polka | Pixel Peeker Polka (faster) | caos cômico |
| run_amok | Run Amok | correria cômica |
| amazing_plan | Amazing Plan | planejando algo |
| investigations | Investigations | mistério/investigação |
| hitman | Hitman | suspense/ação |
| cipher | Cipher | tensão |
| volatile_reaction | Volatile Reaction | épico/tenso |
| heartbreaking | Heartbreaking | triste/emocionante |
| wallpaper | Wallpaper | calmo |
| local_forecast | Local Forecast (Elevator) | espera, meme do elevador |
| carefree | Carefree | alegre/leve |

Ao gerar um vídeo com uma delas, o gerador cria `saida/<video>_descricao.txt` com o crédito pronto. **Cole na descrição.**

## Músicas virais do momento (hits, phonk, funk…)

Essas têm dono: colocar no vídeo gera reivindicação de Content ID. O jeito legal é gerar o vídeo **sem música**
(`musica: nenhuma`) ou com volume baixo e **adicionar o som no app do YouTube** ao publicar o Short
(botão "Adicionar som"). O YouTube licencia essas músicas para Shorts.

## Usar músicas de outras fontes
Coloque o arquivo nesta pasta (`.mp3`, `.wav`, `.ogg`, `.m4a`) e use `musica: <nome do arquivo>` no roteiro.
Fontes gratuitas confiáveis: **NoCopyrightSounds (NCS)** (eletrônica que viralizou; exige crédito), **Biblioteca de Áudio do YouTube** (YouTube Studio → Biblioteca de áudio; prefira as
faixas "sem atribuição necessária"), **Pixabay Music** e **FreePD** (domínio público). Confira sempre a licença de cada faixa.

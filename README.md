# Desktop Goose (DIY)

Um ganso que vive por cima das suas janelas de verdade — feito com Electron.

## O que ele já faz
- Passeia pela tela inteira, por cima de qualquer programa aberto.
- Persegue seu cursor de vez em quando.
- Solta falas em balão (HONK e companhia).
- Escreve notas de verdade em uma janelinha própria (estilo bloco de notas),
  em posições aleatórias da tela.
- Fica "click-through": você clica normalmente nas suas janelas por baixo
  dele. Só quando o mouse está exatamente em cima do ganso é que o clique
  é capturado (pra você poder cutucar ele).
- Tem um ícone na bandeja do sistema com menu pra **pausar/retomar** o ganso
  e pra **fechar** ele (clicar no ícone também alterna a pausa).
- Deixa **pegadas de lama** 🐾 no rastro por onde passa (com som de "squish").
- Toca **sons** de HONK e de bicada (sintetizados, sem arquivos externos).
- Traz **memes** — fotos e vídeos — que aparecem na tela de vez em quando
  (você coloca os seus em `assets/memes/`).
- Pode **roubar o cursor** do sistema (opcional — veja abaixo).
- `Ctrl+Alt+G` fecha o ganso e qualquer nota aberta — nosso "Close Goose.bat".

## Ajustando o comportamento (`config.json`)

Tudo é configurável no [`config.json`](config.json):

```json
{
  "silenciarSons": false,
  "podeAtacarMouse": true,
  "tempoMinPasseioS": 8,
  "tempoMaxPasseioS": 18,
  "pegadas": true,
  "memes": true,
  "roubarMouse": false,
  "chanceHonk": 0.30,
  "chanceNota": 0.12,
  "chanceMeme": 0.10,
  "chanceRoubo": 0.15,
  "cores": { "corpo": "#ffffff", "bico": "#ffa500", "contorno": "#161616", "pernas": "#2f7ec7" }
}
```

- **silenciarSons** — desliga os efeitos sonoros.
- **tempoMin/MaxPasseioS** — quanto ele fica "de boa" entre uma ação e outra.
- **pegadas / memes** — liga/desliga esses truques.
- **chance...** — probabilidade de cada travessura.
- **cores** — troque a cor do corpo, bico, contorno e pernas do ganso.

## Fotos e vídeos (memes)

Coloque imagens (`.png`, `.jpg`, `.gif`, `.webp`) ou vídeos (`.mp4`, `.webm`)
na pasta [`assets/memes/`](assets/memes/) e o ganso traz uma pra tela de vez
em quando. A pasta vem vazia de propósito — as mídias do app original têm
direitos autorais, então use as suas.

## Roubar o cursor (opcional)

Mover o cursor **de verdade** do sistema não faz parte do Electron "de
fábrica" — precisa de um módulo nativo. Por isso é opcional:

1. Instale o `robotjs`: `npm install robotjs`
   (é um módulo nativo; pode pedir ferramentas de build do seu SO).
2. Ligue no config: `"roubarMouse": true`.

Sem o `robotjs` instalado, o recurso simplesmente não liga e o resto do
ganso funciona normalmente.

## Editando as falas e notas

As frases ficam no arquivo [`frases.json`](frases.json), separadas em duas
listas — `honks` (os balões de fala) e `notes` (as janelinhas de nota).
É só editar o texto, salvar e reabrir o ganso:

```json
{
  "honks": ["HONK.", "só passeando pela sua tela"],
  "notes": ["lembrete: você está sendo observado(a) 🪿"]
}
```

Se o arquivo tiver algum erro, o ganso usa um conjunto mínimo de frases
padrão pra nunca ficar mudo.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) instalado (versão 18+).

```bash
cd desktop-goose-app
npm install
npm start
```

Isso baixa o Electron (só na primeira vez) e abre o ganso direto na sua
área de trabalho.

## Estrutura

```
main.js            → processo principal: cria a janela transparente,
                      controla o click-through e abre as notas
preload.js          → ponte segura entre o processo principal e o ganso
renderer/
  index.html        → o SVG do ganso (mesma arte que já vimos no navegador)
  goose.css          → estilos e animações (andar, bater asa, balão de fala)
  goose.js           → comportamento: passear, perseguir cursor, honk, notas
notepad/
  notepad.html       → a janelinha de "nota" com efeito de digitação
frases.json          → as falas (honks) e notas do ganso, fáceis de editar
config.json          → ajustes de comportamento, sons, cores e chances
assets/
  tray.png           → o ícone da bandeja do sistema
  memes/             → suas fotos e vídeos que o ganso traz pra tela
tools/
  goosegen.js        → gera o pixel art do ganso a partir de uma grade
```

## Mexendo na arte do ganso

O ganso é pixel art gerado de uma grade em [`tools/goosegen.js`](tools/goosegen.js)
— cada caractere é um pixel (`W` corpo, `B` bico, `E` olho, `P` bochecha,
`L` bota…). Edite a `grid`, rode `node tools/goosegen.js` e cole os grupos
`<g>` gerados dentro do `<svg>` em `renderer/index.html`.

## Ideias pra evoluir daqui
- Mais opções no menu da bandeja (trocar de "humor", esconder o ganso).
- Suporte a "mods" como no original.
- Empacotar como instalador com `electron-builder`, pra virar um `.exe`
  de verdade como o original.

## Sobre o original
O Desktop Goose original é um app pago do samperson. Esta versão reproduz os
**mecanismos** (passear, caçar o cursor, notas, memes, pegadas, roubar o
mouse) com código e assets próprios — **não** inclui os sons, memes ou
sprites do original, que têm direitos autorais. Use suas próprias mídias em
`assets/memes/`.

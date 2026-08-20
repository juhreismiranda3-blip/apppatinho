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
- `Ctrl+Alt+G` fecha o ganso e qualquer nota aberta — nosso "Close Goose.bat".

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
```

## Ideias pra evoluir daqui
- Trocar as falas/notas por um arquivo `frases.json` fácil de editar.
- Adicionar mais "truques": pegadas de lama (uma janela transparente fina
  no rodapé da tela onde ele deixa marcas), roubar o cursor de verdade
  (precisa de um módulo nativo tipo `robotjs` pra mover o mouse do
  sistema — mais avançado e específico por SO).
- Ícone na bandeja do sistema (`Tray`) com menu pra pausar/trocar de humor.
- Empacotar como instalador com `electron-builder`, pra virar um `.exe`
  de verdade como o original.

## Por que não é 100% igual ao original ainda
O Desktop Goose original mexe em coisas de baixo nível do sistema (mover o
cursor de verdade, simular teclas dentro de outros programas). Essa versão
usa só o que o Electron oferece "de fábrica" — click-through, janela
transparente, várias janelas — que já dá pra maior parte da graça, sem
precisar de módulos nativos arriscados. Dá pra ir evoluindo aos poucos.

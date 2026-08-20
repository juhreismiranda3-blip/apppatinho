// Gera o SVG do ganso a partir de uma grade de pixels (fácil de ajustar).
const fs = require('fs');

// legenda:
// . vazio  K contorno  W corpo  S barriga  B bico  D bico-sombra
// E olho   H brilho    P bochecha  L bota    l sola  M boca(honk)
const grid = [
  "......................", // 0
  "..........KKKK........", // 1
  ".........KWWWWK.......", // 2
  "........KWWWWWWK......", // 3
  "........KWWHEWKBBBK...", // 4
  "........KWWEEWKBBBK...", // 5
  ".......KWWWWWWWKDK....", // 6
  ".......KWPPWWWWK......", // 7
  "......KWWWWWWWWWK.....", // 8
  ".....KWWWWWWWWWWK.....", // 9
  ".....KWWWWWWWWWWK.....", // 10
  "....KWWWWWWWWWWWK.....", // 11
  "....KWWSWWWWWWWWK.....", // 12
  "...KWWSSSWWWWWWWK.....", // 13
  "...KWWSSSWWWWWWWK.....", // 14
  "...KWWSSSWWWWWWWK.....", // 15
  "...KWWSSSWWWWWWWK.....", // 16
  "...KWWWSSWWWWWWWK.....", // 17
  "...KWWWWSWWWWWWWK.....", // 18
  "...KWWWWWWWWWWWWK.....", // 19
  "....KWWWWWWWWWWWK.....", // 20
  "....KWWWWWWWWWWWK.....", // 21
  ".....KWWWWWWWWWK......", // 22
  ".....KWWWWWWWWK.......", // 23
  "......LLL..LLL........", // 24
  "......LLL..LLL........", // 25
  "......lll..lll........", // 26
];

const colors = {
  K: { fill:'#2b2b2b', cls:'c-outline' },
  W: { fill:'#ffffff', cls:'c-body' },
  S: { fill:'#cfe0ea', cls:'c-belly' },
  B: { fill:'#ffb020', cls:'c-beak' },
  D: { fill:'#e8901a', cls:'c-beak' },
  E: { fill:'#1b1b1b', cls:'eye' },
  H: { fill:'#ffffff', cls:'eye-hi' },
  P: { fill:'#ffb3c8', cls:'blush' },
  L: { fill:'#3f8fd8', cls:'leg' },
  l: { fill:'#2f6fb0', cls:'leg' },
};

// agrupa por classe para permitir recolorir via config
const groups = {};
const order = ['c-outline','c-belly','c-body','blush','eye','eye-hi','c-beak','leg b','leg'];
grid.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    const c = colors[ch];
    if (!c) return;
    let cls = c.cls;
    // separa as duas botinhas: a de trás (x<10) leva a classe "leg b"
    // pra animar com atraso; ambas continuam recoloríveis via ".leg".
    if (cls === 'leg') cls = x < 10 ? 'leg b' : 'leg';
    (groups[cls] = groups[cls] || { fill: c.fill, rects: [] }).rects.push([x, y]);
  });
});

let svg = '';
for (const cls of order) {
  const g = groups[cls];
  if (!g) continue;
  const rects = g.rects.map(([x, y]) =>
    `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`).join('');
  svg += `        <g class="${cls}" fill="${g.fill}">${rects}</g>\n`;
}
fs.writeFileSync(process.argv[2] || '/dev/stdout', svg);
console.error('grupos:', Object.keys(groups).join(', '));

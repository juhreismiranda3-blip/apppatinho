// Gera o SVG do ganso a partir de uma grade de pixels.
// O corpo é montado com elipses (fica bem redondo/gordinho) e o contorno
// é derivado da silhueta. Ajuste os raios pra mudar o formato.
const fs = require('fs');

const GW = 22, GH = 23;          // grade (viewBox 0 0 22 23)
const P = Array.from({ length: GH }, () => Array(GW).fill('.'));

function ellipse(cx, cy, rx, ry, ch, onlyOver) {
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) {
      if (onlyOver && P[y][x] !== onlyOver) continue;
      P[y][x] = ch;
    }
  }
}
function rect(x0, y0, x1, y1, ch, onlyOver) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= GH || x < 0 || x >= GW) continue;
    if (onlyOver && P[y][x] !== onlyOver) continue;
    P[y][x] = ch;
  }
}

// ---- silhueta: baixinho e gordinho ----
ellipse(9.5, 14.5, 7.6, 6.6, 'W');   // corpo largo e baixo
ellipse(12.5, 9.5, 3.6, 3.4, 'W');   // pescoço curtinho (conecta)
ellipse(14.5, 6, 3.7, 3.5, 'W');     // cabeça redonda

// ---- contorno: pixel de corpo encostando no vazio vira contorno ----
// (lê de um snapshot pra a erosão não se propagar pra dentro)
const snap = P.map(row => row.slice());
const isBody = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && (snap[y][x] === 'W');
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
  if (snap[y][x] !== 'W') continue;
  if (!isBody(x-1,y) || !isBody(x+1,y) || !isBody(x,y-1) || !isBody(x,y+1)) P[y][x] = 'K';
}

// ---- barriga (sombra clara), só por dentro do corpo ----
ellipse(6.5, 15.5, 2.6, 4.2, 'S', 'W');

// ---- bico (à direita da cabeça) ----
rect(17, 5, 19, 6, 'B');
P[5][19] = 'K'; P[6][17] = 'B';
// arruma contorno em volta do bico
[[16,4],[20,5],[20,6],[17,7]].forEach(([x,y])=>{ if(P[y] && P[y][x]==='.') P[y][x]='K'; });

// ---- olho 2x2 + brilho + bochecha ----
rect(14, 5, 15, 6, 'E', 'W');
P[5][14] = 'H';           // brilho no canto do olho
if (P[8] && P[8][12]==='W') { P[8][12]='P'; P[8][13]='P'; }  // bochecha

// ---- botinhas (duas, coladas embaixo) ----
const footY = GH - 3;
rect(6, footY, 8, footY + 2, 'L');
rect(11, footY, 13, footY + 2, 'L');

// ================= exporta SVG =================
const colors = {
  K:{fill:'#2b2b2b',cls:'c-outline'}, W:{fill:'#ffffff',cls:'c-body'},
  S:{fill:'#cfe0ea',cls:'c-belly'},   B:{fill:'#ffb020',cls:'c-beak'},
  E:{fill:'#1b1b1b',cls:'eye'},       H:{fill:'#ffffff',cls:'eye-hi'},
  P:{fill:'#ffb3c8',cls:'blush'},     L:{fill:'#3f8fd8',cls:'leg'},
};
const order = ['c-outline','c-belly','c-body','blush','eye','eye-hi','c-beak','leg b','leg'];
const groups = {};
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
  const c = colors[P[y][x]];
  if (!c) continue;
  let cls = c.cls;
  if (cls === 'leg') cls = x < 10 ? 'leg b' : 'leg';   // bota de trás anima com atraso
  (groups[cls] = groups[cls] || { fill: c.fill, rects: [] }).rects.push([x, y]);
}
let svg = '';
for (const cls of order) {
  const g = groups[cls];
  if (!g) continue;
  const rects = g.rects.map(([x, y]) =>
    `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`).join('');
  svg += `        <g class="${cls}" fill="${g.fill}">${rects}</g>\n`;
}
fs.writeFileSync(process.argv[2] || '/dev/stdout', svg);
console.error('grupos:', Object.keys(groups).join(', '), '| viewBox 0 0', GW, GH);

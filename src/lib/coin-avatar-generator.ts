// Deterministic SVG avatar generator for coins
// Creates unique, colorful abstract crypto-themed logos

const PALETTES = [
  ['#FF6B6B', '#FF8E8E', '#4ECDC4'],
  ['#6C5CE7', '#A29BFE', '#FFEAA7'],
  ['#00B894', '#00CEC9', '#0984E3'],
  ['#E17055', '#FAB1A0', '#FDCB6E'],
  ['#2D3436', '#636E72', '#00CEC9'],
  ['#E84393', '#FD79A8', '#6C5CE7'],
  ['#0984E3', '#74B9FF', '#55EFC4'],
  ['#FF7675', '#D63031', '#FDCB6E'],
  ['#00B4D8', '#0077B6', '#90E0EF'],
  ['#F72585', '#7209B7', '#3A0CA3'],
  ['#F4A261', '#E76F51', '#264653'],
  ['#2EC4B6', '#CBF3F0', '#FF9F1C'],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

type ShapeType = 'hexagon' | 'diamond' | 'circle' | 'shield' | 'octagon';

function shapePath(type: ShapeType, cx: number, cy: number, r: number): string {
  switch (type) {
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      });
      return `M${pts.join('L')}Z`;
    }
    case 'diamond':
      return `M${cx},${cy - r} L${cx + r * 0.7},${cy} L${cx},${cy + r} L${cx - r * 0.7},${cy}Z`;
    case 'shield':
      return `M${cx - r * 0.7},${cy - r * 0.8} L${cx + r * 0.7},${cy - r * 0.8} L${cx + r * 0.7},${cy + r * 0.2} Q${cx},${cy + r} ${cx - r * 0.7},${cy + r * 0.2}Z`;
    case 'octagon': {
      const d = r * 0.38;
      return `M${cx - d},${cy - r} L${cx + d},${cy - r} L${cx + r},${cy - d} L${cx + r},${cy + d} L${cx + d},${cy + r} L${cx - d},${cy + r} L${cx - r},${cy + d} L${cx - r},${cy - d}Z`;
    }
    default:
      return '';
  }
}

function innerDesign(rand: () => number, cx: number, cy: number, color: string): string {
  const type = Math.floor(rand() * 5);
  switch (type) {
    case 0: // Lightning bolt
      return `<path d="M${cx - 4},${cy - 12} L${cx + 2},${cy - 2} L${cx - 2},${cy + 1} L${cx + 5},${cy + 12} L${cx - 1},${cy + 3} L${cx + 2},${cy}" fill="${color}" opacity="0.9"/>`;
    case 1: // Star
      return `<path d="${starPath(cx, cy, 10, 5, 5)}" fill="${color}" opacity="0.85"/>`;
    case 2: // Waves
      return `<g opacity="0.8">
        <path d="M${cx - 12},${cy - 5} Q${cx - 6},${cy - 10} ${cx},${cy - 5} Q${cx + 6},${cy} ${cx + 12},${cy - 5}" stroke="${color}" fill="none" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M${cx - 12},${cy + 2} Q${cx - 6},${cy - 3} ${cx},${cy + 2} Q${cx + 6},${cy + 7} ${cx + 12},${cy + 2}" stroke="${color}" fill="none" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M${cx - 10},${cy + 9} Q${cx - 4},${cy + 4} ${cx + 2},${cy + 9} Q${cx + 8},${cy + 14} ${cx + 10},${cy + 9}" stroke="${color}" fill="none" stroke-width="2" stroke-linecap="round"/>
      </g>`;
    case 3: // Arrow/rocket
      return `<g opacity="0.85">
        <path d="M${cx},${cy - 14} L${cx + 6},${cy + 4} L${cx + 2},${cy + 2} L${cx + 3},${cy + 10} L${cx},${cy + 6} L${cx - 3},${cy + 10} L${cx - 2},${cy + 2} L${cx - 6},${cy + 4}Z" fill="${color}"/>
      </g>`;
    default: // Gem/crystal
      return `<g opacity="0.85">
        <path d="M${cx},${cy - 12} L${cx + 10},${cy - 2} L${cx + 6},${cy + 10} L${cx - 6},${cy + 10} L${cx - 10},${cy - 2}Z" fill="${color}"/>
        <path d="M${cx},${cy - 12} L${cx},${cy + 10} M${cx - 10},${cy - 2} L${cx + 10},${cy - 2}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      </g>`;
  }
}

function starPath(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function generateCoinSVG(name: string, symbol: string): string {
  const seed = hashStr(name + symbol);
  const rand = seededRandom(seed);

  const palette = PALETTES[seed % PALETTES.length];
  const bg1 = palette[0];
  const bg2 = palette[1];
  const accent = palette[2];

  const shapes: ShapeType[] = ['hexagon', 'diamond', 'shield', 'octagon'];
  const bgShape = shapes[Math.floor(rand() * shapes.length)];
  const gradAngle = Math.floor(rand() * 360);

  const cx = 32, cy = 32, r = 28;
  const gradId = `g${seed}`;
  const glowId = `glow${seed}`;

  const bgPath = bgShape === 'circle'
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})" filter="url(#${glowId})"/>`
    : `<path d="${shapePath(bgShape, cx, cy, r)}" fill="url(#${gradId})" filter="url(#${glowId})"/>`;

  const inner = innerDesign(rand, cx, cy, accent);

  // Optional ring
  const hasRing = rand() > 0.5;
  const ring = hasRing
    ? `<circle cx="${cx}" cy="${cy}" r="${r - 3}" stroke="${accent}" stroke-width="1.5" fill="none" opacity="0.4"/>`
    : '';

  // Optional dots
  const hasDots = rand() > 0.6;
  let dots = '';
  if (hasDots) {
    const count = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 14 + rand() * 10;
      const dx = cx + Math.cos(angle) * dist;
      const dy = cy + Math.sin(angle) * dist;
      dots += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${1 + rand()}" fill="${accent}" opacity="${0.3 + rand() * 0.3}"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${gradAngle},32,32)">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <filter id="${glowId}">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${bg1}" flood-opacity="0.4"/>
    </filter>
  </defs>
  ${bgPath}
  ${ring}
  ${inner}
  ${dots}
</svg>`;
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

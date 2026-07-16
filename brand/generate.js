#!/usr/bin/env node
/**
 * ByteBots — Bot-Identität Generator
 * ==================================
 * Baut alle Bot-Avatare + Profil-Banner aus den Design-Tokens neu.
 * Ausgabe: brand/svg/*.svg  (Quelle) und, falls @resvg/resvg-js verfuegbar,
 *          brand/png/*.png   (Avatare 1024, Banner 960).
 *
 * Aufruf:  node brand/generate.js
 * PNG-Rendering (optional):  npm i -D @resvg/resvg-js  (native, darwin/linux prebuilt)
 *
 * Design-System-Doku: brand/README.md
 * Konzept in einem Satz: dunkler Tile-Grund + bot-eigenes Motiv VOLL im Hintergrund
 * (Equalizer / Soundboard / Schild) + zentraler ByteBots-„/"-Kreis als Wiedererkennung.
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const TOKENS = {
  // dunkler Radial-Tile-Hintergrund (in JEDEM Avatar gleich)
  tile: { cx: '50%', cy: '36%', r: '76%', from: '#2a1740', to: '#0b0b10' },
  // Gradient je Bot (jeder Bot besetzt sein Ende des ByteBots-Spektrums)
  beat:  { a: '#c084fc', mid: '#d946ef', b: '#38d6f5' },   // Lila → Magenta → Cyan
  ear:   { a: '#3ee0f5', mid: '#22d3ee', b: '#1f9fd6' },   // Cyan
  admin: { a: '#a855f7', mid: '#d946ef', b: '#22d3ee' },   // volles Spektrum
  // Soundboard-Pad-Farben
  pad:   '#3ee0f5', padTo: '#1f9fd6',   // Standard-Pad (cyan)
  padBlue: '#5a86f0', padBlueTo: '#3b5fd6',
  padLit: '#d6fbff', padLitTo: '#67ecff',
  // Banner-Glow je Bot
  glow: { beat: '#a855f7', ear: '#22d3ee', admin: '#8b5cf6' },
};

// ─────────────────────────────────────────────────────────────
// BAUSTEINE
// ─────────────────────────────────────────────────────────────
const tileDef = () =>
  `<radialGradient id="tile" cx="${TOKENS.tile.cx}" cy="${TOKENS.tile.cy}" r="${TOKENS.tile.r}"><stop offset="0" stop-color="${TOKENS.tile.from}"/><stop offset="1" stop-color="${TOKENS.tile.to}"/></radialGradient>`;

// Der ByteBots-„/" (Slash + Block-Cursor) — feste Geometrie, immer gleich groß.
const markShapes = (fill) =>
  `<rect x="234" y="192" width="44" height="146" rx="22" fill="${fill}" transform="rotate(20 256 265)"/>` +
  `<rect x="292" y="300" width="32" height="32" rx="9" fill="${fill}"/>`;

// Zentraler „/"-Kreis (Badge) — liegt OBEN auf dem Motiv, mit dunklem Trenn-Halo.
const badge = (fill) =>
  `<circle cx="256" cy="256" r="104" fill="#0b0b10" opacity=".55"/>` +
  `<circle cx="256" cy="256" r="94" fill="#100a1c"/>` +
  `<circle cx="256" cy="256" r="94" fill="none" stroke="${fill}" stroke-width="7"/>` +
  `<g transform="translate(256 256) scale(0.6) translate(-256 -265)">${markShapes(fill)}</g>`;

const lin = (id, a, mid, b, uso) =>
  `<linearGradient id="${id}"${uso ? ` gradientUnits="userSpaceOnUse" x1="46" y1="0" x2="466" y2="0"` : ' x1="0" y1="0" x2="1" y2="1"'}>` +
  `<stop offset="0" stop-color="${a}"/>${mid ? `<stop offset=".5" stop-color="${mid}"/>` : ''}<stop offset="1" stop-color="${b}"/></linearGradient>`;
const vlin = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

// ── MOTIVE (voll, im Hintergrund) ──
// BeatByte: 15 mittig ausgerichtete Equalizer-Balken
const EQ_HEIGHTS = [90,150,110,210,150,240,180,250,180,240,150,210,110,150,90];
const equalizer = (fill) => EQ_HEIGHTS.map((h,i)=>`<rect x="${46+i*28}" y="${256-h/2}" width="20" height="${h}" rx="10" fill="${fill}"/>`).join('');

// EarTastic: 3×3 Soundboard-Grid (Pad-Farbe je Zelle)
const GRID_POS = [128,256,384];
const GRID_COL = {'128,128':'ear','256,128':'earL','384,128':'ear','128,256':'earB','256,256':'ear','384,256':'earL','128,384':'ear','256,384':'earB','384,384':'ear'};
const soundboard = () => {
  let s = '';
  for (const y of GRID_POS) for (const x of GRID_POS)
    s += `<rect x="${x-54}" y="${y-54}" width="108" height="108" rx="24" fill="url(#${GRID_COL[`${x},${y}`]})"/>`;
  return s;
};

// Admin: Schild-Umriss
const shield = (fill) =>
  `<path d="M256 96 L408 144 L408 250 C408 344 344 404 256 440 C168 404 104 344 104 250 L104 144 Z" fill="none" stroke="${fill}" stroke-width="16" stroke-linejoin="round"/>`;

// ─────────────────────────────────────────────────────────────
// AVATARE (512×512)
// ─────────────────────────────────────────────────────────────
const AVATARS = {
  beatbyte: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs>${tileDef()}${lin('beat',TOKENS.beat.a,TOKENS.beat.mid,TOKENS.beat.b,true)}</defs>` +
    `<rect width="512" height="512" fill="url(#tile)"/>${equalizer('url(#beat)')}${badge('url(#beat)')}</svg>`,
  eartastic: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs>${tileDef()}` +
    `${vlin('ear',TOKENS.pad,TOKENS.padTo)}${vlin('earB',TOKENS.padBlue,TOKENS.padBlueTo)}${vlin('earL',TOKENS.padLit,TOKENS.padLitTo)}</defs>` +
    `<rect width="512" height="512" fill="url(#tile)"/>${soundboard()}${badge('url(#ear)')}</svg>`,
  admin: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs>${tileDef()}${lin('adm',TOKENS.admin.a,TOKENS.admin.mid,TOKENS.admin.b)}</defs>` +
    `<rect width="512" height="512" fill="url(#tile)"/>${shield('url(#adm)')}${badge('url(#adm)')}</svg>`,
};

// ─────────────────────────────────────────────────────────────
// BANNER (960×540) — dunkel + Glow + Bot-Logo ghosted + Vignette + Akzentlinie
// ─────────────────────────────────────────────────────────────
function banner(glow, accA, accB, symbol, sc, ty) {
  return `<svg viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg"><defs>` +
    `<radialGradient id="gl" cx="52%" cy="32%" r="58%"><stop offset="0" stop-color="${glow}" stop-opacity=".5"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="vig" cx="50%" cy="42%" r="76%"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>` +
    `<linearGradient id="gh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accA}"/><stop offset="1" stop-color="${accB}"/></linearGradient>` +
    `<linearGradient id="ln" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${accA}"/><stop offset="1" stop-color="${accB}"/></linearGradient></defs>` +
    `<rect width="960" height="540" fill="#0a0910"/><ellipse cx="650" cy="150" rx="620" ry="440" fill="url(#gl)"/>` +
    `<g opacity=".15" transform="translate(560 ${ty}) scale(${sc})">${symbol('url(#gh)')}</g>` +
    `<rect width="960" height="540" fill="url(#vig)"/><rect x="0" y="534" width="960" height="6" fill="url(#ln)"/></svg>`;
}
// Ghost-Symbole (einfarbig, fuer den Banner-Hintergrund)
const BANNERS = {
  beatbyte:  banner(TOKENS.glow.beat,  '#a855f7', '#e879f9', (f)=>equalizer(f)+badge(f), 1.3, 8),
  eartastic: banner(TOKENS.glow.ear,   '#22d3ee', '#3b82f6', (f)=>{let s='';for(const y of GRID_POS)for(const x of GRID_POS)s+=`<rect x="${x-54}" y="${y-54}" width="108" height="108" rx="24" fill="${f}"/>`;return s+badge(f);}, 1.3, -12),
  admin:     banner(TOKENS.glow.admin, '#a855f7', '#22d3ee', (f)=>shield(f)+badge(f), 1.25, -20),
};

// ─────────────────────────────────────────────────────────────
// SCHREIBEN
// ─────────────────────────────────────────────────────────────
const outSvg = path.join(__dirname, 'svg');
const outPng = path.join(__dirname, 'png');
fs.mkdirSync(outSvg, { recursive: true });

for (const [name, svg] of Object.entries(AVATARS)) fs.writeFileSync(path.join(outSvg, `${name}-avatar.svg`), svg);
for (const [name, svg] of Object.entries(BANNERS)) fs.writeFileSync(path.join(outSvg, `${name}-banner.svg`), svg);
console.log('✓ SVGs geschrieben nach brand/svg/');

// Optional: PNG rendern, falls @resvg/resvg-js vorhanden
let Resvg;
try { ({ Resvg } = require('@resvg/resvg-js')); } catch { /* optional */ }
if (Resvg) {
  fs.mkdirSync(outPng, { recursive: true });
  const render = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: true } }).render().asPng();
  for (const [name, svg] of Object.entries(AVATARS)) fs.writeFileSync(path.join(outPng, `${name}-avatar.png`), render(svg, 1024));
  for (const [name, svg] of Object.entries(BANNERS)) fs.writeFileSync(path.join(outPng, `${name}-banner.png`), render(svg, 960));
  console.log('✓ PNGs geschrieben nach brand/png/ (Avatare 1024, Banner 960)');
} else {
  console.log('ℹ  Fuer PNGs: npm i -D @resvg/resvg-js  (oder ein beliebiger SVG→PNG-Renderer)');
}

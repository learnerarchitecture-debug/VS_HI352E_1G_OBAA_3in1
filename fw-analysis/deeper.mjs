// Deeper structure analysis for the T56U11.23 SPI dump
import fs from 'node:fs';
import zlib from 'node:zlib';

const inPath = process.argv[2];
const buf = fs.readFileSync(inPath);
const size = buf.length;
const outDir = process.argv[3] || '.';
const L = []; const P = s => L.push(s);

function hexdump(b, off, len) {
  const end = Math.min(b.length, off + len);
  for (let o = off; o < end; o += 16) {
    P('  ' + o.toString(16).padStart(6, '0') + '  ' + [...b.subarray(o, Math.min(o + 16, end))].map(x => x.toString(16).padStart(2, '0')).join(' '));
  }
}

// ---------- 1. stride autocorrelation (whole file) ----------
P('== byte equality at stride (whole 4MB) ==');
for (const stride of [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]) {
  let m = 0; const n = size - stride;
  for (let i = 0; i < n; i++) if (buf[i] === buf[i + stride]) m++;
  const pct = 100 * m / n;
  P(`stride ${String(stride).padStart(4)}: ${pct.toFixed(3)}% (random 0.391%)  => x${(pct / 0.390625).toFixed(1)}`);
}

// ---------- 2. top bytes per mod-16 position (first 1MiB) ----------
P(''); P('== top bytes per mod-16 position (first 1MiB) ==');
{
  const N1 = 1 << 20;
  const maps = Array.from({ length: 16 }, () => new Map());
  for (let i = 0; i < N1; i++) { const m = maps[i & 15]; const v = buf[i]; m.set(v, (m.get(v) || 0) + 1); }
  for (let p = 0; p < 16; p++) {
    const top = [...maps[p].entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    P(`pos ${String(p).padStart(2)}: ` + top.map(([b, c]) => `${b.toString(16).padStart(2, '0')}:${(100 * c / N1).toFixed(1)}%`).join('  '));
  }
}

// ---------- 3. MIPS opcode scoring across transforms ----------
const mipsOps = new Set([0x00, 0x24, 0x8C, 0xAC, 0x3C, 0x27, 0xAF, 0x08, 0x0A, 0x10, 0x13, 0x25, 0x2B, 0x04, 0x0F, 0x23, 0x2F, 0x09, 0x01, 0x2D]);
function mipsScore(b, off, len, le) {
  let good = 0, tot = 0;
  for (let i = off; i + 4 <= off + len; i += 4) {
    const w = le ? ((b[i + 3] << 24) | (b[i + 2] << 16) | (b[i + 1] << 8) | b[i]) >>> 0
                 : ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    tot++;
    if (mipsOps.has((w >>> 26) & 0x3f)) good++;
  }
  return tot ? good / tot : 0;
}
const revtab = new Uint8Array(256);
for (let i = 0; i < 256; i++) { let r = 0; for (let b = 0; b < 8; b++) r = (r << 1) | ((i >> b) & 1); revtab[i] = r; }
function xform(off, len, f) { const t = Buffer.alloc(len); for (let i = 0; i < len; i++) t[i] = f(buf[off + i]); return t; }
const W = 16384;
P(''); P('== MIPS opcode-likeness per window (baseline random ~31%) ==');
P('window      raw-BE raw-LE rev-BE rev-LE xorA1-BE xorFF-BE');
for (const off of [0x0, 0x100000, 0x200000, 0x300000, 0x368000, 0x3a0000, 0x3c0000]) {
  const len = Math.min(W, size - off);
  const raw = buf.subarray(off, off + len);
  const rev = xform(off, len, c => revtab[c]);
  const xa1 = xform(off, len, c => c ^ 0xA1);
  const xff = xform(off, len, c => c ^ 0xFF);
  P(`0x${off.toString(16).padStart(6, '0')}   ` + [
    mipsScore(raw, 0, len, false), mipsScore(raw, 0, len, true),
    mipsScore(rev, 0, len, false), mipsScore(rev, 0, len, true),
    mipsScore(xa1, 0, len, false), mipsScore(xff, 0, len, false),
  ].map(v => (100 * v).toFixed(1).padStart(6)).join(' '));
}

// ---------- 4. transpose tests (width 16, 256) ----------
function transpose(off, len, width) {
  const blocks = Math.floor(len / width);
  const out = Buffer.alloc(blocks * width);
  for (let lane = 0; lane < width; lane++)
    for (let b = 0; b < blocks; b++)
      out[lane * blocks + b] = buf[off + b * width + lane];
  return out;
}
function countStrings(b, min = 6) {
  let cnt = 0; let cur = 0; let chars = 0;
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (c >= 0x20 && c <= 0x7e) { cur++; chars++; }
    else { if (cur >= min) cnt++; cur = 0; }
  }
  if (cur >= min) cnt++;
  return { cnt, chars };
}
P(''); P('== transpose tests (first 1MiB) ==');
for (const width of [16, 256]) {
  const t = transpose(0, 1 << 20, width);
  const s = countStrings(t);
  const hits = [];
  const re = /Linux|MIPS|UTS|6710|MBOOT|ECOS|root|init|bin|etc/gi;
  let m; while ((m = re.exec(t.toString('latin1'))) && hits.length < 10) hits.push(`${m[0]}@0x${m.index.toString(16)}`);
  P(`width ${width}: strings>=6 = ${s.cnt} (chars ${s.chars}); mipsBE=${(100 * mipsScore(t, 0, 16384, false)).toFixed(1)}% mipsLE=${(100 * mipsScore(t, 0, 16384, true)).toFixed(1)}%; hits: ${hits.join(', ') || 'none'}`);
}
P(`reference raw strings>=6 on same 1MiB: ${countStrings(buf.subarray(0, 1 << 20)).cnt}`);

// ---------- 5. zlib candidates ----------
P(''); P('== zlib header candidates ==');
const zcands = [];
for (let i = 0; i + 2 < size; i++) {
  const a = buf[i], b = buf[i + 1];
  if (a === 0x78 && (b === 0x9C || b === 0x01 || b === 0xDA || b === 0x5E)) zcands.push(i);
}
P(`candidates: ${zcands.length} (first: ${zcands.slice(0, 12).map(o => '0x' + o.toString(16)).join(', ')})`);
let ok = 0;
for (const off of zcands.slice(0, 40)) {
  try {
    const out = zlib.inflateSync(buf.subarray(off, Math.min(size, off + (1 << 20))));
    P(`  inflate OK @0x${off.toString(16)} -> ${out.length} bytes`);
    ok++;
  } catch { }
}
P(`inflate successes: ${ok}`);

// ---------- 6. tail row-repeat analysis ----------
P(''); P('== tail region 0x368000-0x3cb900: 16-byte rows ==');
{
  const start = 0x368000, end = 0x3cb900;
  let sameAsPrev = 0, rows = 0, uniqWords = new Set(), wordMap = new Map();
  for (let o = start; o + 16 <= end; o += 16) {
    rows++;
    if (o > start && buf.compare(buf, o - 16, o, o, o + 16) === 0) sameAsPrev++;
    for (let j = 0; j < 16; j += 4) {
      const w = buf.readUInt32LE(o + j);
      uniqWords.add(w);
      wordMap.set(w, (wordMap.get(w) || 0) + 1);
    }
  }
  P(`rows=${rows} identicalToPrev=${sameAsPrev} uniqueLE32words=${uniqWords.size}`);
  const top = [...wordMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  P('top LE32 words: ' + top.map(([w, c]) => `${w.toString(16).padStart(8, '0')}:${c}`).join('  '));
}

// ---------- 7. tail hexdumps ----------
P(''); P('== hexdumps (96 bytes each) ==');
for (const off of [0x368000, 0x36a000, 0x370000, 0x371000, 0x376000, 0x389000, 0x393000, 0x3a6000, 0x3ae000, 0x3bb000, 0x3cc000, 0x3db000, 0x3e0000, 0x3f2000, 0x3fb000]) {
  P(`@ 0x${off.toString(16)}:`);
  hexdump(buf, off, 96);
}

// ---------- 8. transformed first-64-bytes ----------
P(''); P('== first 64 bytes under transforms ==');
const disp = (name, f) => {
  const t = Buffer.alloc(64);
  for (let i = 0; i < 64; i++) t[i] = f(buf[i]);
  P(name.padEnd(10) + ': ' + [...t].map(x => x.toString(16).padStart(2, '0')).join(' '));
};
disp('bitrev', c => revtab[c]);
disp('xorA1', c => c ^ 0xA1);
disp('xorFF', c => c ^ 0xFF);

fs.writeFileSync(outDir + '/deep_report.txt', L.join('\n'));
console.log('written: ' + outDir + '/deep_report.txt');

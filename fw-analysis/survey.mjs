// Firmware survey script — reads a flash dump and reports structure hints.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const inPath = process.argv[2];
if (!inPath) { console.error('usage: node survey.mjs <firmware.bin> [outDir]'); process.exit(1); }
const outDir = process.argv[3] || 'fw-analysis-out';
fs.mkdirSync(outDir, { recursive: true });

const buf = fs.readFileSync(inPath);
const size = buf.length;
const L = [];
const out = (s = '') => L.push(s);

out(`File        : ${inPath}`);
out(`Size        : ${size} bytes (${(size / 1048576).toFixed(3)} MiB)`);
out(`SHA-256     : ${crypto.createHash('sha256').update(buf).digest('hex')}`);
out(`MD5         : ${crypto.createHash('md5').update(buf).digest('hex')}`);
out('');

// --- overall byte histogram (top) ---
const freqAll = new Uint32Array(256);
for (let i = 0; i < size; i++) freqAll[buf[i]]++;
const top = [...freqAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
out('Top bytes overall:');
for (const [b, c] of top) out(`  0x${b.toString(16).padStart(2, '0')}  ${c}  (${(100 * c / size).toFixed(1)}%)`);
out('');

// --- entropy map per 4KiB ---
const BLK = 4096;
const nblk = Math.ceil(size / BLK);
const ent = new Float64Array(nblk);
for (let b = 0; b < nblk; b++) {
  const s = b * BLK, e = Math.min(size, s + BLK), n = e - s;
  const fr = new Uint32Array(256);
  for (let i = s; i < e; i++) fr[buf[i]]++;
  let h = 0;
  for (let i = 0; i < 256; i++) { if (fr[i]) { const p = fr[i] / n; h -= p * Math.log2(p); } }
  ent[b] = h;
}
const cls = h => h >= 7.30 ? 'HIGH' : (h <= 1.0 ? 'ZEROISH' : (h <= 3.0 ? 'LOW' : 'MID'));
const runs = [];
for (let b = 0; b < nblk; b++) {
  const c = cls(ent[b]);
  const last = runs[runs.length - 1];
  if (last && last.c === c) { last.n++; last.sum += ent[b]; }
  else runs.push({ c, n: 1, sum: ent[b], start: b });
}
out('Entropy map (per 4KiB block; HIGH>=7.30 = compressed/encrypted/random):');
for (const r of runs) out(`  ${r.c.padEnd(8)} ${String(r.n * 4).padStart(6)} KiB @ 0x${(r.start * BLK).toString(16).padStart(6, '0')}  avgH=${(r.sum / r.n).toFixed(2)}`);
out('');

// --- magic scan ---
const M = [
  ['jffs2 (19 85)', [0x19, 0x85]],
  ['jffs2 (85 19)', [0x85, 0x19]],
  ['squashfs hsqs', [...Buffer.from('hsqs')]],
  ['squashfs sqsh', [...Buffer.from('sqsh')]],
  ['cramfs', [0x45, 0x3d, 0xcd, 0x28]],
  ['romfs', [...Buffer.from('-rom1fs-')]],
  ['UBI#', [...Buffer.from('UBI#')]],
  ['UBIFS', [...Buffer.from('UBIFS')]],
  ['dtb', [0xd0, 0x0d, 0xfe, 0xed]],
  ['gzip', [0x1f, 0x8b, 0x08]],
  ['xz', [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]],
  ['bzip2 BZh', [0x42, 0x5a, 0x68]],
  ['lz4', [0x04, 0x22, 0x4d, 0x18]],
  ['zstd', [0x28, 0xb5, 0x2f, 0xfd]],
  ['zip PK', [0x50, 0x4b, 0x03, 0x04]],
  ['png', [0x89, 0x50, 0x4e, 0x47]],
  ['jpeg ffd8ff', [0xff, 0xd8, 0xff]],
  ['gif', [...Buffer.from('GIF8')]],
  ['elf', [0x7f, 0x45, 0x4c, 0x46]],
  ['uImage', [0x27, 0x05, 0x19, 0x56]],
  ['MBOOT', [...Buffer.from('MBOOT')]],
  ['mboot', [...Buffer.from('mboot')]],
  ['MSTAR', [...Buffer.from('MSTAR')]],
  ['U-Boot', [...Buffer.from('U-Boot')]],
  ['mksquashfs', [...Buffer.from('mksquashfs')]],
  ['BusyBox', [...Buffer.from('BusyBox')]],
  ['Linux', [...Buffer.from('Linux')]],
  ['T56', [...Buffer.from('T56')]],
  ['V56', [...Buffer.from('V56')]],
  ['T56U11', [...Buffer.from('T56U11')]],
  ['U11.23', [...Buffer.from('U11.23')]],
  ['cramfs str', [...Buffer.from('cramfs')]],
];
out('Magic scan (cap 12 hits per pattern):');
const find = (pat) => { const hits = []; let i = 0; const p = Buffer.from(pat); while (hits.length < 12) { const j = buf.indexOf(p, i); if (j < 0) break; hits.push(j); i = j + 1; } return hits; };
for (const [name, pat] of M) {
  const hits = find(pat);
  if (hits.length) out(`  ${name.padEnd(16)} x${hits.length >= 12 ? '12+' : hits.length}  @ ${hits.map(o => '0x' + o.toString(16)).join(', ')}`);
}
out('');

// --- longest 0x00 / 0xFF runs ---
function longestRun(byteVal) {
  let best = 0, bestOff = 0, cur = 0, curOff = 0;
  for (let i = 0; i < size; i++) {
    if (buf[i] === byteVal) { if (cur === 0) curOff = i; cur++; if (cur > best) { best = cur; bestOff = curOff; } }
    else cur = 0;
  }
  return { best, bestOff };
}
const r0 = longestRun(0x00), rff = longestRun(0xff);
out(`Longest 0x00 run: ${r0.best} bytes @ 0x${r0.bestOff.toString(16)}`);
out(`Longest 0xFF run: ${rff.best} bytes @ 0x${rff.bestOff.toString(16)}`);
out('');

// --- strings ---
const strs = new Map();
{
  let start = -1;
  const isP = c => c >= 0x20 && c <= 0x7e;
  for (let i = 0; i <= size; i++) {
    const c = i < size ? buf[i] : 0;
    if (isP(c)) { if (start < 0) start = i; }
    else {
      if (start >= 0) {
        const len = i - start;
        if (len >= 5) { const s = buf.toString('latin1', start, i); const e = strs.get(s); if (e) e.count++; else strs.set(s, { count: 1, first: start }); }
        start = -1;
      }
    }
  }
}
const list = [...strs.entries()].map(([s, v]) => ({ s, ...v })).sort((a, b) => a.first - b.first);
fs.writeFileSync(path.join(outDir, 'survey_strings.txt'), list.map(e => `0x${e.first.toString(16).padStart(6, '0')} x${e.count} ${e.s}`).join('\n'));
const re = /(mboot|mstar|v56|t56|logo|osd|boot|kernel|squash|jffs|ubi|font|lang|uart|hdmi|remote|panel|version|build|secure|crypto|aes|magic|system|factory|default|reboot|upgrade|usb|hdmi)/i;
const interesting = list.filter(e => re.test(e.s));
out(`Strings: ${list.length} unique ASCII runs >=5 chars (full list: survey_strings.txt). Interesting matches (${interesting.length}), up to 200 shown:`);
for (const e of interesting.slice(0, 200)) out(`  0x${e.first.toString(16).padStart(6, '0')}  ${e.s.length > 110 ? e.s.slice(0, 110) + '...' : e.s}`);
out('');

// --- raw hex edges ---
out('First 256 bytes, raw:');
for (let o = 0; o < 256; o += 16) out('  ' + [...buf.subarray(o, o + 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
out('');
out(`Last 256 bytes, raw (offset 0x${(size - 256).toString(16)}):`);
for (let o = size - 256; o < size; o += 16) out('  ' + [...buf.subarray(o, o + 16)].map(b => b.toString(16).padStart(2, '0')).join(' '));
out('');

// --- transform probes on first 1KiB ---
const sample = buf.subarray(0, 1024);
function score(dec) {
  let pr = 0;
  for (const b of dec) { if ((b >= 0x20 && b <= 0x7e) || b === 0x09 || b === 0x0a || b === 0x0d || b === 0) pr++; }
  const w0 = (dec[0]) | (dec[1] << 8) | (dec[2] << 16) | (dec[3] << 24);
  const w1 = (dec[4]) | (dec[5] << 8) | (dec[6] << 16) | (dec[7] << 24);
  let bonus = 0;
  const s = Buffer.from(dec).toString('latin1');
  if (/MBOOT|mboot|MSTAR|jffs|hsqs|rom1fs/.test(s)) bonus += 40;
  if ((w0 >>> 24) === 0xea) bonus += 60;                 // ARM branch
  if (w0 >= 0x20000000 && w0 < 0x21000000) bonus += 40;  // Cortex-M initial SP
  if ((w1 >>> 24) === 0x08 || (w1 >>> 28) === 0x0) bonus += 20;
  return { score: pr / 10 + bonus, w0w1: `${w0.toString(16)}:${w1.toString(16)}` };
}
const probes = [];
const tmp = new Uint8Array(1024);
for (let k = 0; k < 256; k++) { for (let i = 0; i < 1024; i++) tmp[i] = sample[i] ^ k; const r = score(tmp); probes.push([`xor ${k.toString(16).padStart(2, '0')}`, r.score, r.w0w1]); }
for (let i = 0; i < 1024; i++) tmp[i] = ~sample[i] & 0xff; { const r = score(tmp); probes.push(['invert (~x)', r.score, r.w0w1]); }
const revb = n => { let r = 0; for (let i = 0; i < 8; i++) { r = (r << 1) | ((n >> i) & 1); } return r; };
for (let i = 0; i < 1024; i++) tmp[i] = revb(sample[i]); { const r = score(tmp); probes.push(['bitreverse', r.score, r.w0w1]); }
const tmp2 = new Uint8Array(1024);
for (let i = 0; i < 1022; i += 2) { tmp2[i] = sample[i + 1]; tmp2[i + 1] = sample[i]; } { const r = score(tmp2); probes.push(['swap16', r.score, r.w0w1]); }
for (let i = 0; i < 1024; i++) tmp2[i] = ((sample[i] << 4) | (sample[i] >> 4)) & 0xff; { const r = score(tmp2); probes.push(['nibbleswap', r.score, r.w0w1]); }
probes.sort((a, b) => b[1] - a[1]);
out('Transform probes (best 8 by score on first 1KiB):');
for (const [n, s, w] of probes.slice(0, 8)) out(`  ${n.padEnd(12)} score=${s.toFixed(1).padStart(7)}  w0:w1=${w}`);
out('');

const rpt = path.join(outDir, 'survey_report.txt');
fs.writeFileSync(rpt, L.join('\n'));
console.log(`report written: ${rpt}`);
console.log(`strings   : ${path.join(outDir, 'survey_strings.txt')} (${list.length} entries)`);

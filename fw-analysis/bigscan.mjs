// bigscan: large dump scanner (chunked) - magics, strings, keywords, filenames, entropy/FF map
import fs from 'node:fs';
const path = process.argv[2];
const outDir = process.argv[3] || '.';
const maxStrings = 1200000;
const size = fs.statSync(path).size;
const L = []; const P = s => L.push(s);
P('== bigscan ==');
P('file: ' + path);
P('size: ' + size + ' bytes (' + (size / 1048576).toFixed(2) + ' MiB)');

const fd = fs.openSync(path, 'r');

// ---- head / MBR / tail ----
const head = Buffer.alloc(4096);
fs.readSync(fd, head, 0, 4096, 0);
P('');
P('-- first 512 bytes --');
for (let o = 0; o < 512; o += 16) {
  const row = [...head.subarray(o, o + 16)];
  P('  ' + o.toString(16).padStart(6, '0') + '  ' + row.map(x => x.toString(16).padStart(2, '0')).join(' ') + '  ' + row.map(x => (x >= 0x20 && x <= 0x7e) ? String.fromCharCode(x) : '.').join(''));
}
if (head[510] === 0x55 && head[511] === 0xaa) {
  P('MBR signature present:');
  for (let i = 0; i < 4; i++) {
    const e = head.subarray(446 + i * 16, 446 + i * 16 + 16);
    const type = e[4], lba = e.readUInt32LE(8), cnt = e.readUInt32LE(12);
    if (type !== 0 || lba !== 0 || cnt !== 0) P('  part' + (i + 1) + ': type=0x' + type.toString(16) + ' startLBA=' + lba + ' (0x' + (lba * 512 >>> 0).toString(16) + ') sectors=' + cnt + ' (' + ((cnt * 512 / 1048576) | 0) + ' MiB)');
  }
}
const tail = Buffer.alloc(512);
fs.readSync(fd, tail, 0, 512, size - 512);
P('');
P('-- last 256 bytes --');
for (let o = 256; o < 512; o += 16) {
  const row = [...tail.subarray(o, o + 16)];
  P('  ' + (size - 512 + o).toString(16).padStart(8, '0') + '  ' + row.map(x => x.toString(16).padStart(2, '0')).join(' '));
}

// ---- magics ----
const magics = [
  ['UBI#', 'UBI header'], ['UBI!', 'UBI header'],
  ['hsqs', 'squashfs LE'], ['sqsh', 'squashfs BE'],
  ['\x7fELF', 'ELF'], ['ANDROID!', 'Android boot'], ['BOOTLDR!', 'Android bootldr'],
  ['EFI PART', 'GPT header'], ['FAT32   ', 'FAT32'], ['FAT16   ', 'FAT16'], ['NTFS    ', 'NTFS'],
  ['F2FS', 'F2FS'], ['\x19\x85\x19\x85', 'JFFS2 LE'], ['\x85\x19\x85\x19', 'JFFS2 BE'],
  ['\xfd7zXZ\x00', 'XZ'], ['PK\x03\x04', 'ZIP'], ['\x1f\x8b\x08', 'GZIP'],
  ['7z\xbc\xaf\x27\x1c', '7z'], ['Rar!\x1a\x07', 'RAR'], ['\xd0\x0d\xfe\xed', 'FDT/DTB']
].map(([m, n]) => [Buffer.from(m, 'latin1'), n]);
const magicHits = magics.map(() => []);
const magicCount = magics.map(() => 0);

// ---- state ----
const CHUNK = 8 << 20;
const chunk = Buffer.alloc(CHUNK);
let pos = 0;
let ff = 0, z = 0;
let ffRun = 0, ffRunStart = 0; const ffRuns = [];
let zRun = 0, zRunStart = 0; const zRuns = [];
const strList = []; let strTotal = 0;
const filenames = [];
let magicTail = Buffer.alloc(0);
const mapRows = [];
let histBytes = 0; const hist = new Uint32Array(256);
const KWS = ['vestel', 'sp3531', 'hi352', 'hisilicon', 'remote', 'remocon', 'logo', 'panel', 'tcon', 'uboot', 'u-boot', 'kernel', 'android', 'rootfs', 'userdata', 'vendor', 'recovery', 'squashfs', 'ubifs', 'jffs2', 'sunplus', 'mstar', 'boot', 'firmware'];

function addStr(off, s) {
  strTotal++;
  if (strList.length < maxStrings) {
    strList.push([off, s]);
    if (s.length >= 6 && s.length <= 80 && /\.(bin|img|fs|dat|cfg|conf|xml|json|txt|png|jpg|jpeg|bmp|ttf|ko|so|sh|elf|tar|gz)$/i.test(s) && filenames.length < 400) filenames.push([off, s]);
  }
}
function flushMap() {
  if (histBytes === 0) return;
  let H = 0;
  for (let v = 0; v < 256; v++) { if (hist[v]) { const p = hist[v] / histBytes; H -= p * Math.log2(p); } }
  mapRows.push([pos - histBytes, histBytes, H]);
  histBytes = 0; hist.fill(0);
}

while (true) {
  const n = fs.readSync(fd, chunk, 0, CHUNK, pos);
  if (n <= 0) break;
  const b = chunk;
  // magics (with tiny carry overlap)
  const searchBuf = magicTail.length ? Buffer.concat([magicTail, b.subarray(0, n)]) : b.subarray(0, n);
  const baseAdj = pos - magicTail.length;
  for (let m = 0; m < magics.length; m++) {
    const pat = magics[m][0];
    let idx = 0;
    while (true) {
      idx = searchBuf.indexOf(pat, idx);
      if (idx < 0) break;
      magicCount[m]++;
      if (magicHits[m].length < 15) magicHits[m].push(baseAdj + idx);
      idx += 1;
      if (magicCount[m] > 100000) break;
    }
  }
  const keep = 64;
  magicTail = Buffer.from(b.subarray(Math.max(0, n - keep), n));
  // pass
  let strStart = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n) {
      const v = b[i];
      if (v === 0xff) { ff++; if (ffRun === 0) ffRunStart = pos + i; ffRun++; }
      else { if (ffRun > 0) { if (ffRun >= 0x100000) ffRuns.push([ffRunStart, ffRun]); ffRun = 0; } if (v === 0) { z++; if (zRun === 0) zRunStart = pos + i; zRun++; } else { if (zRun > 0) { if (zRun >= 0x100000) zRuns.push([zRunStart, zRun]); zRun = 0; } } }
      hist[v]++; histBytes++;
    }
    const printable = i < n && b[i] >= 0x20 && b[i] <= 0x7e;
    if (printable) {
      if (strStart < 0) strStart = i;
      else if (i - strStart >= 100) { addStr(pos + strStart, b.toString('latin1', strStart, strStart + 100)); strStart = i; }
    } else {
      if (strStart >= 0) { if (i - strStart >= 6) addStr(pos + strStart, b.toString('latin1', strStart, i)); strStart = -1; }
    }
  }
  if (histBytes >= 16 * 1048576) { flushMap(); }
  pos += n;
}
flushMap();
fs.closeSync(fd);

// final runs
if (ffRun >= 0x100000) ffRuns.push([ffRunStart, ffRun]);
if (zRun >= 0x100000) zRuns.push([zRunStart, zRun]);

P('');
P('-- overview --');
P('0xFF bytes: ' + ff + ' (' + (ff / size * 100).toFixed(2) + '%)   0x00 bytes: ' + z + ' (' + (z / size * 100).toFixed(2) + '%)');
P('strings>=6 total: ' + strTotal + (strTotal > maxStrings ? ' (stored first ' + maxStrings + ')' : ''));
P('');
P('-- 16MiB map (F=FF-heavy Z=zero-heavy R=maxentropy P=high M=mid L=low) --');
let mline = '';
for (const [off, len, H] of mapRows) {
  let c = '.';
  // ff fraction of row approximated later; use entropy+neighbors
  if (H > 7.95) c = 'R'; else if (H > 7.0) c = 'P'; else if (H > 5.0) c = 'M'; else c = 'L';
  mline += c;
  if (mline.length === 128) { P('  ' + mline); mline = ''; }
}
if (mline) P('  ' + mline);
P('  rows: ' + mapRows.map(r => '0x' + r[0].toString(16) + ':H=' + r[2].toFixed(2)).slice(0, 0).join(''));
P('');
P('-- magics --');
for (let m = 0; m < magics.length; m++) {
  if (magicCount[m] > 0) P('  ' + magics[m][0].toString('latin1').replace(/[^\x20-\x7e]/g, '?') + ' (' + ['UBI header', 'UBI header', 'squashfs LE', 'squashfs BE', 'ELF', 'Android boot', 'Android bootldr', 'GPT header', 'FAT32', 'FAT16', 'NTFS', 'F2FS', 'JFFS2 LE', 'JFFS2 BE', 'XZ', 'ZIP', 'GZIP', '7z', 'RAR', 'FDT/DTB'][m] + '): ' + magicCount[m] + ' hits; first: ' + magicHits[m].map(o => '0x' + o.toString(16)).join(' '));
}
P('');
P('-- largest 0xFF runs --');
ffRuns.sort((a, b) => b[1] - a[1]);
for (const [st, len] of ffRuns.slice(0, 12)) P('  0x' + st.toString(16) + '  len=' + (len / 1048576).toFixed(2) + ' MiB');
P('-- largest 0x00 runs --');
zRuns.sort((a, b) => b[1] - a[1]);
for (const [st, len] of zRuns.slice(0, 8)) P('  0x' + st.toString(16) + '  len=' + (len / 1048576).toFixed(2) + ' MiB');
P('');
P('-- keywords in strings --');
const lower = strList.map(([o, s]) => [o, s, s.toLowerCase()]);
for (const kw of KWS) {
  const hits = [];
  for (const [o, s, ls] of lower) { if (ls.includes(kw)) { hits.push([o, s.replace(/[^\x20-\x7e]/g, '?')]); if (hits.length >= 20) break; } }
  if (hits.length) { P('  [' + kw + '] first ' + hits.length + ':'); for (const [o, s] of hits.slice(0, 12)) P('    0x' + o.toString(16) + '  ' + s.slice(0, 90)); }
}
P('');
P('-- filename-like strings (first 120) --');
for (const [o, s] of filenames.slice(0, 120)) P('  0x' + o.toString(16) + '  ' + s);
P('');
P('-- sample strings from first 8MiB (first 80) --');
let cnt = 0;
for (const [o, s] of strList) { if (o > 8 * 1048576) break; if (s.length >= 8) { P('  0x' + o.toString(16) + '  ' + s.slice(0, 100)); cnt++; if (cnt >= 80) break; } }

const report = L.join('\n');
fs.writeFileSync(outDir + '/bigscan_report_' + (process.argv[4] || 'x') + '.txt', report);
console.log(report);

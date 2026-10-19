// landmarks: find real image/firmware landmarks in a big dump (boot imgs, fs superblocks, pics, TOC)
import fs from 'node:fs';
const path = process.argv[2];
const outDir = process.argv[3] || '.';
const size = fs.statSync(path).size;
const L = []; const P = s => L.push(s);
const fd = fs.openSync(path, 'r');
const CHUNK = 8 << 20;
const chunk = Buffer.alloc(CHUNK);

function collect(pat, cap) {
  const out = [];
  let pos = 0, carry = Buffer.alloc(0);
  while (pos < size) {
    const n = fs.readSync(fd, chunk, 0, Math.min(CHUNK, size - pos), pos);
    if (n <= 0) break;
    const b = chunk.subarray(0, n);
    const sb = carry.length ? Buffer.concat([carry, b]) : b;
    const base = pos - carry.length;
    let idx = 0;
    while (true) {
      idx = sb.indexOf(pat, idx);
      if (idx < 0) break;
      out.push(base + idx);
      if (out.length >= cap) break;
      idx += 1;
    }
    if (out.length >= cap) break;
    const keep = Math.max(0, pat.length - 1);
    carry = Buffer.from(b.subarray(Math.max(0, n - keep), n));
    pos += n;
  }
  return out;
}
function hd(off, len) {
  const b = Buffer.alloc(len);
  fs.readSync(fd, b, 0, len, off);
  for (let o = 0; o < len; o += 16) {
    const row = [...b.subarray(o, o + 16)];
    P('  ' + (off + o).toString(16).padStart(8, '0') + '  ' + row.map(x => x.toString(16).padStart(2, '0')).join(' ') + '  ' + row.map(x => (x >= 0x20 && x <= 0x7e) ? String.fromCharCode(x) : '.').join(''));
  }
}

P('== landmarks ==');
P('file: ' + path + '  size: ' + size);

// ANDROID! boot images
const boots = collect(Buffer.from('ANDROID!'), 300);
P('');
P('-- ANDROID! hits: ' + boots.length + ' --');
for (const o of boots) {
  const h = Buffer.alloc(64);
  fs.readSync(fd, h, 0, 64, o);
  const ksz = h.readUInt32BE(8), rsz = h.readUInt32BE(16), ssz = h.readUInt32BE(24), psz = h.readUInt32BE(36) || 2048;
  const total = Math.ceil((1632 + ksz + rsz + ssz) / psz) * psz;
  P('  0x' + o.toString(16) + '  ksize=' + (ksz / 1048576).toFixed(2) + 'M rsize=' + (rsz / 1048576).toFixed(2) + 'M ssize=' + ssz + ' pagesz=' + psz + ' est_total=' + (total / 1048576).toFixed(2) + 'M');
}
// BOOTLDR! (recovery-style)
const bootldr = collect(Buffer.from('BOOTLDR!'), 50);
P('BOOTLDR! hits: ' + bootldr.length + (bootldr.length ? ' first: ' + bootldr.map(o => '0x' + o.toString(16)).join(' ') : ''));

// F2FS real magic (u32 LE 0xF2F52010)
const f2 = collect(Buffer.from('1020f5f2', 'hex'), 400);
P('');
P('-- F2FS magic (10 20 f5 f2): ' + f2.length + ' hits --');
for (const o of f2.slice(0, 60)) {
  const start = o - 1024;
  P('  hit 0x' + o.toString(16) + '  block0_start=0x' + (o - 1024).toString(16) + '  aligned64k=' + ((o - 1024) % 0x10000 === 0));
}

// squashfs
const sq = collect(Buffer.from('hsqs'), 200);
P('');
P('-- hsqs (squashfs): ' + sq.length + ' hits --');
for (const o of sq.slice(0, 40)) {
  const v = Buffer.alloc(128); fs.readSync(fd, v, 0, 128, o);
  P('  0x' + o.toString(16) + '  ver=' + v.readUInt16LE(0x1c) + '.' + v.readUInt16LE(0x1e) + ' blocksize=' + v.readUInt32LE(0xc) + ' inodes=' + v.readUInt32LE(4) + ' bytesUsed=' + Number(v.readBigUInt64LE(0x28)));
}

// PNG / JPEG
const png = collect(Buffer.from('89504e470d0a1a0a', 'hex'), 600);
P('');
P('-- PNG: ' + png.length + ' hits; first 40: ' + png.slice(0, 40).map(o => '0x' + o.toString(16)).join(' '));
const jpg = collect(Buffer.from('ffd8ffe0', 'hex'), 600);
const jpg2 = collect(Buffer.from('ffd8ffe1', 'hex'), 600);
const jpg3 = collect(Buffer.from('ffd8ffdb', 'hex'), 300);
const alljpg = [...jpg, ...jpg2, ...jpg3].sort((a, b) => a - b);
P('-- JPEG: ' + alljpg.length + ' hits; first 60: ' + alljpg.slice(0, 60).map(o => '0x' + o.toString(16)).join(' '));

// ext4 grid check (1MB and 512KB grid)
P('');
P('-- ext4 superblock candidates (grid) --');
let e4 = 0;
for (let o = 0; o + 0x800 <= size; o += 0x100000) {
  const b = Buffer.alloc(0x800);
  fs.readSync(fd, b, 0, 0x800, o);
  if (b.readUInt16LE(0x438) === 0xef53) { P('  ext4 @ 0x' + o.toString(16) + '  inodes=' + b.readUInt32LE(0x400) + ' blocks=' + b.readUInt32LE(0x404)); e4++; if (e4 > 60) break; }
}
if (!e4) P('  none at 1MiB grid');

// UBI#
const ubi = collect(Buffer.from('UBI#'), 20);
P('');
P('-- UBI#: ' + ubi.length + (ubi.length ? ' at ' + ubi.map(o => '0x' + o.toString(16)).join(' ') : ''));

// EFI PART (GPT)
const efi = collect(Buffer.from('EFI PART'), 20);
P('-- EFI PART: ' + efi.length + (efi.length ? ' at ' + efi.map(o => '0x' + o.toString(16)).join(' ') : ''));

P('');
P('-- TOC area 0x0-0x2F0 (16B rows) --');
hd(0, 0x2f0);

const spots = [0x13d1b0, 0x140d650, 0x2107000, 0x2604000, 0x36fc000, 0x3b20800, 0x4069f000, 0x4d559000, 0x4d559400, size - 0x1000];
for (const s of spots) {
  if (s < 0 || s + 0x80 > size) continue;
  P('');
  P('-- @0x' + s.toString(16) + ' --');
  hd(Math.max(0, s - 0x20), 0xc0);
}

fs.writeFileSync(outDir + '/landmarks_report.txt', L.join('\n'));
console.log(L.join('\n'));

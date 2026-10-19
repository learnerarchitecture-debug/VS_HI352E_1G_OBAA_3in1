// ident.mjs - identify extracted images by magic/headers
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const list = fs.readdirSync(dir).filter(f => /\.(img|bin)$/i.test(f)).sort();
for (const f of list) {
  const p = path.join(dir, f);
  const st = fs.statSync(p);
  const fd = fs.openSync(p, 'r');
  const N = Math.min(st.size, 4 << 20);
  const h = Buffer.alloc(N);
  fs.readSync(fd, h, 0, N, 0);
  console.log('\n===== ' + f + '   ' + st.size + ' bytes =====');
  const rows = Math.min(6, Math.ceil(N / 16));
  for (let o = 0; o < rows * 16; o += 16) {
    const row = [...h.subarray(o, o + 16)];
    console.log('  ' + o.toString(16).padStart(6, '0') + '  ' + row.map(x => x.toString(16).padStart(2, '0')).join(' ') + '  ' + row.map(x => (x >= 32 && x < 127) ? String.fromCharCode(x) : '.').join(''));
  }
  const notes = [];
  const u16 = o => (o + 2 <= N ? h.readUInt16LE(o) : -1);
  const u32 = o => (o + 4 <= N ? h.readUInt32LE(o) : -1);
  const tag = h.toString('latin1', 0, 8);
  if (tag === 'ANDROID!') {
    const ksz = u32(8), rsz = u32(16), ssz = u32(24), psz = u32(36) || 2048;
    const total = Math.ceil((1632 + ksz + rsz + ssz) / psz) * psz;
    notes.push('ANDROID boot img: kernel=' + ksz + ' ramdisk=' + rsz + ' second=' + ssz + ' pagesz=' + psz + ' payload_total=' + total + ' name=' + JSON.stringify(h.toString('latin1', 48, 64).replace(/\0+$/, '')));
  }
  if (u32(1024) === 0xF2F52010) notes.push('F2FS superblock magic at +1024');
  if (u32(2048) === 0xF2F52010) notes.push('F2FS magic at +2048');
  if (u16(0x438) === 0xEF53) notes.push('EXT4 superblock @0x438: inodes=' + u32(0x400) + ' blocks=' + u32(0x404) + ' blockSize=' + (1024 << h[0x424]) + ' volume=' + h.toString('latin1', 0x478, 0x488).replace(/\0.*$/, ''));
  if (u16(1024 + 0x38) === 0xEF53) notes.push('EXT4 superblock @+0x438 from 1024: volume=' + h.toString('latin1', 1024 + 0x78, 1024 + 0x88).replace(/\0.*$/, ''));
  if (u16(510) === 0xAA55) notes.push('MBR 55AA @510');
  let fnz = -1;
  for (let i = 0; i < N; i++) if (h[i] !== 0) { fnz = i; break; }
  if (fnz > 0) notes.push('first non-zero at 0x' + fnz.toString(16));
  if (fnz < 0 && N === st.size) notes.push('FILE IS ALL ZEROS');
  let nz = 0; for (let i = 0; i < N; i++) if (h[i] !== 0) nz++;
  notes.push('non-zero in first ' + (N / 1048576).toFixed(1) + ' MiB: ' + (100 * nz / N).toFixed(1) + '%');
  for (const n of notes) console.log('   >> ' + n);
  fs.closeSync(fd);
}

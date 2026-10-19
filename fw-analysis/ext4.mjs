// ext4.mjs - minimal read-only ext4 tree lister / file extractor
// usage:
//   node ext4.mjs stat <img>
//   node ext4.mjs list <img> <outTxt> [substr1,substr2,...]
//   node ext4.mjs cat  <img> <innerPath> <outFile>
import fs from 'node:fs';
import path from 'node:path';

const [, , mode, imgPath, a4, a5] = process.argv;
function die(msg) { console.error('ERR: ' + msg); process.exit(1); }

class Ext4 {
  constructor(p) {
    this.fd = fs.openSync(p, 'r');
    this.fileSize = fs.statSync(p).size;
    const sb = Buffer.alloc(1024);
    fs.readSync(this.fd, sb, 0, 1024, 1024);
    if (sb.readUInt16LE(0x38) !== 0xEF53) die('not ext4: ' + p);
    this.sb = sb;
    this.bs = 1024 << sb.readUInt32LE(0x18);
    this.first = sb.readUInt32LE(0x14);
    this.incompat = sb.readUInt32LE(0x60);
    this.rocompat = sb.readUInt32LE(0x64);
    this.blocks = sb.readUInt32LE(4) + ((this.incompat & 0x80) ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
    this.inodesCnt = sb.readUInt32LE(0);
    this.bpg = sb.readUInt32LE(0x20);
    this.ipg = sb.readUInt32LE(0x28);
    this.isize = sb.readUInt16LE(0x58) || 128;
    this.descSize = (this.incompat & 0x80) ? (sb.readUInt16LE(0xFE) || 64) : 32;
    this.vol = sb.toString('latin1', 0x78, 0x88).replace(/\0.*$/, '');
    this.uuid = sb.subarray(0x68, 0x78).toString('hex');
    this.groups = Math.ceil((this.blocks - this.first) / this.bpg);
    this.gdt = Buffer.alloc(Math.max(1, this.groups * this.descSize));
    fs.readSync(this.fd, this.gdt, 0, this.gdt.length, (this.first + 1) * this.bs);
    this.tables = new Map();
  }
  tableBlock(g) {
    const o = g * this.descSize;
    let t = this.gdt.readUInt32LE(o + 8);
    if (this.descSize > 32) t += this.gdt.readUInt32LE(o + 0x28) * 2 ** 32;
    return t;
  }
  table(g) {
    if (!this.tables.has(g)) {
      const b = Buffer.alloc(this.ipg * this.isize);
      fs.readSync(this.fd, b, 0, b.length, this.tableBlock(g) * this.bs);
      this.tables.set(g, b);
    }
    return this.tables.get(g);
  }
  inode(ino) {
    const g = Math.floor((ino - 1) / this.ipg), idx = (ino - 1) % this.ipg;
    const t = this.table(g);
    const b = t.subarray(idx * this.isize, (idx + 1) * this.isize);
    const mode = b.readUInt16LE(0);
    let size = b.readUInt32LE(4);
    if ((mode & 0xF000) === 0x8000 && (this.rocompat & 0x2 || true)) size += b.readUInt32LE(0x6C) * 2 ** 32;
    return { ino, mode, type: mode & 0xF000, size, links: b.readUInt16LE(0x1A), flags: b.readUInt32LE(0x20), iBlock: b.subarray(0x28, 0x64) };
  }
  extents(inode) {
    const out = [];
    const fd = this.fd, bs = this.bs;
    const walk = buf => {
      if (buf.readUInt16LE(0) !== 0xF30A) return;
      const entries = buf.readUInt16LE(2);
      const d = buf.readUInt16LE(6);
      if (d > 0) {
        for (let i = 0; i < entries; i++) {
          const eo = 12 + i * 12;
          const leaf = buf.readUInt32LE(eo + 4) + buf.readUInt16LE(eo + 8) * 2 ** 32;
          const nb = Buffer.alloc(bs);
          fs.readSync(fd, nb, 0, bs, leaf * bs);
          walk(nb);
        }
      } else {
        for (let i = 0; i < entries; i++) {
          const eo = 12 + i * 12;
          let len = buf.readUInt16LE(eo + 4), uninit = false;
          if (len > 32768) { uninit = true; len -= 32768; }
          out.push({ lb: buf.readUInt32LE(eo), len, pb: buf.readUInt32LE(eo + 8) + buf.readUInt16LE(eo + 6) * 2 ** 32, uninit });
        }
      }
    };
    walk(Buffer.from(inode.iBlock));
    return out;
  }
  readData(inode) {
    const size = inode.size;
    if (size === 0) return Buffer.alloc(0);
    if (size <= 60) {
      if (inode.type === 0xA000) return Buffer.from(inode.iBlock.subarray(0, size));
      if ((this.incompat & 0x40000) && inode.iBlock.readUInt16LE(0) !== 0xF30A) return Buffer.from(inode.iBlock.subarray(0, size));
    }
    const ex = this.extents(inode);
    const out = Buffer.alloc(size);
    for (const e of ex) {
      for (let i = 0; i < e.len; i++) {
        const dest = (e.lb + i) * this.bs;
        if (dest >= size) break;
        if (!e.uninit && e.pb !== 0) {
          const n = Math.min(this.bs, size - dest);
          fs.readSync(this.fd, out, dest, n, (e.pb + i) * this.bs);
        }
      }
    }
    return out;
  }
  listDir(dirInode) {
    const data = this.readData(dirInode);
    const ents = [];
    for (let b0 = 0; b0 < data.length; b0 += this.bs) {
      let o = b0;
      const bmax = Math.min(b0 + this.bs, data.length);
      while (o + 8 <= bmax) {
        const ino = data.readUInt32LE(o);
        const rec = data.readUInt16LE(o + 4);
        const nl = data[o + 6], ft = data[o + 7];
        if (rec < 8 || rec % 4 !== 0) break;
        if (ino && nl > 0 && o + 8 + nl <= bmax) ents.push({ ino, name: data.toString('latin1', o + 8, o + 8 + nl), ft });
        if (o + rec >= bmax) break;
        o += rec;
      }
    }
    return ents;
  }
}

const TYPE = { 0x1000: 'p', 0x2000: 'c', 0x4000: 'd', 0x6000: 'b', 0x8000: 'f', 0xA000: 'l', 0xC000: 's' };

function walkTree(x, cb) {
  const seen = new Set();
  const q = [{ ino: 2, p: '/' }];
  let qi = 0;
  while (qi < q.length) {
    const { ino, p } = q[qi++];
    if (seen.has(ino)) continue;
    seen.add(ino);
    let inode;
    try { inode = x.inode(ino); } catch (e) { continue; }
    cb(inode, p);
    if (inode.type !== 0x4000) continue;
    let ents = [];
    try { ents = x.listDir(inode); } catch (e) { continue; }
    for (const e of ents) {
      if (e.name === '.' || e.name === '..') continue;
      const cp = p === '/' ? '/' + e.name : p + '/' + e.name;
      q.push({ ino: e.ino, p: cp });
    }
  }
}

function resolve(x, p) {
  let ino = 2;
  for (const part of p.split('/').filter(Boolean)) {
    const inode = x.inode(ino);
    if (inode.type !== 0x4000) die('not a dir: ' + part);
    const hit = x.listDir(inode).find(e => e.name === part);
    if (!hit) die('not found: ' + part + ' (in ' + p + ')');
    ino = hit.ino;
  }
  return ino;
}

const x = new Ext4(imgPath);
if (mode === 'stat') {
  const flags = [];
  const ic = x.incompat;
  if (ic & 0x2) flags.push('FILETYPE'); if (ic & 0x40) flags.push('EXTENTS'); if (ic & 0x80) flags.push('64BIT');
  if (ic & 0x10) flags.push('META_BG'); if (ic & 0x200) flags.push('FLEX_BG'); if (ic & 0x40000) flags.push('INLINE_DATA');
  const rc = x.rocompat;
  if (rc & 0x1) flags.push('SPARSE_SUPER'); if (rc & 0x2) flags.push('LARGE_FILE'); if (rc & 0x8) flags.push('HUGE_FILE');
  if (rc & 0x40) flags.push('EXTRA_ISIZE'); if (rc & 0x400) flags.push('METADATA_CSUM');
  console.log('== ' + imgPath + ' ==');
  console.log('volume="' + x.vol + '" uuid=' + x.uuid);
  console.log('blockSize=' + x.bs + ' blocks=' + x.blocks + ' (' + (x.blocks * x.bs / 1048576).toFixed(1) + ' MiB) inodes=' + x.inodesCnt + ' groups=' + x.groups);
  console.log('inodeSize=' + x.isize + ' descSize=' + x.descSize + ' incompat=0x' + ic.toString(16) + ' [' + flags.join(' ') + '] ro=0x' + rc.toString(16));
  const root = x.inode(2);
  const ents = x.listDir(root);
  console.log('root: ' + ents.map(e => e.name + (e.ft === 2 ? '/' : '')).slice(0, 200).join(' '));
} else if (mode === 'list') {
  const out = a4;
  const filt = (a5 || '').toLowerCase().split(',').filter(Boolean);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const lines = [];
  let nf = 0, nd = 0, nl = 0, bytes = 0, nOther = 0;
  const matches = [];
  let matchCount = 0;
  const top = [];
  for (const e of x.listDir(x.inode(2))) if (e.name !== '.' && e.name !== '..') top.push(e);
  walkTree(x, (inode, p) => {
    const t = TYPE[inode.type] || '?';
    if (inode.type === 0x4000) nd++;
    else if (inode.type === 0x8000) { nf++; bytes += inode.size; }
    else if (inode.type === 0xA000) nl++;
    else nOther++;
    lines.push(t + ' ' + inode.size + ' ' + p);
    if (filt.length) {
      const lp = p.toLowerCase();
      for (const f of filt) {
        if (lp.includes(f)) {
          matchCount++;
          if (matches.length < 500) {
            let extra = '';
            if (inode.type === 0xA000) { try { extra = ' -> ' + x.readData(inode).toString('latin1'); } catch (e) {} }
            matches.push('  ' + t + ' ' + inode.size + ' ' + p + extra);
          }
          break;
        }
      }
    }
  });
  fs.writeFileSync(out, lines.join('\n'));
  console.log('== ' + imgPath + ' ==');
  console.log('dirs=' + nd + ' files=' + nf + ' links=' + nl + ' other=' + nOther + ' fileBytes=' + bytes + ' (' + (bytes / 1048576).toFixed(1) + ' MiB)  list-> ' + out);
  console.log('top-level: ' + top.map(e => e.name + (e.ft === 2 ? '/' : '')).join(' '));
  if (filt.length) {
    console.log('matches for [' + filt.join('|') + ']: ' + matchCount);
    for (const m of matches) console.log(m);
    if (matchCount > matches.length) console.log('  ... ' + (matchCount - matches.length) + ' more');
  }
} else if (mode === 'cat') {
  const inner = a4, out = a5;
  const ino = resolve(x, inner);
  const inode = x.inode(ino);
  if (inode.type === 0xA000) { console.log('symlink -> ' + x.readData(inode).toString('latin1')); process.exit(0); }
  if (inode.size > 512 * 1048576) die('too big: ' + inode.size);
  const d = x.readData(inode);
  fs.writeFileSync(out, d);
  console.log('wrote ' + out + ' (' + d.length + ' bytes) from ' + inner);
} else if (mode === 'xtree') {
  const outDir = a4;
  fs.mkdirSync(outDir, { recursive: true });
  let nf = 0;
  walkTree(x, (inode, p) => {
    const rel = p.replace(/^\//, '');
    if (!rel) return;
    const op = path.join(outDir, rel);
    if (inode.type === 0x4000) { fs.mkdirSync(op, { recursive: true }); return; }
    if (inode.type === 0xA000) { try { fs.writeFileSync(op + '.symlink.txt', x.readData(inode).toString('latin1')); } catch (e) {} return; }
    if (inode.type === 0x8000) {
      if (inode.size > 256 * 1048576) { console.log('skip big: ' + p); return; }
      fs.mkdirSync(path.dirname(op), { recursive: true });
      fs.writeFileSync(op, x.readData(inode));
      nf++;
    }
  });
  console.log('xtree done: ' + nf + ' files -> ' + outDir);
} else {
  die('unknown mode');
}

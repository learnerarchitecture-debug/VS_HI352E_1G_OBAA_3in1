// ext4w.mjs - minimal ext4 WRITER (no metadata_csum images only)
// commands:
//   groups <img>
//   info <img> <innerPath>
//   ls <img> <innerDir>
//   mkdirp <img> <innerDir>
//   addfile <img> <innerPath> <localFile> [modeOctal] [--xattr-from=<refInnerPath>]
//   rm <img> <innerPath> [--keep-xattr-block]
//   replace <img> <innerPath> <localFile> [modeOctal]
import fs from 'node:fs';

function die(msg) { console.error('ERR: ' + msg); process.exit(1); }

// ---------- crc16 (e2fsprogs, poly 0xA001 reflected, seed 0xffff) ----------
const T16 = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xA001) : (c >>> 1);
  T16[n] = c & 0xffff;
}
function crc16(crc, buf) {
  let c = crc & 0xffff;
  for (let i = 0; i < buf.length; i++) c = (T16[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) & 0xffff;
  return c;
}

const align4 = n => (n + 3) & ~3;

class Ext4W {
  constructor(p) {
    this.path = p;
    this.fd = fs.openSync(p, 'r+');
    this.sbOff = 1024;
    const sb = Buffer.alloc(1024);
    fs.readSync(this.fd, sb, 0, 1024, 1024);
    if (sb.readUInt16LE(0x38) !== 0xEF53) die('not ext4: ' + p);
    this.sb = sb;
    this.bs = 1024 << sb.readUInt32LE(0x18);
    this.first = sb.readUInt32LE(0x14);
    this.incompat = sb.readUInt32LE(0x60);
    this.rocompat = sb.readUInt32LE(0x64);
    if (this.rocompat & 0x100) die('image uses METADATA_CSUM - writer not safe for this image');
    this.has64 = !!(this.incompat & 0x80);
    this.blocks = sb.readUInt32LE(4) + (this.has64 ? sb.readUInt32LE(0x150) * 2 ** 32 : 0);
    this.inodesCnt = sb.readUInt32LE(0);
    this.bpg = sb.readUInt32LE(0x20);
    this.ipg = sb.readUInt32LE(0x28);
    this.isize = sb.readUInt16LE(0x58) || 128;
    this.descSize = this.has64 ? (sb.readUInt16LE(0xFE) || 64) : 32;
    this.logGroupsPerFlex = sb.readUInt8(0x174);
    this.reservedGdt = sb.readUInt16LE(0xCE);
    this.uuid = sb.subarray(0x68, 0x78);
    this.gdtCsum = !!(this.rocompat & 0x10);
    this.extraIsizeFeat = !!(this.rocompat & 0x40);
    this.groups = Math.ceil((this.blocks - this.first) / this.bpg);
    this.gdtOff = (this.first + 1) * this.bs;
    this.gdt = Buffer.alloc(Math.max(1, this.groups * this.descSize));
    fs.readSync(this.fd, this.gdt, 0, this.gdt.length, this.gdtOff);
    this.dirtyGroups = new Set();
    this.bitmapCache = new Map(); // key: g + '-' + which ('blk'|'ino') -> Buffer
    this.inodeTables = new Map();
  }

  // ---------- group helpers ----------
  gd(g) {
    const o = g * this.descSize;
    return {
      blockBitmap: this.gdt.readUInt32LE(o + 0),
      inodeBitmap: this.gdt.readUInt32LE(o + 4),
      inodeTable: this.gdt.readUInt32LE(o + 8),
      freeBlocks: this.gdt.readUInt16LE(o + 0x0C),
      freeInodes: this.gdt.readUInt16LE(o + 0x0E),
      usedDirs: this.gdt.readUInt16LE(o + 0x10),
      flags: this.gdt.readUInt16LE(o + 0x12),
    };
  }
  gdSet(g, patch) {
    const o = g * this.descSize;
    if (patch.freeBlocks !== undefined) this.gdt.writeUInt16LE(patch.freeBlocks, o + 0x0C);
    if (patch.freeInodes !== undefined) this.gdt.writeUInt16LE(patch.freeInodes, o + 0x0E);
    if (patch.usedDirs !== undefined) this.gdt.writeUInt16LE(patch.usedDirs, o + 0x10);
    if (patch.flags !== undefined) this.gdt.writeUInt16LE(patch.flags, o + 0x12);
    if (this.gdtCsum) {
      // recompute bg_checksum: crc16 over uuid + group_le + desc[0..0x1E)
      let crc = 0xffff;
      crc = crc16(crc, this.uuid);
      const g4 = Buffer.alloc(4); g4.writeUInt32LE(g);
      crc = crc16(crc, g4);
      crc = crc16(crc, this.gdt.subarray(o, o + 0x1E));
      this.gdt.writeUInt16LE(crc, o + 0x1E);
    }
    this.dirtyGroups.add(g);
  }
  groupBlockCount(g) {
    const start = this.first + g * this.bpg;
    return Math.min(this.bpg, this.blocks - start);
  }
  isUninit(g) {
    const d = this.gd(g);
    return { blk: !!(d.flags & 0x2), ino: !!(d.flags & 0x1) };
  }
  gdtBlocks() { return Math.ceil(this.groups * this.descSize / this.bs); }
  bgHasSuper(g) {
    if (g === 0) return true;
    if (!(this.rocompat & 0x1)) return true; // SPARSE_SUPER off -> super in every group
    for (const p of [3, 5, 7]) {
      let x = g;
      while (x % p === 0) x /= p;
      if (x === 1) return true;
    }
    return false;
  }
  initBlockBitmap(g) {
    // initialize an uninitialized group's block bitmap (only valid if group truly has no data)
    const b = Buffer.alloc(this.bs);
    let used = 0;
    if (this.bgHasSuper(g)) {
      // sb + GDT + reserved GDT growth blocks, all at the start of the group
      const p = Math.min(1 + this.gdtBlocks() + this.reservedGdt, this.groupBlockCount(g));
      for (let bit = 0; bit < p; bit++) { b[bit >> 3] |= 1 << (bit & 7); used++; }
    }
    this.bitmapCache.set(g + '-blk', b);
    const d = this.gd(g);
    const newFree = this.groupBlockCount(g) - used;
    const delta = newFree - d.freeBlocks;
    this.sb.writeUInt32LE((this.sb.readUInt32LE(0x0C) + delta) >>> 0, 0x0C);
    this.gdSet(g, { flags: d.flags & ~0x2, freeBlocks: newFree });
    return newFree;
  }
  initInodeBitmap(g) {
    const b = Buffer.alloc(this.bs);
    this.bitmapCache.set(g + '-ino', b);
    const d = this.gd(g);
    const newFree = this.ipg; // no inodes used in a fresh group
    const delta = newFree - d.freeInodes;
    this.sb.writeUInt32LE((this.sb.readUInt32LE(0x10) + delta) >>> 0, 0x10);
    this.gdSet(g, { flags: d.flags & ~0x1, freeInodes: newFree });
    return newFree;
  }

  // ---------- bitmaps ----------
  bitmap(g, which) {
    const key = g + '-' + which;
    if (!this.bitmapCache.has(key)) {
      const d = this.gd(g);
      const blk = which === 'blk' ? d.blockBitmap : d.inodeBitmap;
      const b = Buffer.alloc(this.bs);
      fs.readSync(this.fd, b, 0, this.bs, blk * this.bs);
      this.bitmapCache.set(key, b);
    }
    return this.bitmapCache.get(key);
  }
  bitmapSet(g, which, bit, value) {
    const b = this.bitmap(g, which);
    const byte = bit >> 3, mask = 1 << (bit & 7);
    if (value) b[byte] |= mask; else b[byte] &= ~mask;
  }
  findRun(g, count) {
    const b = this.bitmap(g, 'blk');
    const maxBlk = this.groupBlockCount(g);
    let run = 0, runStart = 0;
    for (let bit = 0; bit < maxBlk; bit++) {
      const used = (b[bit >> 3] >> (bit & 7)) & 1;
      if (!used) {
        if (run === 0) runStart = bit;
        run++;
        if (run >= count) return runStart;
      } else run = 0;
    }
    return -1;
  }
  allocateBlocks(count, preferGroup) {
    const order = [];
    if (preferGroup !== undefined && preferGroup !== null && preferGroup < this.groups) order.push(preferGroup);
    for (let g = 0; g < this.groups; g++) if (g !== preferGroup) order.push(g);
    for (const g of order) {
      let d = this.gd(g);
      if (this.isUninit(g).blk) {
        if (d.freeBlocks < count + 2) continue;
        this.initBlockBitmap(g);
        d = this.gd(g);
      }
      if (d.freeBlocks < count + 2) continue;
      const run = this.findRun(g, count);
      if (run < 0) continue;
      for (let i = 0; i < count; i++) this.bitmapSet(g, 'blk', run + i, 1);
      this.gdSet(g, { freeBlocks: d.freeBlocks - count });
      const sbFree = this.sb.readUInt32LE(0x0C) - count;
      this.sb.writeUInt32LE(sbFree >>> 0, 0x0C);
      return { group: g, start: this.first + g * this.bpg + run, count };
    }
    die('no space: could not allocate ' + count + ' contiguous blocks');
  }
  freeBlock(b) {
    const g = Math.floor((b - this.first) / this.bpg);
    const bit = (b - this.first) % this.bpg;
    const d = this.gd(g);
    this.bitmapSet(g, 'blk', bit, 0);
    this.gdSet(g, { freeBlocks: d.freeBlocks + 1 });
    this.sb.writeUInt32LE((this.sb.readUInt32LE(0x0C) + 1) >>> 0, 0x0C);
  }
  allocateInode(preferGroup) {
    const order = [];
    if (preferGroup !== undefined && preferGroup !== null && preferGroup < this.groups) order.push(preferGroup);
    for (let g = 0; g < this.groups; g++) if (g !== preferGroup) order.push(g);
    for (const g of order) {
      let d = this.gd(g);
      if (this.isUninit(g).ino) {
        if (d.freeInodes < 2) continue;
        this.initInodeBitmap(g);
        d = this.gd(g);
      }
      if (d.freeInodes < 2) continue;
      const b = this.bitmap(g, 'ino');
      const startBit = (g === 0) ? 11 : 0; // inodes 1..10 reserved in group 0
      for (let bit = startBit; bit < this.ipg; bit++) {
        const ino = g * this.ipg + bit + 1;
        if (ino > this.inodesCnt) break;
        if (!((b[bit >> 3] >> (bit & 7)) & 1)) {
          this.bitmapSet(g, 'ino', bit, 1);
          this.gdSet(g, { freeInodes: d.freeInodes - 1 });
          this.sb.writeUInt32LE((this.sb.readUInt32LE(0x10) - 1) >>> 0, 0x10);
          return ino;
        }
      }
    }
    die('no free inodes');
  }
  freeInode(ino) {
    const g = Math.floor((ino - 1) / this.ipg), bit = (ino - 1) % this.ipg;
    const d = this.gd(g);
    this.bitmapSet(g, 'ino', bit, 0);
    this.gdSet(g, { freeInodes: d.freeInodes + 1 });
    this.sb.writeUInt32LE((this.sb.readUInt32LE(0x10) + 1) >>> 0, 0x10);
  }

  // ---------- inodes ----------
  tableOff(g, idx) { return this.gd(g).inodeTable * this.bs + idx * this.isize; }
  readInode(ino) {
    const g = Math.floor((ino - 1) / this.ipg), idx = (ino - 1) % this.ipg;
    const b = Buffer.alloc(this.isize);
    fs.readSync(this.fd, b, 0, this.isize, this.tableOff(g, idx));
    return b;
  }
  writeInode(ino, buf) {
    const g = Math.floor((ino - 1) / this.ipg), idx = (ino - 1) % this.ipg;
    fs.writeSync(this.fd, buf, 0, this.isize, this.tableOff(g, idx));
  }
  inodeInfo(ino) {
    const b = this.readInode(ino);
    const mode = b.readUInt16LE(0);
    let size = b.readUInt32LE(4);
    const type = mode & 0xF000;
    if (type === 0x8000) size += b.readUInt32LE(0x6C) * 2 ** 32;
    return {
      buf: b, ino, mode, type, size,
      links: b.readUInt16LE(0x1A),
      flags: b.readUInt32LE(0x20),
      fileAcl: b.readUInt32LE(0x68),
      extraIsize: this.isize > 128 ? b.readUInt16LE(0x80) : 0,
    };
  }

  // ---------- file data ----------
  extents(inodeBuf, collectIndex) {
    const out = [];
    const fd = this.fd, bs = this.bs;
    const walk = (buf, depth) => {
      if (buf.readUInt16LE(0) !== 0xF30A) return;
      const entries = buf.readUInt16LE(2);
      const d = buf.readUInt16LE(6);
      if (d > 0) {
        for (let i = 0; i < entries; i++) {
          const eo = 12 + i * 12;
          const leaf = buf.readUInt32LE(eo + 4) + buf.readUInt16LE(eo + 8) * 2 ** 32;
          if (collectIndex) collectIndex.push(leaf);
          const nb = Buffer.alloc(bs);
          fs.readSync(fd, nb, 0, bs, leaf * bs);
          walk(nb, depth + 1);
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
    walk(inodeBuf.subarray(0x28, 0x64), 0);
    return out;
  }
  readData(info) {
    const size = info.size;
    const out = Buffer.alloc(size);
    if (size === 0) return out;
    if (size <= 60 && info.buf.readUInt32LE(0x1C) === 0 && (info.type === 0xA000 || (this.incompat & 0x8000))) {
      info.buf.copy(out, 0, 0x28, 0x28 + size);
      return out;
    }
    for (const e of this.extents(info.buf)) {
      if (e.uninit) continue;
      for (let i = 0; i < e.len; i++) {
        const dest = (e.lb + i) * this.bs;
        if (dest >= size) break;
        const n = Math.min(this.bs, size - dest);
        fs.readSync(this.fd, out, dest, n, (e.pb + i) * this.bs);
      }
    }
    return out;
  }
  listDir(info) {
    const data = this.readData(info);
    const ents = [];
    for (let b0 = 0; b0 < data.length; b0 += this.bs) {
      let o = b0;
      const bmax = Math.min(b0 + this.bs, data.length);
      while (o + 8 <= bmax) {
        const ino = data.readUInt32LE(o);
        const rec = data.readUInt16LE(o + 4);
        const nl = data[o + 6];
        if (rec < 8 || rec % 4 !== 0) break;
        if (ino && nl > 0 && o + 8 + nl <= bmax) ents.push({ ino, name: data.toString('latin1', o + 8, o + 8 + nl), ft: data[o + 7], off: o });
        if (o + rec >= bmax) break;
        o += rec;
      }
    }
    return ents;
  }
  resolve(p) {
    let ino = 2;
    for (const part of p.split('/').filter(Boolean)) {
      const info = this.inodeInfo(ino);
      if (info.type !== 0x4000) die('not a dir: ' + part);
      const hit = this.listDir(info).find(e => e.name === part);
      if (!hit) return null;
      ino = hit.ino;
    }
    return ino;
  }

  // ---------- xattr ----------
  buildIbodyXattr(nameIndex, name, value) {
    // returns Buffer of xattr area for ibody (starting at magic), or null if doesn't fit
    const nameBuf = Buffer.isBuffer(name) ? name : Buffer.from(name, 'latin1');
    const ibodyStart = this.isize > 128 ? 128 + (this.extraIsizeFeat ? 32 : 0) : 0x64;
    const avail = this.isize - ibodyStart;
    const entryLen = 16 + align4(nameBuf.length);
    const valueAbs = (this.isize - value.length) & ~3;
    if (valueAbs < ibodyStart + 4 + entryLen + 4 || valueAbs + value.length > this.isize) return null;
    const area = Buffer.alloc(avail);
    area.writeUInt32LE(0xEA020000, 0);
    let o = 4;
    area[o] = nameBuf.length; area[o + 1] = nameIndex;
    area.writeUInt16LE(0, o + 2); // value_offs placeholder
    area.writeUInt32LE(0, o + 4); // value_inum
    area.writeUInt32LE(value.length, o + 8);
    area.writeUInt32LE(0, o + 12); // e_hash
    nameBuf.copy(area, o + 16);
    const valueOffs = valueAbs - (ibodyStart + 4);
    area.writeUInt16LE(valueOffs, o + 2);
    value.copy(area, valueAbs - ibodyStart);
    return { area, ibodyStart };
  }
  readXattr(info) {
    // returns {ibody: Buffer|null, fileAcl}
    const res = { ibody: null, fileAcl: info.fileAcl };
    const ibodyStart = this.isize > 128 ? 128 + (info.extraIsize) : 0x64;
    if (info.buf.readUInt32LE(ibodyStart) === 0xEA020000) {
      res.ibody = Buffer.from(info.buf.subarray(ibodyStart));
    }
    return res;
  }
  applyXattrToInode(inodeBuf, xattr) {
    if (xattr.ibody) {
      const ibodyStart = this.isize > 128 ? 128 + inodeBuf.readUInt16LE(0x80) : 0x64;
      xattr.ibody.copy(inodeBuf, ibodyStart);
    }
    inodeBuf.writeUInt32LE(xattr.fileAcl || 0, 0x68);
  }

  // ---------- dir ops ----------
  // low-level: perform insert with block append if needed
  doDirInsert(dirIno, name, fileType, targetIno) {
    const nameBuf = Buffer.from(name, 'latin1');
    const needed = align4(8 + nameBuf.length);
    let info = this.inodeInfo(dirIno);
    if (info.type !== 0x4000) die('not a dir');
    if (info.flags & 0x1000) {
      info.buf.writeUInt32LE(info.flags & ~0x1000, 0x20);
      this.writeInode(dirIno, info.buf);
      info = this.inodeInfo(dirIno);
    }
    const data = this.readData(info);
    const nblk = Math.ceil(data.length / this.bs) || 0;
    for (let b = 0; b < nblk; b++) {
      let o = b * this.bs;
      const bmax = Math.min((b + 1) * this.bs, data.length);
      while (o + 8 <= bmax) {
        const ino = data.readUInt32LE(o);
        const rec = data.readUInt16LE(o + 4);
        const nl = data[o + 6];
        if (rec < 8 || rec % 4 !== 0 || o + rec > bmax) break;
        if (ino === 0 && rec >= needed) {
          writeDirent(data, o, targetIno, rec, nameBuf, fileType);
          this.writeDirBlock(info, b, data);
          return { block: b, appended: false };
        }
        if (ino !== 0) {
          const actual = align4(8 + nl);
          if (rec - actual >= needed) {
            data.writeUInt16LE(actual, o + 4);
            const no = o + actual;
            writeDirent(data, no, targetIno, rec - actual, nameBuf, fileType);
            this.writeDirBlock(info, b, data);
            return { block: b, appended: false };
          }
        }
        if (o + rec >= bmax) break;
        o += rec;
      }
    }
    // need new block
    const dirGroup = Math.floor((dirIno - 1) / this.ipg);
    const alloc = this.allocateBlocks(1, dirGroup);
    const nb = Buffer.alloc(this.bs);
    writeDirent(nb, 0, 0, this.bs, Buffer.alloc(0), 0); // whole block free
    writeDirent(nb, 0, targetIno, needed, nameBuf, fileType);
    writeDirent(nb, needed, 0, this.bs - needed, Buffer.alloc(0), 0);
    fs.writeSync(this.fd, nb, 0, this.bs, alloc.start * this.bs);
    // extend inode
    const ex = this.extents(info.buf);
    const newLogical = nblk;
    const last = ex[ex.length - 1];
    const ehEntriesOffset = 0x28 + 2;
    const ehMaxOffset = 0x28 + 4;
    let ok = false;
    if (last && last.lb + last.len === newLogical && last.pb + last.len === alloc.start) {
      // grow last extent
      const ne = 12 + (ex.length - 1) * 12;
      info.buf.writeUInt16LE(last.len + 1, 0x28 + ne + 4);
      ok = true;
    } else {
      const ent = info.buf.readUInt16LE(ehEntriesOffset);
      const max = info.buf.readUInt16LE(ehMaxOffset) || 4;
      if (ent < max) {
        const ne = 12 + ent * 12;
        info.buf.writeUInt32LE(newLogical, 0x28 + ne);
        info.buf.writeUInt16LE(1, 0x28 + ne + 4);
        info.buf.writeUInt16LE(0, 0x28 + ne + 6);
        info.buf.writeUInt32LE(alloc.start, 0x28 + ne + 8);
        info.buf.writeUInt16LE(ent + 1, ehEntriesOffset);
        ok = true;
      }
    }
    if (!ok) die('dir extent tree full - cannot append block (dir ino ' + dirIno + ')');
    const newSize = (nblk + 1) * this.bs;
    info.buf.writeUInt32LE(newSize, 4);
    const now = (Date.now() / 1000) | 0;
    info.buf.writeUInt32LE(now, 0x0C); // ctime
    info.buf.writeUInt32LE(now, 0x10); // mtime
    this.writeInode(dirIno, info.buf);
    return { block: nblk, appended: true };
  }

  writeDirBlock(info, blockIndex, data) {
    const ex = this.extents(info.buf);
    for (const e of ex) {
      if (blockIndex >= e.lb && blockIndex < e.lb + e.len) {
        const phys = e.pb + (blockIndex - e.lb);
        fs.writeSync(this.fd, data, blockIndex * this.bs, this.bs, phys * this.bs);
        return;
      }
    }
    die('dir block not mapped: ' + blockIndex);
  }

  // ---------- high-level ops ----------
  makeInode(mode, uid, gid, links, size, blocks512, extentsList, xattr, flags) {
    const b = Buffer.alloc(this.isize);
    b.writeUInt16LE(mode, 0x00);
    b.writeUInt16LE(uid & 0xffff, 0x02);
    b.writeUInt32LE(size >>> 0, 0x04);
    const now = (Date.now() / 1000) | 0;
    b.writeUInt32LE(now, 0x08); // atime
    b.writeUInt32LE(now, 0x0C); // ctime
    b.writeUInt32LE(now, 0x10); // mtime
    b.writeUInt32LE(0, 0x14); // dtime
    b.writeUInt16LE(gid & 0xffff, 0x18);
    b.writeUInt16LE(links, 0x1A);
    b.writeUInt32LE(blocks512 >>> 0, 0x1C);
    b.writeUInt32LE(flags, 0x20);
    // extent tree
    b.writeUInt16LE(0xF30A, 0x28);
    b.writeUInt16LE(extentsList.length, 0x28 + 2);
    b.writeUInt16LE(4, 0x28 + 4);
    b.writeUInt16LE(0, 0x28 + 6);
    let eo = 0x28 + 12;
    for (const e of extentsList) {
      b.writeUInt32LE(e.lb, eo);
      b.writeUInt16LE(e.len, eo + 4);
      b.writeUInt16LE(0, eo + 6);
      b.writeUInt32LE(e.pb, eo + 8);
      eo += 12;
    }
    if (this.isize > 128 && this.extraIsizeFeat) {
      b.writeUInt16LE(32, 0x80);
      b.writeUInt32LE(0, 0x90); // crtime extra... set crtime
      b.writeUInt32LE(now, 0x90); // i_crtime
    }
    if (xattr) this.applyXattrToInode(b, xattr);
    return b;
  }

  addFile(parentDirIno, name, content, mode, xattr) {
    const nblocks = Math.max(1, Math.ceil(content.length / this.bs));
    const parentGroup = Math.floor((parentDirIno - 1) / this.ipg);
    const alloc = this.allocateBlocks(nblocks, parentGroup);
    // write data (zero-padded last block)
    const padded = Buffer.alloc(nblocks * this.bs);
    content.copy(padded);
    fs.writeSync(this.fd, padded, 0, padded.length, alloc.start * this.bs);
    const ino = this.allocateInode(parentGroup);
    // zero the inode slot first
    this.writeInode(ino, Buffer.alloc(this.isize));
    const ext = [{ lb: 0, len: nblocks, pb: alloc.start }];
    const inodeBuf = this.makeInode(mode, 0, 0, 1, content.length, nblocks * (this.bs / 512), ext, xattr, 0x80000);
    this.writeInode(ino, inodeBuf);
    this.doDirInsert(parentDirIno, name, 1, ino);
    return ino;
  }

  addDir(parentDirIno, name, xattr) {
    const parentGroup = Math.floor((parentDirIno - 1) / this.ipg);
    const alloc = this.allocateBlocks(1, parentGroup);
    const ino = this.allocateInode(parentGroup);
    const g = Math.floor((ino - 1) / this.ipg);
    const d = this.gd(g);
    this.gdSet(g, { usedDirs: d.usedDirs + 1 });
    this.writeInode(ino, Buffer.alloc(this.isize));
    // dir block: . and ..
    const blk = Buffer.alloc(this.bs);
    writeDirent(blk, 0, ino, 12, Buffer.from('.'), 2);
    writeDirent(blk, 12, parentDirIno, this.bs - 12, Buffer.from('..'), 2);
    fs.writeSync(this.fd, blk, 0, this.bs, alloc.start * this.bs);
    const ext = [{ lb: 0, len: 1, pb: alloc.start }];
    const inodeBuf = this.makeInode(0x41ED, 0, 0, 2, this.bs, this.bs / 512, ext, xattr, 0x80000);
    this.writeInode(ino, inodeBuf);
    // link parent +1
    const pi = this.inodeInfo(parentDirIno);
    pi.buf.writeUInt16LE(pi.links + 1, 0x1A);
    const now = (Date.now() / 1000) | 0;
    pi.buf.writeUInt32LE(now, 0x0C);
    pi.buf.writeUInt32LE(now, 0x10);
    this.writeInode(parentDirIno, pi.buf);
    this.doDirInsert(parentDirIno, name, 2, ino);
    return ino;
  }

  mkdirp(inner) {
    let ino = 2;
    let pathSoFar = '';
    for (const part of inner.split('/').filter(Boolean)) {
      pathSoFar += '/' + part;
      const info = this.inodeInfo(ino);
      const hit = this.listDir(info).find(e => e.name === part);
      if (hit) { ino = hit.ino; continue; }
      const dirXattr = { ibody: this.buildIbodyXattr(6, Buffer.from('selinux'), Buffer.from('u:object_r:system_file:s0\0', 'latin1'))?.area, fileAcl: 0 };
      ino = this.addDir(ino, part, dirXattr);
      console.log('  created dir ' + pathSoFar + ' (ino ' + ino + ')');
    }
    return ino;
  }

  removeFile(inner) {
    const ino = this.resolve(inner);
    if (ino === null) { console.log('  not found: ' + inner); return null; }
    const info = this.inodeInfo(ino);
    const isDir = info.type === 0x4000;
    // free data + index blocks (for files and dirs)
    if (!isDir) {
      const idx = [];
      const ex = this.extents(info.buf, idx);
      for (const leaf of idx) this.freeBlock(leaf);
      for (const e of ex) if (!e.uninit) for (let i = 0; i < e.len; i++) this.freeBlock(e.pb + i);
    }
    // clear dirent in parent
    const parentPath = inner.replace(/\/[^/]+$/, '') || '/';
    const name = inner.split('/').filter(Boolean).pop();
    const parentIno = this.resolve(parentPath) ?? 2;
    const pinfo = this.inodeInfo(parentIno);
    const data = this.readData(pinfo);
    for (let b = 0; b < Math.ceil(data.length / this.bs); b++) {
      let o = b * this.bs;
      const bmax = Math.min((b + 1) * this.bs, data.length);
      while (o + 8 <= bmax) {
        const eIno = data.readUInt32LE(o);
        const rec = data.readUInt16LE(o + 4);
        const nl = data[o + 6];
        if (rec < 8 || rec % 4 !== 0) break;
        if (eIno === ino && nl === name.length && data.toString('latin1', o + 8, o + 8 + nl) === name) {
          data.writeUInt32LE(0, o);
          this.writeDirBlock(pinfo, b, data);
          break;
        }
        if (o + rec >= bmax) break;
        o += rec;
      }
    }
    // inode
    const dtime = (Date.now() / 1000) | 0;
    info.buf.writeUInt16LE(0, 0x1A); // links 0
    info.buf.writeUInt32LE(dtime, 0x14);
    this.writeInode(ino, info.buf);
    this.freeInode(ino);
    console.log('  removed ' + inner + ' (ino ' + ino + (isDir ? ', dir' : '') + ')');
    return { ino, xattr: this.readXattr(info), extents: this.extents(info.buf), isDir };
  }

  removeRecursive(path) {
    const ino = this.resolve(path);
    if (ino === null) { console.log('  not found: ' + path); return; }
    const info = this.inodeInfo(ino);
    if (info.type === 0x4000) {
      // directory: recurse into entries
      const ents = this.listDir(info);
      for (const e of ents) {
        if (e.name === '.' || e.name === '..') continue;
        this.removeRecursive(path + '/' + e.name);
      }
    }
    // remove this entry (file or now-empty dir)
    this.removeFile(path);
  }

  commit() {
    for (const [key, buf] of this.bitmapCache) {
      const [g, which] = key.split('-');
      const d = this.gd(Number(g));
      const blk = which === 'blk' ? d.blockBitmap : d.inodeBitmap;
      fs.writeSync(this.fd, buf, 0, this.bs, blk * this.bs);
    }
    const now = (Date.now() / 1000) | 0;
    this.sb.writeUInt32LE(now, 0x2C); // wtime
    fs.writeSync(this.fd, this.sb, 0, 1024, 1024);
    fs.writeSync(this.fd, this.gdt, 0, this.gdt.length, this.gdtOff);
    fs.fsyncSync(this.fd);
    console.log('  committed (dirty groups: ' + [...this.dirtyGroups].join(',') + ')');
  }
}

function writeDirent(buf, off, ino, recLen, nameBuf, ft) {
  buf.writeUInt32LE(ino, off);
  buf.writeUInt16LE(recLen, off + 4);
  buf[off + 6] = nameBuf.length;
  buf[off + 7] = ft;
  nameBuf.copy(buf, off + 8);
}

// ---------- CLI ----------
const [, , cmd, imgPath, ...rest] = process.argv;

if (cmd === 'groups') {
  const x = new Ext4W(imgPath);
  console.log('groups=' + x.groups + ' bpg=' + x.bpg + ' ipg=' + x.ipg + ' isize=' + x.isize + ' descSize=' + x.descSize);
  console.log('flexShift=' + x.logGroupsPerFlex + ' (' + 2 ** x.logGroupsPerFlex + ' groups/flex)  reservedGdt=' + x.reservedGdt + '  gdtBlocks=' + x.gdtBlocks() + '  hasSuper(g9)=' + x.bgHasSuper(9) + '  hasSuper(g10)=' + x.bgHasSuper(10));
  for (let g = 0; g < x.groups; g++) {
    const d = x.gd(g);
    const u = x.isUninit(g);
    console.log(`  g${g}: bb=${d.blockBitmap} ib=${d.inodeBitmap} it=${d.inodeTable} free=${d.freeBlocks}/${d.freeInodes} usedDirs=${d.usedDirs} flags=0x${d.flags.toString(16)}${u.blk ? ' BLK_UNINIT' : ''}${u.ino ? ' INO_UNINIT' : ''}`);
  }
  process.exit(0);
}

if (cmd === 'bitmap') {
  const x = new Ext4W(imgPath);
  for (const gArg of rest) {
    const g = Number(gArg);
    const b = x.bitmap(g, 'blk');
    const set = [];
    for (let bit = 0; bit < x.groupBlockCount(g) && set.length < 40; bit++) if ((b[bit >> 3] >> (bit & 7)) & 1) set.push(bit);
    console.log(`g${g} usedBits(first 40)= ${set.join(',')}`);
  }
  process.exit(0);
}

const x = new Ext4W(imgPath);

if (cmd === 'info') {
  const inp = rest[0];
  const ino = x.resolve(inp);
  if (ino === null) die('not found: ' + inp);
  const info = x.inodeInfo(ino);
  console.log(inp + ' ino=' + ino + ' mode=0' + (info.mode & 0xfff).toString(8) + ' type=0x' + info.type.toString(16) + ' size=' + info.size + ' links=' + info.links + ' flags=0x' + info.flags.toString(16) + ' fileAcl=0x' + info.fileAcl.toString(16) + ' extraIsize=' + info.extraIsize);
  const ex = x.extents(info.buf);
  console.log('  extents: ' + ex.map(e => `[lb=${e.lb} len=${e.len} pb=${e.pb}]`).join(' ') + ' blocks512=' + info.buf.readUInt32LE(0x1C));
  const xa = x.readXattr(info);
  console.log('  xattr ibody: ' + (xa.ibody ? xa.ibody.subarray(0, 64).toString('hex') : 'none'));
  if (info.type === 0x4000) {
    const ents = x.listDir(info);
    console.log('  entries(' + ents.length + '): ' + ents.slice(0, 30).map(e => e.name + ':' + e.ino).join(' '));
  }
  process.exit(0);
}

if (cmd === 'ls') {
  const inp = rest[0] || '/';
  const ino = x.resolve(inp);
  if (ino === null) die('not found: ' + inp);
  for (const e of x.listDir(x.inodeInfo(ino))) console.log(`  ${e.ino}\t${e.ft}\t${e.name}`);
  process.exit(0);
}

if (cmd === 'mkdirp') {
  x.mkdirp(rest[0]);
  x.commit();
  process.exit(0);
}

if (cmd === 'addfile' || cmd === 'replace') {
  const inp = rest[0], local = rest[1];
  const modeArg = rest[2] && !rest[2].startsWith('--') ? parseInt(rest[2], 8) : 0o644;
  const xf = rest.find(a => a.startsWith('--xattr-from='));
  const content = fs.readFileSync(local);
  const dirPath = inp.replace(/\/[^/]+$/, '') || '/';
  const dirIno = x.mkdirp(dirPath === '/' ? '/' : dirPath);
  let xattr = null;
  if (xf) {
    const refIno = x.resolve(xf.split('=')[1]);
    if (refIno === null) die('xattr ref not found');
    xattr = x.readXattr(x.inodeInfo(refIno));
  } else {
    const xb = x.buildIbodyXattr(6, Buffer.from('selinux'), Buffer.from('u:object_r:system_file:s0\0', 'latin1'));
    xattr = { ibody: xb ? xb.area : null, fileAcl: 0 };
  }
  if (cmd === 'replace') {
    const old = x.resolve(inp);
    if (old !== null) {
      const oldInfo = x.inodeInfo(old);
      const oldX = x.readXattr(oldInfo);
      // prefer old xattr blob (keeps whatever SELinux/other xattrs existed)
      if (oldX.ibody || oldX.fileAcl) xattr = oldX;
      x.removeFile(inp);
    }
  }
  const name = inp.split('/').filter(Boolean).pop();
  const ino = x.addFile(dirIno, name, content, 0x8000 | modeArg, xattr);
  console.log('  added ' + inp + ' (' + content.length + ' bytes, ino ' + ino + ')');
  x.commit();
  process.exit(0);
}

if (cmd === 'rm') {
  x.removeFile(rest[0]);
  x.commit();
  process.exit(0);
}

if (cmd === 'rmr') {
  x.removeRecursive(rest[0]);
  x.commit();
  process.exit(0);
}

die('unknown command: ' + cmd);

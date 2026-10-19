// sb.mjs - dump ext4 superblock info (features, free space) for image files
import fs from 'fs';
const files = process.argv.slice(2);
for (const f of files) {
  let fd;
  try { fd = fs.openSync(f, 'r'); } catch (e) { console.log(`${f}: cannot open`); continue; }
  const buf = Buffer.alloc(4096);
  fs.readSync(fd, buf, 0, 4096, 1024);
  const magic = buf.readUInt16LE(0x38);
  if (magic !== 0xEF53) { console.log(`${f}: not ext4 (magic 0x${magic.toString(16)})`); fs.closeSync(fd); continue; }
  const blockSize = 1024 << buf.readUInt32LE(0x18);
  const blocksCount = buf.readUInt32LE(0x4) | (buf.readUInt32LE(0x150) << 32);
  const blocksFree = buf.readUInt32LE(0xC) | (buf.readUInt32LE(0x158) << 32);
  const inodeSize = buf.readUInt16LE(0x58);
  const inodesCount = buf.readUInt32LE(0x0);
  const inodesFree = buf.readUInt32LE(0x10);
  const featCompat = buf.readUInt32LE(0x5C);
  const featIncompat = buf.readUInt32LE(0x60);
  const featRo = buf.readUInt32LE(0x64);
  const logBlockSize = buf.readUInt32LE(0x24);
  const volName = buf.slice(0x78, 0x88).toString('utf8').replace(/\0+$/, '');
  const size = fs.statSync(f).size;
  const flags = [];
  const incompat = [
    [0x1, 'COMPRESSION'], [0x2, 'FILETYPE'], [0x4, 'RECOVER'], [0x8, 'JOURNAL_DEV'], [0x10, 'META_BG'],
    [0x40, 'EXTENTS'], [0x80, '64BIT'], [0x100, 'MMP'], [0x200, 'FLEX_BG'], [0x400, 'EA_INODE'],
    [0x1000, 'DIRDATA'], [0x2000, 'CSUM_SEED'], [0x4000, 'LARGEDIR'], [0x8000, 'INLINE_DATA'], [0x10000, 'ENCRYPT']
  ];
  for (const [bit, name] of incompat) if (featIncompat & bit) flags.push('INCOMPAT_' + name);
  const ro = [[0x1, 'SPARSE_SUPER'], [0x2, 'LARGE_FILE'], [0x4, 'BTREE_DIR'], [0x8, 'HUGE_FILE'], [0x10, 'GDT_CSUM'], [0x20, 'DIR_NLINK'], [0x40, 'EXTRA_ISIZE'], [0x100, 'METADATA_CSUM'], [0x400, 'BIGALLOC'], [0x1000, 'PROJECT'], [0x2000, 'VERITY']];
  for (const [bit, name] of ro) if (featRo & bit) flags.push('RO_' + name);
  const compat = [[0x1, 'HAS_JOURNAL'], [0x4, 'EXT_ATTR'], [0x8, 'RESIZE_INODE'], [0x10, 'DIR_INDEX']];
  for (const [bit, name] of compat) if (featCompat & bit) flags.push('COMPAT_' + name);
  console.log(`=== ${f} ===`);
  console.log(`  file size: ${size} (${(size / 1048576).toFixed(1)} MB)`);
  console.log(`  volume: "${volName}"  blockSize: ${blockSize}  blocks: ${blocksCount} (${(blocksCount * blockSize / 1048576).toFixed(1)} MB)  free: ${blocksFree} (${(blocksFree * blockSize / 1024).toFixed(0)} KB)`);
  console.log(`  inodes: ${inodesCount} (free ${inodesFree})  inodeSize: ${inodeSize}`);
  console.log(`  logBlockSize: ${logBlockSize}`);
  console.log(`  features: ${flags.join(' ') || '(none)'}`);
  fs.closeSync(fd);
}

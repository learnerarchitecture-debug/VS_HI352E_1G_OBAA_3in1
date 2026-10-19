with open('C:/Users/techn/OneDrive/Documents/Default Project/fw-analysis/make_product_img_final.mjs', 'w') as f:
    f.write("""// make_product_img_final.mjs - create product.img with proper ext4 structure
import fs from 'node:fs';

const productImg = 'C:\\\\Users\\\\techn\\\\AppData\\\\Local\\\\Temp\\\\opencode\\\\obaa-work\\\\product.img';

// Create blank image (128MB = 32768 blocks)
fs.writeFileSync(productImg, Buffer.alloc(32768 * 4096));
console.log('Created blank image');

const origFd = fs.openSync('C:\\\\Users\\\\techn\\\\OneDrive\\\\Desktop\\\\VS_HI352E_1G_extracted\\\\system.img', 'r');
const origSb = Buffer.alloc(1024);
fs.readSync(origFd, origSb, 0, 1024, 1024);
fs.closeSync(origFd);

const imgBuf = Buffer.alloc(32768 * 4096);
origSb.copy(imgBuf, 1024);

const w32 = (buf, off, val) => buf.writeUInt32LE(val, off);
const w16 = (buf, off, val) => buf.writeUInt16LE(val, off);

const imgSb = imgBuf.subarray(1024, 1024 + 1024);
imgSb.writeUInt32LE(32768, 4); // blocks count
imgSb.writeUInt32LE(0, 8); // r_blocks
imgSb.writeUInt32LE(32768 - 600, 0xC); // free blocks
imgSb.writeUInt32LE(8192 - 20, 0x10); // free inodes
imgSb.writeUInt32LE(0, 0x14); // first data block
imgSb.writeUInt32LE(12, 0x18); // log block size
imgSb.writeUInt32LE(12, 0x1C); // log frag size
imgSb.writeUInt32LE(32768, 0x20); // blocks per group
imgSb.writeUInt32LE(32768, 0x24); // frags per group
imgSb.writeUInt32LE(8192, 0x28); // inodes per group
imgSb.writeUInt32LE(Math.floor(Date.now() / 1000), 0x2C); // mtime
imgSb.writeUInt32LE(0, 0x30); // wtime
imgSb.writeUInt16LE(1, 0x38); // mnt count
imgSb.writeUInt16LE(0xFFFF, 0x3A); // max mnt count
imgSb.writeUInt16LE(0xEF53, 0x3C); // magic
imgSb.writeUInt16LE(1, 0x3E); // state
imgSb.writeUInt16LE(1, 0x40); // errors
imgSb.writeUInt16LE(1, 0x42); // minor rev
imgSb.writeUInt32LE(0, 0x44); // lastcheck
imgSb.writeUInt32LE(0, 0x48); // checkinterval
imgSb.writeUInt32LE(0, 0x4C); // creator os
imgSb.writeUInt32LE(1, 0x50); // rev level
imgSb.writeUInt16LE(0, 0x54); // def_resuid
imgSb.writeUInt16LE(0, 0x56); // def_resgid
imgSb.writeUInt32LE(256, 0x58); // inode size
imgSb.writeUInt16LE(0, 0x5C); // req_gid
imgSb.writeUInt32LE(0x400, 0x60); // compat: has_journal
imgSb.writeUInt32LE(0x242, 0x64); // incompat: extents, filetype, 64bit
imgSb.writeUInt32LE(0, 0x68); // ro_compat
// UUID at 0x6C-0x7B
for (let i = 0; i < 16; i++) imgSb[0x6C + i] = Math.floor(Math.random() * 256);
// Volume name at 0x7C
for (let i = 0; i < 16; i++) imgSb[0x7C + i] = 'product   '.charCodeAt(i) || 0;
imgSb.writeUInt32LE(0x40, 0x8C); // feature compat: has_journal
imgSb.writeUInt32LE(0x242, 0x90); // feature incompat: extents, filetype, 64bit
imgSb.writeUInt32LE(0, 0x94); // feature ro_compat
for (let i = 0; i < 68; i++) imgSb[0x94 + i] = 0;

// 2. GDT at block 1 (offset 4096) - 1 group * 64 bytes
const gdt = Buffer.alloc(64);
gdt.writeUInt32LE(3, 0); // block bitmap
gdt.writeUInt32LE(4, 4); // inode bitmap
gdt.writeUInt32LE(5, 8); // inode table
gdt.writeUInt16LE(32768 - 600, 0xC); // free blocks
gdt.writeUInt16LE(8192 - 20, 0xE); // free inodes
gdt.writeUInt16LE(1, 0x10); // used dirs (root)
gdt.writeUInt16LE(0, 0x12); // flags
gdt.writeUInt32LE(0, 0x14);
gdt.writeUInt16LE(0, 0x18); // block bitmap csum
gdt.writeUInt16LE(0, 0x1A); // inode bitmap csum
gdt.writeUInt32LE(0, 0x1C); // itable unused
gdt.writeUInt32LE(0, 0x20); // csum seed
gdt.copy(imgBuf, 4096);

// 3. Block bitmap at block 3
const bb = Buffer.alloc(4096);
bb[0] = 0xFF; // block 0 (superblock)
bb[1] = 0x07; // blocks 1,2,3 (GDT, block bitmap, inode bitmap)
for (let i = 5; i < 5 + 512; i++) { // inode table (512 blocks)
    const byte = i >> 3;
    const bit = i & 7;
    bb[byte] |= 1 << bit;
}
const rootDirBlock = 5 + 512;
bb[rootDirBlock >> 3] |= 1 << (rootDirBlock & 7);
bb.copy(imgBuf, 3 * 4096);

// 4. Inode bitmap at block 4
const ib = Buffer.alloc(4096);
ib[0] = 0x03; // inodes 1,2
ib.copy(imgBuf, 4 * 4096);

// 5. Root inode (inode 2) at inode table block 5
const rootInodeOffset = 5 * 4096 + 1 * 256;
imgBuf.writeUInt16LE(0x41ED, rootInodeOffset + 0); // mode: dir | 0755
imgBuf.writeUInt16LE(2, rootInodeOffset + 0x1A); // links
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x1C); // atime
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x18); // ctime
imgBuf.writeUInt32LE(Math.floor(Date.now()/1000), rootInodeOffset + 0x14); // mtime
imgBuf.writeUInt32LE(0x80000, rootInodeOffset + 0x20); // flags: extent
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x28); // file acl
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x30); // size high
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x34); // size low
// extent header
imgBuf.writeUInt16LE(0xF30A, rootInodeOffset + 0x28); // magic
imgBuf.writeUInt16LE(1, rootInodeOffset + 0x2A); // entries
imgBuf.writeUInt16LE(1, rootInodeOffset + 0x2C); // max entries
imgBuf.writeUInt16LE(0, rootInodeOffset + 0x2E); // depth
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x30); // generation
// Extent: logical 0, len 1, physical rootDirBlock
const rootDirBlock = 5 + 512;
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x38); // ee_block
imgBuf.writeUInt16LE(1, rootInodeOffset + 0x3C); // ee_len
imgBuf.writeUInt16LE(0, rootInodeOffset + 0x3E); // ee_start_hi
imgBuf.writeUInt32LE(rootDirBlock, rootInodeOffset + 0x40); // ee_start_lo

// Root inode basic fields
imgBuf.writeUInt16LE(0x41ED, rootInodeOffset + 0); // mode: dir | 0755
imgBuf.writeUInt16LE(2, rootInodeOffset + 0x1A); // links
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x1C); // atime
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x18); // ctime
imgBuf.writeUInt32LE(Math.floor(Date.now()/1000), rootInodeOffset + 0x14); // mtime
imgBuf.writeUInt32LE(0x80000, rootInodeOffset + 0x20); // flags: extent
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x28); // file acl
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x30); // size high
imgBuf.writeUInt32LE(0, rootInodeOffset + 0x34); // size low

// Root directory block
const rootDirBlockOffset = rootDirBlock * 4096;
imgBuf.writeUInt32LE(2, rootDirBlockOffset + 0); // inode
imgBuf.writeUInt16LE(12, rootDirBlockOffset + 4); // rec_len
imgBuf[rootDirBlockOffset + 6] = 1; // name_len
imgBuf[rootDirBlockOffset + 7] = 2; // file_type (dir)
imgBuf.write('.', rootDirBlockOffset + 8, 'latin1');
// .. entry
let off = 12;
imgBuf.writeUInt32LE(2, rootDirBlockOffset + off); // inode
imgBuf.writeUInt16LE(4084, rootDirBlockOffset + off + 4); // rec_len
imgBuf[rootDirBlockOffset + off + 6] = 2; // name_len
imgBuf[rootDirBlockOffset + off + 7] = 2; // file_type
imgBuf.write('..', rootDirBlockOffset + off + 8, 'latin1');

fs.writeFileSync('C:\\\\Users\\\\techn\\\\AppData\\\\Local\\\\Temp\\\\opencode\\\\obaa-work\\\\product.img', imgBuf);
console.log('Created product.img with proper ext4 structure');
console.log('Size:', 32768 * 4096, 'bytes (128MB)');
""")
print('Written')
import fs from 'node:fs';
import crypto from 'node:crypto';

const src = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\VS_HI352E_1G_OBAA.bin';
const fd = fs.openSync(src, 'r');
const size = fs.statSync(src).size;

const TBL = [];
for (let n = 0; n < 256; n++) { let c = n << 24; for (let k = 0; k < 8; k++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0); TBL[n] = c >>> 0; }
function mpeg2Range(off, len) {
  const B = Buffer.alloc(8 << 20);
  let c = 0xFFFFFFFF, p = 0;
  while (p < len) {
    const n = Math.min(B.length, len - p);
    fs.readSync(fd, B, 0, n, off + p);
    for (let i = 0; i < n; i++) c = ((c << 8) ^ TBL[((c >>> 24) ^ B[i]) & 0xff]) >>> 0;
    p += n;
  }
  return c >>> 0;
}

const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
const head = Buffer.alloc(0x30);
fs.readSync(fd, head, 0, 0x30, 0);
const toc = Buffer.alloc(0x400);
fs.readSync(fd, toc, 0, 0x400, 0);
for (let i = 0; i < 22; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => toc.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  if (names[i] !== 'atv') continue;
  const bh = Buffer.alloc(8);
  fs.readSync(fd, bh, 0, 8, f[2]);
  const hSize = bh.readUInt32BE(0), hCrc = bh.readUInt32BE(4);
  const calc = mpeg2Range(f[2] + 8, f[1]);
  console.log(`atv: size=0x${f[1].toString(16)} hdrCrc=0x${hCrc.toString(16)} calc=0x${calc.toString(16)} ${calc===hCrc?'OK':'MISMATCH'}`);
  
  // Also verify we can decode the atv raw image
  const atvSize = f[1];
  const hash = crypto.createHash('sha256');
  const B = Buffer.alloc(8 << 20);
  let p = 0;
  while (p < atvSize) {
    const n = Math.min(B.length, atvSize - p);
    fs.readSync(fd, B, 0, n, f[2] + 8 + p);
    hash.update(B.subarray(0, n));
    p += n;
  }
  const dig = hash.digest('hex').toUpperCase();
  console.log(`atv sha256: ${dig}`);
  
  // Compare with work atv.img
  const h2 = crypto.createHash('sha256');
  const atvPath = 'C:\\Users\\techn\\AppData\\Local\\Temp\\opencode\\obaa-work\\atv.img';
  const afd = fs.openSync(atvPath, 'r');
  const aSize = fs.statSync(atvPath).size;
  let ap = 0;
  while (ap < aSize) {
    const n = Math.min(B.length, aSize - ap);
    fs.readSync(afd, B, 0, n, ap);
    h2.update(B.subarray(0, n));
    ap += n;
  }
  fs.closeSync(afd);
  const dig2 = h2.digest('hex').toUpperCase();
  console.log(`work atv sha256: ${dig2}`);
  console.log(dig === dig2 ? 'ATV IMAGE MATCH OK' : 'ATV IMAGE MISMATCH!!');
  break;
}
fs.closeSync(fd);
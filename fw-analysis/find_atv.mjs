import fs from 'node:fs';
const bin = 'C:\\Users\\techn\\OneDrive\\Desktop\\SP3531E.5 VRVT\\VS_HI352E_1G.bin';
const fd = fs.openSync(bin, 'r');
const h = Buffer.alloc(0x400);
fs.readSync(fd, h, 0, 0x400, 0);
const names = ['fastboot','bootargs','bootargsbak','slaveboot','recovery','panelparam','deviceinfo','logo','boot','dtbo','atf','securestore','misc','bootmusic','bootmusicsec','tconparam','system','vendor','atv','log','cache','userdata'];
for (let i = 0; i < 22; i++) {
  const o = 0x30 + i * 32;
  const f = [0,1,2,3,4,5,6,7].map(k => h.readUInt32BE(o + k * 4));
  if (f[7] !== 2 || f[6] <= f[4] || f[6] > 0x800000000) break;
  if (names[i] === 'atv') {
    console.log('atv off=' + f[2] + ' size=' + f[1] + ' start=' + f[4] + ' end=' + f[6]);
  }
}
fs.closeSync(fd);
// Targeted scan for IR/remote-related data inside the firmware dump
import fs from 'node:fs';
const inPath = process.argv[2];
const buf = fs.readFileSync(inPath);
const size = buf.length;
const outDir = process.argv[3] || '.';
const L = []; const P = s => L.push(s);

// --- IR timing pair scan (adjacent LE16/BE16 value pairs) ---
P('== IR timing pair scan (adjacent 16-bit pairs) ==');
const pairs = [[9000,4500],[4500,560],[560,1690],[180,90],[900,450],[56,169],[11,33],[2400,1200],[889,1778],[2000,1000],[600,300],[1600,800],[800,400],[400,200],[9000,2250],[2250,560]];
for (const [a,b] of pairs) {
  for (const endian of ['LE','BE']) {
    const pat = Buffer.alloc(4);
    if (endian==='LE') { pat.writeUInt16LE(a,0); pat.writeUInt16LE(b,2); }
    else { pat.writeUInt16BE(a,0); pat.writeUInt16BE(b,2); }
    const hits=[]; let i=0;
    while (hits.length<8) { const j=buf.indexOf(pat,i); if(j<0) break; hits.push(j); i=j+1; }
    if (hits.length) P(`  (${a},${b}) ${endian} x${hits.length}${hits.length>=8?'+':''} @ ${hits.map(o=>'0x'+o.toString(16)).join(', ')}`);
  }
}

// --- keyword scan ---
P(''); P('== keyword scan (case-insensitive, whole file) ==');
const S = buf.toString('latin1');
for (const kw of ['remote','nec','rc5','panel','logo','osd','resolution','uart','standby','keymap','hdmi','unisoc','disable','boot','spi']) {
  const re = new RegExp(kw,'gi'); const hits=[]; let m;
  while ((m=re.exec(S)) && hits.length<6) hits.push(m.index);
  if (hits.length) P(`  ${kw}: x>=${hits.length} @ ${hits.map(o=>'0x'+o.toString(16)).join(', ')}`);
}

// --- repeated 16-byte block census ---
function census(start,end) {
  const freq=new Map();
  for (let o=start;o+16<=end;o+=16){ const k=buf.subarray(o,o+16).toString('hex'); freq.set(k,(freq.get(k)||0)+1); }
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12);
}
P(''); P('== top repeated 16B blocks: tail 0x368000-0x3cb900 ==');
for (const [k,c] of census(0x368000,0x3cb900)) P(`  x${String(c).padStart(5)}  ${k}`);
P('== top repeated 16B blocks: head 0-0x368000 ==');
for (const [k,c] of census(0,0x368000)) P(`  x${String(c).padStart(5)}  ${k}`);

// --- bit-difference between top two tail families ---
{
  const top2 = census(0x368000,0x3cb900).slice(0,2).map(e=>Buffer.from(e[0],'hex'));
  if (top2.length===2) {
    let bits=0; for(let i=0;i<16;i++){ let x=top2[0][i]^top2[1][i]; while(x){bits+=x&1;x>>=1;} }
    P(`bit-diff between top two tail families: ${bits}/128 bits`);
  }
}

// --- XOR-K16 keystream attack ---
P(''); P('== XOR-K16 keystream attack ==');
function score(b){ let s=0; const t=b.toString('latin1');
  const re=/(MBOOT|Linux|MIPS|boot|init|bin|etc|dev|usr|http|remot|nec|key|osd|logo)/gi; let m; while((m=re.exec(t))) s+=10;
  let cur=0; for(let i=0;i<t.length;i++){const c=t.charCodeAt(i); if(c>=0x20&&c<=0x7e){cur++;} else { if(cur>=7)s+=1; cur=0; }}
  if(cur>=7)s+=1; return s; }
const samples = [0,0x100000,0x200000,0x368000];
function dec(K){ const out=[]; for(const off of samples){ const t=Buffer.alloc(65536); for(let i=0;i<65536;i++){ t[i]=buf[off+i]^K[i&15]; } out.push(t);} return out; }
const cands = census(0x368000,0x3cb900).slice(0,10);
let results=[];
for (const [khex] of cands) {
  const K = Buffer.from(khex,'hex');
  for (const variant of [0,1]) {
    const KK = variant? Buffer.from(K.map(c=>c^0xFF)) : K;
    const ds = dec(KK);
    const sc = ds.reduce((a,t)=>a+score(t),0);
    results.push([khex.slice(0,32)+(variant?' ^FF':''), sc]);
  }
}
results.sort((a,b)=>b[1]-a[1]);
for (const [k,s] of results.slice(0,8)) P(`  score=${String(s).padStart(5)}  K=${k}`);

// --- bit-shift test on tail sample ---
P(''); P('== bit-shift test (tail sample 64KB @0x368000): strings>=6 ==');
function cntstr(b){ let cnt=0,cur=0; for(let i=0;i<b.length;i++){const c=b[i]; if(c>=0x20&&c<=0x7e)cur++; else {if(cur>=6)cnt++;cur=0;}} if(cur>=6)cnt++; return cnt; }
{
  const off=0x368000, len=65536, raw=buf.subarray(off,off+len);
  P(`  raw: ${cntstr(raw)}`);
  for (let s=1;s<=7;s++){
    const r=Buffer.alloc(len), l=Buffer.alloc(len);
    for(let i=0;i<len-1;i++){ r[i]=((raw[i]>>s)|(raw[i+1]<<(8-s)))&0xff; l[i]=((raw[i]<<s)|(raw[i+1]>>(8-s)))&0xff; }
    P(`  shift ${s}: right ${cntstr(r)}  left ${cntstr(l)}`);
  }
}

// --- bitplane de-interleave test ---
P(''); P('== bitplane test (tail 64KB) ==');
{
  const off=0x368000, len=65536, raw=buf.subarray(off,off+len);
  const out=Buffer.alloc(len);
  for (let bit=0;bit<8;bit++){
    for (let i=0;i<len/8;i++){
      let v=0;
      for (let j=0;j<8;j++){ v = (v<<1) | ((raw[(i*8)+j]>>bit)&1); }
      out[bit*(len/8)+i]=v;
    }
  }
  P(`  de-bitplaned strings>=6: ${cntstr(out)} (raw ${cntstr(raw)})`);
}

fs.writeFileSync(outDir+'/rscan_report.txt', L.join('\n'));
console.log('written: '+outDir+'/rscan_report.txt');

import fs from 'node:fs';
const out = new URL('../public/audio/', import.meta.url); fs.mkdirSync(out,{recursive:true});
const names=['after-the-rain','softer-blue','golden','light','place','windows'];
const bases=[146.83,130.81,164.81,174.61,110,155.56];
const rate=16000,duration=96;
for(let song=0;song<6;song++){
 const n=rate*duration, data=Buffer.alloc(44+n*2);
 data.write('RIFF');data.writeUInt32LE(36+n*2,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(n*2,40);
 const chords=[0,5,3,7],notes=[0,7,12,14,7,3,10,7];
 for(let i=0;i<n;i++){
  const t=i/rate, beat=song===5?.4:.6, step=Math.floor(t/beat), chord=chords[Math.floor(t/12)%4], base=bases[song]*2**(chord/12), phase=t%beat;
  const env=Math.min(t/3,1,(duration-t)/4), padFade=.7+.3*Math.sin(t*.18);
  let v=0;
  for(const semitone of [0,3,7,10]){const f=base*2**(semitone/12);v+=(Math.sin(2*Math.PI*f*t)+.2*Math.sin(2*Math.PI*f*2.001*t))*.038*padFade;}
  const freq=base*2**(notes[step%8]/12)*2;v+=Math.sin(2*Math.PI*freq*phase)*Math.exp(-phase*6)*Math.min(phase*100,1)*.09;
  const kick=t%(beat*4);v+=Math.sin(2*Math.PI*(48*kick+1.2*(1-Math.exp(-kick*20))))*Math.exp(-kick*16)*.07;
  v+=Math.sin(i*127.1+Math.sin(i*311.7))*Math.exp(-(t%(beat*2))*65)*.014;
  data.writeInt16LE(Math.round(Math.max(-.95,Math.min(.95,v*env))*32767),44+i*2);
 }
 fs.writeFileSync(new URL(names[song]+'.wav',out),data);
}
console.log('Created six original 96-second ambient development tracks.');


import fs from 'node:fs/promises';
import path from 'node:path';
import assets from '../data/assets.json' with { type: 'json' };
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
let failures=[];
for(let offset=0;offset<assets.length;offset+=4) {
  await Promise.all(assets.slice(offset,offset+4).map(async asset=>{
    const destination=path.join('public',asset.path);
    try {
      try { const cached=await fs.readFile(destination); if(cached.subarray(0,8).equals(pngSignature)) return; } catch {}
      const response=await fetch(asset.url,{signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw new Error('HTTP '+response.status);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(!bytes.subarray(0,8).equals(pngSignature)) throw new Error('Expected PNG illustration');
      await fs.mkdir(path.dirname(destination),{recursive:true}); await fs.writeFile(destination,bytes);
      console.log('Cached original illustration: '+asset.path);
    } catch(error) { failures.push({asset:asset.url,error:String(error)}); }
  }));
}
await fs.mkdir('output',{recursive:true});
await fs.writeFile('output/assets-report.json',JSON.stringify({total:assets.length,failures},null,2));
if(failures.length) { console.error(JSON.stringify(failures,null,2)); throw new Error('Could not cache '+failures.length+' original illustrations. Retry npm run assets.'); }
console.log('All '+assets.length+' original illustrations are available locally.');

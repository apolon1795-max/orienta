import { build } from 'vite';
import react from '@vitejs/plugin-react';
// No paid module is written under dist/public. Backend bundling receives it in memory.
export const buildProtectedCourse = async () => {
 const result=await build({configFile:false,publicDir:false,plugins:[react({jsxRuntime:"classic"})],define:{'process.env.NODE_ENV':JSON.stringify('production'),'import.meta.env.VITE_PROGRESS_API_URL':JSON.stringify('')},build:{write:false,minify:true,sourcemap:false,lib:{entry:'protected-course.tsx',formats:['es'],fileName:()=> 'course.mjs'},rollupOptions:{output:{inlineDynamicImports:true}}}});
 const output=(Array.isArray(result)?result[0]:result).output;
 const chunks=output.filter(x=>x.type==='chunk');
 if(chunks.length!==1||chunks[0].imports.length||chunks[0].dynamicImports.length)throw Error('Protected course must be a single self-contained module');
 const script=chunks[0].code,css=output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>String(x.source)).join('\n');
 if(script.includes('process.env.NODE_ENV') || /\.jsxDEV\(/.test(script))throw Error('Protected package contains unresolved development runtime');
 if(!script||!css)throw Error('Missing protected course code or styles');
 return {version:1,script,css};
};

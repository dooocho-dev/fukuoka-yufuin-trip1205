import {cp,mkdir,rm} from 'node:fs/promises';
const files=['index.html','styles.css','app.js','data/trip.json','assets/favicon.svg','.nojekyll'];
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const f of files){await mkdir('dist/'+(f.includes('/')?f.split('/').slice(0,-1).join('/'):' ' ).trim(),{recursive:true});await cp(f,'dist/'+f);}
console.log('Trip site ready in dist/');

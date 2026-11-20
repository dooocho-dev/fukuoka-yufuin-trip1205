import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
const root=process.cwd(),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(name==='/'?'/index.html':name));if(file!==root&&!file.startsWith(root+sep))throw new Error('Access denied');const s=await stat(file);if(!s.isFile())throw new Error('Not a file');res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'0.0.0.0',()=>console.log(`여행 사이트: http://localhost:${port}`));

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {PAGE_IDS,collectPublicEntries,buildDataset} from './notion-normalize.mjs';
const token=process.env.NOTION_TOKEN;
if(!token) {console.error('NOTION_TOKEN이 없습니다. 초기 data/trip.json을 유지합니다.');process.exitCode=1;}
else await sync();
async function sync(){
 const ids=[process.env.NOTION_GUIDE_PAGE_ID||PAGE_IDS.guide,process.env.NOTION_ORIGINAL_PAGE_ID||PAGE_IDS.original];
 const cached=new Map();let requestAt=0,blocksVisited=0;
 async function get(url,tries=0){
  const elapsed=Date.now()-requestAt;if(elapsed<375)await new Promise(r=>setTimeout(r,375-elapsed));requestAt=Date.now();
  const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2022-06-28'}});
  if((r.status===429||r.status>=500)&&tries<6){let wait=Number(r.headers.get('retry-after')||'0')*1000||Math.min(12000,750*2**tries);await new Promise(x=>setTimeout(x,wait));return get(url,tries+1);}
  if(!r.ok)throw new Error(`Notion API ${r.status}: ${(await r.text()).slice(0,300)}`);
  return r.json();
 }
 async function listChildren(id){const result=[];let cursor=null;
  do{const url=new URL(`https://api.notion.com/v1/blocks/${encodeURIComponent(id)}/children`);url.searchParams.set('page_size','100');if(cursor)url.searchParams.set('start_cursor',cursor);const response=await get(url.href);result.push(...response.results);cursor=response.has_more?response.next_cursor:null;}while(cursor);
  return result;
 }
 async function getTree(id,depth=0,section=0,stack=new Set()){
  if(depth>12||blocksVisited>8000||stack.has(id))return [];
  const key=`${id}:${section}`;if(cached.has(key))return structuredClone(cached.get(key));
  const nextStack=new Set(stack);nextStack.add(id);
  const nodes=[];const base=await listChildren(id);
  for(const b of base){
   blocksVisited++;
   const value=(b[b.type]?.rich_text||[]).map(t=>t.plain_text||'').join('');
   const m=b.type==='heading_1'&&value.match(/^0([1-6])\s*[·.]/);if(m)section=Number(m[1]);
   // Do not descend into personal documents or travel prep screenshots.
   if(section===2||/^(?:예약\s*내용|항공권\s*상세|개인\s*정보|바우처|여권|결제\s*정보|예약\s*확인)/i.test(value))continue;
   const safe={id:b.id,type:b.type,[b.type]:b[b.type],children:[]};
   if(b.has_children) safe.children=await getTree(b.id,depth+1,section,nextStack);
   if(b.type==='synced_block'&&b.synced_block?.synced_from?.block_id&&!b.has_children) safe.children=await getTree(b.synced_block.synced_from.block_id,depth+1,section,nextStack);
   if(b.type==='child_page')continue;
   nodes.push(safe);
  }
  cached.set(key,nodes);return structuredClone(nodes);
 }
 let data=[];
 for(const id of ids){const found=await getTree(id);data=data.concat(found);}
 const entries=collectPublicEntries(data);
 const seed=JSON.parse(await readFile('data/trip.json','utf8'));
 const result=buildDataset(seed,entries);
 if(result.days.length!==3||result.restaurants.length<4)throw new Error('동기화 결과 검증 실패: 데이터가 적거나 날짜가 맞지 않습니다.');
 await mkdir('data',{recursive:true});await writeFile('data/trip.json',JSON.stringify(result,null,2)+'\n');
 console.log(`동기화 완료: ${blocksVisited}블록 방문, ${result.restaurants.length}개 맛집, ${result.shopping.length}개 쇼핑, ${result.places.length}개 장소`);
}

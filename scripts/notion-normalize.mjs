/** Pure Notion block → public trip-data helpers. Never publish raw blocks. */
export const PAGE_IDS = {
  guide: '3ff9f158-59a8-8114-ac13-d260e554bfc8',
  original: '3f79f158-59a8-805d-ae46-fd904191b5c4'
};
const privatePattern = /예약\s*(번호|자)|바우처|여권|주민등록|QR\s*코드|본인\s*인증|계좌|카드\s*번호|비밀번호|결제\s*내역|확인\s*번호|탑승권|휴대전화|전화번호|이메일|E-?TICKET|BOOKING\s*REF|PNR|reference\s*number/i;
const genericPattern = /^(?:.*\d+곳.*|맛집|쇼핑|관광|점심|저녁|식당|후쿠오카|유후인|텐진|하카타|백업|기타|예약\s*내용|항공|수하물|교통|소개|지도|메뉴판|층별\s*정보|영업시간|위치|구경|가볼만한곳|라멘|스시|카페|모츠나베)$/i;
export function richText(parts) { return Array.isArray(parts) ? parts.map(x => x.plain_text ?? x.text?.content ?? '').join('').trim() : ''; }
export function blockText(b) {
  const type=b.type, content=b[type]||{};
  if (type==='table_row') return (content.cells||[]).map(c=>richText(c)).join(' | ');
  return richText(content.rich_text || content.caption || content.title || []);
}
export function safePublicText(value,max=110) {
  const text=String(value||'').replace(/\s+/g,' ').trim();
  if (!text||privatePattern.test(text)) return '';
  // Filters tokens frequently used for personal/booking IDs even if no context word is present.
  if (/\b(?:[A-Z0-9]{12,}|\d{9,})\b/.test(text)) return '';
  return text.slice(0,max);
}
export function safeVenueName(value) {
 if (/\(\d+곳\)/.test(String(value))) return '';
 const clean=safePublicText(value,110).replace(/^[📍🍜🍱🍽️🏬🛍️✨▶️\-\s]+/u,'').replace(/\s*\(\d+곳\)\s*$/,'').trim();
 if (clean.length<2||genericPattern.test(clean)||/\b\d{2}:\d{2}\b/.test(clean)||/^\d+[일월]/.test(clean))return '';
 return clean;
}
export function safeMapsUrl(value) {
 try {const u=new URL(String(value));const host=u.hostname.toLowerCase();return u.protocol==='https:'&&(/(^|\.)google\.com$/.test(host)||host==='maps.app.goo.gl')&&(u.pathname.includes('maps')||host==='maps.app.goo.gl')?u.href:'';} catch{return ''}
}
export function coordsFromGoogleUrl(value) {
 const url=safeMapsUrl(value);if(!url)return null;
 // !3d latitude / !4d longitude are exact POI markers. Do not use @ viewport coordinates.
 const lat=url.match(/!3d(-?\d+(?:\.\d+)?)/), lng=url.match(/!4d(-?\d+(?:\.\d+)?)/);
 if(!lat||!lng)return null;
 const pos=[Number(lat[1]),Number(lng[1])];return pos[0]>20&&pos[0]<50&&pos[1]>120&&pos[1]<150?pos:null;
}
export function urlsFromBlock(b){
  const found=[];
  for(const item of b[b.type]?.rich_text||[]){if(item.href)found.push(item.href);if(item.text?.link?.url)found.push(item.text.link.url);}
  return found;
}
export function areaFromPath(path){const str=path.join(' ');if(/유후인|由布院|湯布院|긴린코/.test(str))return '유후인';if(/캐널시티|하카타/.test(str))return '하카타·캐널시티';return '텐진·하카타';}
export function categoryFromPath(path){const str=path.join(' ');const keys=['라멘','우동','소바','카페','디저트','이자카야','스시','사시미','야키니쿠','모츠나베','야키토리','돈카츠','해산물','닭요리','교자','전골'];return keys.find(x=>str.includes(x))||'일식·맛집';}
export function sectionOf(path) {const s=path.join(' / ');const m=s.match(/(?:^|\/ )0([1-6])\s*[·.]/);return m?Number(m[1]):0;}
export function collectPublicEntries(tree){
 const restaurants=[],shops=[],places=[],scheduleTables=[];
 const seenRestaurant=new Set(),seenShop=new Set(),seenPlace=new Set();
 function walk(nodes,path=[],section=0) {
   let runningSection=section;
   let headingPath=path;
   for(const b of nodes||[]) {
     const raw=blockText(b),t=safePublicText(raw,130);
     if(b.type==='heading_1'){
       const m=raw.match(/^0([1-6])\s*[·.]/);
       if(m)runningSection=Number(m[1]);
       headingPath=t?[t]:[];
     } else if (b.type==='heading_2') {
       headingPath=[...headingPath.slice(0,1),t].filter(Boolean);
     } else if (b.type==='heading_3') {
       headingPath=[...headingPath.slice(0,2),t].filter(Boolean);
     }
     const nextPath=b.type==='toggle'?[...headingPath,t].filter(Boolean).slice(-12):headingPath;
     const current=runningSection||sectionOf(nextPath);
     if(current===4&&b.type==='toggle'){
       const name=safeVenueName(raw);
       if(name&&!seenRestaurant.has(name.toLowerCase())&&!/^(?:레스토랑|식당|장소|유후인 식당|텐진).*(?:\d+곳|카테고리)/.test(name)) {
         const m={name,area:areaFromPath(nextPath),category:categoryFromPath(nextPath),description:'노션 여행 목록에 저장된 식당'};
         for(const child of (b.children||[]).slice(0,12)){
           const line=blockText(child);
           if(/^주소\s*[:：]/.test(line)){const address=safePublicText(line.replace(/^주소\s*[:：]/,''),135);if(address)m.description=address;}
           const maps=urlsFromBlock(child).map(safeMapsUrl).find(Boolean);
           if(maps){m.mapUrl=maps;const coords=coordsFromGoogleUrl(maps);if(coords)m.coords=coords;}
         }
         restaurants.push(m);seenRestaurant.add(name.toLowerCase());
       }
     }
     if(current===5&&b.type==='toggle'){
       const name=safeVenueName(raw);
       if(name&&!seenShop.has(name.toLowerCase())&&!/^(?:다이묘 거리|층별|쇼핑|텐진 가볼만|브랜드|참고)/.test(name)){
         const area=areaFromPath(nextPath);
         const info={name,area:area==='유후인'?'유후인':area==='하카타·캐널시티'?'하카타·캐널시티':'텐진',description:'노션 쇼핑 목록에 저장된 매장',floors:[]};
         for(const child of b.children||[]){
           const cells=child.type==='table_row'?child.table_row.cells.map(richText):[];
           if(cells.length>=2){if(/주소|위치/.test(cells[0]))info.address=safePublicText(cells[1],150);if(/영업|운영시간/.test(cells[0]))info.hours=safePublicText(cells[1],65);}
           if(child.type==='table')for(const row of child.children||[]){const c=row.table_row?.cells?.map(richText)||[];if(c.length>=2){if(/주소|위치/.test(c[0]))info.address=safePublicText(c[1],150);if(/영업|운영시간/.test(c[0]))info.hours=safePublicText(c[1],65);}}
           for(const url of urlsFromBlock(child)){const safe=safeMapsUrl(url);if(safe){info.mapUrl=safe;const coords=coordsFromGoogleUrl(safe);if(coords)info.coords=coords;}}
         }
         shops.push(info);seenShop.add(name.toLowerCase());
       }
     }
     if(current===6&&b.type==='toggle'){
       const name=safeVenueName(raw);if(name&&!seenPlace.has(name.toLowerCase())&&name.length<50){places.push({name,area:areaFromPath(nextPath),kind:'관광',description:'노션에 저장된 관광 후보'});seenPlace.add(name.toLowerCase());}
     }
     if(b.type==='table'&&current===1&&nextPath.join(' ').includes('세부 이동'))scheduleTables.push(b);
     if(b.children?.length)walk(b.children,nextPath,runningSection);
   }
 }
 walk(tree);
 // Strict validation removes titles that are likely navigation or screenshots rather than venue entries.
 const cleanRestaurant=restaurants.filter(x=>x.name.length<95&&!/\b(?:[0-9]+일차|카테고리|식당·카페|분류|식당 목록)\b/.test(x.name));
 const cleanShop=shops.filter(x=>x.name.length<80);
 return {restaurants:cleanRestaurant,shopping:cleanShop,places,scheduleTables};
}
export function mergeUnique(seed,extracted,key='name'){
 const map=new Map();
 for(const x of [...seed,...extracted]) {const name=String(x[key]||'').replace(/\s+/g,'').toLowerCase();if(!name)continue;const prev=map.get(name);map.set(name,prev?{...x,...prev,coords:prev.coords||x.coords,mapUrl:prev.mapUrl||x.mapUrl}:x);}
 return [...map.values()];
}
export function tableSchedules(tables){
 const result={1:[],2:[],3:[]};let day=0;
 for(const tbl of tables){
  const rows=(tbl.children||[]).filter(r=>r.type==='table_row');
  if(rows.length<4)continue;
  for(const row of rows){
   const cells=(row.table_row.cells||[]).map(richText);
   if(cells.length<2)continue;
   const m=cells[0].match(/([1-3])일차/);if(m)day=Number(m[1]);
   if(!day)continue;
   const title=safePublicText(cells[1],105);const detail=safePublicText(cells[2]||'',150);
   if(!title||!detail&&/^[\s·—-]*$/.test(title))continue;
   if(privatePattern.test(cells.join(' ')))continue;
   const time=(title+' '+detail).match(/(?:^|\s)([01]?\d|2[0-3]):[0-5]\d/);
   const rowObj={time:time?time[0].trim():(/조식|아침/.test(cells[0])?'아침':/저녁/.test(cells[0])?'저녁':/점심/.test(cells[0])?'점심':'예정'),title:title.replace(/^(?:\d{1,2}:\d\d)\s*/,'').trim(),detail:detail.replace(/예약\s*(완료|확정)/g,'').trim(),type:/KTX|철도|기차|버스|이동|터미널/.test(title)?'transport':/호텔|체크인|체크아웃|퇴실/.test(title)?'stay':/비행|공항|아시아나/.test(title)?'flight':/마트|쇼핑|백화점|파르코|시티/.test(title)?'shop':/식사|점심|조식|저녁|야식|라멘|야키니쿠/.test(cells[0]+' '+title)?'food':'visit'};
   if(/예약\s*(완료|확정)/.test(cells.join(' ')))rowObj.status='예약완료';
   if(rowObj.title&&result[day].every(e=>e.title!==rowObj.title))result[day].push(rowObj);
  }
 }
 return result;
}
export function buildDataset(seed,entries,isoDate=new Date().toISOString().slice(0,10)) {
 const result=structuredClone(seed);
 // Preserve curated seed listings while incorporating all safely parsed venue titles.
 if(entries.restaurants.length>0)result.restaurants=mergeUnique(seed.restaurants,entries.restaurants);
 if(entries.shopping.length>0)result.shopping=mergeUnique(seed.shopping,entries.shopping);
 if(entries.places.length>0)result.places=mergeUnique(seed.places,entries.places);
 const planned=tableSchedules(entries.scheduleTables);
 for(let i=0;i<result.days.length;i++){if((planned[i+1]||[]).length>=5)result.days[i].items=planned[i+1];}
 result.meta.updatedAt=isoDate;result.meta.syncStatus='synced';
 result.meta.notice='노션 페이지에서 공개 가능한 일정·장소 정보만 정기 동기화했습니다. 예약번호·개인정보·바우처는 제외합니다.';
 result.meta.syncCounts={restaurants:result.restaurants.length,shopping:result.shopping.length,places:result.places.length};
 return result;
}

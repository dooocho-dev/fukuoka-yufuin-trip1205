'use strict';
const state = { data:null, tab:'overview', day:0, foodArea:'전체', foodSearch:'', foodLimit:18, shopArea:'전체', shopSearch:'', map:null };
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowedUrl = url => { try { const p=new URL(String(url)); return ['https:','http:'].includes(p.protocol) ? p.href : ''; } catch { return ''; } };
const mapUrl = item => allowedUrl(item.mapUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name||'')}`;
const link = (url, label='지도 열기 ↗') => `<a class="tiny-link" href="${esc(allowedUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const typeIcon = type => ({flight:'✈️',transport:'🚌',stay:'🏨',food:'🍜',visit:'📍',shop:'🛍️'})[type]||'📌';
function dateLabel(date) { const [,m,d]=String(date).split('-').map(Number); return `${m}/${d}`; }
function notice(message) { const toast=$('#toast'); toast.textContent=message; toast.classList.add('show'); clearTimeout(notice.timer); notice.timer=setTimeout(()=>toast.classList.remove('show'),2500); }
function showPanel(id) {
 if (!document.getElementById(id)) return;
 state.tab=id;
 $$('.panel').forEach(el=>el.classList.toggle('active',el.id===id));
 $$('.tab').forEach(btn=>{const active=btn.dataset.tab===id; btn.classList.toggle('active',active); if(active)btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');});
 if (location.hash!==`#${id}`) history.replaceState(null,'',`#${id}`);
 window.scrollTo({top:$('.tabbar').getBoundingClientRect().top+window.scrollY-3,behavior:'smooth'});
 if (id==='map') setTimeout(renderMap,70);
}
function renderOverview(d) {
 const today=new Date(); today.setHours(0,0,0,0);
 const start=new Date(`${d.meta.startDate}T00:00:00`), diff=Math.ceil((start-today)/86400000);
 const status=diff>0?`D-${diff}`:diff===0?'출발일':'여행 기록';
 $('#stats').innerHTML=[['TRAVEL DATE',`${dateLabel(d.meta.startDate)} — ${dateLabel(d.meta.endDate)}`,'2026년 12월 · 2박 3일'],['ITINERARY','3 DAYS','유후인 → 텐진'],['FLIGHT', 'OZ134 / 133', '아시아나항공'],['COUNTDOWN',status,diff>0?'여행까지 남은 날짜':diff===0?'즐거운 여행 되세요':'지난 여행 일정']].map(([k,v,s])=>`<div class="stat"><div class="stat-kicker">${esc(k)}</div><div class="stat-big">${esc(v)}</div><div class="stat-sub">${esc(s)}</div></div>`).join('');
 $('#overviewDays').innerHTML=d.days.map((day,i)=>`<button class="day-card" data-go-day="${i}"><div class="day-num">0${i+1}<small>${esc(dateLabel(day.date))}</small></div><div class="day-content"><h4>${esc(day.area)}</h4><p>${esc(day.summary)}</p></div><div class="day-arrow">↗</div></button>`).join('');
 $('#overviewNotice').textContent=d.meta.notice||'현지 사정에 따라 일정은 변경될 수 있습니다.';
}
function renderSchedule(d) {
 $('#dayTabs').innerHTML=d.days.map((day,i)=>`<button class="day-tab ${i===state.day?'active':''}" data-select-day="${i}" role="tab" aria-selected="${i===state.day}"><b>DAY 0${i+1}</b><small>${esc(dateLabel(day.date))} · ${esc(day.label.split('·').at(-1)?.trim()||'')}</small></button>`).join('');
 const day=d.days[state.day]||d.days[0];
 $('#scheduleHeading').innerHTML=`<small>DAY 0${state.day+1} / ${esc(day.date)}</small><h3>${esc(day.area)}</h3><p>${esc(day.summary)}</p>`;
 $('#timeline').innerHTML=day.items.map(item=>`<div class="timeline-item"><div class="timeline-time">${esc(item.time||'예정')}</div><div class="timeline-track"><div class="timeline-dot"></div></div><div class="timeline-body"><div class="timeline-topline"><h4>${typeIcon(item.type)} ${esc(item.title)}</h4>${item.status?`<span class="badge ${item.status==='예약완료'?'':'gray'}">${esc(item.status)}</span>`:''}</div><p>${esc(item.detail||'')}</p>${item.place?`<div>${link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.place)}`)}</div>`:''}</div></div>`).join('');
}
function renderTravel(d) {
 $('#flights').innerHTML=d.flights.map(f=>`<article class="flight-card"><div class="card-eyebrow">✈ ${esc(f.airline||'항공편')}</div><h4>${esc(f.route)}</h4><div class="flight-line"><div><b>${esc(f.departure.split(' ').at(-1)||f.departure)}</b><small>출발 · ${esc(f.departure.split(' ')[0]||'')}</small></div><div class="airplane">→</div><div><b>${esc(f.arrival.split(' ').at(-1)||f.arrival)}</b><small>도착 · ${esc(f.arrival.split(' ')[0]||'')}</small></div></div><div class="card-meta">${esc(f.flight)} · ${esc(f.note||'')}</div></article>`).join('');
 $('#stays').innerHTML=d.stays.map(s=>`<article class="stay-card"><div><div class="card-eyebrow">${esc(s.date)} · ${esc(s.area)}</div><h4>${esc(s.name)}</h4><p>${esc(s.detail||'')}</p>${link(mapUrl(s))}</div><div class="stay-icon">🏨</div></article>`).join('');
 $('#transport').innerHTML=d.transport.map(t=>`<article class="transport-card"><div><b>${esc(t.name)}</b><p>${esc(t.time||'')}</p></div>${t.status?`<span class="badge ${t.status==='예약완료'?'':'gray'}">${esc(t.status)}</span>`:''}</article>`).join('');
}
function coordinatesOf(item) {return Array.isArray(item.coords)&&item.coords.length===2&&item.coords.every(x=>typeof x==='number'&&Number.isFinite(x))&&Math.abs(item.coords[0])<=90&&Math.abs(item.coords[1])<=180?item.coords:null;}
function renderMap() {
 const target=$('#tripMap'); if (!target) return;
 if (state.map){state.map.invalidateSize();return;}
 const locations=[...state.data.restaurants,...state.data.shopping,...state.data.places].filter(item=>coordinatesOf(item));
 if (typeof window.L==='undefined') {target.innerHTML='<p class="map-fallback">지도를 불러오지 못했습니다. 아래 장소의 「지도 열기」 버튼을 이용해 주세요.</p>';return;}
 try {
  state.map=L.map(target,{scrollWheelZoom:false}).setView([33.48,130.72],9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(state.map);
  const bounds=[];
  locations.forEach(x=>{const pos=coordinatesOf(x);if(!pos)return;const popup=document.createElement('div');const strong=document.createElement('strong');strong.textContent=x.name;popup.append(strong);popup.append(document.createElement('br'));const a=document.createElement('a');a.href=mapUrl(x);a.textContent='구글 지도에서 열기 ↗';a.target='_blank';a.rel='noopener noreferrer';popup.append(a);L.marker(pos).addTo(state.map).bindPopup(popup);bounds.push(pos);});
  if(bounds.length>1)state.map.fitBounds(bounds,{padding:[35,35],maxZoom:12});else if(bounds.length===1)state.map.setView(bounds[0],12);
  setTimeout(()=>state.map.invalidateSize(),130);
 } catch(e){ console.warn('지도 로딩 실패',e);target.textContent='지도 표시가 어렵습니다. 아래의 지도 검색 링크를 사용하세요.'; }
}
function renderPlaces(d){$('#places').innerHTML=d.places.length?d.places.map(p=>`<article class="place-card"><div class="place-tag">${esc(p.kind||p.area)}</div><h4>${esc(p.name)}</h4><p>${esc(p.description||'')}</p>${link(mapUrl(p))}</article>`).join(''):'<div class="empty">등록된 관광지가 없습니다.</div>';}
function chips(container,items,current,attribute) {container.innerHTML=['전체',...items.filter(x=>x!=='전체')].map(x=>`<button class="chip ${x===current?'active':''}" ${attribute}="${esc(x)}" aria-pressed="${x===current}">${esc(x)}</button>`).join('');}
function renderFood(){const d=state.data;const areas=[...new Set(d.restaurants.map(x=>x.area||'기타'))];chips($('#foodAreas'),areas,state.foodArea,'data-food-area');const q=state.foodSearch.trim().toLocaleLowerCase('ko');const results=d.restaurants.filter(x=>(state.foodArea==='전체'||x.area===state.foodArea)&&(!q||[x.name,x.category,x.area,x.description].join(' ').toLocaleLowerCase('ko').includes(q)));$('#foodCount').textContent=`${results.length.toLocaleString('ko-KR')}곳`;$('#foodCards').innerHTML=results.length?results.slice(0,state.foodLimit).map(x=>`<article class="food-card"><div class="card-topline"><span class="food-category">${esc(x.category||'맛집')}</span><span class="food-area">${esc(x.area||'')}</span></div><h3>${esc(x.name)}</h3><p>${esc(x.description||'노션 여행 목록에 저장된 식당')}</p><div class="food-bottom"><span class="card-price">${x.priceYen?`¥${Number(x.priceYen).toLocaleString('ko-KR')}`:'상세 메뉴·가격 확인'}</span>${link(mapUrl(x))}</div></article>`).join(''):'<div class="empty">조건에 맞는 식당이 없어요. 검색어를 바꿔보세요.</div>';$('#foodMore').hidden=results.length<=state.foodLimit;}
function renderShopping(){
 const d=state.data,q=state.shopSearch.trim().toLocaleLowerCase('ko');
 chips($('#shopAreas'),[...new Set(d.shopping.map(x=>x.area||'기타'))],state.shopArea,'data-shop-area');
 const floors=x=>(x.floors||[]).map(f=>typeof f==='string'?{level:'기타',stores:[f]}:f);
 const floorText=f=>[f.level,...(f.stores||[])].join(' ').toLocaleLowerCase('ko');
 const results=d.shopping.filter(x=>(state.shopArea==='전체'||x.area===state.shopArea)&&(!q||[x.name,x.address,x.description,...floors(x).map(floorText)].join(' ').toLocaleLowerCase('ko').includes(q)));
 $('#shopCount').textContent=results.length+'곳';
 $('#shoppingCards').innerHTML=results.length?results.map(x=>{
  const fs=floors(x),mallMatch=!q||[x.name,x.address,x.description].join(' ').toLocaleLowerCase('ko').includes(q);
  const visible=mallMatch?fs:fs.filter(f=>floorText(f).includes(q));
  const directory=fs.length?`<details class="floor-details" ${q&&!mallMatch?'open':''}><summary>층별 매장·시설 정보 <small>${fs.length}개 층·구역 · ${fs.reduce((n,f)=>n+(f.stores||[]).length,0)}개 항목</small></summary>
   <div class="floor-details-inner"><p class="floor-notice">${esc(x.floorNote||'노션에 저장된 층별 안내입니다.')}</p><div class="floor-rows">${visible.map(f=>`<div class="floor-row"><b class="floor-level">${esc(f.level||'기타')}</b><div class="floor-store-list">${(f.stores||[]).map(s=>`<span class="floor-store">${esc(s)}</span>`).join('')}</div></div>`).join('')}</div><div class="floor-footer"><span>${esc(x.floorVerifiedAt||'노션 자료')}</span>${x.officialFloorUrl?`<a href="${esc(x.officialFloorUrl)}" target="_blank" rel="noopener noreferrer">공식 층별 안내 ↗</a>`:''}</div></div></details>`:'';
  return `<article class="shop-card"><div class="shop-area">${esc(x.area||'쇼핑')} / SHOPPING</div><h3>${esc(x.name)}</h3><p>${esc(x.description||'')}</p><div class="shop-info"><div><b>위치</b><span>${esc(x.address||'지도에서 확인')}</span></div><div><b>영업</b><span>${esc(x.hours||'공식 안내 확인')}</span></div></div>${directory}<div class="shop-footer"><span class="card-price">방문 전 영업시간 재확인</span>${link(mapUrl(x))}</div></article>`;
 }).join(''):'<div class="empty">일치하는 쇼핑몰 또는 매장이 없습니다.</div>';
}
function renderGuide(d){$('#guideCards').innerHTML=d.guide.map(x=>`<article class="guide-card"><span class="guide-tag">${esc(x.category||'여행 정보')}</span><h3>${esc(x.title)}</h3><p>${esc(x.description||'')}</p>${x.url?link(x.url,'공식 링크 열기 ↗'):''}</article>`).join('');}
let volatileChecks={};
function checkedItems(){try{return {...volatileChecks,...JSON.parse(localStorage.getItem('kyushu-checks-v1')||'{}')}}catch{return {...volatileChecks}}}
function updateChecklistProgress(d){const saved=checkedItems();const items=d.checklist;const complete=items.filter(x=>saved[x.id]).length;$('#checkProgressText').textContent=`${complete} / ${items.length} 완료`;$('#checkProgressBar').style.width=`${items.length?complete/items.length*100:0}%`;}
function renderChecklist(d){const saved=checkedItems();const items=d.checklist;updateChecklistProgress(d);$('#checkItems').innerHTML=items.map(x=>`<label class="check-item"><input type="checkbox" data-check-id="${esc(x.id)}" ${saved[x.id]?'checked':''}><span>${esc(x.label)}</span></label>`).join('');}
function attachEvents(){
 $('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showPanel(b.dataset.tab);});
 document.body.addEventListener('click',e=>{
  const j=e.target.closest('[data-jump]');if(j)showPanel(j.dataset.jump);
  const go=e.target.closest('[data-go-day]');if(go){state.day=Number(go.dataset.goDay);renderSchedule(state.data);showPanel('schedule');}
  const ds=e.target.closest('[data-select-day]');if(ds){state.day=Number(ds.dataset.selectDay);renderSchedule(state.data);}
  const f=e.target.closest('[data-food-area]');if(f){state.foodArea=f.dataset.foodArea;state.foodLimit=18;renderFood();}
  const s=e.target.closest('[data-shop-area]');if(s){state.shopArea=s.dataset.shopArea;renderShopping();}
 });
 $('#foodSearch').addEventListener('input',e=>{state.foodSearch=e.target.value;state.foodLimit=18;renderFood();});
 $('#foodMore').addEventListener('click',()=>{state.foodLimit+=18;renderFood();});
 $('#shopSearch').addEventListener('input',e=>{state.shopSearch=e.target.value;renderShopping();});
 $('#checkItems').addEventListener('change',e=>{const id=e.target.dataset.checkId;if(!id)return;const saved=checkedItems();saved[id]=e.target.checked;volatileChecks[id]=e.target.checked;try{localStorage.setItem('kyushu-checks-v1',JSON.stringify(saved))}catch{notice('이 브라우저에서는 체크 저장이 제한됩니다.')}updateChecklistProgress(state.data);});
 $('#resetChecklist').addEventListener('click',()=>{volatileChecks={};try{localStorage.removeItem('kyushu-checks-v1')}catch{}renderChecklist(state.data);notice('준비물 체크가 초기화되었습니다.');});
 window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(id&&id!==state.tab)showPanel(id);});
}
async function init(){
 attachEvents();
 try {
  const r=await fetch('data/trip.json',{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const data=await r.json();if(!Array.isArray(data.days)||!data.meta)throw new Error('데이터 형식 오류');
  state.data={restaurants:[],shopping:[],places:[],flights:[],stays:[],transport:[],guide:[],checklist:[],...data};
  const synced=data.meta.syncStatus==='synced';
  $('#syncBadge').textContent=synced?'● 노션 자동 동기화':'● 노션 초기 자료';
  $('#lastSynced').textContent=`데이터 기준: ${data.meta.updatedAt||'정보 없음'} ${synced?'· 노션 동기화':'· 초기 데이터'}`;
  renderOverview(state.data);renderSchedule(state.data);renderTravel(state.data);renderPlaces(state.data);renderFood();renderShopping();renderGuide(state.data);renderChecklist(state.data);
  const hash=location.hash.slice(1);if(hash&&document.getElementById(hash))showPanel(hash);
 } catch(error){ console.error(error);$('#syncBadge').textContent='데이터 불러오기 실패';$('#overviewDays').innerHTML='<div class="empty">여행 데이터를 불러오지 못했습니다. 개발 환경에서 npm run dev를 실행하세요.</div>';notice('데이터 파일을 확인해 주세요.'); }
}
document.addEventListener('DOMContentLoaded',init);

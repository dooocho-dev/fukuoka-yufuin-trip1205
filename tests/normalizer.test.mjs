import test from 'node:test';
import assert from 'node:assert/strict';
import {safePublicText,coordsFromGoogleUrl,collectPublicEntries,buildDataset,tableSchedules} from '../scripts/notion-normalize.mjs';
const rt=text=>[{plain_text:text}];
const heading=(type,text)=>({type,[type]:{rich_text:rt(text)}});
const toggle=(name,children=[])=>({type:'toggle',toggle:{rich_text:rt(name)},children});
const row=(cells)=>({type:'table_row',table_row:{cells:cells.map(rt)}});
const table=(rows)=>({type:'table',table:{},children:rows.map(row)});
test('personal fields are not copied to public site',()=>{
 assert.equal(safePublicText('예약번호: 188922032'),'');
 assert.equal(safePublicText('예약자: 홍길동'),'');
 assert.equal(safePublicText('여권 사본'),'');
 assert.equal(safePublicText('갓포사토'),'갓포사토');
});
test('coordinates use POI point instead of map viewport',()=>{
 assert.deepEqual(coordsFromGoogleUrl('https://www.google.com/maps/place/abc/@34.1,130.3,13z/data=!3d33.5924112!4d130.3964023'),[33.5924112,130.3964023]);
 assert.equal(coordsFromGoogleUrl('https://www.google.com/maps/@34.1,130.3,13z'),null);
 assert.equal(coordsFromGoogleUrl('https://notion.so/private'),null);
});
test('extract venue titles from Notion-style nested blocks',()=>{
 const t=[heading('heading_1','04 · 🍜 맛집 356곳'),heading('heading_2','유후인 식당·카페'),toggle('라멘·츠케멘 (20곳)',[toggle('이치란 라멘')]),toggle('예약번호: 123456789'),heading('heading_1','05 · 🛍️ 쇼핑'),toggle('후쿠오카 파르코',[table([['주소','2 Chome-11-1 Tenjin, Fukuoka'],['영업시간','10:00~20:30']])])];
 const result=collectPublicEntries(t);
 assert.equal(result.restaurants.length,1);
 assert.equal(result.restaurants[0].name,'이치란 라멘');
 assert.equal(result.restaurants[0].area,'유후인');
 assert.equal(result.shopping[0].name,'후쿠오카 파르코');
 assert.match(result.shopping[0].address,/Tenjin/);
});
test('time table parser requires detailed schedule, redacts booking note',()=>{
 const rows=[['1일차','강릉역 KTX','06:16 출 ~ 08:31 도착 / 예약완료'],['','인천공항 출발','13:10 출발'],['','슈호칸 호텔','체크인'],['','와사쿠 저녁','20:00 예약 완료'],['2일차','긴린코 호수','오전 산책'],['','유후인 갓포사토','점심'],['','고속버스','14:00 출발'],['','니시테츠 호텔','체크인']];
 const data=tableSchedules([table(rows)]);
 assert.equal(data[1][0].time,'06:16');
 assert.equal(data[1][0].status,'예약완료');
 assert.ok(data[2].length>=4);
});
test('dataset fallback retains curated seed when no schedule extracted',()=>{
 const seed={meta:{},days:[{items:[{title:'seed'}]},{items:[]},{items:[]}],restaurants:[],shopping:[],places:[]};
 const value=buildDataset(seed,{restaurants:[{name:'참고 식당'}],shopping:[],places:[],scheduleTables:[]},'2026-11-20');
 assert.equal(value.days[0].items[0].title,'seed');assert.equal(value.meta.syncStatus,'synced');
});

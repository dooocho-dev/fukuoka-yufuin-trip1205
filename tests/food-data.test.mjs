import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectPublicEntries} from '../scripts/notion-normalize.mjs';
const data=JSON.parse(readFileSync(new URL('../data/trip.json',import.meta.url),'utf8'));
const rt=s=>[{plain_text:s}];
test('public food catalog has all 356 Notion venues and a Korean reading for each',()=>{
 const venues=data.restaurants.filter(x=>x.id.startsWith('notion-food-'));
 assert.equal(venues.length,356);
 assert.equal(new Set(venues.map(x=>x.id)).size,356);
 assert.ok(venues.every(x=>x.koreanReading));
 assert.ok(venues.filter(x=>x.japaneseName).length>=320);
 assert.deepEqual([...new Set(venues.map(x=>x.area))].sort(),['유후인','캐널시티·나카스','텐진','하카타'].sort());
});
test('photos are only labelled as available when Notion supplied a URL',()=>{
 const venues=data.restaurants.filter(x=>x.id.startsWith('notion-food-'));
 const illustrated=venues.filter(x=>x.menuImages?.length);
 assert.ok(illustrated.length>=135);
 for(const x of illustrated)for(const image of x.menuImages){
  assert.match(image.url,/^https:\/\//);
  assert.ok(!/\s/.test(image.url));
 }
});
test('auto-sync extracts Korean reading instead of Japanese name plus rating',()=>{
 const heading={type:'heading_1',heading_1:{rich_text:rt('04 · 🍜 맛집')}};
 const food={type:'toggle',toggle:{rich_text:rt('菊すけ (키쿠스케) · ⭐ 3.60')},children:[]};
 const out=collectPublicEntries([heading,food]);
 assert.equal(out.restaurants[0].name,'키쿠스케');
});

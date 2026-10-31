import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV,normalize} from './lib.mjs';
import './model.js';
const M=globalThis.EbolaModel;
const data=JSON.parse(readFileSync(new URL('./data/snapshot.json',import.meta.url),'utf8'));
test('CSV : guillemets, virgules, retours et cellules vides',()=>{
 const csv='location_level,reference_date,value,name\r\n0,2026-01-01,4,"A, B"\r\n3,2026-01-02,,"Une ""citation""\nretour"\r\n';
 const rows=parseCSV(csv);assert.equal(rows.length,2);assert.equal(rows[0].name,'A, B');assert.equal(rows[1].name,'Une "citation"\nretour');assert.equal(rows[1].value,'');
});
test('National : aucun double comptage des niveaux géographiques',()=>{
 const national=M.scope(data,'confirmed','COD');assert.ok(national.every(r=>r.level===0));
 const result=M.summary(national,'2026-10-29');assert.equal(result.cases.value,10351);assert.equal(result.deaths.value,5026);assert.equal(result.cases.date,result.deaths.date);
 assert.ok(Math.abs(result.fatality-48.5556)<.001);
});
test('Filtrage historique : ne pas prendre une observation future',()=>{
 const result=M.summary(M.scope(data,'confirmed','COD'),'2026-10-25');assert.equal(result.cases.value,10060);assert.equal(result.deaths.value,4887);
});
test('Dates différentes, zéro et données absentes',()=>{
 const rows=[{measure:'cases',date:'2026-01-01',value:5},{measure:'deaths',date:'2026-01-02',value:1}];
 assert.equal(M.summary(rows,'2026-01-02').fatality,null);assert.equal(M.summary([],'2026-01-02').cases,null);
 assert.equal(M.summary([{measure:'cases',date:'2026-01-01',value:0},{measure:'deaths',date:'2026-01-01',value:0}],'2026-01-01').fatality,null);
 assert.equal(M.number(0),'0');assert.equal(M.number(null),'—');
});
test('Zones : classification et périmètre conservés',()=>{
 const zones=M.zones(data,'confirmed','2026-10-29');assert.ok(zones.length>10);assert.ok(zones.every(r=>r.code&&r.code!=='COD'&&r.name!=='NA'));assert.equal(new Set(zones.map(r=>r.code)).size,zones.length);
 const zone=zones[0];assert.ok(M.scope(data,'suspected',zone.code).every(r=>r.level===3&&r.classification==='suspected'&&r.code===zone.code));
});
test('CSV : les données manquantes restent vides, le zéro est conservé',()=>{
 const csv=M.csv([{date:'2026-01-01',value:null,name:'A "B"'},{date:'2026-01-02',value:0}]);
 assert.match(csv,/A ""B""/);assert.match(csv,/"0"/);assert.ok(!csv.includes('null'));
});
test('Normalisation : doublons refusés et valeurs manquantes préservées',()=>{
 const header='location_level,location_code,location_name,reference_date,measure,case_classification,time_period,value';
 const row='0,COD,RDC,2026-01-01,cases,confirmed,cumulative,';
 const result=normalize(header+'\n'+row,{title:'Test'});assert.equal(result.records[0].value,null);
 assert.throws(()=>normalize(header+'\n'+row+'\n'+row,{}),/Doublon/);
});

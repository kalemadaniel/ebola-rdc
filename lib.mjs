export const DATASET = 'republique-democratique-du-congo-cas-et-deces-d-ebola';
export const SOURCE = `https://data.humdata.org/dataset/${DATASET}`;
export function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"' && text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('CSV incomplet');
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
  const headers=rows.shift();
  if(!headers?.includes('location_level')||!headers.includes('reference_date')||!headers.includes('value'))throw Error('Colonnes HDX non reconnues');
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
export function normalize(csv, meta, fetchedAt=new Date().toISOString()) {
  const raw=parseCSV(csv), seen=new Set();
  const records=raw.filter(r=>['0','3'].includes(r.location_level)&&['cases','deaths'].includes(r.measure)&&r.time_period==='cumulative'&&['confirmed','probable','suspected'].includes(r.case_classification)).map(r=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.reference_date))throw Error('Date non reconnue');
    const value=r.value.trim()===''?null:Number(r.value);
    if(value!==null&&(!Number.isFinite(value)||value<0))throw Error('Valeur invalide');
    const result={date:r.reference_date,level:Number(r.location_level),code:r.location_code,name:r.location_name,measure:r.measure,classification:r.case_classification,value,flag:r.data_quality_flag,notes:r.notes};
    const key=[result.date,result.level,result.code,result.measure,result.classification].join('|');
    if(seen.has(key))throw Error('Doublon : '+key);
    seen.add(key);return result;
  });
  if(!records.some(r=>r.level===0&&r.classification==='confirmed'&&r.measure==='cases'))throw Error('Aucun total national confirmé');
  records.sort((a,b)=>a.date.localeCompare(b.date));
  const result=meta.result??meta;
  return {title:result.title,source:SOURCE,producer:'INRB-UMIE · INSP / rapports de situation',fetchedAt,sourceUpdated:result.metadata_modified,resourceUpdated:result.resources?.[0]?.last_modified,resourceUrl:result.resources?.[0]?.url,coverageStart:records[0].date,coverageEnd:records.at(-1).date,records};
}
export async function download(){
  const response=await fetch(`https://data.humdata.org/api/3/action/package_show?id=${DATASET}`,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('HDX : HTTP '+response.status);
  const meta=await response.json();
  if(!meta.success)throw Error('HDX indisponible');
  const resource=meta.result.resources.find(r=>r.format?.toLowerCase()==='csv');
  if(!resource)throw Error('Ressource CSV absente');
  const url=new URL(resource.url);
  if(url.protocol!=='https:'||url.hostname!=='data.humdata.org')throw Error('URL de ressource inattendue');
  const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!res.ok)throw Error('CSV : HTTP '+res.status);
  const csv=await res.text();
  return {data:normalize(csv,meta),csv};
}

(function(root){
  const n=new Intl.NumberFormat('fr-FR');
  function latest(records,measure,cutoff){return records.filter(r=>r.measure===measure&&r.date<=cutoff&&r.value!==null).sort((a,b)=>b.date.localeCompare(a.date))[0]??null;}
  function scope(data,classification,zone){return data.records.filter(r=>r.classification===classification&&(zone==='COD'?r.level===0:r.level===3&&r.code===zone));}
  function summary(records,cutoff){
    const cases=latest(records,'cases',cutoff),deaths=latest(records,'deaths',cutoff);
    const sameDate=cases&&deaths&&cases.date===deaths.date&&cases.value>0;
    return {cases,deaths,fatality:sameDate?deaths.value/cases.value*100:null};
  }
  function zones(data,classification,cutoff){
    const groups=new Map();
    data.records.filter(r=>r.level===3&&r.code&&r.name!=='NA'&&r.classification===classification&&r.date<=cutoff).forEach(r=>{if(!groups.has(r.code))groups.set(r.code,[]);groups.get(r.code).push(r);});
    return [...groups].map(([code,rows])=>({code,name:rows[0].name,...summary(rows,cutoff)}));
  }
  function csv(records){
    const columns=['date','level','code','name','measure','classification','value','flag','notes'];
    const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    return '\uFEFF'+columns.join(',')+'\r\n'+records.map(r=>columns.map(k=>escape(r[k])).join(',')).join('\r\n');
  }
  root.EbolaModel={latest,scope,summary,zones,csv,number:v=>v===null||v===undefined?'—':n.format(v)};
})(globalThis);

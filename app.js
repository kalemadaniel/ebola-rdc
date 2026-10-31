(()=>{
'use strict';
const M=globalThis.EbolaModel,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=(v,short=false)=>v?new Intl.DateTimeFormat('fr-FR',short?{day:'numeric',month:'short',timeZone:'UTC'}:{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(v.length===10?v+'T12:00:00Z':v)):'Date indisponible';
const fmt=M.number;let data=globalThis.EBOLA_SNAPSHOT,state={classification:'confirmed',zone:'COD',start:'',end:'',search:'',sort:'cases',descending:true,page:1};
const PAGE=10;
function message(text){$('notice').textContent=text;$('notice').hidden=!text;}
function setup(initial=false){
  if(!data?.records?.length){message('Aucune donnée disponible. Vérifiez la présence du fichier data.js.');return false;}
  const selected=state.zone;
  const zones=[...new Map(data.records.filter(r=>r.level===3&&r.code&&r.name!=='NA').map(r=>[r.code,r.name])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'fr'));
  $('zone').innerHTML='<option value="COD">Ensemble de la RDC · national</option>'+zones.map(([code,name])=>'<option value="'+esc(code)+'">'+esc(name)+'</option>').join('');
  $('zone').value=zones.some(([code])=>code===selected)?selected:'COD';state.zone=$('zone').value;
  if(initial){state.start=data.coverageStart;state.end=data.coverageEnd;}
  for(const id of ['start','end']){$(id).min=data.coverageStart;$(id).max=data.coverageEnd;$(id).value=state[id];}
  $('coverage').textContent='Données arrêtées au '+formatDate(data.coverageEnd);
  $('synced').textContent='Copie récupérée le '+formatDate(data.fetchedAt);
  $('source-updated').textContent='Ressource mise à jour le '+formatDate(data.resourceUpdated??data.sourceUpdated)+'. Période couverte : du '+formatDate(data.coverageStart)+' au '+formatDate(data.coverageEnd)+'.';
  return true;
}
function readFilters(){
  const start=$('start').value,end=$('end').value;
  const valid=start&&end&&start<=end&&start>=data.coverageStart&&end<=data.coverageEnd;
  $('filter-error').hidden=!!valid;
  $('filter-error').textContent=valid?'':'Choisissez une date de début et une date de fin dans la période couverte, avec le début avant la fin.';
  $('export').disabled=!valid;
  if(!valid)return false;
  Object.assign(state,{start,end,classification:$('classification').value,zone:$('zone').value,page:1});return true;
}
function selectedRows(){return M.scope(data,state.classification,state.zone);}
function regionRows(){let rows=M.zones(data,state.classification,state.end);if(state.zone!=='COD')rows=rows.filter(r=>r.code===state.zone);return rows;}
function render(){
  const rows=selectedRows(),summary=M.summary(rows,state.end),classLabel=state.classification==='confirmed'?'confirmés':'suspects';
  document.querySelectorAll('.metric-class').forEach(el=>el.textContent=classLabel);
  $('scope-label').textContent=state.zone==='COD'?'Totaux nationaux publiés':$('zone').selectedOptions[0].textContent+' · zone de santé';
  for(const measure of ['cases','deaths']){
    const point=summary[measure];$(measure+'-value').textContent=fmt(point?.value);
    $(measure+'-date').textContent=point?'Relevé du '+formatDate(point.date):'Aucun relevé disponible';
  }
  $('fatality-value').textContent=summary.fatality===null?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,minimumFractionDigits:1}).format(summary.fatality)+' %';
  $('fatality-note').textContent=summary.fatality===null?'Cas et décès à une même date requis':'Décès / cas · '+formatDate(summary.cases.date);
  const zones=regionRows();$('zones-value').textContent=fmt(zones.filter(r=>r.cases?.value>0).length);
  let note='Indicateurs : derniers cumuls disponibles au plus tard le '+formatDate(state.end)+'. Le début de période filtre le graphique et l’export.';
  if([summary.cases,summary.deaths].some(r=>r&&r.date<state.start))note+=' Un relevé affiché est antérieur au début de la période sélectionnée.';
  if(state.classification==='suspected')note+=' Les cas suspects ne sont pas des cas confirmés.';
  $('reading-note').textContent=note;
  renderChart(rows.filter(r=>r.date>=state.start&&r.date<=state.end));renderRanking(zones);renderTable();
}
function renderChart(rows){
  $('chart-period').textContent=formatDate(state.start,true)+' — '+formatDate(state.end,true);
  $('chart-tooltip').hidden=true;
  rows=rows.filter(r=>r.value!==null);
  if(!rows.length){$('chart').innerHTML='<div class="chart-empty">Aucun relevé dans cette période et ce périmètre.</div>';return;}
  const W=720,H=275,L=55,R=18,T=18,B=38,width=W-L-R,height=H-T-B;
  const min=new Date(state.start+'T12:00:00Z').getTime(),max=new Date(state.end+'T12:00:00Z').getTime();
  const maximum=Math.max(1,...rows.map(r=>r.value));
  const base=Math.pow(10,Math.floor(Math.log10(maximum)));const ceiling=Math.ceil(maximum/base)*base;
  const x=date=>L+(max===min?.5:(new Date(date+'T12:00:00Z').getTime()-min)/(max-min))*width,y=v=>T+height-v/ceiling*height;
  let grid='';for(let i=0;i<=4;i++){const value=ceiling*i/4,yy=y(value);grid+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="#edf0f4" stroke-dasharray="3 5"/><text x="'+(L-12)+'" y="'+(yy+3)+'" text-anchor="end" fill="#9aa5b2" font-size="10">'+fmt(Math.round(value))+'</text>';}
  const tickCount=max===min?1:5;
  for(let i=0;i<tickCount;i++){const ratio=tickCount===1?.5:i/(tickCount-1),date=new Date(min+(max-min)*ratio).toISOString().slice(0,10);grid+='<text x="'+(L+width*ratio)+'" y="'+(H-12)+'" text-anchor="middle" fill="#99a4b1" font-size="10">'+esc(formatDate(date,true))+'</text>';}
  let lines='';for(const [measure,color]of [['cases','#326bce'],['deaths','#a44760']]){
    const series=rows.filter(r=>r.measure===measure).sort((a,b)=>a.date.localeCompare(b.date));
    if(!series.length)continue;
    const points=series.map(r=>x(r.date)+','+y(r.value)).join(' ');
    if(measure==='cases'&&series.length>1)lines+='<polygon points="'+x(series[0].date)+','+y(0)+' '+points+' '+x(series.at(-1).date)+','+y(0)+'" fill="url(#area)"/>';
    lines+='<polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linejoin="round"/>';
    for(const r of series){const label=formatDate(r.date)+' · '+(measure==='cases'?'Cas':'Décès')+' '+state.classification.replace('confirmed','confirmés').replace('suspected','suspects')+' : '+fmt(r.value);lines+='<circle class="chart-point" cx="'+x(r.date)+'" cy="'+y(r.value)+'" r="3" fill="'+color+'" stroke="white" stroke-width="1" tabindex="0" role="img" aria-label="'+esc(label)+'" data-label="'+esc(label)+'"><title>'+esc(label)+'</title></circle>';}
  }
  $('chart').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="chart-title chart-description"><title id="chart-title">Cumuls de cas et décès</title><desc id="chart-description">Observations publiées du '+esc(formatDate(state.start))+' au '+esc(formatDate(state.end))+'. Les données détaillées sont téléchargeables avec le bouton Exporter.</desc><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#407ed6" stop-opacity=".13"/><stop offset="100%" stop-color="#407ed6" stop-opacity=".01"/></linearGradient></defs>'+grid+lines+'</svg>';
  $('chart').querySelectorAll('.chart-point').forEach(point=>{
    const show=()=>{$('chart-tooltip').textContent=point.dataset.label;$('chart-tooltip').hidden=false;};
    point.addEventListener('pointerenter',show);point.addEventListener('focus',show);point.addEventListener('pointerleave',()=>{$('chart-tooltip').hidden=true;});point.addEventListener('blur',()=>{$('chart-tooltip').hidden=true;});
  });
}
function renderRanking(rows){
  const top=rows.filter(r=>r.cases?.value>0).sort((a,b)=>b.cases.value-a.cases.value).slice(0,5),max=top[0]?.cases.value??1;
  $('ranking').innerHTML=top.length?top.map((r,i)=>'<div class="rank-row"><div class="rank-label"><span class="rank-no">0'+(i+1)+'</span><span>'+esc(r.name)+'</span><strong>'+fmt(r.cases.value)+'</strong></div><div class="rank-bar"><span style="width:'+r.cases.value/max*100+'%"></span></div><div class="rank-date">'+esc(formatDate(r.cases.date,true))+'</div></div>').join(''):'<div class="chart-empty">Aucune zone avec des cas documentés.</div>';
}
function renderTable(){
  const all=regionRows(),search=state.search.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let rows=all.filter(r=>r.name.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(search));
  rows.sort((a,b)=>{
    if(state.sort==='name')return a.name.localeCompare(b.name,'fr')*(state.descending?-1:1);
    const aa=a[state.sort]?.value,bb=b[state.sort]?.value;
    if(aa===undefined||aa===null)return bb===undefined||bb===null?0:1;
    if(bb===undefined||bb===null)return -1;
    return (aa-bb)*(state.descending?-1:1);
  });
  const total=rows.length,pages=Math.max(1,Math.ceil(total/PAGE));state.page=Math.min(state.page,pages);
  const start=(state.page-1)*PAGE;rows=rows.slice(start,start+PAGE);
  $('zone-count').textContent=all.length;
  $('table-body').innerHTML=rows.length?rows.map(r=>{
    const flags=[r.cases,r.deaths].filter(Boolean).filter(p=>p.flag),manual=flags.some(p=>p.flag==='manual');
    const notes=flags.map(p=>(p.measure==='cases'?'Cas':'Décès')+' : '+p.flag+(p.notes?' · '+p.notes:'')).join(' / ');
    return '<tr><td>'+esc(r.name)+'</td><td class="number">'+fmt(r.cases?.value)+'</td><td class="date">'+(r.cases?esc(formatDate(r.cases.date,true)):'—')+'</td><td class="number death-number">'+fmt(r.deaths?.value)+'</td><td class="date">'+(r.deaths?esc(formatDate(r.deaths.date,true)):'—')+'</td><td><span class="quality '+(manual?'manual':'')+'" title="'+esc(notes||'Aucun signalement qualité dans la source pour ces relevés')+'">'+(manual?'Saisie manuelle':flags.length?'Signalement source':'Non signalé')+'</span></td></tr>';
  }).join(''):'<tr><td colspan="6" class="empty-cell">Aucune zone ne correspond à votre recherche ou à ces filtres.</td></tr>';
  $('table-info').textContent=total?`${start+1}–${Math.min(start+PAGE,total)} sur ${total} zones`:'0 zone';
  $('page-number').textContent=state.page+' / '+pages;$('prev').disabled=state.page<=1;$('next').disabled=state.page>=pages;
  document.querySelectorAll('[data-sort]').forEach(button=>button.parentElement.setAttribute('aria-sort',state.sort===button.dataset.sort?(state.descending?'descending':'ascending'):'none'));
}
for(const id of ['classification','zone','start','end'])$(id).addEventListener('change',()=>{if(readFilters())render();});
$('reset').addEventListener('click',()=>{
  $('classification').value='confirmed';$('zone').value='COD';$('start').value=data.coverageStart;$('end').value=data.coverageEnd;$('search').value='';state.search='';if(readFilters())render();
});
$('search').addEventListener('input',()=>{state.search=$('search').value;state.page=1;renderTable();});
document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.sort;state.descending=state.sort===key?!state.descending:key!=='name';state.sort=key;state.page=1;renderTable();}));
$('prev').addEventListener('click',()=>{state.page--;renderTable();});$('next').addEventListener('click',()=>{state.page++;renderTable();});
$('export').addEventListener('click',()=>{
  const rows=selectedRows().filter(r=>r.date>=state.start&&r.date<=state.end);
  if(!rows.length){message('Aucune observation à exporter pour ces filtres.');return;}
  const url=URL.createObjectURL(new Blob([M.csv(rows)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`ebola-rdc-${state.zone}-${state.classification}-${state.start}-${state.end}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
async function load(force=false){
  if(location.protocol==='file:'){message('Copie locale des données HDX. Pour actualiser depuis la source, lancez « Demarrer.cmd », puis ouvrez http://127.0.0.1:4173.');return;}
  $('refresh').disabled=true;$('refresh').textContent='↻ Vérification…';
  try{
    const response=await fetch(force?'/api/refresh':'/api/data',{method:force?'POST':'GET',signal:AbortSignal.timeout(65000),cache:'no-store'});
    if(!response.ok)throw Error('Connexion indisponible');
    const next=await response.json();if(!next.records?.length)throw Error('Données indisponibles');
    const wasEnd=state.end===data.coverageEnd;data=next;if(wasEnd)state.end=data.coverageEnd;setup();render();
    message(next.refreshError?'La source HDX est temporairement inaccessible. La dernière copie valide est conservée (récupérée le '+formatDate(data.fetchedAt)+').':'');
  }catch(e){message('Actualisation indisponible. La copie HDX récupérée le '+formatDate(data.fetchedAt)+' reste affichée.');}
  finally{$('refresh').disabled=false;$('refresh').textContent='↻ Actualiser';}
}
$('refresh').addEventListener('click',()=>load(true));
document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a===link));}));
if(setup(true)){render();load();}
})();

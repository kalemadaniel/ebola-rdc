import http from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {download} from './lib.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
let snapshot=JSON.parse(await readFile(path.join(root,'data/snapshot.json'),'utf8'));
let inFlight=null,lastAttempt=0,lastError=null;
async function refresh(force=false){
  if(inFlight)return inFlight;
  if(!force && Date.now()-new Date(snapshot.fetchedAt).getTime()<86400000)return;
  if(Date.now()-lastAttempt<60000)return;
  lastAttempt=Date.now();
  inFlight=(async()=>{
    try{
      const {data,csv}=await download();
      const json=JSON.stringify(data);
      await mkdir(path.join(root,'data'),{recursive:true});
      await writeFile(path.join(root,'data/snapshot.json.tmp'),json);
      await rename(path.join(root,'data/snapshot.json.tmp'),path.join(root,'data/snapshot.json'));
      await writeFile(path.join(root,'data.js'),'window.EBOLA_SNAPSHOT='+json+';');
      await writeFile(path.join(root,'data/source.csv'),csv);
      snapshot=data;lastError=null;
    }catch(error){lastError=error.message;console.error('HDX :',error.message);}
    finally{inFlight=null;}
  })();
  return inFlight;
}
const assets={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/model.js':['model.js','text/javascript; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/data.js':['data.js','text/javascript; charset=utf-8'],'/data/source.csv':['data/source.csv','text/csv; charset=utf-8']};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/api/data' && req.method==='GET'){
      await refresh();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({...snapshot,refreshError:lastError}));
    }
    if(pathname==='/api/refresh' && req.method==='POST'){
      await refresh(true);res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({...snapshot,refreshError:lastError}));
    }
    if(req.method!=='GET'||!assets[pathname]){res.writeHead(404);return res.end('Page introuvable');}
    const [file,mime]=assets[pathname];res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(await readFile(path.join(root,file)));
  }catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500);res.end('Erreur de lecture');}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Ebola RDC : http://127.0.0.1:'+(process.env.PORT||4173)));
const interval=setInterval(()=>refresh(),86400000);interval.unref();

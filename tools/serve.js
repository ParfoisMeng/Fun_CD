'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.glb':'model/gltf-binary','.jsonl':'application/x-ndjson; charset=utf-8'};
const importMap=fs.readFileSync(path.join(root,'replay/index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
const mapHash=crypto.createHash('sha256').update(importMap).digest('base64');
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(e){res.writeHead(400);return res.end();}
  if(pathname==='/')pathname='/replay/index.html';
  const file=path.resolve(root,'.'+pathname),relative=path.relative(root,file).replace(/\\/g,'/');
  if(req.method!=='GET'||!(/^(replay\/|miniprogram\/core\/|node_modules\/three\/(build\/|examples\/jsm\/))/.test(relative))||relative.includes('..')||!types[path.extname(file)]){res.writeHead(404);return res.end('Not found');}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-"+mapHash+"'; connect-src 'self' blob:; img-src 'self' data: blob:"});res.end(data);});
});
server.on('error',e=>{console.error('无法启动回放工作台：'+e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('回放工作台：http://127.0.0.1:'+port));

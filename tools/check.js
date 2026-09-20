'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');let count=0;
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  if(ent.name.startsWith('.')||ent.name==='node_modules')continue;
  const file=path.join(dir,ent.name);
  if(ent.isDirectory())walk(file);
  else if(/\.m?js$/.test(file)){cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});count++;}
  else if(file.endsWith('.json')){JSON.parse(fs.readFileSync(file,'utf8'));count++;}
}}
walk(root);console.log(count+' 个 JavaScript / JSON 文件语法检查通过。');

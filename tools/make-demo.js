'use strict';
const fs=require('node:fs'),path=require('node:path');
const Core=require('../miniprogram/core/engine');
function demo(){
  const engine=new Core.Engine(),rows=[{type:'meta',schema:1,engineVersion:Core.VERSION,params:engine.params,
    startedAt:'2026-09-17T08:00:00.000Z',device:{model:'合成演示数据（非 iPhone 实测）'},units:{t:'ms',accel:'g',gyro:'rad/s',speed:'m/s'}}];
  const push=e=>{rows.push(e);const s=engine.push(e);
    if(['tick','pause','resume','calibration-start','end','sensor-error'].includes(e.type))rows.push({type:'state',t:e.t,data:s});};
  push({type:'resume',t:0});push({type:'calibration-start',t:0});
  for(let t=0;t<=42000;t+=100){
    if(t===27000)push({type:'pause',t});
    if(t===30000){push({type:'resume',t});push({type:'calibration-start',t});}
    const hidden=t>=27000&&t<30000;
    if(hidden)continue;
    const moving=(t>=5000&&t<16000)||(t>=33000&&t<38000);
    push({type:'accel',t,data:{x:moving?Math.sin(t/170)*0.1:0.003,y:0,z:1}});
    push({type:'gyro',t,data:{x:0,y:0,z:moving?0.03:0}});
    if(t%1000===0&&!(t>=21000&&t<26000))push({type:'location',t,data:{speed:moving?4.5:0.1,accuracy:12,latitude:0,longitude:0}});
    push({type:'tick',t});
  }
  push({type:'end',t:42000});return rows.map(r=>JSON.stringify(r)).join('\n')+'\n';
}
if(require.main===module){fs.writeFileSync(path.join(__dirname,'../replay/demo.jsonl'),demo());console.log('演示记录已生成（42 秒，含起停、断流、暂停、重新校准）。');}
module.exports={demo};

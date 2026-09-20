(function(root,factory) {
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./engine'));
  else root.RideLog=factory(root.RideEngine);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core) {
  'use strict';
  const TYPES=new Set(['accel','gyro','location','tick','calibration-start','pause','resume','sensor-error','end']);
  function parse(text) {
    if(text.length>50*1024*1024) throw new Error('文件超过 50 MB，请分段记录');
    const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
    let meta=null,last=-1;const events=[],states=[],warnings=[];
    lines.forEach((line,i)=> {
      if(!line.trim()) return;
      let r;try{r=JSON.parse(line);}catch(err){
        if(i===lines.length-1 && meta) { warnings.push('最后一行不完整，已忽略；记录可能意外中断。');return; }
        throw new Error('第 '+(i+1)+' 行不是合法 JSON');
      }
      if(!r || typeof r!=='object') throw new Error('第 '+(i+1)+' 行结构错误');
      if(r.type==='meta') {
        if(meta || i!==0 || r.schema!==1 || typeof r.engineVersion!=='string') throw new Error('不支持的日志头或版本');
        Core.config(r.params);meta=r;return;
      }
      if(!meta) throw new Error('缺少日志头');
      if(!Number.isFinite(r.t)||r.t<last||r.t<0) throw new Error('第 '+(i+1)+' 行时间顺序错误');
      last=r.t;
      if(r.type==='state') {
        if(!r.data || !['STOP','MOVE'].includes(r.data.main) || typeof r.data.status!=='string') throw new Error('状态记录格式错误');
        states.push(r);
      } else if(TYPES.has(r.type)) {
        if(['accel','gyro'].includes(r.type) && (!r.data || !['x','y','z'].every(k=>Number.isFinite(r.data[k])))) throw new Error('传感器向量格式错误');
        events.push(r);
      } else throw new Error('未知事件类型：'+r.type);
    });
    if(!meta || !events.some(e=>e.type==='tick')) throw new Error('日志没有可回放的采样');
    if(meta.engineVersion!==Core.VERSION) warnings.push('引擎版本不同；基准使用记录参数在当前引擎重算，原始判定另列。');
    return {meta,events,states,warnings,duration:events[events.length-1].t};
  }
  function simulate(log, params) {
    const engine=new Core.Engine(params||log.meta.params),frames=[];
    log.events.forEach(e=>{const s=engine.push(e);
      if(['tick','pause','resume','calibration-start','end','sensor-error'].includes(e.type))frames.push({t:e.t,...s});});
    return frames;
  }
  return { parse, simulate };
});

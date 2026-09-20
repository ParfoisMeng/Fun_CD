/* global RideEngine, RideLog, CatStage */
'use strict';
const $=id=>document.getElementById(id);
let log=null,base=[],frames=[],params={...RideEngine.DEFAULTS},position=0,playing=false,anchor=0,anchorPosition=0,loadToken=0;
let previewMode='replay';
document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{
  previewMode=button.dataset.preview;
  document.querySelectorAll('[data-preview]').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
}));
const labels={ready:'',waiting:'等待感应',paused:'已暂停',calibrating:'校准中','calibration-failed':'校准失败'};
const fmt=t=>{const s=Math.max(0,t)/1000;return String(Math.floor(s/60)).padStart(2,'0')+':'+(s%60).toFixed(1).padStart(4,'0');};
const stateLabel=s=>!s?'—':s.status==='ready'?(s.main==='MOVE'?'骑行':'停车'):labels[s.status]||s.status;
function at(rows,t){let lo=0,hi=rows.length-1,result=-1;while(lo<=hi){const m=(lo+hi)>>1;if(rows[m].t<=t){result=m;lo=m+1;}else hi=m-1;}return result<0?null:rows[result];}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function fillForm(){Object.keys(RideEngine.DEFAULTS).forEach(k=>{const el=$('params').elements.namedItem(k);if(el)el.value=params[k];});}
function pause(){playing=false;$('play').textContent='▶';}
function seek(t){position=Math.max(0,Math.min(log?log.duration:0,t));anchorPosition=position;anchor=performance.now();renderDetails();}
function recompute(){
  frames=RideLog.simulate(log,params);
  let differences=0;frames.forEach((f,i)=>{if(f.main!==base[i].main||f.status!==base[i].status)differences++;});
  $('summary').textContent='整段 '+frames.length.toLocaleString()+' 个判定点 · '+differences.toLocaleString()+' 处不同（'+(100*differences/frames.length).toFixed(1)+'%）。';
  renderDetails();
}
function load(text,name){
  const parsed=RideLog.parse(text),baseline=RideLog.simulate(parsed,parsed.meta.params);
  pause();log=parsed;base=baseline;params=RideEngine.config(log.meta.params);position=0;
  fillForm();recompute();$('seek').max=log.duration;$('duration').textContent=fmt(log.duration);
  ['play','restart','seek','apply','reset','export-params'].forEach(id=>$(id).disabled=false);
  $('source').textContent=name;
  const device=log.meta.device||{};
  notice(name+' · '+(device.model||'未知设备')+' · '+log.events.length.toLocaleString()+' 条事件。'+(log.warnings.join(' ')||'可开始回放，或调整参数复测。'));
}
$('file').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;const token=++loadToken;pause();
  try{if(f.size>50*1024*1024)throw new Error('文件超过 50 MB，请分段记录');const text=await f.text();if(token===loadToken)load(text,f.name);}
  catch(err){if(token===loadToken)notice(err.message,true);}finally{e.target.value='';}
});
$('demo').addEventListener('click',async()=>{
  const token=++loadToken;pause();
  try{const response=await fetch('/replay/demo.jsonl');if(!response.ok)throw new Error('无法读取演示文件');const text=await response.text();if(token===loadToken)load(text,'演示 · 起停 / 断流 / 重新校准');}
  catch(err){if(token===loadToken)notice(err.message,true);}
});
$('play').addEventListener('click',()=>{if(!log)return;if(playing){pause();return;}if(position>=log.duration)seek(0);anchorPosition=position;anchor=performance.now();playing=true;$('play').textContent='Ⅱ';});
$('restart').addEventListener('click',()=>{pause();seek(0);});
$('seek').addEventListener('input',e=>{pause();seek(Number(e.target.value));});
$('rate').addEventListener('change',()=>{anchorPosition=position;anchor=performance.now();});
$('timeline').addEventListener('click',e=>{if(!log)return;pause();const box=e.currentTarget.getBoundingClientRect();seek((e.clientX-box.left)/box.width*log.duration);});
$('params').addEventListener('submit',e=>{
  e.preventDefault();if(!log)return;
  try{const candidate={...params};new FormData(e.target).forEach((v,k)=>candidate[k]=Number(v));
    params=RideEngine.config(candidate);pause();recompute();notice('已按当前参数重新计算整段数据；原始记录保持不变。');
  }catch(err){notice(err.message,true);}
});
$('reset').addEventListener('click',()=>{if(!log)return;pause();params=RideEngine.config(log.meta.params);fillForm();recompute();notice('已恢复记录中的参数。');});
$('export-params').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({engineVersion:RideEngine.VERSION,params},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fun-cd-params.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function renderDetails(){
  const s=at(frames,position),b=at(base,position),r=log?at(log.states,position):null;
  $('recorded-state').textContent=stateLabel(r&&r.data);$('base-state').textContent=stateLabel(b);$('new-state').textContent=stateLabel(s);
  $('difference').textContent=!s||!b?'—':(s.main===b.main&&s.status===b.status?'一致':'有变化');
  $('speed').textContent=s&&s.speed!==null?s.speed.toFixed(2)+' m/s':'—';
  $('motion').textContent=s?s.motion.toFixed(3)+' g':'—';
  $('headline').textContent=!s?'小猫正在等你':s.status==='ready'?(s.main==='MOVE'?'一起向前走':'歇一会儿，我陪你'):stateLabel(s);
  $('caption').textContent=!s?'把手机里的那段路，放进这里。':s.status==='calibrating'?'尽量不要大幅度移动 · '+s.countdown+' 秒':s.status==='ready'?'你骑车，小猫跟上。':'收到新鲜、有效的数据后继续。';
  if(previewMode!=='replay'){$('headline').textContent=previewMode==='MOVE'?'骑行效果预览':'停车效果预览';$('caption').textContent='仅预览动作；选择“跟随回放”恢复记录驱动。';}
  $('clock').textContent=fmt(position)+' / '+fmt(log?log.duration:0);$('seek').value=position;
  $('status-dot').style.background=s&&s.status==='ready'?'#416b55':'#c7ac7c';
}
function timeline(){
  const c=$('timeline'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#f0f2e9';ctx.fillRect(0,10,c.width,32);ctx.fillRect(0,62,c.width,32);
  if(!log||!log.duration)return;
  [base,frames].forEach((rows,idx)=>{
    // Merge contiguous states: painting remains cheap even for long recordings.
    for(let i=0;i<rows.length;){const start=i,color=rows[i].status==='ready'?(rows[i].main==='MOVE'?'#416b55':'#b3c69c'):'#e3cfa8';
      while(i+1<rows.length&&rows[i+1].main===rows[start].main&&rows[i+1].status===rows[start].status)i++;
      const x=rows[start].t/log.duration*c.width,end=(i+1<rows.length?rows[i+1].t:log.duration)/log.duration*c.width;
      ctx.fillStyle=color;ctx.fillRect(x,10+idx*52,Math.max(1,end-x),32);i++;
    }
  });
  const x=position/log.duration*c.width;ctx.strokeStyle='#b4774e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();
}
let lastUI=-1,lastDraw=-1;
function animate(now){
  if(playing&&log){position=Math.min(log.duration,anchorPosition+(now-anchor)*Number($('rate').value));if(position>=log.duration)pause();}
  if(now-lastUI>100){renderDetails();timeline();lastUI=now;}
  if(now-lastDraw>32){const recorded=at(frames,position)||{main:'STOP',status:'waiting'};
    const s=previewMode==='replay'?recorded:{main:previewMode,status:'ready'};
    const t=previewMode==='replay'?position:now;
    if(window.Cat3D)window.Cat3D.draw(s,t);
    else CatStage.draw($('cat').getContext('2d'),800,880,s,t);
    lastDraw=now;}
  requestAnimationFrame(animate);
}
fillForm();requestAnimationFrame(animate);

(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CatStage = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  function draw(ctx, width, height, state, time) {
    const moving = state.status === 'ready' && state.main === 'MOVE';
    const stopped = state.status === 'ready' && state.main === 'STOP';
    const t = time / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.save(); ctx.scale(width/400, height/440);
    function ellipse(x,y,rx,ry,color) {
      ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    }
    function line(points,color,w) {
      ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
      points.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
      ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    }
    function polygon(points,color) {
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
    ellipse(206,206,174,169,'#e8edde');
    ellipse(321,71,22,22,'#f3dca5');
    line([[42,336],[360,336]],'#d1dacb',2);
    for(let i=0;i<5;i++) {
      const x=((i*100-(moving?t*80:0))%460+460)%460-30;
      line([[x,355],[x+35,355]],'#d1dacb',3);
    }
    ellipse(211,332,113,12,'#c9d5c2');
    ctx.save();ctx.translate(moving ? Math.sin(t*5)*1.5:0, moving ? Math.sin(t*9)*1.7:Math.sin(t*2)*1.2);
    // Tail, wheels, scooter frame, then rider. Same renderer on phone and desktop.
    ctx.beginPath();ctx.moveTo(160,230);ctx.bezierCurveTo(111,222,111,180,94,201+Math.sin(t*2)*5);
    ctx.strokeStyle='#df9c61';ctx.lineWidth=16;ctx.lineCap='round';ctx.stroke();
    [128,285].forEach(x=> {
      ellipse(x,306,28,28,'#33473e');ellipse(x,306,17,17,'#f6f3eb');ellipse(x,306,5,5,'#91aa95');
      const a=moving?t*9:0;
      line([[x-Math.cos(a)*14,306-Math.sin(a)*14],[x+Math.cos(a)*14,306+Math.sin(a)*14]],'#91aa95',3);
    });
    line([[128,284],[156,267],[217,289],[271,289],[282,218],[270,211]],'#2f6b59',14);
    line([[156,269],[139,245]],'#486553',9);line([[127,245],[173,245]],'#33473e',13);
    line([[282,218],[295,215]],'#33473e',8);
    ellipse(245,288,35,10,'#2f6b59');
    ellipse(175,220,32,38,'#df9c61');
    polygon([[150,201],[191,201],[203,240],[151,240]],'#f6f3eb');
    line([[190,207],[223,227],[272,215]],'#df9c61',13);
    if(stopped) {
      line([[176,242],[183,277],[182,320]],'#d78b52',15);
      line([[181,321],[198,321]],'#33473e',11);
    } else {
      line([[176,242],[208,261],[227,283]],'#d78b52',15);
      line([[226,284],[245,284]],'#33473e',11);
    }
    // STOP personality: periodically glance around, with a soft blink.
    const glance=stopped?Math.sin(t*0.8)*3:3;
    ctx.save();ctx.translate(glance,0);
    polygon([[137,156],[136,105],[163,124]],'#df9c61');
    polygon([[186,124],[214,105],[210,158]],'#df9c61');
    polygon([[143,131],[143,116],[154,130]],'#eeb5a2');
    polygon([[194,130],[207,116],[204,137]],'#eeb5a2');
    ellipse(175,158,42,38,'#e9aa71');ellipse(182,171,26,21,'#f9dfb9');
    const blink=stopped && t%5>4.7;
    if(blink) { line([[155,154],[164,154]],'#33473e',3);line([[189,154],[198,154]],'#33473e',3); }
    else { ellipse(161,153,3,5,'#33473e');ellipse(195,153,3,5,'#33473e'); }
    polygon([[174,165],[182,165],[178,170]],'#80513f');
    line([[178,170],[178,175],[173,177]],'#80513f',2);
    line([[141,168],[125,165]],'#aa754f',2);line([[141,176],[125,179]],'#aa754f',2);
    line([[207,168],[223,165]],'#aa754f',2);
    // A mint helmet makes the silhouette read as a rider.
    ctx.beginPath();ctx.arc(175,142,40,Math.PI,Math.PI*2);ctx.fillStyle='#719889';ctx.fill();
    line([[136,140],[217,140]],'#476c5a',5);
    line([[169,106],[179,106]],'#dce8d8',4);
    ctx.restore();
    if(moving) { line([[73,240],[102,240]],'#9bb49c',3);line([[58,255],[91,255]],'#9bb49c',3); }
    ctx.restore();
    ctx.fillStyle='#758675';ctx.font='12px sans-serif';ctx.textAlign='center';
    ctx.fillText(moving?'一起慢慢向前':stopped?'歇一会儿，我陪你':'小猫正在等你',200,399);
    ctx.restore();
  }
  return { draw };
});

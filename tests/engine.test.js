'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Engine,config}=require('../miniprogram/core/engine');
const Log=require('../miniprogram/core/log');
const {demo}=require('../tools/make-demo');
function rig(params){const e=new Engine(params);let t=0;
  const push=(type,data)=>e.push({type,t,data});
  function advance(ms,speed=0,options={}){let s;for(let i=0;i<ms;i+=100){t+=100;
    if(!options.noAccel)push('accel',{x:options.x||0,y:0,z:1});
    if(!options.noGPS)push('location',{speed,accuracy:options.accuracy||10});
    s=push('tick');}return s;}
  push('calibration-start');advance(2000);return {e,push,advance};
}
test('calibration averages the complete countdown, without requiring perfectly still samples',()=>{
  const e=new Engine();e.push({type:'calibration-start',t:0});
  e.push({type:'accel',t:100,data:{x:0,y:0,z:1}});e.push({type:'accel',t:1800,data:{x:.2,y:0,z:1}});
  const s=e.push({type:'tick',t:2000});assert.equal(s.baseline.accel.x,.1);assert.equal(s.baseline.samples,2);
});
test('requires acceleration samples to finish calibration',()=>{
  const e=new Engine();e.push({type:'calibration-start',t:0});assert.equal(e.push({type:'tick',t:2000}).status,'calibration-failed');
});
test('starts faster than it stops and handles normal commuting',()=>{
  const r=rig();assert.equal(r.advance(500,4).main,'STOP');assert.equal(r.advance(500,4).main,'MOVE');
  assert.equal(r.advance(1600,0).main,'MOVE');assert.equal(r.advance(1500,0).main,'STOP');
});
test('hysteresis keeps a low-speed moving ride stable',()=>{
  const r=rig();r.advance(1200,4);for(const speed of [1.1,.9,1.2,.8,1.0])assert.equal(r.advance(500,speed).main,'MOVE');
});
test('GPS outlier alone cannot immediately start a ride',()=>{
  const r=rig();r.advance(100,12);assert.equal(r.advance(1500,0).main,'STOP');
});
test('motion helps a near-threshold start but cannot invent speed while stationary',()=>{
  const r=rig();assert.equal(r.advance(3000,0,{x:.2}).main,'STOP');assert.equal(r.advance(1800,1,{x:.2}).main,'MOVE');
});
test('short GPS gap holds state; a long gap becomes neutral and clears confirmation',()=>{
  const r=rig();r.advance(1000,4);assert.equal(r.advance(1000,0,{noGPS:true}).status,'ready');
  assert.equal(r.advance(3000,0,{noGPS:true}).status,'waiting');assert.equal(r.advance(100,4).status,'ready');
});
test('missing acceleration makes the engine wait even with fresh GPS',()=>{
  const r=rig();assert.equal(r.advance(1800,4,{noAccel:true}).status,'waiting');
});
test('invalid GPS speed and poor accuracy cannot renew freshness',()=>{
  const r=rig();assert.equal(r.advance(4000,-1).status,'waiting');assert.equal(r.advance(4000,4,{accuracy:100}).status,'waiting');
});
test('pause discards cached signals and an interrupted calibration cannot complete in background',()=>{
  const r=rig();r.push('calibration-start');r.advance(500);r.push('pause');assert.equal(r.advance(3000,4,{noAccel:true,noGPS:true}).status,'paused');
  r.push('resume');assert.equal(r.advance(100,4).status,'waiting');assert.equal(r.e.baseline,null);
  r.push('calibration-start');assert.equal(r.advance(2000,0).baseline.samples,20);
});
test('recalibration replaces the averaged installation baseline',()=>{
  const r=rig();r.push('calibration-start');const s=r.advance(2000,0,{x:.5});assert.equal(s.baseline.accel.x,.5);
});
test('resume does not display the previous ride state while confirming contradictory fresh data',()=>{
  const r=rig();r.advance(1200,4);r.push('pause');r.push('resume');
  assert.equal(r.advance(200,0).status,'waiting');
  const s=r.advance(2500,0);assert.equal(s.status,'ready');assert.equal(s.main,'STOP');
});
test('replay is deterministic and exactly matches recorded states',()=>{
  const log=Log.parse(demo()),frames=Log.simulate(log);
  assert.deepEqual(frames,log.states.map(e=>({t:e.t,...e.data})));
  assert.deepEqual(Log.simulate(log),frames);
  assert(frames.some(s=>s.main==='MOVE'));assert(frames.some(s=>s.status==='waiting'));
});
test('changing parameters actually recalculates sensor events',()=>{
  const log=Log.parse(demo()),original=Log.simulate(log),changed=Log.simulate(log,{...log.meta.params,enterSpeed:8,motionThreshold:2});
  assert(original.some(s=>s.main==='MOVE'));assert(changed.every(s=>s.main==='STOP'));
});
test('replay includes lifecycle boundaries even while no periodic ticks are recorded',()=>{
  const frames=Log.simulate(Log.parse(demo()));
  assert.equal(frames.find(s=>s.t===27000).status,'paused');
  assert.equal(frames.at(-1).status,'paused');
});
test('rejects corrupt schemas and time reversal; recovers only a truncated final line',()=>{
  assert.throws(()=>Log.parse('{broken\n{}'),/JSON/);
  assert.throws(()=>Log.parse(demo().replace('"schema":1','"schema":2')),/版本/);
  assert.throws(()=>Log.parse(demo()+'{"type":"tick","t":1}\n'),/时间/);
  const recovered=Log.parse(demo()+'{"type":');assert.equal(recovered.warnings.length,1);
  assert.throws(()=>Log.parse(demo()+'{"type":"alien","t":42000}\n'),/未知/);
  assert.throws(()=>config({exitSpeed:9}),/顺序/);assert.throws(()=>config({speedAlpha:0}),/范围/);
});

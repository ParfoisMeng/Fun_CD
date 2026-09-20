'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Recorder,list}=require('../miniprogram/services/recorder');
const {Collector}=require('../miniprogram/services/collector');
function disk(){const files=new Map();let fail=false;return {files,setFail:()=>fail=true,
  writeFileSync(p,d){files.set(p,d);},appendFileSync(p,d){if(fail)throw Error('disk full');files.set(p,files.get(p)+d);},
  copyFileSync(a,b){files.set(b,files.get(a));},readdirSync(){return [...files.keys()].map(p=>p.split('/').pop());}};}
test('recorder flushes and exports a stable snapshot while recording continues',()=>{
  const fs=disk(),wx={getFileSystemManager:()=>fs,env:{USER_DATA_PATH:'/local'}};
  const r=new Recorder(wx,{},{});r.write({type:'tick',t:0});const snapshot=r.snapshot(),before=fs.files.get(snapshot);
  r.write({type:'tick',t:100});r.flush();assert.equal(fs.files.get(snapshot),before);
  assert(fs.files.get(r.path).includes('100'));assert.equal(list(wx).length,1);
});
test('disk-full errors are explicit and do not silently return an incomplete snapshot',()=>{
  const fs=disk(),wx={getFileSystemManager:()=>fs,env:{USER_DATA_PATH:'/local'}};let errors=0;
  const r=new Recorder(wx,{}, {},()=>errors++);fs.setFail();r.write({type:'tick',t:0});r.flush();
  assert.equal(errors,1);assert.throws(()=>r.snapshot(),/不完整/);assert.equal(r.buffer.length,0);
});
function sensors(){
  const calls=[],listeners={},pending=[];let defer=false;
  const wx={calls,listeners,pending,defer:()=>defer=true};
  for(const [sensor,start,stop,on,off] of [
    ['location','startLocationUpdate','stopLocationUpdate','onLocationChange','offLocationChange'],
    ['accel','startAccelerometer','stopAccelerometer','onAccelerometerChange','offAccelerometerChange'],
    ['gyro','startGyroscope','stopGyroscope','onGyroscopeChange','offGyroscopeChange']]){
    wx[start]=opts=>{calls.push(start);if(defer&&sensor==='location')pending.push(opts);else opts.success();};
    wx[stop]=()=>calls.push(stop);wx[on]=fn=>listeners[sensor]=fn;wx[off]=fn=>{if(listeners[sensor]===fn)delete listeners[sensor];};
  }return wx;
}
test('collector unsubscribes and ignores late sensor events after stop',async()=>{
  const wx=sensors(),rows=[],c=new Collector(wx,(...e)=>rows.push(e));await c.start();
  const stale=wx.listeners.accel;stale({x:1});c.stop();stale({x:2});assert.equal(rows.length,1);assert.deepEqual(wx.listeners,{});
});
test('failed mandatory sensor startup stops already started streams',async()=>{
  const wx=sensors();wx.startAccelerometer=opts=>opts.fail(Error('denied'));
  const c=new Collector(wx,()=>{});await assert.rejects(c.start(),/denied/);assert.equal(c.active,false);assert.deepEqual(wx.listeners,{});
});
test('late start completion cannot revive a hidden collector; resume is serialized',async()=>{
  const wx=sensors();wx.defer();const c=new Collector(wx,()=>{});
  const first=c.start();c.stop();const second=c.start();assert.equal(wx.pending.length,1);
  wx.pending.shift().success();await assert.rejects(first,/暂停/);
  await new Promise(r=>setImmediate(r));assert.equal(wx.pending.length,1);
  wx.pending.shift().success();await second;assert.equal(c.active,true);c.stop();
});
test('gyro failure is logged but stop/move sensing remains usable',async()=>{
  const wx=sensors(),rows=[];wx.startGyroscope=opts=>opts.fail(Error('unavailable'));
  const c=new Collector(wx,(type,data)=>rows.push({type,data}));await c.start();
  assert.equal(c.active,true);assert.equal(rows[0].data.sensor,'gyro');c.stop();
});
test('a queued resume is cancelled if the page hides again before startup completes',async()=>{
  const wx=sensors();wx.defer();const c=new Collector(wx,()=>{});
  const first=c.start();c.stop();const queued=c.start();c.stop();
  const firstCheck=assert.rejects(first,/暂停/),queuedCheck=assert.rejects(queued,/暂停/);
  wx.pending.shift().success();await Promise.all([firstCheck,queuedCheck]);
  assert.equal(c.active,false);assert.equal(wx.pending.length,0);
});

// A token prevents late start callbacks from reviving sensors after hide/unload.
class Collector {
  constructor(wxApi, emit){this.wx=wxApi;this.emit=emit;this.token=0;this.requestGeneration=0;this.active=false;this.handlers={};}
  start(){
    const generation=this.requestGeneration;
    if(this.pending) return this.pending.catch(()=>{}).then(()=>{
      if(generation!==this.requestGeneration)throw new Error('采集已暂停');
      return this.start();
    });
    this.pending=this.startOnce().finally(()=>{this.pending=null;});
    return this.pending;
  }
  async startOnce(){
    if(this.active)return;
    const w=this.wx,token=++this.token;this.active=true;
    const emit=(type,data)=>{if(this.active&&token===this.token)this.emit(type,data);};
    this.handlers.accel=d=>emit('accel',d);this.handlers.gyro=d=>emit('gyro',d);
    this.handlers.location=d=>emit('location',d);
    this.handlers.error=d=>emit('sensor-error',{sensor:'location',message:d.errMsg||'定位中断'});
    w.onAccelerometerChange(this.handlers.accel);w.onGyroscopeChange(this.handlers.gyro);
    w.onLocationChange(this.handlers.location);
    if(w.onLocationChangeError)w.onLocationChangeError(this.handlers.error);
    const start=(name,stop,opts)=>new Promise((resolve,reject)=> {
      w[name]({...opts,success:()=>{
        if(!this.active||token!==this.token){w[stop]({});reject(new Error('采集已暂停'));}else resolve();
      },fail:reject});
    });
    try {
      await start('startLocationUpdate','stopLocationUpdate',{type:'gcj02'});
      if(token!==this.token)throw new Error('采集已暂停');
      await start('startAccelerometer','stopAccelerometer',{interval:'game'});
      if(token!==this.token)throw new Error('采集已暂停');
      await start('startGyroscope','stopGyroscope',{interval:'game'}).catch(err=>{
        emit('sensor-error',{sensor:'gyro',message:err.errMsg||err.message||'陀螺仪不可用'});
      });
    }catch(err){if(token===this.token)this.stop();throw err;}
  }
  stop(){
    this.active=false;++this.token;++this.requestGeneration;const w=this.wx,h=this.handlers;
    if(h.accel)w.offAccelerometerChange(h.accel);if(h.gyro)w.offGyroscopeChange(h.gyro);
    if(h.location)w.offLocationChange(h.location);if(h.error&&w.offLocationChangeError)w.offLocationChangeError(h.error);
    w.stopAccelerometer({});w.stopGyroscope({});w.stopLocationUpdate({});this.handlers={};
  }
}
module.exports={Collector};

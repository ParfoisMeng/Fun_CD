const Core = require('../core/engine');
class Recorder {
  constructor(wxApi, params, device, onError) {
    this.wx=wxApi;this.fs=wxApi.getFileSystemManager();this.onError=onError;
    this.started=Date.now();this.last=0;this.buffer=[];this.failed=false;
    this.path=wxApi.env.USER_DATA_PATH+'/ride_'+this.started+'.jsonl';
    this.fs.writeFileSync(this.path,JSON.stringify({type:'meta',schema:1,engineVersion:Core.VERSION,
      startedAt:new Date(this.started).toISOString(),params:Core.config(params),device,
      units:{t:'ms since session start (callback arrival)',accel:'g',gyro:'rad/s',speed:'m/s',accuracy:'m'},
      privacy:'local only; location records include coordinates'})+'\n','utf8');
  }
  now(){this.last=Math.max(this.last,Date.now()-this.started);return this.last;}
  write(record){if(this.failed)return;this.buffer.push(JSON.stringify(record));if(this.buffer.length>=150)this.flush();}
  flush(){
    if(!this.buffer.length||this.failed)return;
    try{this.fs.appendFileSync(this.path,this.buffer.join('\n')+'\n','utf8');this.buffer=[];}
    catch(e){this.failed=true;this.buffer=[];if(this.onError)this.onError(e);}
  }
  snapshot(){this.flush();if(this.failed)throw new Error('记录写入失败，当前文件不完整');
    const target=this.wx.env.USER_DATA_PATH+'/export_latest.jsonl';
    this.fs.copyFileSync(this.path,target);return target;}
}
function list(wxApi){
  const fs=wxApi.getFileSystemManager(),root=wxApi.env.USER_DATA_PATH;
  return fs.readdirSync(root).filter(n=>/^ride_\d+\.jsonl$/.test(n)).sort().reverse().map(name=>({
    name,path:root+'/'+name,date:new Date(Number(name.slice(5,-6))).toLocaleString()
  }));
}
module.exports={Recorder,list};

const Core=require('../../core/engine');
const {Collector}=require('../../services/collector');
const {Recorder}=require('../../services/recorder');
Page({
  data:{state:{main:'STOP',status:'waiting'},headline:'小猫准备中',hint:'正在连接传感器',error:'',recordError:'',exportError:'',starting:false,exporting:false},
  onLoad(){
    this.engine=new Core.Engine();this.visible=false;this.dead=false;this.run=0;
    try{
      const appInfo=wx.getAppBaseInfo();
      const device=Object.assign({},wx.getDeviceInfo(),{wechatVersion:appInfo.version,sdkVersion:appInfo.SDKVersion});
      this.recorder=new Recorder(wx,this.engine.params,device,()=>{
        this.setData({recordError:'本机记录写入失败，文件可能不完整。请导出已有记录并检查存储空间。'});
      });
      this.collector=new Collector(wx,(type,data)=>this.emit(type,data));
    }catch(e){this.setData({error:'无法创建本地记录：'+e.message});}
  },
  onShow(){this.visible=true;if(this.collector)this.connect();},
  onHide(){this.pause();},
  onUnload(){
    this.pause();this.dead=true;
    if(this.recorder){this.emit('end');this.recorder.flush();}
  },
  emit(type,data){
    if(!this.recorder)return;
    const e={type,t:this.recorder.now()};if(data!==undefined)e.data=data;
    this.recorder.write(e);const state=this.engine.push(e);
    if(['tick','pause','resume','calibration-start','end','sensor-error'].includes(type)){
      this.recorder.write({type:'state',t:e.t,data:state});
      if(!this.dead&&this.visible)this.render(state);
    }
    return state;
  },
  async connect(){
    const run=++this.run;this.setData({starting:true,error:''});
    this.emit('resume');
    try{
      await this.collector.start();
      if(!this.visible||this.dead||run!==this.run)return;
      wx.setKeepScreenOn({keepScreenOn:true});
      if(!this.engine.baseline)this.calibrate();
      clearInterval(this.ticker);clearInterval(this.flusher);
      this.ticker=setInterval(()=>this.emit('tick'),100);
      this.flusher=setInterval(()=>this.recorder.flush(),1000);
    }catch(e){
      if(this.visible&&!this.dead&&run===this.run)this.setData({error:'采集启动失败：'+(e.errMsg||e.message||'请检查定位权限'),headline:'还没有连接上',hint:'允许定位后重试'});
    }finally{if(!this.dead&&run===this.run)this.setData({starting:false});}
  },
  pause(){
    this.visible=false;++this.run;clearInterval(this.ticker);clearInterval(this.flusher);
    if(this.collector)this.collector.stop();
    if(this.recorder){this.emit('pause');this.recorder.flush();}
    wx.setKeepScreenOn({keepScreenOn:false});
  },
  retry(){if(this.collector&&!this.data.starting)this.connect();},
  calibrate(){if(this.visible&&this.recorder){this.emit('calibration-start');this.render(this.engine.snapshot(this.recorder.now()));}},
  render(state){
    let headline='感应恢复中',hint='小猫等一等，收到有效数据后继续';
    if(state.status==='calibrating'){headline='准备出发 · '+state.countdown;hint='尽量不要大幅度移动，正在记住手机的姿态';}
    else if(state.status==='calibration-failed'){headline='没有收到动作数据';hint='请点击重新校准，或返回检查设备';}
    else if(state.status==='ready'){
      headline=state.main==='MOVE'?'一起向前走':'歇一会儿，我陪你';
      hint=state.main==='MOVE'?'你骑车，小猫跟上':'准备好了，就一起出发';
    }
    this.setData({state,headline,hint});
  },
  exportLog(){
    if(!this.recorder||this.data.exporting)return;this.setData({exporting:true,exportError:''});
    try{
      const filePath=this.recorder.snapshot();
      wx.shareFileMessage({filePath,fileName:'ride_'+this.recorder.started+'.jsonl',
        fail:e=>{if(!this.dead&&!/cancel/.test(e.errMsg||''))this.setData({exportError:'分享失败，记录仍在本机：'+e.errMsg});},
        complete:()=>{if(!this.dead)this.setData({exporting:false});}});
    }catch(e){this.setData({exporting:false,exportError:'导出失败：'+e.message});}
  }
});

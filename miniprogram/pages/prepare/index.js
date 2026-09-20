const {list}=require('../../services/recorder');
const call=(name,opts={})=>new Promise((resolve,reject)=>wx[name]({...opts,success:resolve,fail:reject}));
Page({
  data:{busy:false,error:'',logs:[],privacy:false,preview:{main:'STOP',status:'ready'}},
  onLoad(){
    this.privacyHandler=resolve=>{this.privacyResolve=resolve;this.setData({privacy:true});};
    if(wx.onNeedPrivacyAuthorization)wx.onNeedPrivacyAuthorization(this.privacyHandler);
  },
  onShow(){try{this.setData({logs:list(wx)});}catch(e){this.setData({error:'读取本地记录失败：'+e.message});}},
  onUnload(){
    if(this.privacyResolve)this.rejectPrivacy();
    if(wx.offNeedPrivacyAuthorization)wx.offNeedPrivacyAuthorization(this.privacyHandler);
  },
  async start(){
    if(this.data.busy)return;this.setData({busy:true,error:''});
    try{
      if(wx.requirePrivacyAuthorize)await call('requirePrivacyAuthorize');
      await call('authorize',{scope:'scope.userLocation'});
      await call('navigateTo',{url:'/pages/ride/index'});
    }catch(e){this.setData({error:'暂时无法开始。请允许定位，并确认系统定位已开启。'+(e.errMsg||e.message||'')});}
    finally{this.setData({busy:false});}
  },
  agreePrivacy(){if(this.privacyResolve)this.privacyResolve({event:'agree',buttonId:'privacy-agree'});this.privacyResolve=null;this.setData({privacy:false});},
  rejectPrivacy(){if(this.privacyResolve)this.privacyResolve({event:'disagree'});this.privacyResolve=null;this.setData({privacy:false});},
  openPrivacy(){wx.openPrivacyContract({fail:()=>wx.showToast({title:'请先配置小程序隐私指引',icon:'none'})});},
  settings(){wx.openSetting({});},
  exportLog(e){wx.shareFileMessage({filePath:e.currentTarget.dataset.path,fail:err=>{
    if(!/cancel/.test(err.errMsg||''))this.setData({error:'导出失败，请在真机重试：'+err.errMsg});
  }});}
});

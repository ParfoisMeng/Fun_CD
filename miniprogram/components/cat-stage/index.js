const Stage=require('../../core/stage');
Component({
  properties:{state:{type:Object,value:{main:'STOP',status:'waiting'}}},
  lifetimes:{
    ready(){
      this.createSelectorQuery().select('#cat').fields({node:true,size:true}).exec(res=>{
        if(!res[0]||!res[0].node)return;
        this.canvas=res[0].node;this.ctx=this.canvas.getContext('2d');
        this.width=res[0].width;this.height=res[0].height;
        const ratio=wx.getWindowInfo().pixelRatio;
        this.canvas.width=this.width*ratio;this.canvas.height=this.height*ratio;
        this.ctx.scale(ratio,ratio);this.started=Date.now();this.animate();
      });
    },
    detached(){this.stop();this.ctx=null;}
  },
  pageLifetimes:{show(){this.hidden=false;this.animate();},hide(){this.hidden=true;this.stop();}},
  methods:{
    animate(){
      if(!this.ctx||this.timer||this.hidden)return;
      const render=()=>{if(!this.ctx||this.hidden)return;
        Stage.draw(this.ctx,this.width,this.height,this.data.state,Date.now()-this.started);
        this.timer=setTimeout(render,33);};render();
    },
    stop(){clearTimeout(this.timer);this.timer=null;}
  }
});

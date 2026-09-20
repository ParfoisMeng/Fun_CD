import * as THREE from 'three';
import { createPlatformer } from './platformer.mjs';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.getElementById('cat3d');
const label=document.getElementById('model-status');
const statusText={waiting:'等待有效数据',paused:'感应已暂停',calibrating:'正在校准','calibration-failed':'等待重新校准'};

async function createStage(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,60);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.enablePan=false;
  controls.minDistance=3.6;controls.maxDistance=10;
  controls.minPolarAngle=.35;controls.maxPolarAngle=Math.PI/2-.05;
  function resetCamera(){camera.position.set(3.7,2.8,5.0);controls.target.set(0,1.2,0);controls.update();}
  resetCamera();document.getElementById('reset-camera').addEventListener('click',resetCamera);
  scene.add(new THREE.HemisphereLight(0xfff9ee,0x9ead99,2.7));
  const sun=new THREE.DirectionalLight(0xffedda,3.5);sun.position.set(-3,6,4);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;
  sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.normalBias=.035;scene.add(sun);
  const rim=new THREE.DirectionalLight(0xdceefb,1.8);rim.position.set(4,3,-3);scene.add(rim);
  const mat=(color,roughness=.7)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
  const mint=mat(0x709f8a,.4),cream=mat(0xf6edd9),dark=mat(0x34423f),rubber=mat(0x343a37),metal=mat(0xabb9b0,.3);
  function mesh(geometry,material,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function ellipsoid(parent,material,position,scale){const o=mesh(new THREE.SphereGeometry(1,32,20),material,parent,...position);o.scale.set(...scale);return o;}
  function tube(parent,a,b,r,material){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);
    const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),16),material,parent);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  const floor=mesh(new THREE.CylinderGeometry(2.5,2.6,.12,80),mat(0xe1e6d5),scene,0,-.08,0);
  floor.castShadow=false;
  const rig=new THREE.Group();scene.add(rig);
  // The vehicle points along +Z, matching the source cat's forward direction.
  const wheels=[];
  for(const z of [-.85,.85]){
    const group=new THREE.Group();group.position.set(0,.32,z);rig.add(group);wheels.push(group);
    const tire=mesh(new THREE.TorusGeometry(.245,.085,16,40),rubber,group);tire.rotation.y=Math.PI/2;
    const hub=mesh(new THREE.CylinderGeometry(.17,.17,.15,32),cream,group);hub.rotation.z=Math.PI/2;
    for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(group,[-.09,0,0],[-.09,Math.sin(a)*.16,Math.cos(a)*.16],.015,metal);}
  }
  ellipsoid(rig,mint,[0,.57,-.68],[.32,.25,.51]);
  ellipsoid(rig,cream,[0,.63,-.73],[.27,.19,.43]);
  const deck=mesh(new THREE.BoxGeometry(.53,.13,1.35),mint,rig,0,.44,-.03);
  tube(rig,[0,.48,-.64],[0,.94,-.57],.055,metal);
  ellipsoid(rig,dark,[0,.99,-.54],[.32,.075,.33]);
  tube(rig,[0,.34,.85],[0,1.34,.30],.075,mint);
  ellipsoid(rig,mint,[0,.86,.71],[.26,.47,.15]);
  tube(rig,[-.48,1.34,.30],[.48,1.34,.30],.045,metal);
  for(const x of [-.4,.4])tube(rig,[x-.08,1.34,.30],[x+.08,1.34,.30],.055,dark);
  ellipsoid(rig,cream,[0,1.19,.85],[.13,.13,.08]);
  ellipsoid(rig,mat(0xffd58a),[0,1.19,.90],[.10,.10,.03]);
  // Footrests fit the original character's short legs without distorting them.
  for(const sign of [-1,1]){
    tube(rig,[sign*.18,.48,-.12],[sign*.32,.70,-.04],.028,metal);
    mesh(new THREE.BoxGeometry(.18,.055,.25),dark,rig,sign*.32,.72,-.04);
  }
  const stand=tube(rig,[0,.43,-.50],[.35,.02,-.57],.025,metal);
  // Road dashes move only while the state says MOVE.
  const dashes=[];
  for(let i=0;i<9;i++){const dash=mesh(new THREE.BoxGeometry(.05,.01,.21),cream,scene,.70,0,i*.5-2);dashes.push(dash);}
  const rider=await createPlatformer(rig);
  let width=0,height=0;
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
  document.getElementById('cat').hidden=true;canvas.hidden=false;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();label.textContent='3D 渲染中断，请刷新重试';window.Cat3D=null;canvas.hidden=true;document.getElementById('cat').hidden=false;});
  window.Cat3D={draw(state,time){
    const t=time/1000,moving=state.status==='ready'&&state.main==='MOVE',stopped=state.status==='ready'&&state.main==='STOP';
    // Seekable procedural pose: no accumulated mixer clock or walking feet on a moving scooter.
    rider.pose(stopped,moving,t);
    stand.visible=stopped;
    rig.position.y=moving?Math.sin(t*7)*.008:Math.sin(t*2)*.003;
    for(const wheel of wheels)wheel.rotation.x=moving?t*7:0;
    dashes.forEach((d,i)=>d.position.z=((i*.5-(moving?t*1.5:0))%4.5+4.5)%4.5-2.25);
    label.textContent=moving?'3D · 骑行':stopped?'3D · 停车':('3D · '+(statusText[state.status]||'准备中'));
    resize();controls.update();renderer.render(scene,camera);
  }};
  window.Cat3D.draw({main:'STOP',status:'waiting'},0);
}
createStage().catch(error=>{window.Cat3D=null;console.error('3D stage failed',error);label.textContent='3D 加载失败，已显示二维备用舞台';canvas.hidden=true;document.getElementById('cat').hidden=false;});

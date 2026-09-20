import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function createPlatformer(parent){
  const asset=await new GLTFLoader().loadAsync('/replay/assets/platformer.glb');
  const root=asset.scene;parent.add(root);
  const bones={};
  root.traverse(o=>{if(!o.isMesh)bones[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.metalness=0;m.roughness=.8;}}});
  const rest=new Map(Object.values(bones).filter(b=>b.isBone).map(b=>[b,{q:b.quaternion.clone(),p:b.position.clone(),s:b.scale.clone()}]));
  root.updateMatrixWorld(true);
  root.scale.setScalar(1.95/new T.Box3().setFromObject(root).getSize(new T.Vector3()).y);
  root.updateMatrixWorld(true);
  const world=o=>o.getWorldPosition(new T.Vector3());
  const hip=world(bones.UpperLegL).add(world(bones.UpperLegR)).multiplyScalar(.5);
  root.position.add(new T.Vector3(0,1.08,-.40).sub(hip));
  root.updateMatrixWorld(true);
  function aim(bone,end,target){
    root.updateMatrixWorld(true);
    const origin=world(bone),current=world(end).sub(origin).normalize(),desired=target.clone().sub(origin).normalize();
    const delta=new T.Quaternion().setFromUnitVectors(current,desired);
    const q=bone.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
    root.updateMatrixWorld(true);
  }
  function chain(upper,lower,end,target,pole){
    root.updateMatrixWorld(true);
    const origin=world(upper);let l1=origin.distanceTo(world(lower)),l2=world(lower).distanceTo(world(end));
    const offset=target.clone().sub(origin),distance=offset.length();
    // The toy proportions have short legs. Limit reach instead of stretching the mesh.
    const d=T.MathUtils.clamp(distance,Math.abs(l1-l2)+.0001,l1+l2-.0001),direction=offset.normalize();
    const across=pole.clone().sub(origin).addScaledVector(direction,-pole.clone().sub(origin).dot(direction)).normalize();
    const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const elbow=origin.clone().addScaledVector(direction,along).addScaledVector(across,height);
    const reachable=origin.clone().addScaledVector(direction,d);
    aim(upper,lower,elbow);aim(lower,end,reachable);
    return reachable;
  }
  const axisX=new T.Vector3(1,0,0),axisY=new T.Vector3(0,1,0);
  const local=p=>parent.localToWorld(new T.Vector3(...p));
  return {pose(stopped,moving,t){
    for(const [bone,r]of rest){bone.quaternion.copy(r.q);bone.position.copy(r.p);bone.scale.copy(r.s);}
    bones.Head.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axisY,stopped?Math.sin(t*.7)*.10:0));
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      bones['Ear2'+side].quaternion.multiply(new T.Quaternion().setFromAxisAngle(axisX,Math.sin(t*(moving?5:1.8)+sign)*.055));
      chain(bones['UpperArm'+side],bones['LowerArm'+side],bones['Fist'+side],local([sign*.36,1.34,.30]),local([sign*.6,1.13,-.06]));
      const foot=chain(bones['UpperLeg'+side],bones['LowerLeg'+side],bones['LowerLeg'+side+'_end'],local([sign*.32,stopped&&side==='L'?.60:.76,stopped&&side==='L'?-.34:-.04]),local([sign*.38,1.02,.22]));
      const footBone=bones['Foot'+side];footBone.position.copy(footBone.parent.worldToLocal(foot));
    }
    root.updateMatrixWorld(true);
  }};
}

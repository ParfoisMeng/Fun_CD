// Original stylized geometry inspired by bicolor Ragdoll photo references.
// All animation is a function of replay time, so seeking remains deterministic.
export function createRagdoll(T, parent) {
  const root=new T.Group();parent.add(root);
  const material=(color,roughness=.85)=>new T.MeshStandardMaterial({color,roughness});
  const fur=material(0xf8f3e9),point=material(0x9c9796),pink=material(0xdba8a5);
  const blue=material(0x69b5e3,.24),ink=material(0x283a4b,.3),shine=material(0xffffff,.2),teal=material(0x709f9c);
  function mesh(geometry,mat,group=root){const o=new T.Mesh(geometry,mat);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
  function oval(group,mat,pos,size){const o=mesh(new T.SphereGeometry(1,40,28),mat,group);o.position.set(...pos);o.scale.set(...size);return o;}
  function curve(group,points,radius,mat){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,8,false),mat,group);}
  oval(root,fur,[0,1.30,-.36],[.34,.39,.29]);
  oval(root,fur,[0,1.10,-.50],[.35,.20,.28]);
  const tail=new T.Group();tail.position.set(0,1.13,-.65);root.add(tail);
  curve(tail,[[0,0,0],[.25,-.12,-.27],[.50,-.03,-.35],[.58,.20,-.27]],.115,point);
  oval(tail,point,[.58,.20,-.27],[.115,.14,.115]);
  // Broad ruff and cheek contours provide a soft silhouette without fur strands.
  oval(root,fur,[0,1.58,-.27],[.39,.23,.30]);
  for(const sign of [-1,1]){
    const tuft=oval(root,fur,[sign*.28,1.56,-.21],[.15,.21,.18]);tuft.rotation.z=sign*.42;
  }
  const collar=mesh(new T.TorusGeometry(.26,.035,12,40),teal);collar.rotation.x=Math.PI/2;collar.position.set(0,1.52,-.25);
  oval(root,teal,[.16,1.44,.025],[.065,.14,.035]).rotation.z=-.3;
  const head=new T.Group();head.position.set(0,1.99,-.18);root.add(head);
  const faceGeometry=new T.SphereGeometry(1,64,40),colors=[];
  const positions=faceGeometry.attributes.position;
  const white=new T.Color(0xf8f3e9),gray=new T.Color(0x8d8790);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    // White inverted V widens down the face, blending softly into white cheeks.
    const edge=.08+(1-y)*.23;
    let mask=T.MathUtils.smoothstep(Math.abs(x),edge-.055,edge+.055);
    mask*=T.MathUtils.smoothstep(y,-.48,-.20);
    mask=z>0?mask:.60;
    const col=white.clone().lerp(gray,mask*.94);colors.push(col.r,col.g,col.b);
  }
  faceGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const face=mesh(faceGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.94}),head);face.scale.set(.51,.44,.38);
  for(const sign of [-1,1]){
    oval(head,fur,[sign*.34,-.15,.015],[.23,.20,.28]);
    const tuft=oval(head,fur,[sign*.46,-.10,-.035],[.12,.20,.16]);tuft.rotation.z=-sign*.65;
    const earShape=new T.Shape();earShape.moveTo(-.15,0);earShape.quadraticCurveTo(-.16,.14,-.08,.34);earShape.quadraticCurveTo(-.045,.40,.015,.33);earShape.lineTo(.17,.02);earShape.quadraticCurveTo(0,-.035,-.15,0);
    const ear=mesh(new T.ExtrudeGeometry(earShape,{depth:.07,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:16}),point,head);
    ear.position.set(sign*.32,.28,-.045);ear.rotation.z=-sign*.20;
    const inner=oval(ear,pink,[0,.14,.104],[.075,.145,.014]);inner.rotation.z=.10;
  }
  const eyes=[];
  for(const sign of [-1,1]){
    const eye=new T.Group();eye.position.set(sign*.215,.025,.332);eye.rotation.y=sign*.22;head.add(eye);eyes.push(eye);
    oval(eye,ink,[0,0,0],[.112,.119,.039]);
    oval(eye,blue,[0,0,.022],[.096,.102,.033]);
    oval(eye,ink,[0,0,.047],[.043,.072,.018]);
    oval(eye,shine,[-.030,.043,.064],[.024,.026,.010]);
    oval(eye,shine,[.034,-.035,.057],[.010,.011,.008]);
  }
  oval(head,fur,[-.09,-.16,.341],[.12,.087,.064]);
  oval(head,fur,[.09,-.16,.341],[.12,.087,.064]);
  const nose=oval(head,pink,[0,-.12,.409],[.055,.034,.027]);nose.rotation.z=Math.PI;
  const mouth=material(0x9c7372);
  curve(head,[[0,-.144,.408],[0,-.19,.409],[-.043,-.208,.394]],.007,mouth);
  curve(head,[[0,-.19,.409],[.020,-.207,.402],[.043,-.208,.394]],.007,mouth);
  for(const sign of [-1,1])for(let i=0;i<2;i++)curve(head,[[sign*.16,-.18-i*.03,.369],[sign*.29,-.16-i*.047,.35],[sign*.43,-.14-i*.065,.30]],.0025,point);
  function segment(radius){return mesh(new T.CapsuleGeometry(radius,1,6,16),fur);}
  function between(o,a,b){const d=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(1,Math.max(.01,d.length()-.12),1);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
  const limbs=[-1,1].map(sign=>({sign,upper:segment(.115),fore:segment(.105),thigh:segment(.14),shin:segment(.12),elbow:oval(root,fur,[0,0,0],[.116,.116,.116]),knee:oval(root,fur,[0,0,0],[.14,.14,.14]),hand:oval(root,fur,[sign*.36,1.35,.64],[.125,.10,.14]),foot:oval(root,fur,[0,0,0],[.145,.105,.20])}));
  return {pose(stopped,moving,t){
    head.rotation.y=stopped?Math.sin(t*.65)*.13:Math.sin(t*.8)*.025;
    head.rotation.z=stopped?Math.sin(t*.8)*.035:0;
    const blink=t%5.3,openness=blink>4.95?Math.max(.08,Math.abs(blink-5.125)/.175):1;
    eyes.forEach(eye=>eye.scale.y=openness);
    tail.rotation.y=Math.sin(t*1.4)*.13;
    for(const limb of limbs){
      const s=limb.sign,shoulder=new T.Vector3(s*.26,1.52,-.17),elbow=new T.Vector3(s*.36,1.34,.20),hand=new T.Vector3(s*.36,1.35,.64);
      between(limb.upper,shoulder,elbow);between(limb.fore,elbow,hand);limb.elbow.position.copy(elbow);
      const hip=new T.Vector3(s*.23,1.08,-.42),knee=new T.Vector3(s*.34,.85,-.02),foot=new T.Vector3(s*(stopped&&s===1?.48:.32),stopped&&s===1?.115:.57,stopped&&s===1?-.12:.20);
      between(limb.thigh,hip,knee);between(limb.shin,knee,foot);limb.knee.position.copy(knee);limb.foot.position.copy(foot);
    }
  }};
}

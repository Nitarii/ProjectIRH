export const DEFAULT_AVATAR={
  topStyle:0,bottomStyle:0,hairStyle:1,glasses:false,
  topColor:'#316b72',bottomColor:'#353e4e',hairColor:'#3b2920',
  skinColor:'#ddb08b',glassesColor:'#d2c9a7',shoeColor:'#3c3430'
};
export const AVATAR_STYLES={
  fr:{tops:['T-shirt','Sweat à capuche','Veste'],bottoms:['Pantalon','Short','Pantalon cargo'],
    hair:['Chauve','Court','Ébouriffé','Bouclé','Longue queue-de-cheval']},
  en:{tops:['T-shirt','Hoodie','Jacket'],bottoms:['Trousers','Shorts','Cargo trousers'],
    hair:['Bald','Short','Spiky','Curly','Long ponytail']}
};
export function normalizeAvatar(profile={}){
  const output={...DEFAULT_AVATAR};
  if(!profile||typeof profile!=='object')return output;
  for(const key of ['topStyle','bottomStyle','hairStyle']){
    const max=key==='hairStyle'?4:2;
    if(Number.isInteger(profile[key]))output[key]=Math.min(max,Math.max(0,profile[key]));
  }
  output.glasses=!!profile.glasses;
  for(const key of ['topColor','bottomColor','hairColor','skinColor','glassesColor','shoeColor']){
    if(typeof profile[key]==='string'&&/^#[0-9a-fA-F]{6}$/.test(profile[key]))output[key]=profile[key];
  }
  return output;
}
export function attachAvatarDesigner(T,avatar,parts){
  const {torso,head,leftArm,rightArm,leftLeg,rightLeg}=parts;
  const shirt=new T.MeshLambertMaterial({color:DEFAULT_AVATAR.topColor});
  const trousers=new T.MeshLambertMaterial({color:DEFAULT_AVATAR.bottomColor});
  const hair=new T.MeshLambertMaterial({color:DEFAULT_AVATAR.hairColor});
  const skin=new T.MeshLambertMaterial({color:DEFAULT_AVATAR.skinColor});
  const glasses=new T.MeshLambertMaterial({color:DEFAULT_AVATAR.glassesColor});
  const shoes=new T.MeshLambertMaterial({color:DEFAULT_AVATAR.shoeColor});
  torso.material=shirt;head.material=skin;
  for(const arm of [leftArm,rightArm]){
    if(arm.children[0])arm.children[0].material=shirt;
    if(arm.children[1])arm.children[1].material=skin;
  }
  for(const leg of [leftLeg,rightLeg])if(leg.children[0])leg.children[0].material=trousers;
  const garments=new T.Group();avatar.add(garments);
  const mesh=(geometry,material,x,y,z,parent=garments)=>{
    const item=new T.Mesh(geometry,material);
    item.position.set(x,y,z);item.castShadow=true;parent.add(item);return item;
  };
  const box=(w,h,d,mat,x,y,z,parent)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const sphere=(r,mat,x,y,z)=>mesh(new T.IcosahedronGeometry(r,1),mat,x,y,z);
  let profile=normalizeAvatar();
  function clear(){
    for(const child of [...garments.children]){
      garments.remove(child);
      child.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose()});
    }
  }
  function apply(incoming){
    profile=normalizeAvatar(incoming);
    shirt.color.set(profile.topColor);trousers.color.set(profile.bottomColor);
    hair.color.set(profile.hairColor);skin.color.set(profile.skinColor);
    glasses.color.set(profile.glassesColor);shoes.color.set(profile.shoeColor);
    clear();
    const trim=new T.MeshLambertMaterial({color:profile.topColor});
    // Garment cutouts actually modify the visible silhouette.
    if(profile.topStyle===1){
      const hood=sphere(.38,shirt,0,2.05,-.22);
      hood.scale.set(1.18,.85,.72);
      box(.18,.29,.19,shirt,-.52,1.66,0);
      box(.18,.29,.19,shirt,.52,1.66,0);
      box(.16,.26,.055,shoes,-.20,1.05,.43);
      box(.16,.26,.055,shoes,.20,1.05,.43);
    }else if(profile.topStyle===2){
      box(.14,1.03,.09,shoes,0,1.4,.425);
      box(.34,.12,.11,shirt,-.22,1.86,.29);
      box(.34,.12,.11,shirt,.22,1.86,.29);
      box(.20,.13,.12,shoes,-.52,1.08,0);
      box(.20,.13,.12,shoes,.52,1.08,0);
    }else{
      box(.59,.13,.10,shirt,0,.91,.14);
    }
    if(profile.bottomStyle===1){
      box(.34,.18,.31,trousers,-.23,.28,0);
      box(.34,.18,.31,trousers,.23,.28,0);
      // Exposed lower legs use the skin tone.
      box(.25,.32,.24,skin,-.23,.15,.01);
      box(.25,.32,.24,skin,.23,.15,.01);
    }else if(profile.bottomStyle===2){
      for(const sign of [-1,1]){
        box(.20,.28,.21,trousers,sign*.40,.44,.09);
        box(.22,.065,.22,shoes,sign*.40,.36,.10);
      }
    }
    box(.33,.15,.45,shoes,-.23,.06,.16);
    box(.33,.15,.45,shoes,.23,.06,.16);
    if(profile.hairStyle===1){
      const cap=sphere(.33,hair,0,2.37,-.03);cap.scale.set(1.13,.54,1.1);
      box(.24,.12,.14,hair,0,2.26,.29);
    }else if(profile.hairStyle===2){
      const cap=sphere(.315,hair,0,2.34,-.03);cap.scale.y=.45;
      for(let i=0;i<7;i++){
        const a=i*6.283/7;
        const spike=mesh(new T.ConeGeometry(.11,.24,5),hair,Math.cos(a)*.25,2.53,Math.sin(a)*.24-.02);
        spike.rotation.z=Math.cos(a)*.45;spike.rotation.x=Math.sin(a)*.45;
      }
    }else if(profile.hairStyle===3){
      for(let i=0;i<12;i++){
        const a=i*6.283/12;
        sphere(.125+((i%3)*.012),hair,Math.cos(a)*.27,2.38+Math.sin(i*1.35)*.12,Math.sin(a)*.25);
      }
      sphere(.25,hair,0,2.49,-.02);
    }else if(profile.hairStyle===4){
      const crown=sphere(.36,hair,0,2.33,-.05);crown.scale.set(1,.62,1.04);
      const tie=mesh(new T.CylinderGeometry(.115,.16,.78,8),hair,0,1.93,-.34);
      tie.rotation.x=-.32;
      const tip=sphere(.17,hair,0,1.50,-.48);tip.scale.y=1.2;
      box(.52,.18,.19,hair,0,2.15,-.28);
    }
    if(profile.glasses){
      for(const sign of [-1,1]){
        const rim=mesh(new T.TorusGeometry(.135,.026,6,12),glasses,sign*.165,2.18,.350);
        rim.scale.y=.8;
        box(.24,.035,.05,glasses,sign*.31,2.19,.30);
      }
      box(.10,.025,.055,glasses,0,2.18,.385);
    }
    trim.dispose();
    return profile;
  }
  apply(profile);
  return {apply,get current(){return {...profile}}};
}

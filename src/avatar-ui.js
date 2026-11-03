import {normalizeAvatar,AVATAR_STYLES} from './avatar-style.js';
const FIELDS=[
  ['topColor','Haut','Top'],['bottomColor','Bas','Bottom'],
  ['hairColor','Cheveux','Hair'],['skinColor','Peau','Skin'],
  ['glassesColor','Lunettes','Glasses'],['shoeColor','Chaussures','Shoes']
];
export function avatarBuilderMarkup(initial,lang='fr'){
  const p=normalizeAvatar(initial),fr=lang==='fr',labels=AVATAR_STYLES[fr?'fr':'en'];
  const selection=(key,title,options)=>
    '<label class="creator-field"><span>'+title+'</span><select data-avatar="'+key+'">'+
    options.map((label,i)=>'<option value="'+i+'" '+(p[key]===i?'selected':'')+'>'+label+'</option>').join('')+
    '</select></label>';
  const colors=FIELDS.map(([key,frTitle,enTitle])=>
    '<label class="creator-color"><span>'+(fr?frTitle:enTitle)+'</span><input type="color" data-avatar="'+key+'" value="'+p[key]+'"></label>'
  ).join('');
  return '<div class="creator-copy"><span class="creator-kicker">FRONTIER CAPITAL · '+(fr?'PERSONNALISATION':'CHARACTER CREATOR')+'</span>'+
  '<h2>'+(fr?'Créez votre pionnier':'Create your pioneer')+'</h2>'+
  '<p>'+(fr?'Choisissez une tenue et un style uniques avant votre première exploration.':'Choose a distinctive outfit and look before your first expedition.')+'</p></div>'+
  '<div class="creator-layout"><div class="creator-preview" id="creatorPreview"><div class="preview-caption">'+(fr?'APERÇU 3D':'3D PREVIEW')+'</div></div>'+
  '<div class="creator-fields">'+
  selection('topStyle',fr?'Style de haut':'Top style',labels.tops)+
  selection('bottomStyle',fr?'Style de bas':'Bottom style',labels.bottoms)+
  selection('hairStyle',fr?'Coiffure':'Hairstyle',labels.hair)+
  '<label class="creator-field creator-toggle"><span>'+(fr?'Lunettes':'Glasses')+'</span><input type="checkbox" data-avatar="glasses" '+(p.glasses?'checked':'')+'></label>'+
  '<div class="creator-colors">'+colors+'</div></div></div>'+
  '<div class="creator-footer"><span>'+(fr?'Modifiable avant de commencer · sauvegarde individuelle':'Customize before starting · individual local save')+'</span>'+
  '<button type="button" id="creatorFinish">'+(fr?'Commencer l’aventure':'Begin adventure')+' ↗</button></div>';
}

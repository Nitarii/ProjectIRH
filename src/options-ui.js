import {UI} from './language.js';
import {keyLabel,ACTIONS} from './settings.js';
const actionText={
 fr:{forward:'Avancer',backward:'Reculer',left:'Aller à gauche',right:'Aller à droite',
 sprint:'Sprint',interact:'Interagir / vendre',build:'Construction',talents:'Progression',
 inventory:'Inventaire',drop:'Déposer',vehicle:'Véhicule'},
 en:{forward:'Move forward',backward:'Move backward',left:'Strafe left',right:'Strafe right',
 sprint:'Sprint',interact:'Interact / sell',build:'Construction',talents:'Progression',
 inventory:'Inventory',drop:'Drop',vehicle:'Vehicle'}
};
export function optionsMarkup(settings,awaiting){
 const t=UI[settings.language],actions=actionText[settings.language];
 const buttons=ACTIONS.map(k=>'<div class="option-key-row"><span>'+actions[k]+'</span><button type="button" data-bind="'+k+'" class="'+(awaiting===k?'binding-active':'')+'">'+(awaiting===k?t.rebinding:keyLabel(settings.bindings[k]))+'</button></div>').join('');
 return '<div class="options-layout">'+
 '<section class="options-box"><h3>'+t.sound+'</h3><label class="option-check"><input id="settingAudio" type="checkbox" '+(!settings.muted?'checked':'')+'> '+t.sound+' '+(!settings.muted?'ON':'OFF')+'</label>'+
 '<label class="option-range"><span>'+t.volume+' <strong id="volumeLabel">'+Math.round(settings.volume*100)+'%</strong></span><input type="range" id="settingVolume" min="0" max="100" step="1" value="'+Math.round(settings.volume*100)+'"></label>'+
 '<h3>'+t.graphics+'</h3><label class="option-label">'+t.quality+'<select id="settingQuality">'+
 ['low','balanced','high'].map(k=>'<option value="'+k+'" '+(settings.quality===k?'selected':'')+'>'+t[k]+'</option>').join('')+'</select></label>'+
 '<p class="option-help">'+t.lowHint+'</p>'+
 '<label class="option-check"><input id="settingEffects" type="checkbox" '+(settings.effects?'checked':'')+'> '+t.effects+'</label>'+
 '<h3>'+t.language+'</h3><label class="option-label">'+t.language+'<select id="settingLanguage">'+
 '<option value="en" '+(settings.language==='en'?'selected':'')+'>English</option>'+
 '<option value="fr" '+(settings.language==='fr'?'selected':'')+'>Français</option></select></label></section>'+
 '<section class="options-box"><h3>'+t.controls+'</h3><div class="option-key-grid">'+buttons+'</div></section></div>';
}

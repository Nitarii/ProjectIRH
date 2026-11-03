import {UI} from './language.js?v=20261103r2';
import {keyLabel,ACTIONS} from './settings.js?v=20261103r2';
const actionText={
 fr:{forward:'Avancer',backward:'Reculer',left:'Aller à gauche',right:'Aller à droite',
 sprint:'Sprint',interact:'Interagir / vendre',build:'Construction',talents:'Progression',
 inventory:'Inventaire',drop:'Déposer',vehicle:'Véhicule',jump:'Sauter'},
 en:{forward:'Move forward',backward:'Move backward',left:'Strafe left',right:'Strafe right',
 sprint:'Sprint',interact:'Interact / sell',build:'Construction',talents:'Progression',
 inventory:'Inventory',drop:'Drop',vehicle:'Vehicle',jump:'Jump'}
};
export function optionsMarkup(settings,awaiting){
 const t=UI[settings.language],actions=actionText[settings.language];
 const buttons=ACTIONS.map(k=>'<div class="option-key-row"><span>'+actions[k]+'</span><button type="button" data-bind="'+k+'" class="'+(awaiting===k?'binding-active':'')+'">'+(awaiting===k?t.rebinding:keyLabel(settings.bindings[k]))+'</button></div>').join('');
 return '<div class="options-layout">'+
 '<section class="options-box"><h3>'+t.sound+'</h3><label class="option-check"><input id="settingAudio" type="checkbox" '+(!settings.muted?'checked':'')+'> '+t.sound+' '+(!settings.muted?t.on:t.off)+'</label>'+
 '<label class="option-range"><span>'+t.volume+' <strong id="volumeLabel">'+Math.round(settings.volume*100)+'%</strong></span><input type="range" id="settingVolume" min="0" max="100" step="1" value="'+Math.round(settings.volume*100)+'"></label>'+
 '<h3>'+t.graphics+'</h3><label class="option-label">'+t.quality+'<select id="settingQuality">'+
 ['low','balanced','high'].map(k=>'<option value="'+k+'" '+(settings.quality===k?'selected':'')+'>'+t[k]+'</option>').join('')+'</select></label>'+
 '<label class="option-range"><span>'+t.resolution+' <strong id="resolutionLabel">'+Math.round(settings.renderScale*100)+'%</strong></span><input type="range" id="settingResolution" min="50" max="150" step="5" value="'+Math.round(settings.renderScale*100)+'"></label>'+
 '<label class="option-range"><span>'+t.distance+' <strong id="distanceLabel">'+Math.round(settings.viewDistance)+' m</strong></span><input type="range" id="settingDistance" min="64" max="256" step="16" value="'+Math.round(settings.viewDistance)+'"></label>'+
 '<label class="option-range"><span>'+t.sensitivity+' <strong id="sensitivityLabel">'+Math.round(settings.mouseSensitivity*100)+'%</strong></span><input type="range" id="settingSensitivity" min="20" max="300" step="10" value="'+Math.round(settings.mouseSensitivity*100)+'"></label>'+
 '<p class="option-help">'+t.lowHint+'</p>'+
 '<label class="option-check"><input id="settingEffects" type="checkbox" '+(settings.effects?'checked':'')+'> '+t.effects+'</label>'+
 '<h3>'+t.language+'</h3><label class="option-label">'+t.language+'<select id="settingLanguage">'+
 '<option value="en" '+(settings.language==='en'?'selected':'')+'>English</option>'+
 '<option value="fr" '+(settings.language==='fr'?'selected':'')+'>Français</option></select></label></section>'+
 '<section class="options-box"><h3>'+t.controls+'</h3><div class="option-key-grid">'+buttons+'</div>'+
 '<div class="options-safety"><h3>'+t.recovery+'</h3><p class="option-help">'+t.recoveryInfo+'</p>'+
 '<button type="button" class="utility-control" data-system="unstuck">'+t.unstuck+'</button>'+
 '<div id="resetConfirm" class="reset-confirm hidden"><strong>'+t.resetQuestion+'</strong><p>'+t.resetWarning+'</p>'+
 '<div class="reset-actions"><button type="button" data-system="cancelReset">'+t.cancel+'</button>'+
 '<button type="button" class="danger" data-system="confirmReset">'+t.confirm+'</button></div></div>'+
 '<button type="button" class="utility-control danger" data-system="requestReset">'+t.resetGame+'</button></div></section></div>';
}

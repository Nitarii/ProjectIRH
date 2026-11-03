import {UI} from './language.js?v=20261103p7';
import {keyLabel,ACTIONS} from './settings.js?v=20261103s6';
const actionText={
 fr:{forward:'Avancer',backward:'Reculer',left:'Aller à gauche',right:'Aller à droite',
 sprint:'Sprint',interact:'Interagir',market:'Comptoir',auto:'Mode automatique',build:'Construction',talents:'Progression',
 drop:'Déposer',vehicle:'Vélo',jump:'Sauter'},
 en:{forward:'Move forward',backward:'Move backward',left:'Strafe left',right:'Strafe right',
 sprint:'Sprint',interact:'Interact',market:'Market',auto:'Auto gathering',build:'Construction',talents:'Progression',
 drop:'Drop',vehicle:'Bicycle',jump:'Jump'}
};
export function optionsMarkup(settings,awaiting,vaultId=''){
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
 '<button type="button" class="utility-control danger" data-system="requestReset">'+t.resetGame+'</button></div>'+
 '<div class="vault-info"><h3>'+(settings.language==='fr'?'Sauvegarde chiffrée':'Encrypted save')+'</h3>'+
 '<p>'+(settings.language==='fr'?'Ce navigateur possède sa propre sauvegarde. Conservez votre code de récupération privé pour transférer votre partie. Aucun compte ni synchronisation cloud.':'This browser has its own save. Keep your private recovery code safe to transfer progress. No account or cloud sync.')+'</p>'+
 '<div class="vault-code">'+vaultId+'</div>'+
 '<div class="vault-actions"><button type="button" data-system="saveExport">'+(settings.language==='fr'?'Copier le code de sauvegarde':'Copy recovery code')+'</button>'+
 '<button type="button" data-system="requestImport">'+(settings.language==='fr'?'Importer une sauvegarde':'Import a save')+'</button></div>'+
 '<div id="vaultExport" class="hidden"><textarea id="vaultExportCode" readonly aria-label="Encrypted recovery code"></textarea></div>'+
 '<div id="vaultImport" class="hidden"><textarea id="vaultRecoveryCode" placeholder="'+(settings.language==='fr'?'Collez votre code chiffré IRH1…':'Paste your encrypted IRH1 recovery code…')+'"></textarea>'+
 '<div class="vault-actions"><button type="button" data-system="cancelImport">'+t.cancel+'</button>'+
 '<button type="button" data-system="confirmImport">'+(settings.language==='fr'?'Remplacer cette partie':'Replace this save')+'</button></div>'+
 '<p>'+(settings.language==='fr'?'Attention : cette action remplace la progression stockée sur ce navigateur.':'Warning: this replaces the progress stored in this browser.')+'</p></div>'+
 '<div id="vaultMessage" class="vault-message" aria-live="polite"></div></div></section></div>';
}

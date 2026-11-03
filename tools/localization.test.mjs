import assert from 'node:assert/strict';
import {tr,UI} from '../src/language.js';

const labels=[
  ['INTERAGIR','INTERACT'],
  ['INVENTAIRE','INVENTORY'],
  ['CINQ INDUSTRIES','FIVE INDUSTRIES'],
  ['DÉPÔT TRANSPORT','TRANSPORT DEPOT'],
  ['Marché','Market'],
  ['Atelier vide · achetez des employés ou déposez des ressources','Workshop empty · hire staff or deliver materials'],
  ['Le comptoir vend uniquement les ressources de ses employés.','The selling post handles goods carried by its staff only.'],
  ['Tronc déposé','Log dropped'],
  ['RÉCOLTE EN COURS','GATHERING'],
  ['ZONE DE VENTE','SALE ZONE'],
  ['Bois','Wood'],
  ['Farine','Flour'],
  ['EMPLACEMENT BLOQUÉ','PLACEMENT BLOCKED']
];
for(const [fr,en] of labels){
  assert.equal(tr(fr,'en'),en,fr+' must localize');
  assert.equal(tr(fr,'fr'),fr,'French locale must remain unchanged');
}
for(const key of ['volume','quality','resolution','distance','sensitivity','recovery',
  'unstuck','resetGame','confirm','cancel','language','controls']){
  assert.ok(UI.fr[key]&&UI.en[key],'Both languages must contain '+key);
}
console.log('Interface language and settings translations verified');

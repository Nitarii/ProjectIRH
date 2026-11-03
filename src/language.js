const pairs=[
['COMPTOIR','MARKET'],['CONSTRUCTION','CONSTRUCTION'],['PROGRESSION','PROGRESSION'],['INVENTAIRE','INVENTORY'],
['Outils & récolte','TOOLS & GATHERING'],['Équipement','EQUIPMENT'],['Comptoir','TRADING POST'],
['Chaîne de production','PRODUCTION CHAIN'],['Logistique','LOGISTICS'],['Personnel','WORKFORCE'],
['Transport & commerce','TRANSPORT & TRADE'],['Recrutement','HIRING'],['Endurance & sprint','STAMINA & SPRINT'],
['Expertise des métiers','SKILL MASTERY'],['Contenu transporté','CARRIED GOODS'],['Stock en dépôt','STOCK'],
['Marchandises à vendre','Goods for sale'],['Vendre le chargement','Sell carried resources'],
['VENDRE','SELL'],['PRIX','PRICE'],['MAJ','SHIFT'],['COURIR','SPRINT'],['DÉPLACER','MOVE'],
['RÉCOLTER','GATHER'],['INTERAGIR / VENDRE','INTERACT / SELL'],['CAMÉRA','CAMERA'],
['REPRENDRE ↗','RESUME ↗'],['ENTRER DANS LE MONDE','ENTER THE WORLD'],
['UN MONDE, CINQ INDUSTRIES, AUCUNE FRONTIÈRE','ONE WORLD. FIVE INDUSTRIES. NO BORDERS.'],
['Partez de rien. Récoltez la terre. Construisez un empire.','Start with nothing. Gather resources. Build an empire.'],
['MONDE PROCÉDURAL INFINI · SAUVEGARDE AUTOMATIQUE · VERSION ALPHA','ENDLESS PROCEDURAL WORLD · AUTOSAVE · ALPHA'],
['JOUR','DAY'],['OR','GOLD'],['BÂTIR','BUILD'],['PLACER','PLACE'],['ANNULER','CANCEL'],
['ENTRER','ENTER'],['EMPLOI','WORKERS'],['Récolte automatique · stockage','Automatic gathering · storage'],
['Collecte automatique · stockage','Automatic gathering · storage'],
['Déplacements des ressources','Move resources between buildings'],['Vente automatisée','Automated selling'],
['Dépôt de transport','Transport depot'],['Comptoir vendeur','Sales outpost'],
['Capacité de stockage','Inventory capacity'],['Condition physique','Physical conditioning'],
['Chariot utilitaire','Utility cart'],['Camion de ressources','Resource truck'],
['Transport de petites charges','Small cargo hauling'],['Grand volume de transport','Large-volume hauling'],
['Matériaux','Materials'],['Aucun stock disponible','No stock available'],
['Bois','Wood'],['Pierre','Stone'],['Minerai','Ore'],['Sable','Sand'],['Blé','Wheat'],
['Planches','Planks'],['Pierre taillée','Cut stone'],['Lingots','Ingots'],['Verre','Glass'],['Farine','Flour'],
['FORÊT','FOREST'],['MONTAGNE','MOUNTAINS'],['EXCAVATION','MINING'],['DÉSERT','DESERT'],['CHAMPS','FIELDS'],
['Cabane de bûcheron','Logging hut'],['Carrière','Quarry'],['Mine','Mine'],['Camp de terrassiers','Excavation camp'],
['Ferme','Farm'],['Scierie','Sawmill'],['Atelier de taille','Stone workshop'],['Fonderie','Smelter'],
['Verrerie','Glassworks'],['Moulin','Mill'],
['NIV.','LVL.'],['Palier','Tier'],['Employés','Workers'],['Brut','Raw'],['Entrée','Input'],
['Transformé','Processed'],['Logistique automatisée','Automated logistics'],['Récupérer','Collect'],
['Aucun objet','Empty'],['Aucune marchandise à vendre','No goods to sell'],
['EMPLACEMENT BLOQUÉ','PLACEMENT BLOCKED'],['EMPLACEMENT DISPONIBLE','VALID PLACEMENT'],
['F PLACER','F PLACE'],['ÉCHAP ANNULER','ESC CANCEL'],['SON','SOUND'],['MUET','MUTED'],
['Construction annulée · or remboursé','Building cancelled · gold refunded'],
['Bâtiment construit','Building completed'],['Choisissez un emplacement puis appuyez sur F','Choose a location and press F'],
['Récolte en cours · Déplacez-vous pour arrêter','Gathering · move to cancel'],
['Inventaire plein','Inventory full'],['Or insuffisant','Not enough gold'],
['Récolte en cours','Gathering'],['F pour récolter','F to gather'],['Aucun stock disponible','Nothing in stock'],
['ACHETEZ VOTRE PREMIER OUTIL','START WITH YOUR FISTS'],['DÉVELOPPEZ VOTRE EMPIRE','BUILD YOUR EMPIRE'],
['Approchez du comptoir et appuyez sur F','Approach the trader and press F'],
['Récoltez, transformez et automatisez','Gather, process and automate'],
['RÉCOLTE AUTOMATIQUE','AUTOMATIC GATHERING'],
['Vente automatisée','Automated sales'],['RESUME','RESUME']
];
const dictionary=new Map(pairs);
const patterns=[
[/([0-9]+) pièces d’or/g,'$1 gold'],
[/([0-9]+) OR\b/g,'$1 GOLD'],
[/Employés\s*:/g,'Workers:'],[/Stock\s*:/g,'Stock:'],
[/Récupéré\(s\)/g,'collected'],[/livré\(s\)/g,'delivered'],
[/unités?\b/g,'units'],[/emplacements?\b/g,'slots'],
[/Palier (\d+) \/ (\d+)/g,'Tier $1 / $2'],
[/Réserve /g,'Capacity '],[/récupération/g,'recovery'],
[/une unité transformée manuellement/gi,'one item processed manually']
];
export function tr(text,lang){
  if(lang!=='en')return text;
  if(dictionary.has(text))return dictionary.get(text);
  let str=text;
  for(const [fr,en] of pairs)if(fr.length>4&&str.includes(fr))str=str.split(fr).join(en);
  for(const [re,to] of patterns)str=str.replace(re,to);
  return str;
}
export function translateTree(root,lang){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){
    if(!n.nodeValue.trim())continue;
    if(!n.__originalText)n.__originalText=n.nodeValue;
    n.nodeValue=tr(n.__originalText,lang);
  }
}
export const UI={
  fr:{settings:'PARAMÈTRES',sound:'Son',volume:'Volume général',graphics:'Graphismes',
    quality:'Qualité réelle',low:'Faible — résolution réduite, sans ombres',balanced:'Équilibré',high:'Élevée',
    effects:'Effets de l’environnement',language:'Langue',controls:'Commandes',rebinding:'Appuyez sur une touche...',
    apply:'Appliquer',back:'Reprendre',stamina:'Endurance',work:'Travailleurs',capacity:'Charge transportée',fists:'Poings',
    lowHint:'La qualité faible réduit la résolution et désactive les ombres.'},
  en:{settings:'SETTINGS',sound:'Sound',volume:'Master volume',graphics:'Graphics',
    quality:'Rendering quality',low:'Low — lower resolution, no shadows',balanced:'Balanced',high:'High',
    effects:'Environmental effects',language:'Language',controls:'Key bindings',rebinding:'Press a key...',
    apply:'Apply',back:'Resume',stamina:'Stamina',work:'Workers',capacity:'Carrying capacity',fists:'Fists',
    lowHint:'Low quality lowers rendering resolution and turns off shadows.'}
};

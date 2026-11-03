export const EQUIPMENT=[
  ['Hatchet','Logging axe','Heavy felling axe','Bow saw','Chainsaw'],
  ['Stone hammer','Iron pickaxe','Steel pickaxe','Pneumatic breaker','Hydraulic splitter'],
  ['Mining pick','Steel mining pick','Hand drill','Power drill','Industrial drill'],
  ['Hand shovel','Steel shovel','Excavation spade','Power auger','Mini excavator'],
  ['Harvest sickle','Harvest knife','Field scythe','Motorized scythe','Compact harvester']
];
export const EQUIPMENT_FR=[
  ['Hachette','Hache de bûcheron','Hache d’abattage','Scie à archet','Tronçonneuse'],
  ['Marteau de pierre','Pioche de fer','Pioche d’acier','Brise-roche pneumatique','Fendeur hydraulique'],
  ['Pic de mine','Pic de mine en acier','Foret manuel','Perceuse motorisée','Foreuse industrielle'],
  ['Pelle à main','Pelle en acier','Bêche de terrassement','Tarière motorisée','Mini-pelleteuse'],
  ['Faucille','Couteau de moisson','Faux agricole','Débroussailleuse','Moissonneuse compacte']
];
export const TOOL_BASE_COSTS=[250,950,3200,9000,24000];
export const TOOL_SPEED=[2.8,1.85,1.42,1.09,.83,.54];
export const TOOL_YIELD=[1,1,1,2,3,4];
export const ECONOMY={
  bag:2000,bag24:9500,bicycle:6200,hire:1800,
  transport:10500,seller:13500,
  factory:[5400,6700,8300,6600,6100],
  worker:[6300,7200,8800,7500,6800],
  stamina:[1500,3800,8900,19000],
  talent:4800,
  workerCarry:[1600,4200,10500,23000,51000]
};
export function toolCost(type,tier){
  return Math.round(TOOL_BASE_COSTS[tier]*(1+Math.max(0,type)*.13)/10)*10;
}
export function buildingCost(kind,type=0){
  if(kind==='factory'||kind==='worker')return ECONOMY[kind][type]||ECONOMY[kind][0];
  return ECONOMY[kind]||0;
}
export function workerCarryCost(level){
  return ECONOMY.workerCarry[Math.max(0,Math.min(4,level))]||Infinity;
}

export const MAX_EXPERTISE=5;
export function expertiseCost(type,tier){
  if(tier>=MAX_EXPERTISE||tier<0)return Infinity;
  return Math.round(4800*Math.pow(tier+1,1.78)*(1+type*.08)/50)*50;
}
export function expertiseMultiplier(state,type){
  const level=Math.max(0,Math.min(MAX_EXPERTISE,Number(state?.talents?.[type])||0));
  return 1+level*.12;
}
export function expertiseHarvestSpeed(state,type){
  const level=Math.max(0,Math.min(MAX_EXPERTISE,Number(state?.talents?.[type])||0));
  return 1+level*.045;
}

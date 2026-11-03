// The camp sits at a seeded three-biome crossroads.
// The zone in the forward (+Z) direction is random, and both neighboring
// biomes can be reached by heading left or right from the first camp.
export function startingBiomes(seed){
  const n=Math.abs(Number(seed)||7331);
  const base=Math.floor(n)%5;
  const candidates=[0,1,2,3,4].filter(v=>v!==base);
  const second=candidates[Math.floor(n/7)%4];
  const remaining=candidates.filter(v=>v!==second);
  const third=remaining[Math.floor(n/31)%3];
  return [base,second,third];
}
export function openingBiome(x,z,seed){
  const r=Math.hypot(x,z);
  if(r<22)return -1;
  if(r>=200)return null;
  const ids=startingBiomes(seed);
  const angle=Math.atan2(x,z);
  // Gently irregular sector borders; zero angle always stays in biome 0.
  const border=Math.PI/4+Math.sin((r+seed%57)*.028)*.055;
  if(Math.abs(angle)<border)return ids[0];
  return angle>0?ids[1]:ids[2];
}

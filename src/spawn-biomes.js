// The camp sits at a seeded three-biome crossroads.
// The zone in the forward (+Z) direction is random, and both neighboring
// biomes can be reached by heading left or right from the first camp.
export function startingBiomes(seed){
  const base=(Math.abs((Number(seed)||7331)|0)%5);
  const advance=1+Math.abs(Math.imul(base+3,(Number(seed)||7331)|0)%4);
  const other=(base+advance)%5;
  const final=(other+1+Math.abs(Math.imul(base+17,(Number(seed)||7331)|0)%3))%5;
  return [base,other,final===base||final===other?(other+1+(other+1===base?1:0))%5:final];
}
export function openingBiome(x,z,seed){
  const r=Math.hypot(x,z);
  if(r<22)return -1;
  if(r>=200)return null;
  const ids=startingBiomes(seed);
  const angle=Math.atan2(x,z);
  // Gently irregular sector borders; zero angle always stays in biome 0.
  const border=Math.PI/3+Math.sin((r+seed%57)*.028)*.072;
  if(Math.abs(angle)<border)return ids[0];
  return angle>0?ids[1]:ids[2];
}

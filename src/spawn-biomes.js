// Kept as a compatibility utility for saved worlds and older map tools.
// N.I.M now has one continuous forest; only the safe central camp differs.
export const startingBiomes=()=>[0];
export function openingBiome(x,z){
  return Math.hypot(x,z)<22?-1:0;
}

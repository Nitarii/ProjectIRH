// Only props with a rigid, thigh-high or taller silhouette obstruct movement.
// Grass, wheat stalks, low shrubs and pebble clusters are decorative and passable.
export function decorationCollider(kind,scale){
  if(kind!==3)return null;
  const height=1.13*scale;
  if(height<1.25)return null;
  return {r:Math.max(.16,.14*scale),height};
}

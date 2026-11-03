import assert from 'node:assert/strict';
import {nearestStock,transferStock} from '../src/stock-interaction.js';
const buildings=[
  {id:'tree',kind:'worker',type:0,x:22,z:15,stockRaw:11,stock:11},
  {id:'mill',kind:'factory',type:0,x:39,z:15,inputRaw:15,stockProcessed:6,stock:6}
];
const points=b=>b.kind==='worker'?{
  raw:{x:b.x-2.75,z:b.z+3.15}
}:{
  raw:{x:b.x-5,z:b.z+3.4},processed:{x:b.x+5,z:b.z+3.4}
};
const data={bag:8,inv:[3,0,0,0,0],products:[1,0,0,0,0]};
let pile=nearestStock(buildings,{x:19.3,z:18.1},points);
assert.equal(pile.building.id,'tree');
assert.equal(transferStock(data,pile.building,'raw','deposit'),3);
assert.equal(data.inv[0],0);assert.equal(buildings[0].stockRaw,14);
assert.equal(transferStock(data,pile.building,'raw','withdraw'),7);
assert.equal(data.inv[0],7);assert.equal(buildings[0].stockRaw,7);
assert.equal(transferStock(data,pile.building,'raw','withdraw'),0,'bag cannot overflow');
pile=nearestStock(buildings,{x:44,z:18.5},points);
assert.equal(pile.kind,'processed');
assert.equal(transferStock(data,pile.building,'processed','withdraw'),0);
assert.equal(transferStock(data,pile.building,'processed','deposit'),1);
assert.equal(buildings[1].stockProcessed,7);
data.inv[0]=0;
assert.equal(transferStock(data,pile.building,'processed','withdraw'),7);
assert.equal(data.products[0],7);
assert.equal(buildings[1].stockProcessed,0);
assert.equal(nearestStock(buildings,{x:0,z:0},points),null);
console.log('Manual resource pickup and deposit at physically located stockpiles verified');

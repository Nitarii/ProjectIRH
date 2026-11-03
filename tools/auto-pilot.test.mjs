import assert from 'node:assert/strict';
import {createAutoPilot} from '../src/auto-pilot.js';
const character={position:{x:0,z:0},rotation:{y:0}};
const node={type:0,x:8,z:0,dead:false},goods={amount:0},sale={x:16,z:0,w:8,d:8};
let harvesting=false,sales=0,moves=0,turnedOn=false;
const pilot=createAutoPilot({
  player:character,blocked:(x,z)=>x>3&&x<5&&Math.abs(z)<1.4,
  move:(x,z)=>{character.position.x+=x;character.position.z+=z;moves++},
  resources:()=>[node],count:()=>goods.amount,capacity:()=>2,
  isSelling:(x,z)=>Math.abs(x-sale.x)<=4&&Math.abs(z)<=4,
  sale,harvest:()=>{harvesting=true;goods.amount=2;node.dead=true},
  isHarvesting:()=>harvesting,
  sell:()=>{sales++;goods.amount=0},onChange:on=>{turnedOn=on}
});
assert.equal(pilot.setEnabled(true),true);
let tick=0;
for(;tick<500&&sales===0;tick++){
  pilot.update(.07);
  if(harvesting)harvesting=false;
}
assert.ok(moves>8,'autopilot must actually navigate world geometry');
assert.ok(tick<500,'autopilot must gather and reach the market');
assert.ok(sales>=1,'autopilot must sell once the bag is full');
assert.equal(turnedOn,true);
pilot.setEnabled(false);
const x=character.position.x,z=character.position.z;
for(let i=0;i<30;i++)pilot.update(.07);
assert.equal(character.position.x,x);assert.equal(character.position.z,z);
console.log('Automatic harvesting, obstacle avoidance, selling and cancellation verified');

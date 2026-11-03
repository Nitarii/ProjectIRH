import assert from 'node:assert/strict';
import {normalizeAvatar,AVATAR_STYLES} from '../src/avatar-style.js';
import {avatarBuilderMarkup} from '../src/avatar-ui.js';
for(const lang of ['fr','en']){
  assert.equal(AVATAR_STYLES[lang].tops.length,3);
  assert.equal(AVATAR_STYLES[lang].bottoms.length,3);
  assert.equal(AVATAR_STYLES[lang].hair.length,5);
}
const profile=normalizeAvatar({
  topStyle:2,bottomStyle:1,hairStyle:4,glasses:true,
  topColor:'#ab12EF',bottomColor:'#002244',hairColor:'#f2c09e',
  skinColor:'#8f7654',glassesColor:'#eee1cc',shoeColor:'#241c21'
});
assert.equal(profile.hairStyle,4);assert.equal(profile.glasses,true);
assert.equal(profile.topColor,'#ab12EF');
assert.equal(normalizeAvatar({topStyle:99,hairStyle:15,topColor:'javascript:alert(1)'}).topColor,'#316b72');
const markup=avatarBuilderMarkup(profile,'en');
for(const name of ['topStyle','bottomStyle','hairStyle','glasses',
 'topColor','bottomColor','hairColor','skinColor','glassesColor','shoeColor']){
  assert.ok(markup.includes('data-avatar="'+name+'"'),'missing customization '+name);
}
assert.ok(markup.includes('Long ponytail'));
assert.ok(!markup.includes('javascript:'));
console.log('All garment cuts, five hairstyles, six color channels and creator controls verified');

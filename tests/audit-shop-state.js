'use strict';
const assert=require('node:assert/strict');
const {loadPage}=require('./audit-harness');
let checks=0;
for(const name of ['bow','dress','crown']){
 const ownership={bow:true,dress:true,crown:true,house:true,unknown:{preserve:'synthetic'}};
 const raw=JSON.stringify(ownership),a=loadPage('math.html',{math_owned:raw,math_coins:'50',math_xp:'40'});a.eval('renderPet()');
 assert.equal(a.storage.get('math_owned'),raw);assert.equal(a.storage.get('math_coins'),'50');
 for(let i=0;i<5;i++)a.eval(`buyItem('${name}',999)`);
 assert.equal(a.storage.get('math_owned'),raw);assert.equal(a.storage.get('math_coins'),'50');assert.equal(a.storage.get('math_xp'),'40');
 const b=loadPage('math.html',Object.fromEntries(a.storage));b.eval('renderPet()');assert.equal(b.eval(`owned().${name}`),true);assert.equal(b.eval(`equipped(owned()).${name}`),false);b.eval(`buyItem('${name}',999)`);assert.equal(b.storage.get('math_coins'),'50');assert.equal(b.eval(`equipped(owned()).${name}`),true);checks++;
}
for(const raw of ['null','[]','not-json']){const a=loadPage('math.html',{math_owned:raw,math_coins:'50'});assert.doesNotThrow(()=>a.eval('renderPet()'));assert.equal(a.storage.get('math_owned'),raw);checks++;}
{
 const a=loadPage('math.html',{math_coins:'50',math_xp:'12',math_owned:'{"other":true}'});a.eval("buyItem('bow',-999)");assert.equal(a.storage.get('math_coins'),'45');assert.equal(a.eval('owned().bow'),true);assert.equal(a.eval('owned().other'),true);for(let i=0;i<4;i++)a.eval("buyItem('bow',5)");assert.equal(a.storage.get('math_coins'),'45');a.eval("buyItem('house',25);buyItem('house',25)");assert.equal(a.storage.get('math_coins'),'20');checks++;
}
console.log(`PASS: ${checks} independent shop ownership/equipment/legacy-null audits.`);

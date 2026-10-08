'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function bank(unit){return JSON.parse(fs.readFileSync(path.join(root,`math-unit${unit}.html`),'utf8').match(/var BANK=(\[[\s\S]*?\]), SESSION=/)[1]);}
// Answers independently checked against place-value arithmetic/elementary plane geometry.
// The former u1_33 options had no valid answer; its fixed answer reads 五千五百万零五百.
const expected={1:['十万','70万','300500008','650','364999','不能确定','四千零八万零六','63020050','10,000,000','7200','595万','亿位','80,300,600','不一定','275000','合理','900090009','三个数相等','一亿零三万零四十','8010000','3.5亿','795000','万位','这个数大于或等于119.5万，且小于120.5万','8千万','三亿零五百万六千零七十','420030600','相等','5.6','2250000','减少100万','合理','55,000,500','304020009','相等','755000'],2:['线段','射线','互相垂直','平行','180','60','直线','射线','不可能','平行','直角','钝角','360','2','145','都是90°','1条','1条','中心点','沿对应的那圈刻度读另一边','115°，钝角','112','90°','垂直','直线','平行','垂直','锐角','钝角','40°','53','90','180°','平行线','垂直','52']};
for(const unit of [1,2]){
  const questions=bank(unit);
  assert.equal(questions.length,36);
  assert.equal(new Set(questions.map(q=>q.id)).size,36);
  for(let i=0;i<questions.length;i++){
    const q=questions[i],label=`u${unit}_${String(i+1).padStart(2,'0')}`;
    assert.equal(q.id,label);
    assert.ok(['mc','text'].includes(q.t),label);
    assert.ok(Number.isInteger(q.d)&&q.d>=1&&q.d<=3,label);
    assert.equal(q.h.length,3,label);
    for(const hint of q.h)assert.ok(typeof hint==='string'&&hint.length>0,label);
    if(q.t==='mc'){assert.ok(Number.isInteger(q.a)&&q.a>=0&&q.a<q.o.length,label);assert.equal(new Set(q.o).size,q.o.length,label);}
    const wanted=expected[unit][i];
    if(wanted!==null)assert.equal(q.t==='mc'?q.o[q.a]:q.a,wanted,label+' checked answer');
  }
}
assert.match(bank(1)[23].q,/四舍五入到万位/,'u1_24 explicit rounding premise');
assert.match(bank(1)[4].q,/整数/,'u1_05 maximum requires integer domain');
assert.match(bank(2)[5].q,/内圈60°、外圈120°/,'u2_06 identifies matching scale');
assert.match(bank(2)[29].q,/外圈40°、内圈140°/,'u2_30 identifies matching scale');
assert.match(bank(2)[9].q,/同一平面.*不同/s,'u2_10 plane and distinctness specified');
console.log('PASS: 72 bank entries structurally valid; all72 independently checked answers and key ambiguity regressions match.');

// Human-audited answer ledger for all 72 questions and 216 revised hints.
// The expected answers below are independent of the bank's answer-index fields.
// Source rule for u1_26: Chinese four-digit groups omit trailing zeros within each group.
// Textbook rule: https://r3-ndr.ykt.cbern.com.cn/edu_product/esp/assets_document/654e3d1e-c995-4340-81c5-abd7881d835b.pkg/pdf.pdf (p.5)
// Primary publisher preview: https://www.tup.com.cn/upload/books/yz/078484-01.pdf
// Audit caveat: unit1 21/28/29 involve decimals; textbook edition/progress is unknown.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readBank = u => JSON.parse(fs.readFileSync(path.join(__dirname,`../math-unit${u}.html`),'utf8').match(/var BANK=(\[[\s\S]*?\]), SESSION=/)[1]);
const roundTo = (n,place) => Math.floor(n/place+0.5)*place;
const ANSWERS = {
  1: [
    ['十万','10 × 10000 = 100000'],
    ['70万','7 occupies the hundred-thousands position'],
    [String(3*1e8+50*1e4+8),'3亿 + 50万 + 8'],
    [String(roundTo(6496000,1e4)/1e4),'Round at the thousands digit 6'],
    [String(365000-1),'Integer domain added; 365000 itself rounds to 370000'],
    ['不能确定','3646000 and 3651000 both round to 3650000 and straddle 3648500'],
    ['四千零八万零六','4008 | 0006'],
    [String(6302*1e4+50),'6302 | 0050'],
    ['10,000,000','8 digits versus 7 digits'],
    [String(72000000/1e4),'Exact conversion to 万'],
    ['595万','5949000 rounds to 5950000'],
    ['亿位','10^8 is the first 9-digit place'],
    ['80,300,600','8 × 10^7 + 3 × 10^5 + 6 × 10^2'],
    ['不一定','Exchange may increase, decrease or leave the value unchanged'],
    [String(280000-5000),'Smallest integer rounding to 280000'],
    ['合理','4997800 rounds to 5000000 at 万位; exact unit conversion no longer mislabeled approximate'],
    [String(9*1e8+9*1e4+9),'9 | 0009 | 0009; leading group does not need zero padding'],
    ['三个数相等','7亿 = 70000万 = 700000000'],
    ['一亿零三万零四十','1 | 0003 | 0040; both lower groups begin with zeros'],
    [String(801*1e4),'Strictly above 800万 and below 810万, integer multiples of 万'],
    ['3.5亿','350000000 / 100000000 = 3.5'],
    ['795000','Only this option rounds to 800000'],
    ['万位','9 | 0305 | 0700'],
    ['这个数大于或等于119.5万，且小于120.5万','Rounding-to-万 condition added; lower inclusive, upper exclusive'],
    ['8千万','8 occupies the ten-millions position'],
    ['三亿零五百万六千零七十','Fixed original wrong key B → A; 3 | 0500 | 6070, no extra 零 before 六千'],
    [String(4*1e8+2003*1e4+600),'4 | 2003 | 0600'],
    ['相等','0.89亿 = 8900万'],
    [String(560000000/1e8),'Exact decimal conversion to 亿'],
    [String(2300000-50000),'Lower rounding boundary at 十万位'],
    ['减少100万','(6 − 5) × 10^6'],
    ['合理','7952300 rounds to 8000000 at 百万位'],
    ['55,000,500','Fixed C to 五千五百万零五百: exactly one 零; original C had two'],
    [String(3*1e8+4*1e6+2*1e4+9),'3 | 0402 | 0009'],
    ['相等','4 × 10000万 + 8万 = 40008万'],
    ['755000','Rounds up to 760000; the other two round to 750000']
  ],
  2: [
    ['线段','Two endpoints, finite length'],
    ['射线','One endpoint and one direction in the mathematical model'],
    ['互相垂直','Intersect at a right angle'],
    ['平行','Coplanar straight lines never intersect'],
    [String(360/2),'Half turn'],
    ['60','Explicit inner scale right0/left180 and inner60/outer120 added'],
    ['直线','No endpoints, extends in both directions'],
    ['射线','One endpoint retained when one side extends infinitely'],
    ['不可能','Distinct coplanar lines parallel to the same line are parallel'],
    ['平行','Coplanar and distinct conditions added for common perpendicular'],
    ['直角','Exactly 90 degrees'],
    ['钝角','90 < 135 < 180'],
    [String(4*90),'Full turn'],
    [String(360/180),'Full turn divided by half turn'],
    [String(180-35),'Linear pair'],
    ['都是90°','Repeated supplementary adjacent angles of 90 degrees'],
    ['1条','Unique parallel through external point in plane'],
    ['1条','Unique perpendicular through external point in plane'],
    ['中心点','Protractor center aligns with the vertex'],
    ['沿对应的那圈刻度读另一边','Vertex-center precondition added; use scale beginning at aligned zero'],
    ['115°，钝角','90 + 25 = 115, between 90 and 180'],
    [String(180-68),'Split straight angle'],
    ['90°','360 / 12 × 3'],
    ['垂直','Adjacent rectangle sides form a right angle'],
    ['直线','Extending the ray in the opposite direction removes its only endpoint'],
    ['平行','Opposite sides of a rectangle'],
    ['垂直','Adjacent sides of a square'],
    ['锐角','0 < 89 < 90'],
    ['钝角','90 < 179 < 180'],
    ['40°','Explicit outer scale left0/right180 and outer40/inner140 added'],
    [String(90-37),'Split right angle'],
    [String((360-180)/2),'Remaining half turn split equally'],
    ['180°','Opposite directions at 6:00'],
    ['平行线','Coplanar parallel railway idealization'],
    ['垂直','Coplanarity added; perpendicular to one parallel is perpendicular to the other'],
    [String(180-128),'Linear pair']
  ]
};
for(const unit of [1,2]) {
  const bank=readBank(unit);
  test(`unit ${unit}: exactly 36 questions and 108 complete hints`,()=>{
    assert.equal(bank.length,36);assert.equal(bank.flatMap(q=>q.h).length,108);
    bank.forEach((q,i)=>{
      assert.equal(q.id,`u${unit}_${String(i+1).padStart(2,'0')}`);
      assert.equal(q.h.length,3);q.h.forEach(h=>assert.ok(typeof h==='string'&&h.length>5));
      assert.ok([1,2,3].includes(q.d));assert.ok(['mc','text'].includes(q.t));
      if(q.t==='mc'){assert.equal(q.o.length,3);assert.equal(new Set(q.o).size,q.o.length);assert.ok(Number.isInteger(q.a)&&q.a>=0&&q.a<q.o.length);}
      else {assert.equal(typeof q.a,'string');assert.ok(Array.isArray(q.alts));}
    });
  });
  bank.forEach((q,i)=>test(`${q.id}: ${ANSWERS[unit][i][1]}`,()=>{
    assert.equal(q.t==='mc'?q.o[q.a]:q.a,ANSWERS[unit][i][0]);
  }));
}
function read4(n) {
  const digits='零一二三四五六七八九', places=['千','百','十',''];
  const chars=String(n).padStart(4,'0');let out='',zero=false;
  for(let i=0;i<4;i++){
    const d=Number(chars[i]);
    if(!d){if(out)zero=true;continue;}
    if(zero)out+='零';out+=digits[d]+places[i];zero=false;
  }
  return out;
}
function chinese(n) {
  const groups=[Math.floor(n/1e8),Math.floor(n/1e4)%10000,n%10000],units=['亿','万',''];let out='',gap=false;
  groups.forEach((g,i)=>{
    if(!g){if(out)gap=true;return;}
    if(out&&(gap||g<1000))out+='零';out+=read4(g)+units[i];gap=false;
  });return out||'零';
}
test('zero-reading options have exactly one correct match under four-digit grouping',()=>{
  const b=readBank(1),q26=b.find(q=>q.id==='u1_26'),q33=b.find(q=>q.id==='u1_33');
  assert.equal(chinese(305006070),'三亿零五百万六千零七十');assert.equal(q26.o.filter(x=>x===chinese(305006070)).length,1);
  const zeroCounts=q33.o.map(s=>(chinese(Number(s.replaceAll(',',''))).match(/零/g)||[]).length);
  assert.deepEqual(zeroCounts,[2,0,1]);assert.equal(zeroCounts[q33.a],1);
});
test('rounding boundaries include lower endpoint and exclude upper endpoint',()=>{
  for(const [place,target] of [[1e4,360000],[1e4,280000],[1e4,1200000],[1e5,2300000],[1e4,750000]]){
    const lo=target-place/2,hi=target+place/2;
    assert.equal(roundTo(lo,place),target);assert.equal(roundTo(hi-1,place),target);assert.notEqual(roundTo(hi,place),target);
  }
  const b=readBank(1);assert.match(b.find(q=>q.id==='u1_05').q,/整数/);assert.match(b.find(q=>q.id==='u1_24').q,/四舍五入到万位/);
});
test('protractor alternatives include explicit origin, direction and both scale labels',()=>{
  const b=readBank(2),q6=b.find(q=>q.id==='u2_06'),q30=b.find(q=>q.id==='u2_30');
  assert.match(q6.q,/内圈从右侧0°读到左侧180°/);assert.match(q6.q,/内圈60°、外圈120°/);assert.match(q6.q,/顶点已对准中心/);
  assert.match(q30.q,/外圈从左侧0°读到右侧180°/);assert.match(q30.q,/外圈40°、内圈140°/);assert.ok(!q30.q.includes('量角器的一条边'));
});
test('geometry relations specify coplanarity and distinctness when required',()=>{
  const b=readBank(2);
  for(const id of ['u2_09','u2_10','u2_17','u2_18','u2_35'])assert.match(b.find(q=>q.id===id).q,/同一平面内/);
  for(const id of ['u2_09','u2_10'])assert.match(b.find(q=>q.id===id).q,/不同/);
});

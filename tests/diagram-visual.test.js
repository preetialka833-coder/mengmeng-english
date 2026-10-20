'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {loadPage}=require('./audit-harness');
const data=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/math-original-banks.json')));
test('axial cut projects two complete parallel diameters with all four corners on the cylinder rims',()=>{
 const q=data.banks[6].find(x=>x.id==='u6_02'),p=q.audit.model.projection,actual=q.diagram.match(/data-cut-plane="axis" points="([^"]+)"/)[1].split(' ').map(pair=>pair.split(',').map(Number)),[A,B,C,D]=actual;
 assert.deepEqual(actual,p.vertices);
 for(const [i,v] of actual.entries()){const cy=i<2?p.topCy:p.bottomCy;assert.ok(Math.abs(((v[0]-p.cx)/p.rx)**2+((v[1]-cy)/p.ry)**2-1)<1e-12);}
 assert.deepEqual([(A[0]+B[0])/2,(A[1]+B[1])/2],[p.cx,p.topCy]);assert.deepEqual([(C[0]+D[0])/2,(C[1]+D[1])/2],[p.cx,p.bottomCy]);
 assert.equal(A[0],D[0]);assert.equal(B[0],C[0]);assert.equal(D[1]-A[1],p.bottomCy-p.topCy);assert.equal(C[1]-B[1],p.bottomCy-p.topCy);
 assert.ok(q.diagram.includes('data-cut-plane="axis"'));assert.doesNotMatch(q.q,/实际截面为长方形/);assert.match(q.h[2],/实际截面为长方形/);assert.equal(q.a,'2');
});
test('sightline and lamp wording state equal horizontal distances and equal poles without contradictory heights',()=>{
 for(const q of data.banks[4].slice(0,2)){assert.match(q.q,/水平距离相等/);assert.doesNotMatch(q.q,/穿过墙的中间|直线经过墙的中间/);assert.match(q.h[1],/经过墙所在位置时的高度/);}
 const q=data.banks[4].find(x=>x.id==='u4_03');assert.equal(q.h[1],'路灯高度不变，两根杆同样高。比较图中两段彩色影子的长度。');
});
test('all14diagram captions expose conditions outside SVG and zoom does not call a learning-assistance operation',()=>{
 for(const u of [4,6]){const a=loadPage(`math-unit${u}.html`);assert.ok(a.eval('BANK.every(q=>q.diagramCaption&&q.diagram.includes(q.diagramCaption))'));const fn=a.eval('openDiagramZoom.toString()');assert.doesNotMatch(fn,/openHint|knowledgeHelp|saveSession|assisted\[/);}
});

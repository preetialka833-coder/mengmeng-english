// Synthetic state only. Run: node --test tests/math-practice.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function boot(unit, storage = {}, search = '', blocked = false) {
  const file = unit === 'shop' ? 'math.html' : `math-unit${unit}.html`;
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const nodes = {}, listeners = {}, alerts = [];
  const el = id => nodes[id] ||= {id, innerHTML:'', textContent:'', value:'', className:'', hidden:false, style:{}, focus(){}, scrollIntoView(){}};
  const localStorage = {
    getItem(k){if(blocked)throw Error('Blocked storage');return storage[k]??null;},
    setItem(k,v){if(blocked)throw Error('Blocked storage');storage[k]=String(v);}
  };
  let seed = 13579;
  const math = Object.create(Math);math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const context = vm.createContext({console, Math:math, Date, localStorage, location:{search}, alert:m=>alerts.push(m),
    document:{getElementById:el,getElementsByClassName:()=>[]},
    window:{confirm:()=>true,addEventListener:(name,fn)=>listeners[name]=fn}});
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  if(unit==='shop')context.renderPet();
  return {c:context,storage,nodes,el,html,listeners,alerts};
}
function queue(app, ids) {
  const c=app.c;c.picked=ids.map(id=>c.BANK.find(q=>q.id===id));c.current=0;c.tries={};c.finished={};
  c.assisted={};c.hintLevels={};c.answers={};c.outcomes={};c.recount();c.saveSession();c.render();
}
function correct(app) {
  const c=app.c, q=c.picked[c.current];
  if(q.t==='mc')c.checkMC(c.current,q.a);else{app.el(`q${c.current}input`).value=q.a;c.checkText(c.current);}
}
for(const unit of [1,2]) {
  test(`unit ${unit}: 36 stable IDs, random set 8 distinct, only one question rendered`,()=>{
    const a=boot(unit),c=a.c;assert.equal(c.BANK.length,36);assert.equal(new Set(c.BANK.map(q=>q.id)).size,36);
    assert.equal(c.picked.length,8);assert.equal(new Set(c.picked.map(q=>q.id)).size,8);
    assert.equal((a.el('questions').innerHTML.match(/class="card questionCard"/g)||[]).length,1);
    assert.ok(a.html.includes('class="card knowledge"><summary>'));assert.ok(!a.html.includes('class="card knowledge" open'));
    assert.match(a.html,/white-space:pre-line/);assert.ok(!a.html.includes('user-scalable=no'));
  });
  test(`unit ${unit}: topic uses actual question count; invalid topic falls back safely`,()=>{
    const base=boot(unit),topic=base.c.BANK[0].k,n=base.c.BANK.filter(q=>q.k===topic).length;
    const a=boot(unit,{},'?topic='+encodeURIComponent(topic));assert.equal(a.c.picked.length,Math.min(n,8));assert.ok(a.c.picked.every(q=>q.k===topic));
    assert.equal(boot(unit,{},'?topic=unknown').c.picked.length,8);
    assert.equal(boot(unit,{},'?topic=%ZZ').c.picked.length,8);
  });
  test(`unit ${unit}: two independent completions establish mastery without duplicate rewards`,()=>{
    const a=boot(unit),c=a.c,id=`u${unit}_01`;queue(a,[id]);correct(a);
    assert.equal(c.score,1);assert.equal(c.done,1);assert.equal(c.st(id).independentStreak,1);
    correct(a);assert.equal(a.storage.math_xp,'1');assert.equal(a.storage.math_coins,String(c.picked[0].d));
    const reload=boot(unit,a.storage);assert.equal(reload.c.finished[0],true);correct(reload);assert.equal(a.storage.math_xp,'1');
    queue(reload,[id]);correct(reload);assert.equal(reload.c.st(id).independentStreak,2);assert.equal(a.storage.math_xp,'2');
  });
  test(`unit ${unit}: any of 3 hints survives refresh and excludes independent mastery`,()=>{
    for(let level=0;level<3;level++){
      const a=boot(unit),id=`u${unit}_01`;queue(a,[id]);a.c.st(id).independentStreak=1;a.c.openHint(0,level);
      assert.equal(a.c.assisted[0],true);assert.equal(a.c.st(id).independentStreak,0);
      const reload=boot(unit,a.storage);assert.equal(reload.c.assisted[0],true);assert.equal(reload.c.hintLevels[0][level],true);
      correct(reload);assert.equal(reload.c.score,0);assert.equal(reload.c.done,1);assert.equal(reload.c.st(id).independentStreak,0);
      assert.equal(reload.c.st(id).assistedTotal,1);assert.equal(a.storage.math_xp,'1');
    }
  });
  test(`unit ${unit}: wrong then refresh then correct keeps retry feedback and assisted result`,()=>{
    const a=boot(unit),id=`u${unit}_01`;queue(a,[id]);a.c.checkMC(0,1);assert.equal(a.c.tries[0],1);assert.equal(a.c.st(id).wrong,1);
    const b=boot(unit,a.storage);assert.equal(b.c.tries[0],1);assert.equal(b.c.answers[0],1);assert.match(b.el('fb0').textContent,/还不对/);
    correct(b);assert.equal(b.c.outcomes[0],'assisted');assert.equal(b.c.score,0);assert.equal(b.c.st(id).independentStreak,0);
  });
  test(`unit ${unit}: completed hint reads cannot retroactively change independent outcome`,()=>{
    const a=boot(unit);queue(a,[`u${unit}_01`]);correct(a);a.c.openHint(0,0);assert.equal(a.c.score,1);assert.equal(a.c.st(a.c.picked[0].id).independentStreak,1);
  });
  test(`unit ${unit}: previous/next respect completion and keep queue on reload`,()=>{
    const a=boot(unit),ids=Array.from(a.c.picked,q=>q.id);a.c.goQuestion(1);assert.equal(a.c.current,0);correct(a);a.c.goQuestion(1);assert.equal(a.c.current,1);
    const b=boot(unit,a.storage);assert.deepEqual(Array.from(b.c.picked,q=>q.id),ids);assert.equal(b.c.current,1);
    b.c.goQuestion(-1);assert.equal(b.c.current,0);assert.equal(b.c.finished[0],true);b.c.goQuestion(1);assert.equal(b.c.current,1);
    // A forged attempt at an invisible question cannot mark it done.
    b.c.checkMC(2,b.c.picked[2].a);assert.equal(!!b.c.finished[2],false);
  });
  test(`unit ${unit}: complete all 8 with truthful independent and assisted summary`,()=>{
    const a=boot(unit),c=a.c;let coins=0;
    for(let i=0;i<8;i++){if(i===0)c.openHint(i,0);coins+=c.picked[i].d;correct(a);if(i<7)c.goQuestion(1);}
    assert.equal(c.done,8);assert.equal(c.score,7);assert.equal(a.el('groupSummary').hidden,false);
    assert.match(a.el('groupSummary').textContent,/独立答对 7 题/);assert.equal(a.storage.math_xp,'8');assert.equal(a.storage.math_coins,String(coins));
    const b=boot(unit,a.storage);assert.equal(b.c.done,8);assert.equal(b.c.score,7);assert.equal(a.storage.math_xp,'8');
  });
  test(`unit ${unit}: empty text is not a wrong attempt; formatting and unit alternatives accepted`,()=>{
    const a=boot(unit),q=a.c.BANK.find(q=>q.t==='text');queue(a,[q.id]);a.el('q0input').value='  ';a.c.checkText(0);assert.equal(a.c.tries[0],undefined);assert.equal(a.c.assisted[0],undefined);
    a.el('q0input').value=String(q.a).replace(/[0-9]/g,d=>String.fromCharCode(d.charCodeAt(0)+0xfee0));a.c.checkText(0);assert.equal(a.c.finished[0],true);
    const unitQ=a.c.BANK.find(q=>q.t==='text'&&q.alts.length);queue(a,[unitQ.id]);a.el('q0input').value=unitQ.alts[0];a.c.checkText(0);assert.equal(a.c.finished[0],true);
  });
  test(`unit ${unit}: old records/unknown fields preserved without trusting old hinted successes`,()=>{
    const key=`math-unit${unit}_bank_stats_v1`,id=`u${unit}_01`,record={ok:9,wrong:3,last:12345,custom:'keep'};
    const storage={[key]:JSON.stringify({[id]:record,legacyExtra:{note:'keep'}}),math_xp:'80',math_coins:'90',math_owned:'{"bow":true}'};
    const a=boot(unit,storage);assert.equal(a.c.st(id).ok,9);assert.equal(a.c.st(id).legacyOk,9);assert.equal(a.c.st(id).independentStreak,0);
    assert.equal(a.c.st(id).wrong,3);assert.equal(a.c.st(id).last,12345);assert.equal(a.c.st(id).custom,'keep');
    queue(a,[id]);correct(a);const saved=JSON.parse(storage[key]);assert.equal(saved[id].independentStreak,1);assert.equal(saved[id].ok,10);assert.equal(saved.legacyExtra.note,'keep');assert.equal(saved[id].custom,'keep');
    assert.equal(storage.math_xp,'81');assert.equal(storage.math_coins,'91');assert.equal(storage.math_owned,'{"bow":true}');
  });
  test(`unit ${unit}: malformed old stats are protected; malformed session recovers`,()=>{
    const key=`math-unit${unit}_bank_stats_v1`;
    for(const bad of ['{bad','null','[]','4']){
      const storage={[key]:bad};const a=boot(unit,storage);correct(a);assert.equal(storage[key],bad);assert.equal(a.c.statsUnreadable,true);assert.equal(a.el('storageNotice').hidden,false);
    }
    const a=boot(unit);a.storage[a.c.SESSION_KEY]='{bad';const b=boot(unit,a.storage);assert.equal(b.c.picked.length,8);assert.equal(b.c.done,0);
  });
  test(`unit ${unit}: blocked storage permits practice with visible warning`,()=>{
    const a=boot(unit,{},'',true);assert.equal(a.c.picked.length,8);assert.equal(a.el('storageNotice').hidden,false);correct(a);assert.equal(a.c.done,1);
  });
  test(`unit ${unit}: incomplete replacement can be canceled; topic sessions are separate`,()=>{
    const a=boot(unit);a.c.openHint(0,0);const id=a.c.sessionId;a.c.window.confirm=()=>false;a.c.startNewGroup();assert.equal(a.c.sessionId,id);assert.equal(a.c.assisted[0],true);
    const b=boot(unit,a.storage,'?topic='+encodeURIComponent(a.c.BANK[0].k));assert.notEqual(a.c.SESSION_KEY,b.c.SESSION_KEY);
    const c=boot(unit,a.storage);assert.equal(c.c.sessionId,id);assert.equal(c.c.assisted[0],true);
  });
  test(`unit ${unit}: failed session completion save cannot mint repeat rewards`,()=>{
    const a=boot(unit);queue(a,[`u${unit}_01`]);
    const write=a.c.localStorage.setItem;
    a.c.localStorage.setItem=(key,value)=>{if(key===a.c.SESSION_KEY)throw Error('Synthetic session quota error');write(key,value);};
    correct(a);assert.equal(a.c.done,1);assert.equal(a.storage.math_xp,undefined);assert.equal(a.storage.math_coins,undefined);assert.equal(a.el('storageNotice').hidden,false);
    const b=boot(unit,a.storage);assert.equal(!!b.c.finished[0],false);correct(b);assert.equal(a.storage.math_xp,'1');
  });
  test(`unit ${unit}: weights prioritize mistakes and due work without expanded arrays`,()=>{
    const a=boot(unit),c=a.c,q=c.BANK[0],s=c.st(q.id);s.last=Date.now();s.wrong=0;s.independentStreak=2;
    const stable=c.weight(q);s.independentStreak=0;const newWeight=c.weight(q);assert.ok(newWeight>stable);
    s.wrong=3;assert.ok(c.weight(q)>newWeight);const recent=c.weight(q);s.last=Date.now()-21*60*60*1000;assert.ok(c.weight(q)>recent);
    s.wrong=1e20;assert.ok(c.weight(q)<100);c.choose();assert.equal(c.picked.length,8);
  });
  test(`unit ${unit}: storage events refresh state without awarding again`,()=>{
    const a=boot(unit);queue(a,[`u${unit}_01`]);const b=boot(unit,a.storage);correct(a);b.listeners.storage({key:b.c.KEY});b.listeners.storage({key:b.c.SESSION_KEY});assert.equal(b.c.finished[0],true);assert.equal(b.c.score,1);assert.equal(a.storage.math_xp,'1');
  });
}
test('unit engines stay identical aside from bank and legacy stats key',()=>{
  const engine=u=>fs.readFileSync(path.join(root,`math-unit${u}.html`),'utf8').split('// Keep the original stats and reward keys.')[1];
  assert.equal(engine(1),engine(2));
});
test('shop: buy, unequip, reload and re-equip never recharge ownership',()=>{
  const a=boot('shop',{math_coins:'100',math_xp:'23'});a.c.buyItem('bow',5);assert.equal(a.storage.math_coins,'95');assert.equal(JSON.parse(a.storage.math_owned).bow,true);
  a.c.buyItem('bow',5);assert.equal(JSON.parse(a.storage.math_owned).bow,true);assert.equal(JSON.parse(a.storage.math_equipped).bow,false);assert.equal(a.storage.math_coins,'95');
  const b=boot('shop',a.storage);assert.equal(b.el('wearBow').style.display,'none');b.c.buyItem('bow',5);assert.equal(b.el('wearBow').style.display,'block');assert.equal(a.storage.math_coins,'95');assert.equal(a.storage.math_xp,'23');
});
test('shop: legacy ownership migrates equipped state and house stays purchased',()=>{
  const a=boot('shop',{math_coins:'100',math_owned:'{"bow":true,"dress":true,"house":true,"extra":"keep"}'});
  assert.equal(a.el('wearBow').style.display,'block');assert.equal(a.el('wearDress').style.display,'block');a.c.buyItem('house',25);assert.equal(a.storage.math_coins,'100');
  a.c.buyItem('dress',10);a.c.buyItem('dress',10);assert.equal(a.storage.math_coins,'100');assert.equal(JSON.parse(a.storage.math_owned).extra,'keep');
});
test('shop: insufficient funds and unknown items never spend',()=>{
  const a=boot('shop',{math_coins:'1'});a.c.buyItem('crown',20);a.c.buyItem('fake',-100);assert.equal(a.storage.math_coins,'1');assert.equal(a.storage.math_owned,undefined);
});
module.exports={boot,queue,correct};

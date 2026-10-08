'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../english.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const KEY='mengmeng_v4_unit1';
const BACKUP_KEY=KEY+'_before_review_v2',BACKUP_INFO_KEY=BACKUP_KEY+'_info';
function createApp({state,raw,storage,now=new Date(2026,9,7,9).getTime(),failWrites=false,failWriteKeys=[],mutateWrite}={}){
  const data=storage||new Map();
  if(state!==undefined)data.set(KEY,JSON.stringify(state));
  if(raw!==undefined)data.set(KEY,raw);
  let clock=now,nextTimer=1;
  const timers=new Map(),alerts=[],listeners={};
  function element(id=''){
    const classes=new Set(id==='home'?['active']:[]);
    return {id,style:{},children:[],textContent:'',innerHTML:'',value:'',tagName:'DIV',
      className:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
      appendChild(x){this.children.push(x);},setAttribute(){}};
  }
  const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element(m[1])]));
  class MockDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
  const context={...nodes,Date:MockDate,console,Math,JSON,Map,Set,Number,String,Array,Object,
    localStorage:{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{if(failWrites||failWriteKeys.includes(k))throw Error('quota');data.set(k,mutateWrite?mutateWrite(k,v):v);}},
    document:{getElementById:id=>nodes[id],createElement:()=>element(),
      querySelectorAll:selector=>selector==='.screen'?['home','learn','parent','rewards'].map(id=>nodes[id]):Object.values(nodes).filter(n=>n.id.startsWith('nav-')),
      addEventListener:(name,fn)=>{listeners[name]=fn;}},
    window:{addEventListener:(name,fn)=>{listeners[name]=fn;}},
    setTimeout:fn=>{const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    alert:text=>alerts.push(text),prompt:()=>null,navigator:{clipboard:{writeText:async()=>{}}},
    btoa:text=>Buffer.from(text,'binary').toString('base64'),atob:text=>Buffer.from(text,'base64').toString('binary'),
    escape,unescape,encodeURIComponent,decodeURIComponent};
  vm.createContext(context);vm.runInContext(script,context,{filename:'english.html'});
  const run=code=>vm.runInContext(code,context);
  return {run,nodes,alerts,listeners,storage:data,context,setNow:value=>{clock=value;},now:()=>clock,
    flush(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}},
    snapshot(){return JSON.parse(run('JSON.stringify(S)'));},
    json(code){return JSON.parse(run(`JSON.stringify(${code})`));}};
}
function learnedFixture(now=new Date(2026,9,7,9).getTime()){
  const a=createApp({now}),state={meta:{day:14,stickers:13,doneDays:{},graduated:false}};
  for(const x of a.json('allItems()'))state[x.kind+'|'+x.en]={seen:1,wrong:0,passed:1,reviewStep:1,lastReview:new Date(2026,8,1,9).getTime(),learnedDay:'2026-09-01',dueDay:'2050-01-01',due:new Date(2050,0,1).getTime()};
  return state;
}
function submit(app,text){app.context.testAnswer=text;app.run('typed=testAnswer;activeEntry().typed=typed;submitAnswer()');}
function completeNew(app){
  while(app.run('!!current')&&app.run('current._mode')==='new'){
    const key=app.run('itemKey(current)');
    while(app.run('!!current&&itemKey(current)')===key){
      const stage=app.run('stage');
      if(stage<=1)app.run('advance()');
      else if(stage===2){const target=app.run('current.en');const buttons=app.nodes.choiceGrid.children;buttons.findLast(b=>b.textContent===target).onclick();app.flush();}
      else {submit(app,app.run('current.en'));app.flush();}
    }
    return;
  }
}
module.exports={createApp,learnedFixture,submit,completeNew,KEY,BACKUP_KEY,BACKUP_INFO_KEY,html,script};

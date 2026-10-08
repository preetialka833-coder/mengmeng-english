'use strict';
// Independent, synthetic-only state audit. This emulates DOM calls, not a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function loadPage(name, seed = {}, options = {}) {
  const root = options.root || path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const elements = new Map(), storage = new Map(Object.entries(seed));
  const writes = [], alerts = [], timers = new Map(), listeners = {};
  let now = options.now === undefined ? new Date('2026-10-07T12:00:00Z').getTime() : typeof options.now === 'string' ? new Date(options.now).getTime() : options.now, nextTimer = 1;
  function node(id = '') {
    let classes = new Set();
    const n = {id, style: {}, dataset: {}, children: [], value: '', textContent: '', disabled: false,
      attributes: {}, listeners: {}, open: false,
      appendChild(child) { this.children.push(child); return child; },
      setAttribute(k,v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] ?? null; },
      removeAttribute(k) { delete this.attributes[k]; },
      addEventListener(k,f) { (this.listeners[k] ||= []).push(f); },
      removeEventListener() {},
      dispatchEvent(event) { for(const f of this.listeners[event.type]||[])f(event); if(this['on'+event.type])this['on'+event.type](event); },
      focus() {}, blur() {}, scrollIntoView() {}, click() { if(!this.disabled && this.onclick)this.onclick({currentTarget:this, target:this, preventDefault(){}}); },
      querySelectorAll() { return this.children; }, querySelector() { return this.children[0]||null; }
    };
    Object.defineProperty(n,'className',{get:()=>[...classes].join(' '),set:v=>{classes=new Set(String(v).split(/\s+/).filter(Boolean));}});
    Object.defineProperty(n,'innerHTML',{get:()=>n._innerHTML||'',set:v=>{n._innerHTML=String(v);n.children=[];}});
    n.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v),toggle(v, force){const present=force===undefined?!classes.has(v):force;present?classes.add(v):classes.delete(v);return present;}};
    return n;
  }
  function get(id) { if(!elements.has(id))elements.set(id,node(id)); return elements.get(id); }
  for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) { const el=get(m[1]);el.className=(m[0].match(/\bclass="([^"]+)"/)||[])[1]||''; }
  const document={getElementById:get,createElement:()=>node(),
    querySelectorAll(selector){if(selector==='.screen')return ['home','learn','rewards','parent'].map(get);if(selector==='nav button')return ['nav-home','nav-learn','nav-rewards','nav-parent'].map(get);return [];},
    querySelector(selector){return selector.startsWith('#')?get(selector.slice(1)):null;},
    getElementsByClassName(){return [];},addEventListener(k,f){(listeners[k]||=[]).push(f);},body:node('body')};
  class FakeDate extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const context={console, Date:FakeDate, document,
    localStorage:{getItem:k=>{if(options.denyReads)throw Error('synthetic read denial');return storage.get(k)??null;},setItem(k,v){if(options.denyWrites)throw Error('synthetic write denial');storage.set(k,String(v));writes.push([k,String(v)]);},removeItem(k){storage.delete(k);},clear(){storage.clear();}},
    location:{search:options.search||'',href:'https://synthetic.invalid/'+name,reload(){}},navigator:{clipboard:{writeText:async()=>{}}},
    alert:t=>alerts.push(String(t)),confirm:()=>options.confirm!==false,prompt:()=>options.prompt??null,
    setTimeout(f){const id=nextTimer++;timers.set(id,f);return id;},clearTimeout:id=>timers.delete(id),
    setInterval(){return 0;},clearInterval(){}, btoa:v=>Buffer.from(v,'binary').toString('base64'),atob:v=>Buffer.from(v,'base64').toString('binary'),
    Event:class {constructor(type){this.type=type;}},
    addEventListener(k,f){(listeners[k]||=[]).push(f);},removeEventListener(){},
  };
  context.window=context; Object.assign(context,Object.fromEntries(elements));
  vm.createContext(context);
  for(const [i,match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())vm.runInContext(match[1],context,{filename:`${name}:script${i}`});
  return {context, storage,writes,alerts,elements,timers,listeners,get,
    eval:code=>vm.runInContext(code,context),
    json:code=>JSON.parse(vm.runInContext(`JSON.stringify(${code})`,context)),
    setNow:v=>{now=typeof v==='string'?new Date(v).getTime():v;},
    flush(){const pending=[...timers.values()];timers.clear();for(const f of pending)f();},
    emit(type,event={}){for(const f of listeners[type]||[])f(event);}
  };
}
module.exports={loadPage};

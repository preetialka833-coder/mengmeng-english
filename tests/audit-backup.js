'use strict';
// Independent safety scenarios. All storage is synthetic and in memory.
const assert=require('node:assert/strict');
const {createApp,KEY,BACKUP_KEY,BACKUP_INFO_KEY}=require('./english-harness');
const tests=[];
function test(name,run){tests.push([name,run]);}
const raw=' \t{\n "meta":{"day":4,"stickers":2,"doneDays":{"d1":true},"graduated":false},\n "foreign":{"unicode":"保留😀","nullEscape":"\\u0000","order":[3,2,1]}, "word|sport":{"passed":1,"seen":8,"wrong":2,"due":0}\n}\n ';
const incoming=a=>a.run('encodeState({meta:{day:2,stickers:1,doneDays:{},graduated:false},imported:true})');
const decoded=a=>Buffer.from(a.nodes.progressCode.textContent,'base64').toString('utf8');
class ReadFailureMap extends Map {
 constructor(entries,key,at){super(entries);this.key=key;this.at=at;this.hits=0;}
 get(key){if(key===this.key&&++this.hits===this.at)throw Error('synthetic read denied');return super.get(key);}
}

test('Unicode, whitespace, field order and corrupt source strings survive exact raw backup/export',()=>{
 for(const original of [raw,'  {bad json\n','null','[]','','\u0000corrupt']){
  const a=createApp({raw:original});assert.equal(a.storage.get(BACKUP_KEY),original);const active=a.storage.get(KEY);a.run('exportOriginalBackup()');assert.equal(decoded(a),original);assert.equal(a.storage.get(KEY),active);
 }
});
test('raw snapshot and integrity receipt are both written before first active migration',()=>{
 const writes=[];createApp({raw,mutateWrite:(key,value)=>{writes.push([key,value]);return value;}});
 assert.deepEqual(writes.slice(0,3).map(x=>x[0]),[BACKUP_KEY,BACKUP_INFO_KEY,KEY]);assert.equal(writes[0][1],raw);
});
test('denied source, snapshot, readback or receipt reads never overwrite the original',()=>{
 for(const [key,at] of [[KEY,1],[BACKUP_KEY,1],[BACKUP_KEY,2],[BACKUP_INFO_KEY,1]]){
  const storage=new ReadFailureMap([[KEY,raw]],key,at),a=createApp({storage});a.run('startToday();save();refresh()');assert.equal(Map.prototype.get.call(storage,KEY),raw);assert.ok(a.run('storageWarning'));
 }
});
test('quota failure for snapshot or receipt blocks practice writes and import writes',()=>{
 for(const key of [BACKUP_KEY,BACKUP_INFO_KEY]){
  const a=createApp({raw,failWriteKeys:[key]});a.run('startToday();tap("x");save()');assert.equal(a.storage.get(KEY),raw);const before=a.snapshot();a.nodes.importCode.value=incoming(a);a.run('importProgress()');assert.deepEqual(a.snapshot(),before);assert.equal(a.storage.get(KEY),raw);
 }
});
test('altered snapshot or receipt readback blocks active writes and remains safe on reload',()=>{
 for(const key of [BACKUP_KEY,BACKUP_INFO_KEY]){
  const a=createApp({raw,mutateWrite:(k,value)=>k===key?value+'!':value});assert.equal(a.storage.get(KEY),raw);const backup=a.storage.get(BACKUP_KEY),receipt=a.storage.get(BACKUP_INFO_KEY);const b=createApp({storage:a.storage});b.run('save()');assert.equal(b.storage.get(KEY),raw);assert.equal(b.storage.get(BACKUP_KEY),backup);assert.equal(b.storage.get(BACKUP_INFO_KEY),receipt);b.run('exportOriginalBackup()');assert.equal(decoded(b),raw);
 }
});
test('verified original snapshot and receipt stay immutable through reloads/imports/exports',()=>{
 let a=createApp({raw});const receipt=a.storage.get(BACKUP_INFO_KEY);
 for(let i=0;i<3;i++)a=createApp({storage:a.storage});
 for(let i=0;i<3;i++){a.nodes.importCode.value=incoming(a);a.run('importProgress()');assert.equal(a.storage.get(BACKUP_KEY),raw);assert.equal(a.storage.get(BACKUP_INFO_KEY),receipt);}
 const active=a.storage.get(KEY),state=a.snapshot();a.run('show("parent");exportOriginalBackup()');assert.equal(decoded(a),raw);assert.equal(a.storage.get(KEY),active);assert.deepEqual(a.snapshot(),state);
});
test('fresh install remains unsnapshotted across reloads; first later import backs up actual pre-import value',()=>{
 let a=createApp();a.run('startToday();advance();save()');
 for(let i=0;i<3;i++){a=createApp({storage:a.storage});a.run('startToday();save()');assert.equal(a.storage.has(BACKUP_KEY),false);assert.equal(a.storage.has(BACKUP_INFO_KEY),false);}
 const before=a.storage.get(KEY);a.nodes.importCode.value=incoming(a);a.run('importProgress()');assert.equal(a.storage.get(BACKUP_KEY),before);assert.equal(JSON.parse(a.storage.get(BACKUP_INFO_KEY)).origin,'before-import');a.run('exportOriginalBackup()');assert.equal(decoded(a),before);assert.equal(a.run('S.imported'),true);
});
test('fresh-install export button does not create a misleading upgrade snapshot or restore state',()=>{
 let a=createApp();a=createApp({storage:a.storage});const before=a.storage.get(KEY),state=a.snapshot();a.run('exportOriginalBackup()');assert.equal(a.storage.has(BACKUP_KEY),false);assert.equal(a.storage.get(KEY),before);assert.deepEqual(a.snapshot(),state);assert.match(a.alerts.at(-1),/没有升级前备份码/);
});
test('existing mismatched or unverified backups are never replaced to force recovery',()=>{
 for(const receipt of [undefined,'broken',JSON.stringify({version:1,checksum:'wrong'})]){
  const storage=new Map([[KEY,raw],[BACKUP_KEY,'existing-unverified-copy']]);if(receipt!==undefined)storage.set(BACKUP_INFO_KEY,receipt);const a=createApp({storage});a.run('save()');a.nodes.importCode.value=incoming(a);a.run('importProgress()');assert.equal(storage.get(KEY),raw);assert.equal(storage.get(BACKUP_KEY),'existing-unverified-copy');assert.equal(storage.get(BACKUP_INFO_KEY),receipt);
 }
});
test('matching partial snapshot can gain a receipt without rewriting its raw bytes',()=>{
 const storage=new Map([[KEY,raw],[BACKUP_KEY,raw]]),writes=[];const a=createApp({storage,mutateWrite:(key,value)=>{writes.push(key);return value;}});assert.equal(writes.includes(BACKUP_KEY),false);assert.equal(storage.get(BACKUP_KEY),raw);assert.ok(storage.has(BACKUP_INFO_KEY));assert.notEqual(storage.get(KEY),raw);
});
let failed=0;for(const[name,run]of tests){try{run();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}if(failed)process.exitCode=1;else console.log(`PASS: all ${tests.length} independent raw-backup safety audits.`);

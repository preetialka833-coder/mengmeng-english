'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp,KEY,BACKUP_KEY,BACKUP_INFO_KEY}=require('./english-harness');
const legacyRaw='  {\n "meta": {"day": 8, "stickers": 7, "doneDays": {"d1": true}, "graduated": true, "cat": {"name": "咪咪"}},\n "word|sport": {"seen": 9, "wrong": 2, "passed": 1, "due": 0, "extra": ["保留", 42]}, "shop": {"coins": 99}\n}\n';
function decodedCode(a){return Buffer.from(a.nodes.progressCode.textContent,'base64').toString('utf8');}
function incoming(a){return a.run('encodeState({meta:{day:2,stickers:1,doneDays:{},graduated:false},imported:true})');}

test('exact original raw bytes are verified before any active migration write',()=>{
  const writes=[];
  const a=createApp({raw:legacyRaw,mutateWrite:(key,value)=>{writes.push(key);return value;}});
  assert.equal(a.storage.get(BACKUP_KEY),legacyRaw);
  assert.deepEqual(writes.slice(0,3),[BACKUP_KEY,BACKUP_INFO_KEY,KEY]);
  assert.equal(JSON.parse(a.storage.get(BACKUP_INFO_KEY)).origin,'before-upgrade');
  assert.notEqual(a.storage.get(KEY),legacyRaw);
  assert.equal(a.run('S.meta.graduated'),true);assert.equal(a.run('S.meta.stickers'),7);
  assert.equal(a.run('S.shop.coins'),99);assert.deepEqual(a.json('S["word|sport"].extra'),['保留',42]);
});

test('snapshot failure blocks migration, practice saves and import from overwriting original',()=>{
  const a=createApp({raw:legacyRaw,failWriteKeys:[BACKUP_KEY]});
  assert.equal(a.storage.get(KEY),legacyRaw);assert.equal(a.storage.has(BACKUP_KEY),false);
  assert.match(a.nodes.plan.textContent,/原进度不会被覆盖/);
  a.run('startToday();tap("x");save()');assert.equal(a.storage.get(KEY),legacyRaw);
  const before=a.snapshot();a.nodes.importCode.value=incoming(a);a.run('importProgress()');
  assert.deepEqual(a.snapshot(),before);assert.equal(a.storage.get(KEY),legacyRaw);
  assert.match(a.alerts.at(-1),/没有导入/);
  a.run('show("parent");exportOriginalBackup()');assert.equal(decodedCode(a),legacyRaw);
});

test('receipt failure keeps raw source intact and safely resumes verification on reload',()=>{
  const a=createApp({raw:legacyRaw,failWriteKeys:[BACKUP_INFO_KEY]});
  assert.equal(a.storage.get(KEY),legacyRaw);assert.equal(a.storage.get(BACKUP_KEY),legacyRaw);
  assert.equal(a.storage.has(BACKUP_INFO_KEY),false);
  a.run('exportOriginalBackup()');assert.equal(decodedCode(a),legacyRaw);assert.match(a.nodes.backupStatus.textContent,/未能验证/);
  const b=createApp({storage:a.storage});
  assert.equal(b.storage.get(BACKUP_KEY),legacyRaw);assert.ok(b.storage.has(BACKUP_INFO_KEY));
  assert.notEqual(b.storage.get(KEY),legacyRaw);
});

test('failed read-back verification stays non-destructive on subsequent reload',()=>{
  const a=createApp({raw:legacyRaw,mutateWrite:(key,value)=>key===BACKUP_KEY?value+'tampered':value});
  assert.equal(a.storage.get(KEY),legacyRaw);assert.equal(a.storage.has(BACKUP_INFO_KEY),false);
  const unverified=a.storage.get(BACKUP_KEY),b=createApp({storage:a.storage});
  assert.equal(b.storage.get(KEY),legacyRaw);assert.equal(b.storage.get(BACKUP_KEY),unverified);
  assert.match(b.nodes.plan.textContent,/原进度不会被覆盖/);
  b.run('exportOriginalBackup()');assert.equal(decodedCode(b),legacyRaw);
});

test('active-write failure after a verified snapshot does not lose original or backup',()=>{
  const a=createApp({raw:legacyRaw,failWriteKeys:[KEY]});
  assert.equal(a.storage.get(KEY),legacyRaw);assert.equal(a.storage.get(BACKUP_KEY),legacyRaw);
  assert.ok(a.storage.has(BACKUP_INFO_KEY));assert.match(a.nodes.plan.textContent,/不能保存进度/);
  a.run('exportOriginalBackup()');assert.equal(decodedCode(a),legacyRaw);
  const b=createApp({storage:a.storage});assert.equal(b.storage.get(BACKUP_KEY),legacyRaw);
  assert.equal(b.run('S.meta.graduated'),true);assert.equal(b.run('S.meta.stickers'),7);
});

test('original snapshot is immutable across reloads and imports, with a parent-page recovery code',()=>{
  let a=createApp({raw:legacyRaw});const receipt=a.storage.get(BACKUP_INFO_KEY);
  for(let i=0;i<3;i++)a=createApp({storage:a.storage});
  a.nodes.importCode.value=incoming(a);a.run('importProgress()');
  assert.equal(a.run('S.imported'),true);assert.equal(a.storage.get(BACKUP_KEY),legacyRaw);
  assert.equal(a.storage.get(BACKUP_INFO_KEY),receipt);
  const activeBeforeExport=a.storage.get(KEY);
  a.run('show("parent");exportOriginalBackup()');assert.equal(decodedCode(a),legacyRaw);
  assert.match(a.nodes.backupStatus.textContent,/升级前原始备份码/);
  assert.equal(a.storage.get(KEY),activeBeforeExport);
  // The exported original code is compatible with the existing restore route.
  a.nodes.importCode.value=a.nodes.progressCode.textContent;a.run('importProgress()');
  assert.equal(a.run('S.meta.graduated'),true);assert.equal(a.run('S.meta.stickers'),7);
  assert.equal(a.storage.get(BACKUP_KEY),legacyRaw);
});

test('empty first install does not snapshot its own saves; first later import snapshots pre-import value',()=>{
  let a=createApp();a.run('startToday();advance();save();refresh()');
  assert.equal(a.storage.has(BACKUP_KEY),false);assert.equal(a.storage.has(BACKUP_INFO_KEY),false);
  a=createApp({storage:a.storage});a.run('save();exportOriginalBackup()');
  assert.equal(a.storage.has(BACKUP_KEY),false);assert.equal(a.storage.has(BACKUP_INFO_KEY),false);
  assert.match(a.alerts.at(-1),/没有升级前备份码/);
  const beforeImport=a.storage.get(KEY);
  a.nodes.importCode.value=incoming(a);a.run('importProgress()');
  assert.equal(a.storage.get(BACKUP_KEY),beforeImport);
  assert.equal(JSON.parse(a.storage.get(BACKUP_INFO_KEY)).origin,'before-import');
  a.run('exportOriginalBackup()');assert.equal(decodedCode(a),beforeImport);
  assert.match(a.nodes.backupStatus.textContent,/首次导入前原始备份码/);
});

test('corrupt original storage is snapshotted and exportable byte-for-byte without overwriting it',()=>{
  for(const raw of ['  {broken\n','null','[]','']){
    const a=createApp({raw});
    assert.equal(a.storage.get(BACKUP_KEY),raw);
    assert.equal(a.storage.get(KEY),raw);
    a.run('exportOriginalBackup()');assert.equal(decodedCode(a),raw);
  }
});

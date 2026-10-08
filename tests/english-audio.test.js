'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createApp}=require('./english-harness');
const root=path.join(__dirname,'..');
function app(){const a=createApp();a.run('startToday()');return a;}
function media(a,{legacy=false}={}){
  const players=[];
  a.context.Audio=class{
    constructor(src){this.src=src;this.style={};this.ended=false;this.pauses=0;this.plays=0;players.push(this);}
    setAttribute(){}
    play(){this.plays++;if(this.onplay)this.onplay();return legacy?undefined:{catch:fn=>{this.reject=fn;}};}
    pause(){this.pauses++;if(this.onpause)this.onpause();}
    emit(name){if(name==='ended')this.ended=true;const fn=this['on'+name];if(fn)fn();}
  };
  return players;
}
function synth(a,voices){
  const spoken=[],s={voices,paused:false,cancels:0,resumes:0,getVoices(){return this.voices;},
    cancel(){this.cancels++;},resume(){this.paused=false;this.resumes++;},speak(u){spoken.push(u);}};
  a.context.window.speechSynthesis=s;
  a.context.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  return {s,spoken};
}
const localUS={lang:'en-US',localService:true,name:'Local US'};
const localGB={lang:'en-GB',localService:true,name:'Local GB'};

test('all 49 exact lessons map to present MP3s and manifest hashes',()=>{
  const a=app(),manifest=JSON.parse(fs.readFileSync(path.join(root,'audio/english/manifest.json')));
  const items=a.json('allItems()');assert.equal(manifest.tracks.length,49);assert.equal(items.length,49);
  for(const item of items){
    const track=manifest.tracks.find(t=>t.text===item.en);assert.ok(track,item.en);
    a.context.audioItem=item;
    assert.equal(a.run('recordedAudioFor(audioItem)'),`./audio/english/${track.file}`);
    assert.equal(a.run('spokenAudioText(audioItem.en)'),track.spokenText);
    const bytes=fs.readFileSync(path.join(root,'audio/english',track.file));
    assert.equal(bytes.length,track.bytes);assert.ok(track.bytes>1000);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),track.sha256);
    assert.ok(track.durationSeconds>0&&track.durationSeconds<15);
    assert.equal(bytes.subarray(0,3).toString(),'ID3');
  }
  assert.ok(manifest.tracks.reduce((sum,t)=>sum+t.bytes,0)<1000000);
});

test('opening a lesson does not autoplay; explicit click uses the same-origin recording',()=>{
  const a=createApp(),players=media(a);a.run('startToday()');assert.equal(players.length,0);
  const {spoken}=synth(a,[localUS]);a.run('speakCurrent()');
  assert.equal(players[0].src,'./audio/english/words-01.mp3');assert.equal(players[0].plays,1);
  assert.equal(spoken.length,0);assert.equal(players[0].muted,false);assert.equal(players[0].volume,1);
  assert.match(a.nodes.audioStatus.textContent,/正在加载/);
  players[0].emit('playing');assert.match(a.nodes.audioStatus.textContent,/正在播放/);
  players[0].emit('ended');assert.match(a.nodes.audioStatus.textContent,/播放结束/);
  a.flush();assert.match(a.nodes.audioStatus.textContent,/播放结束/);
});

test('repeat taps stop the old audio and ignore its delayed callbacks and rejection',()=>{
  const a=app(),p=media(a);a.run('speakCurrent()');
  const ended=p[0].onended,playing=p[0].onplaying,reject=p[0].reject;
  a.run('speakCurrent()');assert.equal(p.length,2);assert.equal(p[0].pauses,1);
  ended();playing();reject({name:'AbortError'});
  assert.match(a.nodes.audioStatus.textContent,/正在加载/);
  p[1].emit('playing');assert.match(a.nodes.audioStatus.textContent,/正在播放/);
});

test('leaving or changing lesson stage stops audio without changing progress',()=>{
  const a=app(),p=media(a);a.run('speakCurrent()');const state=a.run('JSON.stringify(S)');
  a.run('stopLessonAudio()');assert.equal(p[0].pauses,1);assert.equal(a.run('JSON.stringify(S)'),state);
  a.run('speakCurrent();show("parent")');assert.equal(p[1].pauses,1);assert.match(a.nodes.audioStatus.textContent,/点听音/);
  a.run('show("learn");speakCurrent();advance()');assert.equal(p[2].pauses,1);
});

test('rejected recording reports the reason without automatically using speech',()=>{
  const a=app(),p=media(a),{spoken}=synth(a,[localGB]);a.run('speakCurrent()');
  p[0].reject({name:'NotAllowedError'});
  assert.match(a.nodes.audioStatus.textContent,/未允许播放/);assert.match(a.nodes.audioStatus.textContent,/NotAllowedError/);
  assert.equal(spoken.length,0);assert.ok(p[0].pauses>0);
});

test('recording errors and stalled/no-event playback have visible bounded failures',()=>{
  const a=app(),p=media(a);a.run('speakCurrent()');p[0].error={code:4};p[0].emit('error');
  assert.match(a.nodes.audioStatus.textContent,/音频错误 4/);
  a.run('speakCurrent()');p[1].emit('stalled');a.flush();
  assert.match(a.nodes.audioStatus.textContent,/播放超时/);assert.ok(p[1].pauses>0);
  a.run('speakCurrent()');p[2].emit('playing');a.flush();
  assert.match(a.nodes.audioStatus.textContent,/没有正常结束/);
});

test('native pause has a visible paused state and resuming can complete',()=>{
  const a=app(),p=media(a);a.run('speakCurrent()');p[0].emit('playing');p[0].pause();
  assert.match(a.nodes.audioStatus.textContent,/已暂停/);a.flush();assert.match(a.nodes.audioStatus.textContent,/已暂停/);
  p[0].play();p[0].emit('playing');p[0].emit('ended');assert.match(a.nodes.audioStatus.textContent,/播放结束/);
});

test('old play APIs without a Promise work and absent Audio reports a visible failure',()=>{
  const a=app(),p=media(a,{legacy:true});a.run('speakCurrent()');p[0].emit('playing');assert.match(a.nodes.audioStatus.textContent,/正在播放/);
  a.context.Audio=undefined;a.run('speakCurrent()');assert.match(a.nodes.audioStatus.textContent,/不能播放录音/);
});

test('explicit speech fallback selects local English, expands placeholders, and resumes',()=>{
  const a=app(),remote={lang:'en-GB',localService:false},zh={lang:'zh-CN',localService:true};
  const {s,spoken}=synth(a,[remote,zh,localUS,localGB]);s.paused=true;
  const before=a.run('JSON.stringify(S)');
  a.run('current={kind:"phrase",en:"because of sb/sth"};speakWithDevice()');
  assert.equal(spoken[0].text,'because of somebody or something');assert.equal(spoken[0].voice,localGB);
  assert.equal(spoken[0].lang,'en-GB');assert.equal(s.resumes,1);assert.match(a.nodes.audioStatus.textContent,/正在启动/);
  spoken[0].onstart();assert.match(a.nodes.audioStatus.textContent,/正在使用备用/);
  spoken[0].onend();assert.match(a.nodes.audioStatus.textContent,/设备朗读结束/);
  assert.equal(a.run('JSON.stringify(S)'),before);a.flush();assert.match(a.nodes.audioStatus.textContent,/设备朗读结束/);
});

test('speech fallback refuses remote-only/missing voices, then can use a loaded local voice',()=>{
  const a=app(),{s,spoken}=synth(a,[{lang:'en-US',localService:false}]);a.run('speakWithDevice()');
  assert.equal(spoken.length,0);assert.match(a.nodes.audioStatus.textContent,/暂未找到本机英语声音/);
  s.voices=[localUS];a.run('speakWithDevice()');assert.equal(spoken.length,1);assert.equal(spoken[0].lang,'en-US');
});

test('speech fallback unavailable/errors/timeouts are visible, and stale events cannot win',()=>{
  const a=app();a.run('speakWithDevice()');assert.match(a.nodes.audioStatus.textContent,/不支持设备朗读/);
  const {s,spoken}=synth(a,[localUS]);a.run('speakWithDevice()');a.flush();
  assert.match(a.nodes.audioStatus.textContent,/朗读没有启动/);assert.equal(a.run('activeUtterance'),null);assert.ok(s.cancels>=2);
  a.run('speakWithDevice()');spoken[1].onerror({error:'language-unavailable'});assert.match(a.nodes.audioStatus.textContent,/language-unavailable/);
  a.run('speakWithDevice()');const oldEnd=spoken[2].onend;
  a.run('speakWithDevice()');oldEnd();assert.match(a.nodes.audioStatus.textContent,/正在启动/);
  spoken[3].onstart();a.flush();assert.match(a.nodes.audioStatus.textContent,/朗读超时/);
});

test('speech input preserves contractions/hyphens and expands each placeholder form',()=>{
  const a=app();
  assert.equal(a.run('spokenAudioText("because of sb/sth")'),'because of somebody or something');
  assert.equal(a.run('spokenAudioText("be hard for sb")'),'be hard for somebody');
  assert.equal(a.run('spokenAudioText("like doing sth")'),'like doing something');
  assert.equal(a.run('spokenAudioText("play ping-pong")'),'play ping-pong');
  assert.equal(a.run('spokenAudioText("What can Daming do?")'),'What can Dah Ming do?');
  assert.equal(a.run('spokenAudioText("No, I can\\\'t. But I can learn.")'),"No, I can't. But I can learn.");
});

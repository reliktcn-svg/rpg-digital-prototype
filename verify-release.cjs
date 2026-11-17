// Logic checks without a browser. Run with Node.js from this directory.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=fs.existsSync(__dirname+'/index.html')?__dirname:__dirname+'/Heart_of_Darkness_v0.7.0.03';
class El{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.hidden=false;this.inert=false;this.value='';this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.events={};this.textContent='';this.isConnected=true;}
 set innerHTML(s){this.html=s;if(s.includes('author-support-card')){this.children=[new El('section')];}}
 get innerHTML(){return this.html||''}get firstElementChild(){return this.children[0]}
 append(...els){this.children.push(...els)}replaceChildren(...els){this.children=els}
 setAttribute(k,v){this[k]=v}addEventListener(k,f){this.events[k]=f}focus(){doc.activeElement=this}scrollIntoView(){}
 querySelectorAll(q){return this.children.filter(e=>q.split(',').includes(e.tagName.toLowerCase()))}
 querySelector(q){return this.querySelectorAll(q)[0]||(q==='p'?new El('p'):null)}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id)};
const doc={body:new El('body'),activeElement:null,events:{},getElementById:get,createElement:t=>new El(t),addEventListener(k,f){this.events[k]=f},querySelector(){return null}};
const win={events:{},addEventListener(k,f){this.events[k]=f}};
let reminderCheck;
const saved=new Map();
const context={document:doc,window:win,Element:El,localStorage:{getItem(k){return saved.get(k)||null},setItem(k,v){saved.set(k,v)}},clearInterval(){},clearTimeout(){},setTimeout(){},setInterval(fn){reminderCheck=fn},console,AbortController};
vm.runInNewContext(fs.readFileSync(root+'/network-lobby.js','utf8'),context);
assert.equal(get('heartFront').hidden,false);assert.equal(get('onlineHome').hidden,true);
get('heartCompany').onclick();assert.equal(get('heartFront').hidden,true);assert.equal(get('onlineHome').hidden,false);
get('heartBack').onclick();assert.equal(get('heartFront').hidden,false);
get('heartSolo').onclick();assert.equal(get('onlineLobby').hidden,true);
get('soloMenuBack').onclick();assert.equal(get('onlineLobby').hidden,false);assert.equal(get('heartFront').hidden,false);
assert.ok(!fs.readFileSync(root+'/index.html','utf8').includes('id="heartSettings"'));assert.equal(get('heartSettings').onclick,undefined);
win.RPGNetworkReturnHome();assert.equal(get('heartFront').hidden,false);
doc.querySelectorAll=()=>[];
vm.runInNewContext(fs.readFileSync(root+'/author-support.js','utf8'),context);
const overlay=doc.body.children.at(-1),card=overlay.firstElementChild,opener=new El('button');doc.body.append(opener);opener.closest=()=>opener;
function open(){doc.events.click({target:opener});assert.equal(overlay.hidden,false)}
function click(text){const b=card.children.find(e=>e.textContent===text);assert.ok(b,text);b.onclick()}
open();assert.equal(opener.inert,true);
for(const [name,url] of [['CloudTips · разовый донат','https://pay.cloudtips.ru/p/0f172351'],['Boosty · ежемесячная поддержка','https://boosty.to/the_heart_of_darkness']]){
 click(name);const a=card.children.find(e=>e.tagName==='A');assert.equal(a.href,url);assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer');click('Выбрать другой способ');
}
click('Поддержать позже');assert.equal(overlay.hidden,true);assert.equal(opener.inert,false);assert.equal(doc.activeElement,opener);
open();let prevented=false;win.events.keydown({key:'Escape',preventDefault(){prevented=true},stopImmediatePropagation(){}});assert.ok(prevented);assert.equal(overlay.hidden,true);
for(const n of ['app.js','network-lobby.js','author-support.js'])new vm.Script(fs.readFileSync(root+'/'+n,'utf8'),{filename:n});
console.log('PASS: menu routes, solo entry/return, initial screen without settings, all support links, later, Escape, inert/focus restore, JavaScript syntax.');

let level=10,safe=false;win.RPGSupportContext=()=>({key:'test-campaign:warrior',level,safe});
reminderCheck();assert.equal(overlay.hidden,true);safe=true;reminderCheck();assert.equal(overlay.hidden,false);assert.ok(card.children.some(e=>e.textContent==='Нравится игра?'));click('Поддержать');assert.ok(card.children.some(e=>e.textContent==='CloudTips · разовый донат'));click('Поддержать позже');reminderCheck();assert.equal(overlay.hidden,true);
for(const next of [20,30,40]){level=next;reminderCheck();assert.equal(overlay.hidden,false);click('Поддержать позже');reminderCheck();assert.equal(overlay.hidden,true)}
assert.ok(!fs.readFileSync(root+'/author-support.js','utf8').includes('donationalerts.com'));assert.ok(!fs.readFileSync(root+'/author-support.js','utf8').includes('t.tb.ru'));
console.log('PASS: CloudTips/Boosty only; safe deferred reminders at 10/20/30/40; one show per milestone; reminder to chooser.');

vm.runInNewContext(fs.readFileSync(root+'/author-support.js','utf8'),context);reminderCheck();assert.equal(doc.body.children.at(-1).hidden,true);console.log('PASS: milestone ledger survives module reload.');

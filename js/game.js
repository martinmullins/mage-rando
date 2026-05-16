// VOID RITES - Eldritch dice-slotting roguelike

const C = {
  VOID:'#0a0a0f',DEEP:'#12121e',PANEL:'#1a1a2e',PANEL_ALT:'#16213e',
  BORDER:'#2d2d5e',ACCENT:'#7c3aed',ACCENT2:'#a855f7',
  DANGER:'#dc2626',GOLD:'#f59e0b',TEXT:'#e5e7eb',
  TEXT_DIM:'#6b7280',TEXT_MUT:'#374151',
  DIE_BG:'#1e1e3f',DIE_BORDER:'#7c3aed',DIE_USED:'#2d1f4f',
  SLOT_EMPTY:'#1f2937',SLOT_FULL:'#312e81',
  HP_FG:'#dc2626',HP_BG:'#1f1515',
  SAN_FG:'#7c3aed',SAN_BG:'#150d20'
};

const ENEMIES = [
  {id:'herald', name:'The Herald of Gnawing Voids', hp:20,maxHp:20,diceCount:2,color:'#6d28d9',glyph:'◈',tier:1,
    abilities:[{name:'Entropy Bite',dmg:5},{name:'Unravel',dmg:0,effect:'sanity',amount:2}]},
  {id:'watcher',name:'The Watcher Between Seconds',  hp:30,maxHp:30,diceCount:3,color:'#9333ea',glyph:'⊗',tier:1,
    abilities:[{name:'Temporal Gnash',dmg:8},{name:'Erase Moment',dmg:0,effect:'skip'}]},
  {id:'choir',  name:'Choir of Unmaking',            hp:45,maxHp:45,diceCount:3,color:'#7e22ce',glyph:'⊛',tier:2,
    abilities:[{name:'Cacophony',dmg:6},{name:'Soul Fracture',dmg:10},{name:'Consume Thought',dmg:0,effect:'sanity',amount:4}]},
  {id:'sleeper',name:'The Sleeper Beneath All Things',hp:80,maxHp:80,diceCount:4,color:'#4c1d95',glyph:'⊜',tier:3,boss:true,
    abilities:[{name:'Dream Crush',dmg:15},{name:'Void Surge',dmg:20},{name:'Ancient Hunger',dmg:0,effect:'sanity',amount:6}]}
];

const ITEMS = [
  {id:'bloodied-lens', name:'Bloodied Lens',  glyph:'◉',desc:'Slot any die → deals its face value as damage.',   slots:1,req:'any',   effect:'dmg-val'},
  {id:'ritual-dagger', name:'Ritual Dagger',  glyph:'◇',desc:'Slot any die → deals its face value as damage.',   slots:1,req:'any',   effect:'dmg-val'},
  {id:'shattered-idol',name:'Shattered Idol', glyph:'◆',desc:'Slot a 4, 5, or 6 → deals 9 damage.',              slots:1,req:'high',  effect:'dmg',amount:9},
  {id:'void-compass',  name:'Void Compass',   glyph:'⊕',desc:'Slot a 1 or 2 → reroll all un-slotted dice.',      slots:1,req:'low',   effect:'reroll'},
  {id:'cursed-tome',   name:'Cursed Tome',    glyph:'⊞',desc:'Slot two matching dice → deals 14 damage.',        slots:2,req:'pair',  effect:'dmg',amount:14},
  {id:'entropy-sigil', name:'Entropy Sigil',  glyph:'⊟',desc:'Slot a 3 → heal 4 HP.',                           slots:1,req:'three', effect:'heal',amount:4},
  {id:'void-crown',    name:'Void Crown',     glyph:'⊠',desc:'Slot any die → deals face value + 2 damage.',      slots:1,req:'any',   effect:'dmg-val-plus',amount:2},
  {id:'obsidian-eye',  name:'Obsidian Eye',   glyph:'◈',desc:'Slot two odd dice → deals 11 damage.',             slots:2,req:'odd-pair',effect:'dmg',amount:11},
  {id:'flaying-word',  name:'Flaying Word',   glyph:'⟁',desc:'Slot a 5 or 6 → deals 13 damage.',                slots:1,req:'high2', effect:'dmg',amount:13},
  {id:'mind-splinter', name:'Mind Splinter',  glyph:'⟃',desc:'Slot any odd die → deals 7 damage.',              slots:1,req:'odd',   effect:'dmg',amount:7},
  {id:'rift-step',     name:'Rift Step',      glyph:'⟂',desc:'Slot a 2 → stun enemy, cancelling their attack.',  slots:1,req:'two',   effect:'stun'},
  {id:'blood-tithe',   name:'Blood Tithe',    glyph:'⟇',desc:'Slot three matching dice → deals 28 damage.',      slots:3,req:'triple',effect:'dmg',amount:28}
];

const FLOORS = [
  {id:1,name:'The Whispering Crypts',  enemies:['herald','watcher'],loot:3},
  {id:2,name:'The Drowned Cathedral',  enemies:['watcher','choir'], loot:3},
  {id:3,name:'The Void Between Stars', enemies:['sleeper'],         loot:4}
];

// ── State ──────────────────────────────────────────────────────────────────────
let state;
function initState() {
  state = {
    screen:'title',
    player:{hp:30,maxHp:30,sanity:10,maxSanity:10,items:[]},
    floor:1,combat:null,lootOptions:[],
    selDie:null,hover:null,msg:null,msgTimer:0
  };
}

function rollDie()  { return Math.floor(Math.random()*6)+1; }
function rollDice(n){ return Array.from({length:n},rollDie); }

function startCombat(def) {
  const enemy = Object.assign({},def,{curHp:def.hp});
  const n = 3 + Math.min(state.player.items.length, 2);
  state.combat = {
    enemy, intent:pickIntent(enemy),
    dice:rollDice(n), slots:{}, used:new Set(), rerolls:1, stunned:false
  };
}
function pickIntent(enemy) {
  return {ability:enemy.abilities[Math.floor(Math.random()*enemy.abilities.length)], dice:rollDice(enemy.diceCount)};
}
function showMsg(m){ state.msg=m; state.msgTimer=150; }

// ── Slot helpers ───────────────────────────────────────────────────────────────
function slotVals(idx) {
  return Object.entries(state.combat.slots[idx]||{})
    .filter(([k])=>!k.startsWith('_')).map(([,v])=>v);
}
function slotsFilled(item,idx){ return slotVals(idx).length===item.slots; }
function reqMet(item,idx) {
  const v=slotVals(idx);
  if(v.length!==item.slots) return false;
  switch(item.req){
    case 'any':      return true;
    case 'high':     return v.every(x=>x>=4);
    case 'high2':    return v.every(x=>x>=5);
    case 'low':      return v.every(x=>x<=2);
    case 'two':      return v.every(x=>x===2);
    case 'three':    return v.every(x=>x===3);
    case 'odd':      return v.every(x=>x%2===1);
    case 'pair':     return v.length===2&&v[0]===v[1];
    case 'odd-pair': return v.length===2&&v.every(x=>x%2===1);
    case 'triple':   return v.length===3&&v[0]===v[1]&&v[1]===v[2];
    default: return true;
  }
}

// ── Activation ─────────────────────────────────────────────────────────────────
function activateItem(idx) {
  const {combat,player}=state;
  if(combat.used.has(idx)){showMsg('Already fired this turn!');return;}
  const item=player.items[idx]; if(!item) return;
  if(!slotsFilled(item,idx)){showMsg('Fill all slots first!');return;}
  if(!reqMet(item,idx)){showMsg('Wrong dice for this artifact!');return;}
  const vals=slotVals(idx), sum=vals.reduce((a,b)=>a+b,0);
  switch(item.effect){
    case 'dmg':          dealDmg(item.amount); break;
    case 'dmg-val':      dealDmg(sum); break;
    case 'dmg-val-plus': dealDmg(sum+item.amount); break;
    case 'heal':         healHp(item.amount); break;
    case 'reroll':       doReroll(); break;
    case 'stun':         combat.stunned=true; showMsg('Enemy stunned — attack cancelled!'); break;
    default:             showMsg('Activated: '+item.name);
  }
  combat.used.add(idx);
  combat.slots[idx]={};
  if(combat.enemy.curHp<=0) setTimeout(()=>transitionToLoot(),350);
}
function dealDmg(n){ state.combat.enemy.curHp=Math.max(0,state.combat.enemy.curHp-n); showMsg('-'+n+' damage!'); }
function healHp(n) { state.player.hp=Math.min(state.player.maxHp,state.player.hp+n); showMsg('+'+n+' HP!'); }
function doReroll(){
  state.combat.dice=state.combat.dice.map(v=>v==='used'?'used':rollDie());
  showMsg('Rerolled free dice!');
}

// ── Slot / unslot ──────────────────────────────────────────────────────────────
function slotDie(dieIdx,itemIdx,slotIdx) {
  const c=state.combat;
  if(c.dice[dieIdx]==='used') return;
  const val=c.dice[dieIdx];
  const prev=(c.slots[itemIdx]||{})[slotIdx];
  if(prev!==undefined){
    const pi=(c.slots[itemIdx]||{})['_'+slotIdx];
    if(pi!==undefined) c.dice[pi]=prev;
  }
  if(!c.slots[itemIdx]) c.slots[itemIdx]={};
  c.slots[itemIdx][slotIdx]=val;
  c.slots[itemIdx]['_'+slotIdx]=dieIdx;
  c.dice[dieIdx]='used';
  state.selDie=null;
}
function unslotDie(itemIdx,slotIdx) {
  const c=state.combat, s=c.slots[itemIdx]||{};
  const val=s[slotIdx], orig=s['_'+slotIdx];
  if(val===undefined) return;
  if(orig!==undefined) c.dice[orig]=val;
  delete c.slots[itemIdx][slotIdx];
  delete c.slots[itemIdx]['_'+slotIdx];
}

// ── End turn ───────────────────────────────────────────────────────────────────
function endTurn() {
  const {combat,player}=state;
  if(!combat.stunned){
    const {ability}=combat.intent;
    if(ability.dmg>0){
      player.hp=Math.max(0,player.hp-ability.dmg);
      showMsg('Enemy dealt '+ability.dmg+' damage!');
    } else if(ability.effect==='sanity'){
      player.sanity=Math.max(0,player.sanity-ability.amount);
      showMsg('Sanity drained by '+ability.amount+'!');
    }
  } else {
    showMsg('Enemy stunned — they skipped!');
  }
  if(player.hp<=0||player.sanity<=0){state.screen='gameover';return;}
  if(combat.enemy.curHp<=0){transitionToLoot();return;}
  const n=3+Math.min(player.items.length,2);
  combat.dice=rollDice(n); combat.slots={}; combat.used=new Set();
  combat.rerolls=1; combat.stunned=false; combat.intent=pickIntent(combat.enemy);
  state.selDie=null;
}
function transitionToLoot() {
  const fd=FLOORS.find(f=>f.id===state.floor);
  const owned=new Set(state.player.items.map(i=>i.id));
  state.lootOptions=ITEMS.filter(i=>!owned.has(i.id)).sort(()=>Math.random()-0.5).slice(0,fd?fd.loot:3);
  state.screen='loot';
}
function pickLoot(i) {
  const item=state.lootOptions[i]; if(!item) return;
  state.player.items.push(item);
  const next=FLOORS.find(f=>f.id===state.floor+1);
  if(next){
    state.floor++;
    startCombat(ENEMIES.find(e=>e.id===next.enemies[Math.floor(Math.random()*next.enemies.length)]));
    state.screen='combat';
  } else { state.screen='victory'; }
  state.selDie=null;
}

// ── p5 sketch ──────────────────────────────────────────────────────────────────────
new p5(function(p){

  let GW,GH,sc,portrait,ox,oy,VW,VH;

  // Use visualViewport when available (Safari iOS gives actual visible area)
  function vw(){ return window.visualViewport ? window.visualViewport.width  : window.innerWidth;  }
  function vh(){ return window.visualViewport ? window.visualViewport.height : window.innerHeight; }

  function relayout(){
    VW=vw(); VH=vh();
    portrait = VH > VW;
    GW = portrait ? 390 : 800;
    GH = portrait ? 750 : 600;
    sc = Math.min(VW/GW, VH/GH);
    ox = (VW - GW*sc)/2;
    oy = (VH - GH*sc)/2;
  }

  function gx(x){ return (x-ox)/sc; }
  function gy(y){ return (y-oy)/sc; }

  // ── primitives ──
  function dr(x,y,w,h,col,r=0){ p.fill(col);p.noStroke(); r?p.rect(x,y,w,h,r):p.rect(x,y,w,h); }
  function dro(x,y,w,h,col,sw,r=0){ p.noFill();p.stroke(col);p.strokeWeight(sw); r?p.rect(x,y,w,h,r):p.rect(x,y,w,h); p.noStroke(); }
  function tx(s,x,y,col,sz,al='LEFT'){ p.fill(col);p.noStroke();p.textSize(sz);p.textAlign(p[al]);p.text(s,x,y); }
  function ir(mx,my,x,y,w,h){ return mx>=x&&mx<=x+w&&my>=y&&my<=y+h; }
  function bar(x,y,w,h,cur,max,fg,bg,lbl){
    dr(x,y,w,h,bg); dr(x,y,Math.round(w*cur/max),h,fg); dro(x,y,w,h,C.BORDER,1);
    tx(lbl+': '+cur+'/'+max, x+4,y+h-5, C.TEXT,10);
  }
  function die(x,y,sz,val,sel){
    const used=val==='used';
    dr(x,y,sz,sz,used?C.DIE_USED:C.DIE_BG,6);
    dro(x,y,sz,sz,used?C.TEXT_MUT:val===6?C.GOLD:val>=4?C.ACCENT2:C.DIE_BORDER,sel?2.5:1.5,6);
    if(sel) dro(x-3,y-3,sz+6,sz+6,C.ACCENT,2,9);
    if(!used) tx(''+val,x+sz/2,y+sz*0.65,C.TEXT,sz*0.48,'CENTER');
  }
  function itemCard(item,idx,x,y,w,h){
    const slots=(state.combat?state.combat.slots[idx]:null)||{};
    const used=state.combat&&state.combat.used.has(idx);
    const ready=!used&&slotsFilled(item,idx)&&reqMet(item,idx);
    dr(x,y,w,h,used?'#111':C.PANEL,8);
    dro(x,y,w,h,ready?C.ACCENT:C.BORDER,ready?2:1,8);
    tx(item.glyph,x+20,y+h*0.5+6,C.ACCENT,16,'CENTER');
    tx(item.name,x+38,y+14,used?C.TEXT_MUT:C.TEXT,11);
    p.fill(C.TEXT_DIM);p.noStroke();p.textSize(9);p.textAlign(p.LEFT);
    p.text(item.desc,x+38,y+26,w-80,28);
    for(let s=0;s<item.slots;s++){
      const sx=x+38+s*44,sy=y+h-24;
      const sv=slots[s],filled=sv!==undefined;
      dr(sx,sy,38,18,filled?C.SLOT_FULL:C.SLOT_EMPTY,4);
      dro(sx,sy,38,18,filled?(ready?C.ACCENT:C.ACCENT2):C.BORDER,1,4);
      if(filled) tx(''+sv,sx+19,sy+14,C.TEXT,14,'CENTER');
      else       tx('slot',sx+19,sy+13,C.TEXT_MUT,8,'CENTER');
    }
    if(ready) tx('▶ TAP TO FIRE',x+w-6,y+h-5,C.ACCENT,9,'RIGHT');
  }
  function turnBanner(x,y,w){
    const a=0.55+0.45*Math.sin(p.frameCount*0.12);
    dr(x,y,w,26,C.PANEL,6);
    p.noFill();p.stroke(C.ACCENT);p.strokeWeight(a*2);p.rect(x,y,w,26,6);p.noStroke();
    tx('YOUR TURN',x+w/2,y+10,C.ACCENT2,11,'CENTER');
    tx('① tap a die  ② tap a slot  ③ tap artifact to fire  ④ END TURN',x+w/2,y+22,C.TEXT_DIM,8,'CENTER');
  }

  // ── screens ──
  function drawTitle(){
    const cx=GW/2,cy=GH/2;
    p.noFill();
    for(let i=1;i<=5;i++){p.stroke(C.BORDER);p.strokeWeight(0.5);p.ellipse(cx,cy,i*60,i*60);}
    p.noStroke();
    tx('⊜',cx,cy-32,C.ACCENT,50,'CENTER');
    tx('VOID RITES',cx,cy+8,C.ACCENT2,portrait?32:42,'CENTER');
    tx('AN ELDRITCH DICE-SLOTTING ROGUELIKE',cx,cy+28,C.TEXT_DIM,portrait?10:13,'CENTER');
    tx('— tap anywhere to begin the ritual —',cx,cy+60,C.ACCENT,11,'CENTER');
  }

  function combatLand(){
    const {combat,player,floor}=state,{enemy,intent,dice,rerolls}=combat;
    const fd=FLOORS.find(f=>f.id===floor);
    dr(10,10,440,580,C.DEEP,12); dr(450,10,340,580,C.DEEP,12);
    tx('CULTIST',20,34,C.ACCENT2,14);
    bar(20,40,200,18,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    bar(20,64,200,18,player.sanity,player.maxSanity,C.SAN_FG,C.SAN_BG,'SANITY');
    turnBanner(20,90,422);
    tx('RITUAL FRAGMENTS',20,130,C.TEXT_DIM,9);
    dice.forEach((v,i)=>die(20+i*56,136,48,v,state.selDie===i));
    tx('CURSED ARTIFACTS',20,198,C.TEXT_DIM,9);
    player.items.forEach((item,i)=>itemCard(item,i,20,205+i*74,422,66));
    if(!player.items.length) tx('Defeat the enemy to earn artifacts.',20,220,C.TEXT_MUT,10);
    tx('FLOOR '+floor+' — '+(fd?fd.name:''),455,24,C.TEXT_DIM,10);
    tx(enemy.name,638,46,C.TEXT,12,'RIGHT');
    tx(enemy.glyph,555,135,enemy.color,56,'CENTER');
    bar(455,205,330,20,enemy.curHp,enemy.maxHp,C.HP_FG,C.HP_BG,'ENEMY HP');
    dr(455,234,330,78,C.PANEL,8); dro(455,234,330,78,C.BORDER,1,8);
    tx('ENEMY INTENT',460,250,C.TEXT_DIM,9);
    const {ability}=intent;
    tx(ability.name,460,267,C.DANGER,13);
    const id=combat.stunned?'STUNNED — will skip'
      :ability.dmg>0?'Will deal '+ability.dmg+' damage'
      :ability.effect==='sanity'?'Will drain '+ability.amount+' sanity'
      :'Will skip your turn';
    tx(id,460,283,C.TEXT,11);
    intent.dice.forEach((d,i)=>die(460+i*30,290,24,d,false));
    const rh=state.hover==='reroll',eh=state.hover==='endturn';
    dr(455,322,150,44,rh?C.ACCENT:C.PANEL,7); dro(455,322,150,44,C.ACCENT,1,7);
    tx('REROLL',530,340,C.TEXT,12,'CENTER');
    tx('('+rerolls+' left)',530,355,C.TEXT_DIM,10,'CENTER');
    dr(615,322,175,44,eh?'#b91c1c':C.DANGER,7);
    tx('END TURN  ▶',702,349,C.TEXT,15,'CENTER');
    if(state.msg&&state.msgTimer>0){
      dr(150,311,300,22,C.DEEP,5); tx(state.msg,300,327,C.GOLD,13,'CENTER');
    }
  }

  function combatPort(){
    const {combat,player,floor}=state,{enemy,intent,dice,rerolls}=combat;
    const fd=FLOORS.find(f=>f.id===floor), W=GW-20;
    dr(10,10,W,88,C.DEEP,10);
    tx('FLOOR '+floor+' — '+(fd?fd.name:''),15,24,C.TEXT_DIM,9);
    tx('CULTIST',15,40,C.ACCENT2,13);
    bar(15,44,W/2-8,18,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    bar(15,68,W/2-8,18,player.sanity,player.maxSanity,C.SAN_FG,C.SAN_BG,'SANITY');
    dr(10,106,W,104,C.DEEP,10);
    tx(enemy.name,GW/2,120,C.TEXT,11,'CENTER');
    tx(enemy.glyph,GW/2,168,enemy.color,50,'CENTER');
    bar(15,186,W,20,enemy.curHp,enemy.maxHp,C.HP_FG,C.HP_BG,'ENEMY HP');
    dr(10,216,W,60,C.PANEL,8); dro(10,216,W,60,C.BORDER,1,8);
    tx('ENEMY INTENT',15,231,C.TEXT_DIM,9);
    const {ability}=intent;
    tx(ability.name,15,247,C.DANGER,12);
    const id=combat.stunned?'STUNNED — will skip'
      :ability.dmg>0?'Will deal '+ability.dmg+' damage'
      :ability.effect==='sanity'?'Will drain '+ability.amount+' sanity'
      :'Skips your turn';
    tx(id,15,262,C.TEXT,10);
    intent.dice.forEach((d,i)=>die(W-10-intent.dice.length*28+i*28,248,22,d,false));
    turnBanner(10,284,W);
    tx('RITUAL FRAGMENTS',15,321,C.TEXT_DIM,9);
    const dw=48,dgap=6,dtotal=dice.length*(dw+dgap)-dgap,dx0=(GW-dtotal)/2;
    dice.forEach((v,i)=>die(dx0+i*(dw+dgap),327,dw,v,state.selDie===i));
    const bw=(W-10)/2;
    const rh=state.hover==='reroll',eh=state.hover==='endturn';
    dr(10,385,bw,40,rh?C.ACCENT:C.PANEL,7); dro(10,385,bw,40,C.ACCENT,1,7);
    tx('REROLL ('+rerolls+')',10+bw/2,409,C.TEXT,12,'CENTER');
    dr(10+bw+10,385,bw,40,eh?'#b91c1c':C.DANGER,7);
    tx('END TURN  ▶',10+bw+10+bw/2,409,C.TEXT,13,'CENTER');
    if(state.msg&&state.msgTimer>0) tx(state.msg,GW/2,378,C.GOLD,12,'CENTER');
    tx('CURSED ARTIFACTS',15,436,C.TEXT_DIM,9);
    player.items.forEach((item,i)=>itemCard(item,i,10,443+i*72,W,64));
    if(!player.items.length) tx('Defeat the enemy to earn artifacts.',15,455,C.TEXT_MUT,10);
  }

  function drawCombat(){ portrait?combatPort():combatLand(); }

  function drawLoot(){
    const opts=state.lootOptions;
    tx('OFFERINGS FROM THE VOID',GW/2,46,C.ACCENT2,portrait?17:21,'CENTER');
    tx('Tap a card to claim that artifact.',GW/2,64,C.TEXT_DIM,11,'CENTER');
    if(portrait){
      opts.forEach((item,i)=>{
        const cx=10,cy=80+i*88,w=GW-20,h=80;
        const hov=state.hover===('loot'+i);
        dr(cx,cy,w,h,hov?C.PANEL_ALT:C.PANEL,10);
        dro(cx,cy,w,h,hov?C.ACCENT:C.BORDER,hov?2:1,10);
        tx(item.glyph,cx+26,cy+h/2+8,C.ACCENT,24,'CENTER');
        tx(item.name,cx+50,cy+18,C.TEXT,13);
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.LEFT);
        p.text(item.desc,cx+50,cy+32,w-60,40);
        tx('TAP TO TAKE ▶',cx+w-8,cy+h-8,hov?C.ACCENT:C.TEXT_DIM,9,'RIGHT');
      });
    } else {
      const cw=170,gap=20,total=opts.length*(cw+gap)-gap,sx=GW/2-total/2;
      opts.forEach((item,i)=>{
        const cx=sx+i*(cw+gap),cy=88,hov=state.hover===('loot'+i);
        dr(cx,cy,cw,230,hov?C.PANEL_ALT:C.PANEL,12);
        dro(cx,cy,cw,230,hov?C.ACCENT:C.BORDER,hov?2:1,12);
        tx(item.glyph,cx+cw/2,cy+68,C.ACCENT,34,'CENTER');
        tx(item.name,cx+cw/2,cy+96,C.TEXT,13,'CENTER');
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.CENTER);
        p.text(item.desc,cx+12,cy+114,cw-24,56);
        dr(cx+25,cy+186,cw-50,30,hov?C.ACCENT:C.ACCENT,6);
        tx('TAKE IT',cx+cw/2,cy+205,C.TEXT,12,'CENTER');
      });
    }
  }

  function drawGameOver(){
    tx('⊗',GW/2,GH/2-58,C.DANGER,54,'CENTER');
    tx('YOU HAVE BEEN UNMADE',GW/2,GH/2-8,C.DANGER,portrait?20:27,'CENTER');
    tx('The void claimed another cultist.',GW/2,GH/2+17,C.TEXT_DIM,12,'CENTER');
    dr(GW/2-80,GH/2+52,160,40,C.ACCENT,6);
    tx('TRY AGAIN',GW/2,GH/2+77,C.TEXT,13,'CENTER');
  }
  function drawVictory(){
    tx('⊛',GW/2,GH/2-58,C.GOLD,54,'CENTER');
    tx('THE SLEEPER STIRS',GW/2,GH/2-8,C.GOLD,portrait?20:29,'CENTER');
    tx('The ritual is complete. The void is satisfied.',GW/2,GH/2+17,C.TEXT_DIM,12,'CENTER');
    dr(GW/2-80,GH/2+52,160,40,C.ACCENT,6);
    tx('PLAY AGAIN',GW/2,GH/2+77,C.TEXT,13,'CENTER');
  }

  // ── setup / draw ──
  p.setup = function(){
    relayout();
    p.createCanvas(VW,VH);
    p.textFont('Courier New');
    initState();
    // re-layout when visualViewport resizes (Safari address bar show/hide)
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',()=>{
        relayout();
        p.resizeCanvas(VW,VH);
      });
    }
  };
  p.windowResized = function(){
    relayout();
    p.resizeCanvas(VW,VH);
  };
  p.draw = function(){
    if(state.msgTimer>0) state.msgTimer--;
    p.background(C.VOID);
    p.push();
    p.translate(ox,oy);
    p.scale(sc);
    switch(state.screen){
      case 'title':    drawTitle();    break;
      case 'combat':   drawCombat();   break;
      case 'loot':     drawLoot();     break;
      case 'gameover': drawGameOver(); break;
      case 'victory':  drawVictory();  break;
    }
    p.pop();
  };

  // ── input ──
  function updateHover(mx,my){
    state.hover=null;
    if(state.screen==='combat'){
      if(portrait){
        const W=GW-20,bw=(W-10)/2;
        if(ir(mx,my,10,385,bw,40)) state.hover='reroll';
        if(ir(mx,my,10+bw+10,385,bw,40)) state.hover='endturn';
      } else {
        if(ir(mx,my,455,322,150,44)) state.hover='reroll';
        if(ir(mx,my,615,322,175,44)) state.hover='endturn';
      }
    }
    if(state.screen==='loot'){
      if(portrait){
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,10,80+i*88,GW-20,80)) state.hover='loot'+i; });
      } else {
        const cw=170,gap=20,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,sx+i*(cw+gap),88,cw,230)) state.hover='loot'+i; });
      }
    }
  }

  function click(rawX,rawY){
    const mx=gx(rawX),my=gy(rawY);
    updateHover(mx,my);
    if(state.screen==='title'){
      const ff=FLOORS[0];
      startCombat(ENEMIES.find(e=>e.id===ff.enemies[Math.floor(Math.random()*ff.enemies.length)]));
      state.screen='combat'; return;
    }
    if(state.screen==='gameover'||state.screen==='victory'){
      if(ir(mx,my,GW/2-80,GH/2+52,160,40)) initState(); return;
    }
    if(state.screen==='loot'){
      if(portrait){
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,10,80+i*88,GW-20,80)) pickLoot(i); });
      } else {
        const cw=170,gap=20,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,sx+i*(cw+gap),88,cw,230)) pickLoot(i); });
      }
      return;
    }
    if(state.screen==='combat'){
      const {combat,player}=state;
      if(portrait){
        const W=GW-20,bw=(W-10)/2;
        if(ir(mx,my,10,385,bw,40)){
          if(combat.rerolls>0){doReroll();combat.rerolls--;} else showMsg('No rerolls left!'); return;
        }
        if(ir(mx,my,10+bw+10,385,bw,40)){ endTurn(); return; }
      } else {
        if(ir(mx,my,455,322,150,44)){
          if(combat.rerolls>0){doReroll();combat.rerolls--;} else showMsg('No rerolls left!'); return;
        }
        if(ir(mx,my,615,322,175,44)){ endTurn(); return; }
      }
      const dw=48,dgap=portrait?6:8,dtotal=combat.dice.length*(dw+dgap)-dgap;
      const dx0=portrait?(GW-dtotal)/2:20, dy=portrait?327:136;
      for(let i=0;i<combat.dice.length;i++){
        if(ir(mx,my,dx0+i*(dw+dgap),dy,dw,dw)&&combat.dice[i]!=='used'){
          state.selDie=state.selDie===i?null:i; return;
        }
      }
      const ch=portrait?64:66,cg=portrait?72:74;
      const cy0=portrait?443:205,cx0=portrait?10:20,cw2=portrait?GW-20:422;
      for(let idx=0;idx<player.items.length;idx++){
        const item=player.items[idx],iy=cy0+idx*cg;
        for(let s=0;s<item.slots;s++){
          const sx=cx0+38+s*44,sy=iy+ch-24;
          if(ir(mx,my,sx,sy,38,18)){
            if(state.selDie!==null) slotDie(state.selDie,idx,s);
            else unslotDie(idx,s);
            return;
          }
        }
        if(ir(mx,my,cx0,iy,cw2,ch)){ activateItem(idx); return; }
      }
      state.selDie=null;
    }
  }

  p.mouseMoved = p.mouseDragged = function(){ updateHover(gx(p.mouseX),gy(p.mouseY)); };
  p.mouseClicked = function(){ click(p.mouseX,p.mouseY); };
  p.touchStarted = function(){
    if(p.touches.length>0) click(p.touches[0].x,p.touches[0].y);
    return false;
  };
});

// VOID RITES - Eldritch dice-slotting roguelike
// Standalone p5.js build (no compilation required)

const C = {
  VOID:      '#0a0a0f', DEEP:  '#12121e', PANEL:    '#1a1a2e',
  PANEL_ALT: '#16213e', BORDER:'#2d2d5e', ACCENT:   '#7c3aed',
  ACCENT2:   '#a855f7', DANGER:'#dc2626', WARNING:  '#d97706',
  SUCCESS:   '#059669', GOLD:  '#f59e0b', TEXT:     '#e5e7eb',
  TEXT_DIM:  '#6b7280', TEXT_MUT:'#374151',
  DIE_BG:   '#1e1e3f', DIE_BORDER:'#7c3aed', DIE_USED:'#2d1f4f',
  SLOT_EMPTY:'#1f2937', SLOT_FULL:'#312e81',
  HP_FG:    '#dc2626', HP_BG:'#1f1515',
  SAN_FG:   '#7c3aed', SAN_BG:'#150d20'
};

const ENEMIES = [
  { id:'herald',  name:'The Herald of Gnawing Voids', hp:20, maxHp:20, diceCount:2, color:'#6d28d9', glyph:'◈', tier:1,
    abilities:[{name:'Entropy Bite',slots:[3],dmg:5},{name:'Unravel',slots:[5,6],dmg:0,effect:'sanity',amount:2}] },
  { id:'watcher', name:'The Watcher Between Seconds', hp:30, maxHp:30, diceCount:3, color:'#9333ea', glyph:'⊗', tier:1,
    abilities:[{name:'Temporal Gnash',slots:[4,5],dmg:8},{name:'Erase Moment',slots:[6],dmg:0,effect:'skip'}] },
  { id:'choir',   name:'Choir of Unmaking', hp:45, maxHp:45, diceCount:3, color:'#7e22ce', glyph:'⊛', tier:2,
    abilities:[{name:'Cacophony',slots:[2,3],dmg:6},{name:'Soul Fracture',slots:[5],dmg:10},{name:'Consume Thought',slots:[6],dmg:0,effect:'sanity',amount:4}] },
  { id:'sleeper', name:'The Sleeper Beneath All Things', hp:80, maxHp:80, diceCount:4, color:'#4c1d95', glyph:'⊜', tier:3, boss:true,
    abilities:[{name:'Dream Crush',slots:[4],dmg:15},{name:'Void Surge',slots:[5,6],dmg:20},{name:'Ancient Hunger',slots:[3,4,5],dmg:0,effect:'sanity',amount:6}] }
];

const ITEMS = [
  {id:'bloodied-lens',  name:'Bloodied Lens',   glyph:'◉', desc:'Slot any die to deal its value as damage.',           slots:1, req:'any',    effect:'dmg-val'},
  {id:'ritual-dagger',  name:'Ritual Dagger',   glyph:'◇', desc:'Slot any die. Deals face value damage.',               slots:1, req:'any',    effect:'dmg-val'},
  {id:'shattered-idol', name:'Shattered Idol',  glyph:'◆', desc:'Slot a 4-5-6 to deal 9 damage.',                       slots:1, req:'high',   effect:'dmg', amount:9},
  {id:'void-compass',   name:'Void Compass',    glyph:'⊕', desc:'Slot a 1 or 2 to reroll all free dice.',               slots:1, req:'low',    effect:'reroll'},
  {id:'cursed-tome',    name:'Cursed Tome',     glyph:'⊞', desc:'Slot two matching dice to deal 14 damage.',            slots:2, req:'pair',   effect:'dmg', amount:14},
  {id:'entropy-sigil',  name:'Entropy Sigil',   glyph:'⊟', desc:'Slot a 3 to heal 4 HP.',                              slots:1, req:'three',  effect:'heal', amount:4},
  {id:'void-crown',     name:'Void Crown',      glyph:'⊠', desc:'Slot any die. Deals value+2 damage.',                 slots:1, req:'any',    effect:'dmg-val-plus', amount:2},
  {id:'obsidian-eye',   name:'Obsidian Eye',    glyph:'◈', desc:'Slot two odd dice to deal 11 damage.',                slots:2, req:'odd-pair',effect:'dmg', amount:11},
  {id:'flaying-word',   name:'Flaying Word',    glyph:'⟁', desc:'Slot a 5 or 6 to deal 13 damage.',                   slots:1, req:'high2',  effect:'dmg', amount:13},
  {id:'mind-splinter',  name:'Mind Splinter',   glyph:'⟃', desc:'Slot any odd die to deal 7 damage.',                  slots:1, req:'odd',    effect:'dmg', amount:7},
  {id:'rift-step',      name:'Rift Step',       glyph:'⟂', desc:'Slot a 2 to stun enemy (skip their attack).',         slots:1, req:'two',    effect:'stun'},
  {id:'blood-tithe',    name:'Blood Tithe',     glyph:'⟇', desc:'Slot three matching dice to deal 28 damage.',         slots:3, req:'triple', effect:'dmg', amount:28}
];

const FLOORS = [
  {id:1, name:'The Whispering Crypts',    enemies:['herald','watcher'], loot:3},
  {id:2, name:'The Drowned Cathedral',    enemies:['watcher','choir'],  loot:3},
  {id:3, name:'The Void Between Stars',   enemies:['sleeper'],          loot:4}
];

// ── State ────────────────────────────────────────────────────────────────────
let state;

function initState() {
  state = {
    screen: 'title',
    player: { hp:30, maxHp:30, sanity:10, maxSanity:10, items:[] },
    floor: 1,
    combat: null,
    lootOptions: [],
    selDie: null,
    hover: null,
    msg: null, msgTimer: 0
  };
}

function rollDie() { return Math.floor(Math.random()*6)+1; }
function rollDice(n) { return Array.from({length:n}, rollDie); }

function startCombat(enemyDef) {
  const enemy = Object.assign({}, enemyDef, {curHp: enemyDef.hp});
  const intent = pickIntent(enemy);
  const diceCount = 3 + Math.min(state.player.items.length, 2);
  state.combat = {
    enemy, intent,
    dice: rollDice(diceCount),
    slots: {},   // itemIdx -> {0: val, 1: val, ...}
    used: new Set(),
    rerolls: 1,
    stunned: false
  };
}

function pickIntent(enemy) {
  const ab = enemy.abilities[Math.floor(Math.random()*enemy.abilities.length)];
  return { ability: ab, dice: rollDice(enemy.diceCount) };
}

function showMsg(m) { state.msg = m; state.msgTimer = 130; }

// ── Requirement checking ─────────────────────────────────────────────────────
function slotVals(itemIdx) {
  const s = state.combat.slots[itemIdx] || {};
  return Object.values(s);
}

function slotsFilledFor(item, itemIdx) {
  return slotVals(itemIdx).length === item.slots;
}

function reqMet(item, itemIdx) {
  const vals = slotVals(itemIdx);
  if (vals.length !== item.slots) return false;
  switch(item.req) {
    case 'any':      return true;
    case 'high':     return vals.every(v => v >= 4);
    case 'high2':    return vals.every(v => v >= 5);
    case 'low':      return vals.every(v => v <= 2);
    case 'two':      return vals.every(v => v === 2);
    case 'three':    return vals.every(v => v === 3);
    case 'odd':      return vals.every(v => v % 2 === 1);
    case 'pair':     return vals.length===2 && vals[0]===vals[1];
    case 'odd-pair': return vals.length===2 && vals.every(v=>v%2===1);
    case 'triple':   return vals.length===3 && vals[0]===vals[1] && vals[1]===vals[2];
    default: return true;
  }
}

// ── Activation ───────────────────────────────────────────────────────────────
function activateItem(itemIdx) {
  const {combat, player} = state;
  if (combat.used.has(itemIdx)) { showMsg('Already used this turn!'); return; }
  const item = player.items[itemIdx];
  if (!item) return;
  if (!slotsFilledFor(item, itemIdx)) { showMsg('Fill all slots first!'); return; }
  if (!reqMet(item, itemIdx)) { showMsg('Wrong dice for this artifact!'); return; }

  const vals = slotVals(itemIdx);
  const sum = vals.reduce((a,b)=>a+b,0);

  switch(item.effect) {
    case 'dmg':          dealDmg(item.amount); break;
    case 'dmg-val':      dealDmg(sum); break;
    case 'dmg-val-plus': dealDmg(sum + item.amount); break;
    case 'heal':         healHp(item.amount); break;
    case 'reroll':       rerollFree(); break;
    case 'stun':         combat.stunned = true; showMsg('Enemy stunned — attack cancelled!'); break;
    default:             showMsg('Activated: ' + item.name);
  }

  combat.used.add(itemIdx);
  combat.slots[itemIdx] = {};

  if (combat.enemy.curHp <= 0) {
    setTimeout(() => transitionToLoot(), 400);
  }
}

function dealDmg(amount) {
  state.combat.enemy.curHp = Math.max(0, state.combat.enemy.curHp - amount);
  showMsg('-' + amount + ' damage!');
}

function healHp(amount) {
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
  showMsg('+' + amount + ' HP!');
}

function rerollFree() {
  state.combat.dice = state.combat.dice.map(v => v === 'used' ? 'used' : rollDie());
  showMsg('Rerolled free dice!');
}

// ── Slot / unslot die ────────────────────────────────────────────────────────
function slotDie(dieIdx, itemIdx, slotIdx) {
  const {combat} = state;
  if (combat.dice[dieIdx] === 'used') return;
  const val = combat.dice[dieIdx];
  // free any die already in that slot
  const existing = (combat.slots[itemIdx] || {})[slotIdx];
  if (existing !== undefined) {
    // find that die index and restore it
    const oldDieIdx = (combat.slots[itemIdx] || {})['_idx_'+slotIdx];
    if (oldDieIdx !== undefined) combat.dice[oldDieIdx] = existing;
  }
  if (!combat.slots[itemIdx]) combat.slots[itemIdx] = {};
  combat.slots[itemIdx][slotIdx] = val;
  combat.slots[itemIdx]['_idx_'+slotIdx] = dieIdx;
  combat.dice[dieIdx] = 'used';
  state.selDie = null;
}

function unslotDie(itemIdx, slotIdx) {
  const {combat} = state;
  const s = combat.slots[itemIdx] || {};
  const val = s[slotIdx];
  const origIdx = s['_idx_'+slotIdx];
  if (val === undefined) return;
  if (origIdx !== undefined) combat.dice[origIdx] = val;
  delete combat.slots[itemIdx][slotIdx];
  delete combat.slots[itemIdx]['_idx_'+slotIdx];
}

// ── End turn ─────────────────────────────────────────────────────────────────
function endTurn() {
  const {combat, player} = state;
  if (!combat.stunned) {
    const {ability} = combat.intent;
    if (ability.dmg && ability.dmg > 0) {
      player.hp = Math.max(0, player.hp - ability.dmg);
      showMsg('Enemy dealt ' + ability.dmg + ' damage!');
    } else if (ability.effect === 'sanity') {
      player.sanity = Math.max(0, player.sanity - ability.amount);
      showMsg('Sanity drained by ' + ability.amount + '!');
    }
  } else {
    showMsg('Stunned — enemy skipped!');
  }

  if (player.hp <= 0 || player.sanity <= 0) {
    state.screen = 'gameover';
    return;
  }
  if (combat.enemy.curHp <= 0) {
    transitionToLoot();
    return;
  }

  // next player turn
  const diceCount = 3 + Math.min(player.items.length, 2);
  combat.dice = rollDice(diceCount);
  combat.slots = {};
  combat.used = new Set();
  combat.rerolls = 1;
  combat.stunned = false;
  combat.intent = pickIntent(combat.enemy);
  state.selDie = null;
}

function transitionToLoot() {
  const floorDef = FLOORS.find(f => f.id === state.floor);
  const owned = new Set(state.player.items.map(i=>i.id));
  const pool = ITEMS.filter(i => !owned.has(i.id));
  const shuffled = pool.sort(()=>Math.random()-0.5);
  state.lootOptions = shuffled.slice(0, floorDef ? floorDef.loot : 3);
  state.screen = 'loot';
}

function pickLoot(idx) {
  const item = state.lootOptions[idx];
  if (!item) return;
  state.player.items.push(item);

  const nextFloor = state.floor + 1;
  const nextFloorDef = FLOORS.find(f => f.id === nextFloor);
  if (nextFloorDef) {
    state.floor = nextFloor;
    const enemyId = nextFloorDef.enemies[Math.floor(Math.random()*nextFloorDef.enemies.length)];
    const enemyDef = ENEMIES.find(e => e.id === enemyId);
    startCombat(enemyDef);
    state.screen = 'combat';
  } else {
    state.screen = 'victory';
  }
  state.selDie = null;
}

// ── p5.js sketch ─────────────────────────────────────────────────────────────
new p5(function(p) {

  // ── helpers ──
  function rect(x,y,w,h,col,r=0) {
    p.fill(col); p.noStroke();
    r>0 ? p.rect(x,y,w,h,r) : p.rect(x,y,w,h);
  }
  function rectOut(x,y,w,h,col,sw,r=0) {
    p.noFill(); p.stroke(col); p.strokeWeight(sw);
    r>0 ? p.rect(x,y,w,h,r) : p.rect(x,y,w,h);
    p.noStroke();
  }
  function txt(s,x,y,col,sz,align='LEFT') {
    p.fill(col); p.noStroke(); p.textSize(sz);
    p.textAlign(p[align]);
    p.text(s,x,y);
  }
  function inRect(mx,my,x,y,w,h) {
    return mx>=x&&mx<=x+w&&my>=y&&my<=y+h;
  }

  // ── draw helpers ──
  function bar(x,y,w,h,cur,max,fg,bg,label) {
    rect(x,y,w,h,bg);
    rect(x,y,Math.round(w*(cur/max)),h,fg);
    rectOut(x,y,w,h,C.BORDER,1);
    txt(label+': '+cur+'/'+max, x+4,y+h-5, C.TEXT,10);
  }

  function drawDie(x,y,sz,val,sel) {
    const used = val==='used';
    const bg = used ? C.DIE_USED : C.DIE_BG;
    const bd = used ? C.TEXT_MUT : val===6 ? C.GOLD : val>=4 ? C.ACCENT2 : C.DIE_BORDER;
    rect(x,y,sz,sz,bg,6);
    rectOut(x,y,sz,sz,bd,sel?2.5:1.5,6);
    if (sel) rectOut(x-3,y-3,sz+6,sz+6,C.ACCENT,2,9);
    if (!used) txt(''+val, x+sz/2, y+sz/2+7, used?C.TEXT_MUT:C.TEXT, sz===48?22:17, 'CENTER');
  }

  function drawItemCard(item, itemIdx, x, y, w) {
    const {combat} = state;
    const slots = combat ? (combat.slots[itemIdx]||{}) : {};
    const used = combat && combat.used.has(itemIdx);
    const bg = used ? C.TEXT_MUT : C.PANEL;
    rect(x,y,w,72,bg,8);
    rectOut(x,y,w,72,C.BORDER,1,8);
    txt(item.glyph, x+22,y+30, C.ACCENT,20,'CENTER');
    txt(item.name,  x+42,y+18, used?C.TEXT_MUT:C.TEXT, 12);
    txt(item.desc,  x+42,y+33, C.TEXT_DIM, 10);
    // slots
    for(let s=0;s<item.slots;s++) {
      const sx=x+42+s*46, sy=y+46;
      const sv=slots[s];
      const filled=sv!==undefined;
      rect(sx,sy,40,22,filled?C.SLOT_FULL:C.SLOT_EMPTY,5);
      rectOut(sx,sy,40,22,C.BORDER,1,5);
      if(filled) txt(''+sv,sx+20,sy+16,C.TEXT,16,'CENTER');
    }
    // activate hint
    if (!used && slotsFilledFor(item, itemIdx) && reqMet(item, itemIdx)) {
      rectOut(x,y,w,72,C.ACCENT,1.5,8);
      txt('CLICK TO ACTIVATE',x+w-8,y+62,C.ACCENT,9,'RIGHT');
    }
  }

  // ── TITLE ──
  function drawTitle() {
    p.background(C.VOID);
    const cx=400,cy=300;
    p.noFill();
    for(let i=1;i<=5;i++){p.stroke(C.BORDER);p.strokeWeight(0.5);p.ellipse(cx,cy,i*70,i*70);}
    p.noStroke();
    txt('⊜',cx,cy-40,C.ACCENT,65,'CENTER');
    txt('VOID RITES',cx,cy+10,C.ACCENT2,46,'CENTER');
    txt('AN ELDRITCH DICE-SLOTTING ROGUELIKE',cx,cy+36,C.TEXT_DIM,13,'CENTER');
    txt('— click to begin the ritual —',cx,cy+75,C.ACCENT,13,'CENTER');
  }

  // ── COMBAT ──
  function drawCombat() {
    p.background(C.VOID);
    const {combat,player,floor} = state;
    const {enemy,intent,dice,rerolls} = combat;

    // panels
    rect(10,10,440,580,C.DEEP,12);
    rect(450,10,340,580,C.DEEP,12);

    // floor label
    const floorDef = FLOORS.find(f=>f.id===floor);
    txt('FLOOR '+floor+' — '+(floorDef?floorDef.name:''), 455,24,C.TEXT_DIM,10);

    // player info
    txt('CULTIST', 20,36,C.ACCENT2,14);
    bar(20,42,195,18, player.hp,player.maxHp, C.HP_FG,C.HP_BG,'HP');
    bar(20,66,195,18, player.sanity,player.maxSanity, C.SAN_FG,C.SAN_BG,'SANITY');

    // enemy
    txt(enemy.name, 640,56,C.TEXT,13,'RIGHT');
    txt(enemy.glyph, 550,148,enemy.color,62,'CENTER');
    bar(455,218,330,20,enemy.curHp,enemy.maxHp,C.HP_FG,C.HP_BG,'ENEMY HP');

    // intent
    rect(455,248,330,80,C.PANEL,8);
    rectOut(455,248,330,80,C.BORDER,1,8);
    txt('ENEMY INTENT',460,264,C.TEXT_DIM,10);
    const {ability} = intent;
    txt(ability.name,460,282,C.DANGER,13);
    const intentDesc = combat.stunned ? 'STUNNED (will skip this attack)'
      : ability.dmg>0 ? 'Will deal '+ability.dmg+' damage'
      : ability.effect==='sanity' ? 'Will drain '+ability.amount+' sanity'
      : ability.effect==='skip' ? 'Will skip your turn' : '???';
    txt(intentDesc,460,300,C.TEXT,12);
    intent.dice.forEach((d,i)=>drawDie(460+i*34,308,26,d,false));

    // buttons
    const rHover = state.hover==='reroll';
    const eHover = state.hover==='endturn';
    rect(455,345,155,38,rHover?C.ACCENT:C.PANEL,6);
    txt('REROLL ('+rerolls+' left)',532,369,C.TEXT,13,'CENTER');
    rect(620,345,170,38,eHover?C.ACCENT:C.DANGER,6);
    txt('END TURN',705,369,C.TEXT,13,'CENTER');

    // dice tray
    txt('YOUR RITUAL FRAGMENTS', 20,105,C.TEXT_DIM,10);
    dice.forEach((v,i) => drawDie(20+i*58,112,48,v,state.selDie===i));

    // items
    txt('CURSED ARTIFACTS & SPELLS', 20,174,C.TEXT_DIM,10);
    player.items.forEach((item,i) => {
      drawItemCard(item, i, 20, 182+i*80, 420);
    });
    if (player.items.length===0) {
      txt('No artifacts yet — defeat enemies to earn loot.', 20,200,C.TEXT_MUT,11);
    }

    // message
    if (state.msg && state.msgTimer>0) {
      txt(state.msg, 400,340,C.GOLD,16,'CENTER');
    }
  }

  // ── LOOT ──
  function drawLoot() {
    p.background(C.VOID);
    txt('OFFERINGS FROM THE VOID', 400,60,C.ACCENT2,22,'CENTER');
    txt('Choose one artifact to carry forward.', 400,86,C.TEXT_DIM,13,'CENTER');
    const opts = state.lootOptions;
    const cardW=170, gap=20;
    const totalW = opts.length*(cardW+gap)-gap;
    const startX = 400-totalW/2;
    opts.forEach((item,i)=>{
      const cx=startX+i*(cardW+gap), cy=160;
      const hover = state.hover===('loot'+i);
      rect(cx,cy,cardW,230,hover?C.PANEL_ALT:C.PANEL,12);
      rectOut(cx,cy,cardW,230,hover?C.ACCENT:C.BORDER,hover?2:1,12);
      txt(item.glyph, cx+cardW/2,cy+70,C.ACCENT,36,'CENTER');
      txt(item.name,  cx+cardW/2,cy+100,C.TEXT,13,'CENTER');
      // wrap desc
      p.fill(C.TEXT_DIM); p.noStroke(); p.textSize(10);
      p.textAlign(p.CENTER);
      p.text(item.desc, cx+10,cy+118,cardW-20,60);
      rect(cx+25,cy+185,cardW-50,34,hover?C.ACCENT:C.ACCENT,6);
      txt('TAKE IT',cx+cardW/2,cy+207,C.TEXT,13,'CENTER');
    });
  }

  // ── GAME OVER ──
  function drawGameOver() {
    p.background(C.VOID);
    txt('⊗',400,240,C.DANGER,60,'CENTER');
    txt('YOU HAVE BEEN UNMADE',400,290,C.DANGER,28,'CENTER');
    txt('The void has consumed another cultist.',400,320,C.TEXT_DIM,14,'CENTER');
    rect(320,360,160,42,C.ACCENT,6);
    txt('TRY AGAIN',400,386,C.TEXT,14,'CENTER');
  }

  // ── VICTORY ──
  function drawVictory() {
    p.background(C.VOID);
    txt('⊛',400,240,C.GOLD,60,'CENTER');
    txt('THE SLEEPER STIRS',400,290,C.GOLD,30,'CENTER');
    txt('The ritual is complete. The void is satisfied... for now.',400,320,C.TEXT_DIM,13,'CENTER');
    rect(320,360,160,42,C.ACCENT,6);
    txt('PLAY AGAIN',400,386,C.TEXT,14,'CENTER');
  }

  // ── Setup / draw ─────────────────────────────────────────────────────────
  p.setup = function() {
    p.createCanvas(800,600);
    p.textFont('Courier New');
    initState();
  };

  p.draw = function() {
    if (state.msgTimer>0) state.msgTimer--;
    switch(state.screen) {
      case 'title':   drawTitle();   break;
      case 'combat':  drawCombat();  break;
      case 'loot':    drawLoot();    break;
      case 'gameover':drawGameOver();break;
      case 'victory': drawVictory(); break;
    }
  };

  // ── Input ────────────────────────────────────────────────────────────────
  p.mouseMoved = p.mouseDragged = function() {
    const mx=p.mouseX, my=p.mouseY;
    state.hover = null;
    if (state.screen==='combat') {
      if (inRect(mx,my,455,345,155,38)) state.hover='reroll';
      if (inRect(mx,my,620,345,170,38)) state.hover='endturn';
    }
    if (state.screen==='loot') {
      const opts=state.lootOptions, cardW=170, gap=20;
      const totalW=opts.length*(cardW+gap)-gap;
      const startX=400-totalW/2;
      opts.forEach((item,i)=>{
        const cx=startX+i*(cardW+gap);
        if(inRect(mx,my,cx,160,cardW,230)) state.hover='loot'+i;
      });
    }
  };

  p.mouseClicked = function() {
    const mx=p.mouseX, my=p.mouseY;

    if (state.screen==='title') {
      const firstFloor=FLOORS[0];
      const enemyId=firstFloor.enemies[Math.floor(Math.random()*firstFloor.enemies.length)];
      startCombat(ENEMIES.find(e=>e.id===enemyId));
      state.screen='combat';
      return;
    }

    if (state.screen==='gameover'||state.screen==='victory') {
      if(inRect(mx,my,320,360,160,42)) initState();
      return;
    }

    if (state.screen==='loot') {
      const opts=state.lootOptions, cardW=170, gap=20;
      const totalW=opts.length*(cardW+gap)-gap;
      const startX=400-totalW/2;
      opts.forEach((item,i)=>{
        const cx=startX+i*(cardW+gap);
        if(inRect(mx,my,cx+25,160+185,cardW-50,34)) pickLoot(i);
      });
      return;
    }

    if (state.screen==='combat') {
      const {combat,player} = state;
      const {dice} = combat;

      // buttons
      if(inRect(mx,my,455,345,155,38)) {
        if(combat.rerolls>0){rerollFree();combat.rerolls--;}
        else showMsg('No rerolls left!');
        return;
      }
      if(inRect(mx,my,620,345,170,38)) { endTurn(); return; }

      // dice
      for(let i=0;i<dice.length;i++) {
        const dx=20+i*58, dy=112;
        if(inRect(mx,my,dx,dy,48,48)&&dice[i]!=='used') {
          state.selDie = state.selDie===i ? null : i;
          return;
        }
      }

      // item slots (click slot to place selected die, or unslot)
      for(let itemIdx=0;itemIdx<player.items.length;itemIdx++) {
        const item=player.items[itemIdx];
        const iy=182+itemIdx*80;
        for(let s=0;s<item.slots;s++) {
          const sx=62+s*46, sy=iy+46;
          if(inRect(mx,my,sx,sy,40,22)) {
            if(state.selDie!==null) {
              slotDie(state.selDie,itemIdx,s);
            } else {
              unslotDie(itemIdx,s);
            }
            return;
          }
        }
        // click card body to activate
        if(inRect(mx,my,20,iy,420,72)) {
          activateItem(itemIdx);
          return;
        }
      }

      // deselect
      state.selDie=null;
    }
  };
});

'use strict';

// Logical canvas
var GW = 400, GH = 700;
var sc = 1, ox = 0, oy = 0;
var VW, VH;

// Palette
var C = {
  OCEAN:    '#0a1628',
  DEEP:     '#0d1f3c',
  DECK:     '#1a3a5c',
  PLANK:    '#8b6340',
  ROPE:     '#c4a265',
  GOLD:     '#f0c040',
  GOLD2:    '#d4a820',
  SAIL:     '#f5eed8',
  DANGER:   '#c0392b',
  TEXT:     '#f5eed8',
  TEXT_DIM: '#a89a7a',
  HP_FG:    '#27ae60',
  HP_BG:    '#1a3a2a',
  EN_FG:    '#e74c3c',
  EN_BG:    '#3a1a1a',
  PANEL:    '#0f2744',
  PANEL2:   '#132f50',
  BORDER:   '#2e5a8a',
  GREEN_HI: '#1a4a2a',
  GREEN_BD: '#27ae60'
};

// Card database
var CARD_DB = [
  {id:'rusty_cannon', name:'Rusty Cannon',  slots:[null,null], dmg:4,  heal:0, extraDraw:0, stun:false, desc:'Deal 4 damage.'},
  {id:'bilge_pump',   name:'Bilge Pump',    slots:[null,null], dmg:0,  heal:4, extraDraw:0, stun:false, desc:'Heal 4 HP.'},
  {id:'crows_nest',   name:"Crow's Nest",   slots:[null,null], dmg:0,  heal:0, extraDraw:2, stun:false, desc:'+2 dominoes next turn.'},
  {id:'iron_cannon',  name:'Iron Cannon',   slots:[null,6],    dmg:9,  heal:0, extraDraw:0, stun:false, desc:'Needs a 6. Deal 9 damage.'},
  {id:'grapeshot',    name:'Grapeshot',     slots:[3,null],    dmg:6,  heal:0, extraDraw:0, stun:false, desc:'Needs a 3. Deal 6 damage.'},
  {id:'broadside',    name:'Broadside',     slots:[5,5],       dmg:16, heal:0, extraDraw:0, stun:false, desc:'Double 5s only! Deal 16.'},
  {id:'powder_keg',   name:'Powder Keg',    slots:[6,6],       dmg:24, heal:0, extraDraw:0, stun:false, desc:'Double 6s only! Deal 24.'},
  {id:'sea_witch',    name:'Sea Witch',     slots:[null,null], dmg:0,  heal:10,extraDraw:0, stun:false, desc:'Heal 10 HP.'},
  {id:'anchor_drop',  name:'Anchor Drop',   slots:[null,null], dmg:2,  heal:0, extraDraw:0, stun:true,  desc:'Stun enemy. Deal 2 damage.'},
  {id:'nav_chart',    name:'Nav Chart',     slots:[null,null], dmg:0,  heal:0, extraDraw:3, stun:false, desc:'+3 dominoes next turn.'}
];

var ENEMY_DB = [
  {name:'Dinghy',      hp:14, atk:2},
  {name:'Sloop',       hp:24, atk:4},
  {name:'Brigantine',  hp:38, atk:6},
  {name:"Man-o-War",   hp:55, atk:9},
  {name:'Ghost Ship',  hp:75, atk:13}
];

var gs;

function cloneCard(def) {
  return {
    id: def.id, name: def.name,
    slots: [def.slots[0], def.slots[1]],
    dmg: def.dmg, heal: def.heal,
    extraDraw: def.extraDraw, stun: def.stun,
    desc: def.desc,
    assigned: [null, null]
  };
}

function initGS() {
  gs = {
    screen: 'title',
    player: {hp:30, maxHp:30, extraDraw:0},
    backpack: [
      cloneCard(CARD_DB[0]),
      cloneCard(CARD_DB[1]),
      cloneCard(CARD_DB[2])
    ],
    equipped: [0, 1, 2],
    enemyIdx: 0,
    combat: null,
    loot: null,
    msg: '',
    msgTimer: 0,
    wave: 0
  };
}

function makeDomino(l, r) { return {left:l, right:r, used:false}; }

function rollDominoes(n) {
  var result = [];
  for (var i = 0; i < n; i++) {
    result.push(makeDomino(
      Math.floor(Math.random() * 7),
      Math.floor(Math.random() * 7)
    ));
  }
  return result;
}

function dominoFits(dom, card) {
  // Returns false if card fully assigned already
  if (card.assigned[0] !== null && card.assigned[1] !== null) return false;
  var s0 = card.slots[0], s1 = card.slots[1];
  var norm = (s0 === null || s0 === dom.left) && (s1 === null || s1 === dom.right);
  var flip = (s0 === null || s0 === dom.right) && (s1 === null || s1 === dom.left);
  if (norm) return 'normal';
  if (flip) return 'flipped';
  return false;
}

function isReady(card) {
  return card.assigned[0] !== null && card.assigned[1] !== null;
}

function applyCard(card, cm) {
  if (!isReady(card)) return;
  var msgs = [];
  if (card.dmg > 0) {
    cm.enemy.hp -= card.dmg;
    msgs.push('BOOM! -' + card.dmg + ' hull!');
  }
  if (card.heal > 0) {
    gs.player.hp = min(gs.player.maxHp, gs.player.hp + card.heal);
    msgs.push('Healed +' + card.heal + ' HP!');
  }
  if (card.extraDraw > 0) {
    gs.player.extraDraw += card.extraDraw;
    msgs.push('+' + card.extraDraw + ' draws next turn!');
  }
  if (card.stun) {
    cm.enemy.stunned = true;
    msgs.push('Enemy anchored!');
  }
  card.assigned = [null, null];
  if (msgs.length > 0) showMsg(msgs.join(' '));
}

function showMsg(m) { gs.msg = m; gs.msgTimer = 180; }

// Scale helpers
function toGX(px) { return (px - ox) / sc; }
function toGY(py) { return (py - oy) / sc; }
function gx(x)    { return ox + x * sc; }
function gy(y)    { return oy + y * sc; }
function sz(v)    { return v * sc; }

function recalcScale() {
  VW = windowWidth; VH = windowHeight;
  sc = min(VW / GW, VH / GH);
  ox = (VW - GW * sc) / 2;
  oy = (VH - GH * sc) / 2;
}

// p5 lifecycle
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  recalcScale();
  initGS();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recalcScale();
}

function draw() {
  background(C.OCEAN);
  gs.wave = (gs.wave + 0.02) % (TWO_PI);
  if      (gs.screen === 'title')  drawTitle();
  else if (gs.screen === 'equip')  drawEquip();
  else if (gs.screen === 'combat') drawCombat();
  else if (gs.screen === 'loot')   drawLoot();
  drawMsgOverlay();
}

// Wave animation
function drawWaves(yBase) {
  push();
  noFill();
  strokeWeight(sz(1.5));
  var dc = color(C.DECK);
  for (var w = 0; w < 3; w++) {
    stroke(red(dc), green(dc), blue(dc), 130 - w * 30);
    beginShape();
    for (var x2 = 0; x2 <= GW; x2 += 10) {
      var yw = yBase + sin(gs.wave + x2 * 0.04 + w * 1.2) * 4 + w * 14;
      curveVertex(gx(x2), gy(yw));
    }
    endShape();
  }
  pop();
}

// Ship silhouette
function drawShip(cx, cy, w, enemy) {
  push();
  var h = w * 0.42;
  fill(enemy ? C.DANGER : C.DECK);
  noStroke();
  beginShape();
  vertex(gx(cx - w/2),          gy(cy));
  vertex(gx(cx + w/2),          gy(cy));
  vertex(gx(cx + w/2 - w*0.08), gy(cy + h*0.55));
  vertex(gx(cx - w/2 + w*0.08), gy(cy + h*0.55));
  endShape(CLOSE);
  fill(C.PLANK);
  rect(gx(cx - w*0.035), gy(cy - h*1.15), sz(w*0.07), sz(h*1.15));
  fill(enemy ? '#8B1010' : C.SAIL);
  triangle(
    gx(cx),        gy(cy - h*1.15),
    gx(cx + w*0.38), gy(cy - h*0.45),
    gx(cx),        gy(cy - h*0.05)
  );
  fill(enemy ? '#ff4444' : C.GOLD);
  triangle(
    gx(cx - w*0.035), gy(cy - h*1.15),
    gx(cx - w*0.18),  gy(cy - h*1.0),
    gx(cx - w*0.035), gy(cy - h*0.85)
  );
  pop();
}

// Message overlay
function drawMsgOverlay() {
  if (gs.msgTimer <= 0) return;
  gs.msgTimer--;
  var a = min(1, gs.msgTimer / 30) * 230;
  push();
  rectMode(CENTER);
  fill(10, 20, 40, a);
  noStroke();
  rect(gx(GW/2), gy(GH - 52), sz(GW - 30), sz(34), sz(8));
  var gc = color(C.GOLD);
  fill(red(gc), green(gc), blue(gc), a);
  textAlign(CENTER, CENTER);
  textSize(sz(12));
  text(gs.msg, gx(GW/2), gy(GH - 52));
  pop();
}

// ── TITLE ──────────────────────────────────────────────────────────────────
function drawTitle() {
  push();
  fill(C.DEEP);
  noStroke();
  rect(gx(0), gy(GH * 0.50), sz(GW), sz(GH * 0.50));
  pop();
  drawWaves(GH * 0.52);
  drawShip(GW/2, GH * 0.60, 120, false);
  push();
  textAlign(CENTER, CENTER);
  fill(C.GOLD);
  textSize(sz(42));
  textStyle(BOLD);
  text('DOMINO', gx(GW/2), gy(GH * 0.18));
  text('SEAS',   gx(GW/2), gy(GH * 0.27));
  textStyle(NORMAL);
  textSize(sz(13));
  fill(C.ROPE);
  text('A pirate dominoes game', gx(GW/2), gy(GH * 0.36));
  // Start button
  var bw = 190, bh = 46, bx = GW/2 - bw/2, by = GH * 0.76;
  fill(C.GOLD);
  noStroke();
  rect(gx(bx), gy(by), sz(bw), sz(bh), sz(12));
  fill(C.OCEAN);
  textSize(sz(16));
  textStyle(BOLD);
  text('SET SAIL', gx(GW/2), gy(by + bh/2));
  textStyle(NORMAL);
  pop();
}

// ── EQUIP ──────────────────────────────────────────────────────────────────
var EQ = {sidePad:10, cols:2, gap:8, cardH:88, cardY0:58, rowGap:8};

function equipCardRect(i) {
  var cw = (GW - 2*EQ.sidePad - (EQ.cols-1)*EQ.gap) / EQ.cols;
  return {
    x: EQ.sidePad + (i % EQ.cols) * (cw + EQ.gap),
    y: EQ.cardY0  + Math.floor(i / EQ.cols) * (EQ.cardH + EQ.rowGap),
    w: cw,
    h: EQ.cardH
  };
}

function drawEquip() {
  push();
  fill(C.GOLD);
  textAlign(CENTER, TOP);
  textSize(sz(16));
  textStyle(BOLD);
  text('CHOOSE YOUR WEAPONS', gx(GW/2), gy(8));
  textStyle(NORMAL);
  textSize(sz(10));
  fill(C.TEXT_DIM);
  text('Tap to equip / unequip. Max 3.', gx(GW/2), gy(28));
  text('Equipped: ' + gs.equipped.length + ' / 3', gx(GW/2), gy(40));
  for (var i = 0; i < gs.backpack.length; i++) {
    var r = equipCardRect(i);
    drawEquipCard(gs.backpack[i], r.x, r.y, r.w, r.h, gs.equipped.indexOf(i) >= 0);
  }
  var canFight = gs.equipped.length > 0;
  var bw = 180, bh = 42, bx = GW/2 - bw/2, by = GH - 56;
  fill(canFight ? C.GOLD : '#334455');
  noStroke();
  rect(gx(bx), gy(by), sz(bw), sz(bh), sz(10));
  fill(canFight ? C.OCEAN : '#556677');
  textAlign(CENTER, CENTER);
  textSize(sz(14));
  textStyle(BOLD);
  text('WEIGH ANCHOR!', gx(GW/2), gy(by + bh/2));
  textStyle(NORMAL);
  pop();
}

function drawEquipCard(card, cx, cy, w, h, equipped) {
  push();
  fill(equipped ? '#1a3a5c' : C.PANEL);
  stroke(equipped ? C.GOLD : C.BORDER);
  strokeWeight(sz(equipped ? 2.5 : 1.5));
  rect(gx(cx), gy(cy), sz(w), sz(h), sz(6));
  noStroke();
  fill(equipped ? C.GOLD : C.TEXT);
  textAlign(LEFT, TOP);
  textSize(sz(11));
  textStyle(BOLD);
  text(card.name, gx(cx + 7), gy(cy + 7));
  textStyle(NORMAL);
  var s0 = card.slots[0] === null ? '?' : '' + card.slots[0];
  var s1 = card.slots[1] === null ? '?' : '' + card.slots[1];
  fill(C.ROPE);
  textSize(sz(10));
  text('[' + s0 + '|' + s1 + ']', gx(cx + 7), gy(cy + 22));
  fill(C.TEXT_DIM);
  textSize(sz(9));
  text(card.desc, gx(cx + 7), gy(cy + 36), sz(w - 14), sz(h - 40));
  if (equipped) {
    fill(C.GOLD);
    textAlign(RIGHT, TOP);
    textSize(sz(9));
    text('[ON DECK]', gx(cx + w - 6), gy(cy + 7));
  }
  pop();
}

// ── COMBAT ─────────────────────────────────────────────────────────────────
var CB = {
  shipY:    68,
  hpBarY:   138,
  cardY:    186,
  cardH:    116,
  domY:     322,
  domW:     58, domH: 30,
  domPad:   7,
  btnY:     368,
  btnW:     130, btnH: 38
};

function startCombat() {
  for (var i = 0; i < gs.equipped.length; i++) {
    gs.backpack[gs.equipped[i]].assigned = [null, null];
  }
  var def = ENEMY_DB[min(gs.enemyIdx, ENEMY_DB.length - 1)];
  var domCount = 4 + gs.player.extraDraw;
  gs.player.extraDraw = 0;
  gs.combat = {
    enemy: {name:def.name, hp:def.hp, maxHp:def.hp, atk:def.atk, stunned:false},
    dominoes: rollDominoes(domCount),
    selDom: null,
    turn: 1
  };
  gs.screen = 'combat';
  showMsg('A ' + def.name + ' approaches! Man the cannons!');
}

function drawCombat() {
  var cm = gs.combat;
  push();
  fill(C.DEEP);
  noStroke();
  rect(gx(0), gy(GH * 0.62), sz(GW), sz(GH * 0.38));
  drawWaves(GH * 0.64);

  // Enemy ship
  drawShip(GW/2, CB.shipY, 90, true);
  fill(C.TEXT);
  textAlign(CENTER, TOP);
  textSize(sz(12));
  textStyle(BOLD);
  text(cm.enemy.name, gx(GW/2), gy(8));
  textStyle(NORMAL);

  // Enemy HP bar
  var ehpW = 200, ehpH = 16, ehpX = (GW - ehpW)/2;
  fill(C.EN_BG);
  noStroke();
  rect(gx(ehpX), gy(CB.hpBarY), sz(ehpW), sz(ehpH), sz(4));
  fill(C.EN_FG);
  rect(gx(ehpX), gy(CB.hpBarY), sz(ehpW * max(0, cm.enemy.hp/cm.enemy.maxHp)), sz(ehpH), sz(4));
  fill(C.TEXT);
  textAlign(CENTER, CENTER);
  textSize(sz(9));
  text(cm.enemy.hp + '/' + cm.enemy.maxHp + ' hull', gx(GW/2), gy(CB.hpBarY + ehpH/2));
  if (cm.enemy.stunned) {
    fill(C.GOLD);
    textAlign(CENTER, TOP);
    textSize(sz(9));
    text('[ANCHORED - skips next attack]', gx(GW/2), gy(CB.hpBarY + ehpH + 2));
  }

  // Player HP
  var phpW = 120, phpH = 14, phpX = 6, phpY = 6;
  fill(C.HP_BG);
  noStroke();
  rect(gx(phpX), gy(phpY), sz(phpW), sz(phpH), sz(3));
  fill(C.HP_FG);
  rect(gx(phpX), gy(phpY), sz(phpW * max(0, gs.player.hp/gs.player.maxHp)), sz(phpH), sz(3));
  fill(C.TEXT);
  textAlign(LEFT, TOP);
  textSize(sz(9));
  text('Crew: ' + gs.player.hp + '/' + gs.player.maxHp, gx(phpX + 3), gy(phpY + 2));
  fill(C.TEXT_DIM);
  textAlign(RIGHT, TOP);
  text('Turn ' + cm.turn, gx(GW - 6), gy(6));

  // Equipped cards
  var nc = gs.equipped.length;
  var cardW = (GW - 12 - (nc-1)*6) / nc;
  for (var ci = 0; ci < nc; ci++) {
    var card = gs.backpack[gs.equipped[ci]];
    drawCombatCard(card, 6 + ci*(cardW+6), CB.cardY, cardW, CB.cardH, cm);
  }

  // Domino hint label
  fill(C.TEXT_DIM);
  textAlign(CENTER, BOTTOM);
  textSize(sz(10));
  if (cm.selDom === null) {
    text('Tap a domino to select it', gx(GW/2), gy(CB.domY - 3));
  } else {
    text('Tap a card to place  [tap domino to cancel]', gx(GW/2), gy(CB.domY - 3));
  }

  // Dominoes
  var totalDomW = cm.dominoes.length * (CB.domW + CB.domPad) - CB.domPad;
  var domX0 = (GW - totalDomW) / 2;
  for (var di = 0; di < cm.dominoes.length; di++) {
    var dom = cm.dominoes[di];
    var ddx = domX0 + di*(CB.domW + CB.domPad);
    if (!dom.used) {
      drawDomino(dom, ddx, CB.domY, CB.domW, CB.domH, cm.selDom === di);
    } else {
      push();
      fill(C.PANEL2);
      stroke(C.BORDER);
      strokeWeight(sz(1));
      rect(gx(ddx), gy(CB.domY), sz(CB.domW), sz(CB.domH), sz(4));
      pop();
    }
  }

  // End Turn button
  var etX = GW/2 - CB.btnW/2;
  fill(C.DECK);
  stroke(C.BORDER);
  strokeWeight(sz(1.5));
  rect(gx(etX), gy(CB.btnY), sz(CB.btnW), sz(CB.btnH), sz(8));
  noStroke();
  fill(C.TEXT);
  textAlign(CENTER, CENTER);
  textSize(sz(12));
  text('End Turn', gx(GW/2), gy(CB.btnY + CB.btnH/2));
  pop();
}

function drawCombatCard(card, cx, cy, w, h, cm) {
  push();
  var ready = isReady(card);
  var fitType = false;
  if (cm.selDom !== null && !cm.dominoes[cm.selDom].used) {
    fitType = dominoFits(cm.dominoes[cm.selDom], card);
  }
  var fits = fitType !== false;
  fill(ready ? C.GREEN_HI : (fits ? '#1a2f50' : C.PANEL));
  stroke(ready ? C.GREEN_BD : (fits ? C.GOLD : C.BORDER));
  strokeWeight(sz(fits || ready ? 2.5 : 1.5));
  rect(gx(cx), gy(cy), sz(w), sz(h), sz(6));
  noStroke();
  // Name
  fill(ready ? '#7fff7f' : C.TEXT);
  textAlign(CENTER, TOP);
  textSize(sz(9));
  textStyle(BOLD);
  text(card.name, gx(cx + w/2), gy(cy + 5));
  textStyle(NORMAL);
  // Slot display (domino-shaped)
  var sW = w * 0.82, sH = 24;
  var sX = cx + (w - sW)/2, sY = cy + 20;
  fill(C.OCEAN);
  stroke(C.BORDER);
  strokeWeight(sz(1));
  rect(gx(sX), gy(sY), sz(sW), sz(sH), sz(3));
  line(gx(sX + sW/2), gy(sY + 3), gx(sX + sW/2), gy(sY + sH - 3));
  for (var si = 0; si < 2; si++) {
    var halfX = sX + si*(sW/2) + sW/4;
    var asgn = card.assigned[si];
    var req  = card.slots[si];
    noStroke();
    if (asgn !== null) {
      fill(C.GOLD);
      textSize(sz(13));
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('' + asgn, gx(halfX), gy(sY + sH/2));
      textStyle(NORMAL);
    } else {
      fill(fits ? '#88aacc' : C.TEXT_DIM);
      textSize(sz(11));
      textAlign(CENTER, CENTER);
      text(req === null ? '?' : '' + req, gx(halfX), gy(sY + sH/2));
    }
  }
  // Desc
  noStroke();
  fill(C.TEXT_DIM);
  textAlign(CENTER, TOP);
  textSize(sz(8));
  text(card.desc, gx(cx + w/2), gy(sY + sH + 4), sz(w - 8), sz(h - sH - 30));
  // Status label
  if (ready) {
    fill(C.GOLD);
    textAlign(CENTER, BOTTOM);
    textSize(sz(10));
    textStyle(BOLD);
    text('FIRE!', gx(cx + w/2), gy(cy + h - 3));
    textStyle(NORMAL);
  } else if (fits) {
    fill(C.GOLD);
    textAlign(CENTER, BOTTOM);
    textSize(sz(9));
    text('PLACE', gx(cx + w/2), gy(cy + h - 3));
  }
  pop();
}

function drawDomino(dom, dx, dy, w, h, selected) {
  push();
  fill(selected ? C.DECK : C.PANEL2);
  stroke(selected ? C.GOLD : C.BORDER);
  strokeWeight(sz(selected ? 2.5 : 1.5));
  rect(gx(dx), gy(dy), sz(w), sz(h), sz(4));
  stroke(selected ? C.GOLD : '#2e5a8a');
  strokeWeight(sz(1));
  line(gx(dx + w/2), gy(dy + 4), gx(dx + w/2), gy(dy + h - 4));
  noStroke();
  fill(selected ? C.GOLD : C.TEXT);
  textAlign(CENTER, CENTER);
  textSize(sz(14));
  textStyle(BOLD);
  text('' + dom.left,  gx(dx + w/4),   gy(dy + h/2));
  text('' + dom.right, gx(dx + 3*w/4), gy(dy + h/2));
  textStyle(NORMAL);
  pop();
}

// ── LOOT ──────────────────────────────────────────────────────────────────
function startLoot() {
  var ownedIds = gs.backpack.map(function(c) { return c.id; });
  var pool = CARD_DB.filter(function(c) { return ownedIds.indexOf(c.id) < 0; });
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  var choices = pool.slice(0, min(2, pool.length)).map(function(c) { return cloneCard(c); });
  gs.loot = {choices: choices};
  gs.screen = 'loot';
  showMsg('Victory! Choose your plunder!');
}

function drawLoot() {
  push();
  fill(C.GOLD);
  textAlign(CENTER, TOP);
  textSize(sz(22));
  textStyle(BOLD);
  text('PLUNDER!', gx(GW/2), gy(16));
  textStyle(NORMAL);
  textSize(sz(12));
  fill(C.TEXT_DIM);
  text('Choose a card to add to your hold:', gx(GW/2), gy(46));

  var cards = gs.loot.choices;
  var cw = 170, ch = 120;
  var totalW = cards.length * cw + (cards.length - 1) * 12;
  var cStartX = (GW - totalW) / 2;
  var cStartY = 70;

  if (cards.length === 0) {
    fill(C.TEXT_DIM);
    textSize(sz(12));
    text('No new cards available.', gx(GW/2), gy(GH/2));
    var bw = 160, bh = 40, bx = GW/2 - bw/2, by2 = GH*0.65;
    fill(C.GOLD);
    noStroke();
    rect(gx(bx), gy(by2), sz(bw), sz(bh), sz(10));
    fill(C.OCEAN);
    textSize(sz(14));
    textStyle(BOLD);
    text('Continue', gx(GW/2), gy(by2 + bh/2));
    textStyle(NORMAL);
    pop();
    return;
  }

  for (var i = 0; i < cards.length; i++) {
    drawLootCard(cards[i], cStartX + i*(cw + 12), cStartY, cw, ch);
  }

  fill(C.TEXT_DIM);
  textAlign(CENTER, TOP);
  textSize(sz(11));
  text('- tap here to sail on without plunder -', gx(GW/2), gy(cStartY + ch + 20));
  pop();
}

function drawLootCard(card, cx, cy, w, h) {
  push();
  fill(C.PANEL2);
  stroke(C.GOLD);
  strokeWeight(sz(2));
  rect(gx(cx), gy(cy), sz(w), sz(h), sz(8));
  noStroke();
  fill(C.GOLD);
  textAlign(CENTER, TOP);
  textSize(sz(12));
  textStyle(BOLD);
  text(card.name, gx(cx + w/2), gy(cy + 10));
  textStyle(NORMAL);
  var s0 = card.slots[0] === null ? '?' : '' + card.slots[0];
  var s1 = card.slots[1] === null ? '?' : '' + card.slots[1];
  fill(C.ROPE);
  textSize(sz(11));
  text('[' + s0 + '|' + s1 + ']', gx(cx + w/2), gy(cy + 28));
  fill(C.TEXT);
  textSize(sz(10));
  text(card.desc, gx(cx + w/2), gy(cy + 46), sz(w - 14), sz(h - 52));
  pop();
}

// ── INPUT ──────────────────────────────────────────────────────────────────
function mousePressed() {
  var mx = toGX(mouseX), my = toGY(mouseY);
  if      (gs.screen === 'title')  handleTitle(mx, my);
  else if (gs.screen === 'equip')  handleEquip(mx, my);
  else if (gs.screen === 'combat') handleCombat(mx, my);
  else if (gs.screen === 'loot')   handleLoot(mx, my);
}

function touchStarted() { mousePressed(); return false; }

function handleTitle(mx, my) {
  var bw = 190, bh = 46, bx = GW/2 - bw/2, by = GH * 0.76;
  if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
    gs.screen = 'equip';
  }
}

function handleEquip(mx, my) {
  for (var i = 0; i < gs.backpack.length; i++) {
    var r = equipCardRect(i);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      var idx = gs.equipped.indexOf(i);
      if (idx >= 0) {
        gs.equipped.splice(idx, 1);
        showMsg('Unequipped ' + gs.backpack[i].name + '.');
      } else if (gs.equipped.length < 3) {
        gs.equipped.push(i);
        showMsg('Equipped ' + gs.backpack[i].name + '!');
      } else {
        showMsg('Already have 3 cards equipped!');
      }
      return;
    }
  }
  var bw = 180, bh = 42, bx = GW/2 - bw/2, by = GH - 56;
  if (gs.equipped.length > 0 && mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
    startCombat();
  }
}

function handleCombat(mx, my) {
  var cm = gs.combat;
  var totalDomW = cm.dominoes.length * (CB.domW + CB.domPad) - CB.domPad;
  var domX0 = (GW - totalDomW) / 2;

  // Domino taps
  for (var di = 0; di < cm.dominoes.length; di++) {
    if (cm.dominoes[di].used) continue;
    var ddx = domX0 + di*(CB.domW + CB.domPad);
    if (mx >= ddx && mx <= ddx + CB.domW && my >= CB.domY && my <= CB.domY + CB.domH) {
      cm.selDom = (cm.selDom === di) ? null : di;
      return;
    }
  }

  // Card taps (when domino selected)
  if (cm.selDom !== null) {
    var nc = gs.equipped.length;
    var cardW = (GW - 12 - (nc-1)*6) / nc;
    for (var ci = 0; ci < nc; ci++) {
      var card = gs.backpack[gs.equipped[ci]];
      var ccx = 6 + ci*(cardW + 6);
      if (mx >= ccx && mx <= ccx + cardW && my >= CB.cardY && my <= CB.cardY + CB.cardH) {
        var dom = cm.dominoes[cm.selDom];
        var fitType = dominoFits(dom, card);
        if (!fitType) {
          showMsg("That domino doesn't fit " + card.name + '!');
          return;
        }
        if (fitType === 'normal') {
          card.assigned[0] = dom.left;
          card.assigned[1] = dom.right;
        } else {
          card.assigned[0] = dom.right;
          card.assigned[1] = dom.left;
        }
        dom.used = true;
        cm.selDom = null;
        applyCard(card, cm);
        if (cm.enemy.hp <= 0) { startLoot(); return; }
        return;
      }
    }
    cm.selDom = null;
    return;
  }

  // End Turn button
  var etX = GW/2 - CB.btnW/2;
  if (mx >= etX && mx <= etX + CB.btnW && my >= CB.btnY && my <= CB.btnY + CB.btnH) {
    doEndTurn();
  }
}

function doEndTurn() {
  var cm = gs.combat;
  if (cm.enemy.stunned) {
    showMsg(cm.enemy.name + ' is anchored - skips attack!');
    cm.enemy.stunned = false;
  } else {
    gs.player.hp -= cm.enemy.atk;
    showMsg(cm.enemy.name + ' deals ' + cm.enemy.atk + ' damage to your crew!');
    if (gs.player.hp <= 0) {
      gs.player.hp = 0;
      setTimeout(function() {
        initGS();
        gs.screen = 'title';
      }, 2200);
      showMsg('Your ship is sunk! Starting over...');
      return;
    }
  }
  for (var i = 0; i < gs.equipped.length; i++) {
    gs.backpack[gs.equipped[i]].assigned = [null, null];
  }
  var domCount = 4 + gs.player.extraDraw;
  gs.player.extraDraw = 0;
  cm.dominoes = rollDominoes(domCount);
  cm.selDom = null;
  cm.turn++;
}

function handleLoot(mx, my) {
  var cards = gs.loot.choices;
  var cw = 170, ch = 120;
  var totalW = cards.length * cw + (cards.length - 1) * 12;
  var cStartX = (GW - totalW) / 2;
  var cStartY = 70;

  if (cards.length === 0) {
    var bw = 160, bh = 40, bx = GW/2 - bw/2, by = GH * 0.65;
    if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
      gs.enemyIdx++;
      gs.screen = 'equip';
    }
    return;
  }

  for (var i = 0; i < cards.length; i++) {
    var cx = cStartX + i*(cw + 12);
    if (mx >= cx && mx <= cx + cw && my >= cStartY && my <= cStartY + ch) {
      gs.backpack.push(cards[i]);
      showMsg('Added ' + cards[i].name + ' to your hold!');
      gs.enemyIdx++;
      gs.screen = 'equip';
      return;
    }
  }

  if (my > cStartY + ch + 10) {
    showMsg('You sail on without taking plunder.');
    gs.enemyIdx++;
    gs.screen = 'equip';
  }
}

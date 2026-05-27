'use strict';

var GW = 400, GH = 700;
var sc = 1, ox = 0, oy = 0;
var VW, VH;

var C = {
  OCEAN:'#0a1628', DEEP:'#0d1f3c', DECK:'#1a3a5c',
  PLANK:'#8b6340', ROPE:'#c4a265', GOLD:'#f0c040', GOLD2:'#d4a820',
  SAIL:'#f5eed8', DANGER:'#c0392b', TEXT:'#f5eed8', TEXT_DIM:'#a89a7a',
  HP_FG:'#27ae60', HP_BG:'#1a3a2a', EN_FG:'#e74c3c', EN_BG:'#3a1a1a',
  PANEL:'#0f2744', PANEL2:'#132f50', BORDER:'#2e5a8a',
  GREEN_HI:'#1a4a2a', GREEN_BD:'#27ae60'
};

var imgShipPlayer = null, imgShipEnemy = null, imgKraken = null;

var CARD_DB = [
  {id:'rusty_cannon',name:'Rusty Cannon', slots:[null,null],dmg:4, heal:0,extraDraw:0,stun:false,desc:'Deal 4 damage.'},
  {id:'bilge_pump',  name:'Bilge Pump',   slots:[null,null],dmg:0, heal:4,extraDraw:0,stun:false,desc:'Heal 4 HP.'},
  {id:'crows_nest',  name:"Crow's Nest",  slots:[null,null],dmg:0, heal:0,extraDraw:2,stun:false,desc:'+2 dominoes next turn.'},
  {id:'iron_cannon', name:'Iron Cannon',  slots:[null,6],   dmg:9, heal:0,extraDraw:0,stun:false,desc:'Needs a 6. Deal 9 damage.'},
  {id:'grapeshot',   name:'Grapeshot',    slots:[3,null],   dmg:6, heal:0,extraDraw:0,stun:false,desc:'Needs a 3. Deal 6 damage.'},
  {id:'broadside',   name:'Broadside',    slots:[5,5],      dmg:16,heal:0,extraDraw:0,stun:false,desc:'Double 5s only! Deal 16.'},
  {id:'powder_keg',  name:'Powder Keg',   slots:[6,6],      dmg:24,heal:0,extraDraw:0,stun:false,desc:'Double 6s only! Deal 24.'},
  {id:'sea_witch',   name:'Sea Witch',    slots:[null,null],dmg:0, heal:10,extraDraw:0,stun:false,desc:'Heal 10 HP.'},
  {id:'anchor_drop', name:'Anchor Drop',  slots:[null,null],dmg:2, heal:0,extraDraw:0,stun:true, desc:'Stun enemy. Deal 2 damage.'},
  {id:'nav_chart',   name:'Nav Chart',    slots:[null,null],dmg:0, heal:0,extraDraw:3,stun:false,desc:'+3 dominoes next turn.'}
];

var MOVE_DB = {
  light: {name:'Pot Shot',   type:'atk',mult:0.6,desc:'A light attack'},
  cannon:{name:'Cannon Fire',type:'atk',mult:1.0,desc:'Standard volley'},
  heavy: {name:'Broadside',  type:'atk',mult:1.5,desc:'Powerful volley!'},
  brace: {name:'Brace',      type:'def',mult:0,  desc:'Halves next hit taken'},
  repair:{name:'Patch Hull', type:'heal',mult:0, desc:'Emergency repairs'}
};

var ENEMY_DB = [
  {name:'Dinghy',    hp:14, atk:2, gold:1, moveset:['light','light','brace']},
  {name:'Sloop',     hp:24, atk:4, gold:2, moveset:['cannon','light','repair']},
  {name:'Brigantine',hp:38, atk:6, gold:3, moveset:['cannon','heavy','brace']},
  {name:"Man-o-War", hp:55, atk:9, gold:4, moveset:['heavy','cannon','brace']},
  {name:'Ghost Ship',hp:75, atk:13,gold:5, moveset:['heavy','heavy','repair']},
  {name:'The Kraken',hp:150,atk:22,gold:15,moveset:['heavy','cannon','heavy','repair','heavy','brace']}
];

var FLOORS = [
  {name:'The Shallows',  enemies:[0,0],   portName:'Crab Cove'},
  {name:'The Narrows',   enemies:[1,0,1], portName:"Sailor's Rest"},
  {name:'Open Waters',   enemies:[2,1,2], portName:'Port Amberstone'},
  {name:'The Storm Belt',enemies:[3,2,3], portName:'Haven Isle'},
  {name:'Dead Seas',     enemies:[4,3,4], portName:'End of the World'}
];

var gs;

function cloneCard(def) {
  return {id:def.id,name:def.name,slots:[def.slots[0],def.slots[1]],
          dmg:def.dmg,heal:def.heal,extraDraw:def.extraDraw,stun:def.stun,
          desc:def.desc,assigned:[null,null]};
}

// ── MAP GENERATION ────────────────────────────────────────────
var NW = 172, NH = 70;
var xL = 10, xR = 218, xC = 114;
var yR = [100, 238, 376, 510];

function generateFloorMap(flIdx) {
  var fl   = FLOORS[min(flIdx, FLOORS.length - 1)];
  var pool = fl.enemies;
  var nodes = [], nid = 0;

  function rnd() { return pool[Math.floor(Math.random() * pool.length)]; }
  function boss() {
    var b = pool[0];
    for (var i = 1; i < pool.length; i++) { if (pool[i] > b) b = pool[i]; }
    return b;
  }
  function mk(type, x, y, eId) {
    nodes.push({id:nid,type:type,eId:eId||0,x:x,y:y,next:[]});
    return nid++;
  }

  var tpl = Math.floor(Math.random() * 3);
  var entryIds;

  if (tpl === 0) {
    var hasPort = Math.random() < 0.55;
    var nA   = mk('enemy', xL, yR[0], rnd());
    var nB   = hasPort ? mk('port', xR, yR[0]) : mk('enemy', xR, yR[0], rnd());
    var nMid = mk('enemy', xC, yR[1], rnd());
    var nBs  = mk('enemy', xC, yR[2], boss());
    var nEx  = mk('exit',  xC, yR[3]);
    nodes[nA].next  = [nMid];
    nodes[nB].next  = [nMid];
    nodes[nMid].next= [nBs];
    nodes[nBs].next = [nEx];
    entryIds = [nA, nB];

  } else if (tpl === 1) {
    var n0   = mk('enemy', xC, yR[0], rnd());
    var nGd  = mk('enemy', xL, yR[1], rnd());
    var nSk  = mk('enemy', xR, yR[1], rnd());
    var nPt  = mk('port',  xL, yR[2]);
    var nBs  = mk('enemy', xR, yR[2], boss());
    var nEx  = mk('exit',  xC, yR[3]);
    nodes[n0].next  = [nGd, nSk];
    nodes[nGd].next = [nPt];
    nodes[nSk].next = [nBs];
    nodes[nPt].next = [nBs];
    nodes[nBs].next = [nEx];
    entryIds = [n0];

  } else {
    var portRight = Math.random() < 0.5;
    var nL1  = mk('enemy', xL, yR[0], rnd());
    var nR1  = mk('enemy', xR, yR[0], rnd());
    var nL2  = portRight ? mk('enemy', xL, yR[1], rnd()) : mk('port', xL, yR[1]);
    var nR2  = portRight ? mk('port',  xR, yR[1])        : mk('enemy',xR, yR[1], rnd());
    var nBs  = mk('enemy', xC, yR[2], boss());
    var nEx  = mk('exit',  xC, yR[3]);
    nodes[nL1].next = [nL2];
    nodes[nR1].next = [nR2];
    nodes[nL2].next = [nBs];
    nodes[nR2].next = [nBs];
    nodes[nBs].next = [nEx];
    entryIds = [nL1, nR1];
  }

  return {nodes:nodes, entryIds:entryIds, visited:[], fightingNodeId:null};
}

function getMapNode(id) {
  if (!gs.floorMap) return null;
  for (var i = 0; i < gs.floorMap.nodes.length; i++) {
    if (gs.floorMap.nodes[i].id === id) return gs.floorMap.nodes[i];
  }
  return null;
}

function getReachable() {
  var map = gs.floorMap;
  if (!map) return [];
  var vis = map.visited;
  var out = [];
  for (var i = 0; i < map.nodes.length; i++) {
    var n = map.nodes[i];
    if (vis.indexOf(n.id) >= 0) continue;
    var ok = false;
    if (vis.length === 0 && map.entryIds.indexOf(n.id) >= 0) ok = true;
    for (var j = 0; j < vis.length && !ok; j++) {
      var vn = getMapNode(vis[j]);
      if (vn && vn.next.indexOf(n.id) >= 0) ok = true;
    }
    if (ok) out.push(n.id);
  }
  return out;
}

function initFloorState() {
  gs.floorMap = generateFloorMap(gs.floorIdx);
}

function initGS() {
  gs = {
    screen:'title',
    player:{hp:30,maxHp:30,extraDraw:0},
    backpack:[cloneCard(CARD_DB[0]),cloneCard(CARD_DB[1]),cloneCard(CARD_DB[2])],
    equipped:[0,1,2],
    floorIdx:0,
    floorMap:null,
    gold:2,
    combat:null, loot:null, port:null,
    finalBoss:false,
    msg:'', msgTimer:0, wave:0
  };
  initFloorState();
}

// ── DOMINO / COMBAT HELPERS ───────────────────────────────────────────
function makeDomino(l,r){return{left:l,right:r,used:false};}
function rollDominoes(n){
  var r=[];
  for(var i=0;i<n;i++) r.push(makeDomino(Math.floor(Math.random()*7),Math.floor(Math.random()*7)));
  return r;
}

function pickMove(enemy) {
  var id   = enemy.moveset[enemy.moveIdx % enemy.moveset.length];
  enemy.moveIdx = (enemy.moveIdx + 1) % enemy.moveset.length;
  var base = MOVE_DB[id];
  return {
    id:id, name:base.name, type:base.type,
    dmg:    base.type==='atk'  ? Math.max(1,Math.round(enemy.atk*base.mult)) : 0,
    healAmt:base.type==='heal' ? Math.max(3,Math.round(enemy.maxHp*0.15))   : 0,
    desc:base.desc
  };
}

function dominoFits(dom,card){
  if(card.assigned[0]!==null&&card.assigned[1]!==null) return false;
  var s0=card.slots[0],s1=card.slots[1];
  var norm=(s0===null||s0===dom.left)&&(s1===null||s1===dom.right);
  var flip=(s0===null||s0===dom.right)&&(s1===null||s1===dom.left);
  if(norm) return 'normal';
  if(flip) return 'flipped';
  return false;
}
function isReady(card){return card.assigned[0]!==null&&card.assigned[1]!==null;}

function applyCard(card,cm){
  if(!isReady(card)) return;
  var msgs=[];
  if(card.dmg>0){
    var dmg=card.dmg;
    if(cm.enemy.braceActive){
      dmg=Math.max(1,Math.round(dmg*0.5));
      cm.enemy.braceActive=false;
      msgs.push('Brace absorbed! -'+dmg+' hull!');
    } else { msgs.push('BOOM! -'+dmg+' hull!'); }
    cm.enemy.hp-=dmg;
  }
  if(card.heal>0){gs.player.hp=min(gs.player.maxHp,gs.player.hp+card.heal);msgs.push('Healed +'+card.heal+' HP!');}
  if(card.extraDraw>0){gs.player.extraDraw+=card.extraDraw;msgs.push('+'+card.extraDraw+' draws next turn!');}
  if(card.stun){cm.enemy.stunned=true;msgs.push('Enemy anchored!');}
  card.assigned=[null,null];
  if(msgs.length>0) showMsg(msgs.join(' '));
}

function showMsg(m){gs.msg=m;gs.msgTimer=180;}
function toGX(px){return(px-ox)/sc;}
function toGY(py){return(py-oy)/sc;}
function gx(x){return ox+x*sc;}
function gy(y){return oy+y*sc;}
function sz(v){return v*sc;}

function recalcScale(){
  VW=windowWidth;VH=windowHeight;
  sc=min(VW/GW,VH/GH);
  ox=(VW-GW*sc)/2;
  oy=(VH-GH*sc)/2;
}

function preload(){
  imgShipPlayer = loadImage('assets/svg/ship_player.svg');
  imgShipEnemy  = loadImage('assets/svg/ship_enemy.svg');
  imgKraken     = loadImage('assets/svg/kraken.svg');
}

function setup(){createCanvas(windowWidth,windowHeight);textFont('monospace');recalcScale();initGS();}
function windowResized(){resizeCanvas(windowWidth,windowHeight);recalcScale();}

function draw(){
  background(C.OCEAN);
  gs.wave=(gs.wave+0.02)%TWO_PI;
  if     (gs.screen==='title')  drawTitle();
  else if(gs.screen==='floor')  drawFloor();
  else if(gs.screen==='equip')  drawEquip();
  else if(gs.screen==='combat'){
    drawCombat();
    var cm=gs.combat;
    if(cm&&cm.enemyAnim>0){
      cm.enemyAnim--;
      if(cm.enemyAnim>0) drawEnemyTurnOverlay(cm);
      else resolveEnemyTurn(cm);
    }
  }
  else if(gs.screen==='loot') drawLoot();
  else if(gs.screen==='port') drawPort();
  drawMsgOverlay();
}

function drawWaves(yBase){
  push(); noFill(); strokeWeight(sz(1.5));
  var dc=color(C.DECK);
  for(var w=0;w<3;w++){
    stroke(red(dc),green(dc),blue(dc),130-w*30);
    beginShape();
    for(var x2=0;x2<=GW;x2+=10) curveVertex(gx(x2),gy(yBase+sin(gs.wave+x2*0.04+w*1.2)*4+w*14));
    endShape();
  }
  pop();
}

function drawShip(cx,cy,w,enemy){
  var h=w*0.42;
  var img=enemy?imgShipEnemy:imgShipPlayer;
  if(img){
    image(img,gx(cx-w/2),gy(cy-h*1.15),sz(w),sz(w*0.75));
    return;
  }
  push();
  fill(enemy?C.DANGER:C.DECK);noStroke();
  beginShape();
  vertex(gx(cx-w/2),gy(cy));vertex(gx(cx+w/2),gy(cy));
  vertex(gx(cx+w/2-w*0.08),gy(cy+h*0.55));vertex(gx(cx-w/2+w*0.08),gy(cy+h*0.55));
  endShape(CLOSE);
  fill(C.PLANK);rect(gx(cx-w*0.035),gy(cy-h*1.15),sz(w*0.07),sz(h*1.15));
  fill(enemy?'#8B1010':C.SAIL);
  triangle(gx(cx),gy(cy-h*1.15),gx(cx+w*0.38),gy(cy-h*0.45),gx(cx),gy(cy-h*0.05));
  fill(enemy?'#ff4444':C.GOLD);
  triangle(gx(cx-w*0.035),gy(cy-h*1.15),gx(cx-w*0.18),gy(cy-h*1.0),gx(cx-w*0.035),gy(cy-h*0.85));
  pop();
}

function drawMsgOverlay(){
  if(gs.msgTimer<=0) return;
  gs.msgTimer--;
  var a=min(1,gs.msgTimer/30)*230;
  push();
  rectMode(CENTER);
  fill(10,20,40,a);noStroke();
  rect(gx(GW/2),gy(GH-52),sz(GW-30),sz(34),sz(8));
  var gc=color(C.GOLD);
  fill(red(gc),green(gc),blue(gc),a);
  textAlign(CENTER,CENTER);textSize(sz(12));
  text(gs.msg,gx(GW/2),gy(GH-52));
  pop();
}

// ── TITLE ──────────────────────────────────────────────────────────────────────────────
function drawTitle(){
  push();
  fill(C.DEEP);noStroke();
  rect(gx(0),gy(GH*0.50),sz(GW),sz(GH*0.50));
  pop();
  drawWaves(GH*0.52);
  drawShip(GW/2,GH*0.60,120,false);
  push();
  textAlign(CENTER,CENTER);
  fill(C.GOLD);textSize(sz(42));textStyle(BOLD);
  text('DOMINO',gx(GW/2),gy(GH*0.18));
  text('SEAS',  gx(GW/2),gy(GH*0.27));
  textStyle(NORMAL);
  textSize(sz(13));fill(C.ROPE);
  text('A pirate dominoes game',gx(GW/2),gy(GH*0.36));
  var bw=190,bh=46,bx=GW/2-bw/2,by=GH*0.76;
  fill(C.GOLD);noStroke();
  rect(gx(bx),gy(by),sz(bw),sz(bh),sz(12));
  fill(C.OCEAN);textSize(sz(16));textStyle(BOLD);
  text('SET SAIL',gx(GW/2),gy(by+bh/2));
  textStyle(NORMAL);
  pop();
}

// ── FLOOR MAP ───────────────────────────────────────────────────────────────────
function drawFloor(){
  var map=gs.floorMap;
  var fl=FLOORS[min(gs.floorIdx,FLOORS.length-1)];
  var reach=getReachable();

  push();
  fill(C.DEEP);noStroke();
  rect(gx(0),gy(GH*0.5),sz(GW),sz(GH*0.5));
  drawWaves(GH*0.52);

  fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(18));textStyle(BOLD);
  text(fl.name,gx(GW/2),gy(8));
  textStyle(NORMAL);
  fill(C.ROPE);textSize(sz(10));
  text('Floor '+(gs.floorIdx+1)+' of '+FLOORS.length,gx(GW/2),gy(29));

  var phpW=110,phpH=12,phpX=8,phpY=46;
  fill(C.HP_BG);noStroke();
  rect(gx(phpX),gy(phpY),sz(phpW),sz(phpH),sz(3));
  fill(C.HP_FG);
  rect(gx(phpX),gy(phpY),sz(phpW*max(0,gs.player.hp/gs.player.maxHp)),sz(phpH),sz(3));
  noStroke();fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(9));
  text('Crew: '+gs.player.hp+'/'+gs.player.maxHp,gx(phpX+2),gy(phpY+2));
  fill(C.GOLD);textAlign(RIGHT,TOP);textSize(sz(12));textStyle(BOLD);
  text('G: '+gs.gold,gx(GW-8),gy(46));
  textStyle(NORMAL);

  for(var ni=0;ni<map.nodes.length;ni++){
    var n=map.nodes[ni];
    for(var nj=0;nj<n.next.length;nj++){
      var nn=getMapNode(n.next[nj]);
      if(!nn) continue;
      var x1=n.x+NW/2, y1t=n.y+NH;
      var x2=nn.x+NW/2, y2t=nn.y;
      var srcVis=map.visited.indexOf(n.id)>=0;
      var dstVis=map.visited.indexOf(nn.id)>=0;
      var dstReach=reach.indexOf(nn.id)>=0;
      if(srcVis&&dstReach)       {stroke(C.ROPE);strokeWeight(sz(2.5));}
      else if(srcVis&&dstVis)   {stroke(C.TEXT_DIM);strokeWeight(sz(1));}
      else                       {stroke('#162030');strokeWeight(sz(1.5));}
      line(gx(x1),gy(y1t),gx(x2),gy(y2t));
    }
  }

  for(var ni=0;ni<map.nodes.length;ni++){
    var n=map.nodes[ni];
    var vis=map.visited.indexOf(n.id)>=0;
    var can=reach.indexOf(n.id)>=0;
    drawMapNode(n,vis,can,fl);
  }

  pop();
}

function drawMapNode(n,visited,reachable,fl){
  push();
  var isFinalFloor=gs.floorIdx>=FLOORS.length-1;
  var bg,bd,bw;
  if(visited){bg='#090e18';bd='#1a2840';bw=1;}
  else if(reachable){
    if(n.type==='exit'){
      if(isFinalFloor){bg='#0d0020';bd='#9400d3';bw=3;}
      else{bg='#0f2030';bd=C.GOLD;bw=2.5;}
    }
    else if(n.type==='port'){bg=C.PANEL;bd=C.GOLD;bw=2.5;}
    else{bg=C.PANEL2;bd=C.BORDER;bw=2;}
  } else {bg='#070c14';bd='#0c1520';bw=1;}

  fill(bg);stroke(bd);strokeWeight(sz(bw));
  rect(gx(n.x),gy(n.y),sz(NW),sz(NH),sz(6));

  if(visited){
    noStroke();fill(C.TEXT_DIM);
    textAlign(CENTER,CENTER);textSize(sz(10));
    var vl=n.type==='enemy'?('~ '+ENEMY_DB[n.eId].name+' sunk ~'):
           n.type==='port'?'~ Port visited ~':'~ Departed ~';
    text(vl,gx(n.x+NW/2),gy(n.y+NH/2));
    pop();return;
  }

  if(!reachable){
    noStroke();
    fill('#1e2e40');textAlign(CENTER,CENTER);textSize(sz(10));
    var lk=n.type==='enemy'?'?? Enemy ??':n.type==='port'?'Port':'Exit';
    text(lk,gx(n.x+NW/2),gy(n.y+NH/2));
    pop();return;
  }

  noStroke();
  if(n.type==='enemy'){
    var def=ENEMY_DB[n.eId];
    drawShip(n.x+24,n.y+NH/2,28,true);
    fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(11));textStyle(BOLD);
    text(def.name,gx(n.x+48),gy(n.y+7));
    textStyle(NORMAL);
    fill(C.EN_FG);textSize(sz(9));
    text(def.hp+' hull',gx(n.x+48),gy(n.y+24));
    fill(C.ROPE);textSize(sz(9));
    text('ATK '+def.atk+'  +'+def.gold+'g',gx(n.x+48),gy(n.y+38));
    fill(C.GOLD);textAlign(RIGHT,CENTER);textSize(sz(16));textStyle(BOLD);
    text('>',gx(n.x+NW-8),gy(n.y+NH/2));
    textStyle(NORMAL);
  } else if(n.type==='port'){
    fill(C.GOLD);textAlign(CENTER,CENTER);textSize(sz(12));textStyle(BOLD);
    text('PORT: '+fl.portName,gx(n.x+NW/2),gy(n.y+NH/2-10));
    textStyle(NORMAL);
    fill(C.ROPE);textSize(sz(9));
    text('Rest & restock',gx(n.x+NW/2),gy(n.y+NH/2+10));
  } else {
    if(isFinalFloor){
      fill('#cc44ff');textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
      text('THE KRAKEN',gx(n.x+NW/2),gy(n.y+NH/2-14));
      text('AWAITS',gx(n.x+NW/2),gy(n.y+NH/2+1));
      textStyle(NORMAL);
      fill('#ee88ff');textSize(sz(8));
      text('150 hull   ATK 22',gx(n.x+NW/2),gy(n.y+NH/2+15));
    } else {
      fill(C.GOLD);textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
      text('DEPART',gx(n.x+NW/2),gy(n.y+NH/2-9));
      textStyle(NORMAL);
      fill(C.ROPE);textSize(sz(9));
      text('Advance to next floor >>',gx(n.x+NW/2),gy(n.y+NH/2+9));
    }
  }
  pop();
}

function handleFloor(mx,my){
  var map=gs.floorMap;
  var fl=FLOORS[min(gs.floorIdx,FLOORS.length-1)];
  var reach=getReachable();
  for(var i=0;i<map.nodes.length;i++){
    var n=map.nodes[i];
    if(reach.indexOf(n.id)<0) continue;
    if(mx>=n.x&&mx<=n.x+NW&&my>=n.y&&my<=n.y+NH){
      if(n.type==='enemy'){
        map.fightingNodeId=n.id;
        gs.screen='equip';
      } else if(n.type==='port'){
        map.visited.push(n.id);
        gs.port=buildPortItems(fl,true);
        gs.screen='port';
        showMsg('Welcome to '+fl.portName+'!');
      } else {
        if(gs.floorIdx>=FLOORS.length-1){
          gs.finalBoss=true;
          map.fightingNodeId=n.id;
          gs.screen='equip';
          showMsg('THE KRAKEN RISES FROM THE DEEP!');
        } else {
          exitFloor();
        }
      }
      return;
    }
  }
}

function exitFloor(){
  var fl=FLOORS[gs.floorIdx];
  gs.floorIdx++;
  if(gs.floorIdx>=FLOORS.length){
    showMsg('You conquered the seas! VICTORY, CAPTAIN!');
    setTimeout(function(){initGS();},3500);
    return;
  }
  gs.port=buildPortItems(fl,false);
  gs.screen='port';
  showMsg('Welcome to '+fl.portName+'!');
}

function buildPortItems(fl,isInFloor){
  var ownedIds=gs.backpack.map(function(c){return c.id;});
  var pool=CARD_DB.filter(function(c){return ownedIds.indexOf(c.id)<0;});
  for(var i=pool.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;
  }
  var portCards=pool.slice(0,2).map(function(c){return cloneCard(c);});
  var items=[
    {type:'heal',    label:'Patch Hull',   desc:'+15 HP to your crew',  cost:2,done:false},
    {type:'fullheal',label:'Full Overhaul',desc:'Repair hull to full HP',cost:5,done:false}
  ];
  for(var k=0;k<portCards.length;k++){
    var c=portCards[k];
    var s0=c.slots[0]===null?'?':''+c.slots[0];
    var s1=c.slots[1]===null?'?':''+c.slots[1];
    items.push({type:'card',label:c.name,slotStr:'['+s0+'|'+s1+']',desc:c.desc,cost:2,card:c,done:false});
  }
  return{portName:fl.portName,items:items,isInFloor:isInFloor};
}

// ── EQUIP ─────────────────────────────────────────────────────────────────────────────
var EQ={sidePad:10,cols:2,gap:8,cardH:88,cardY0:76,rowGap:8};
function equipCardRect(i){
  var cw=(GW-2*EQ.sidePad-(EQ.cols-1)*EQ.gap)/EQ.cols;
  return{x:EQ.sidePad+(i%EQ.cols)*(cw+EQ.gap),y:EQ.cardY0+Math.floor(i/EQ.cols)*(EQ.cardH+EQ.rowGap),w:cw,h:EQ.cardH};
}

function drawEquip(){
  push();
  var node=gs.floorMap?getMapNode(gs.floorMap.fightingNodeId):null;
  var target=gs.finalBoss?ENEMY_DB[5]:(node?ENEMY_DB[node.eId]:ENEMY_DB[0]);
  if(gs.finalBoss){
    fill('#cc44ff');textAlign(CENTER,TOP);textSize(sz(15));textStyle(BOLD);
    text('CHOOSE YOUR WEAPONS',gx(GW/2),gy(8));
    textStyle(NORMAL);
    textSize(sz(10));fill('#ee88ff');
    text('THE KRAKEN awaits!  (150 hull / ATK 22)',gx(GW/2),gy(27));
  } else {
    fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(15));textStyle(BOLD);
    text('CHOOSE YOUR WEAPONS',gx(GW/2),gy(8));
    textStyle(NORMAL);
    textSize(sz(10));fill(C.ROPE);
    text('Facing: '+target.name+'  ('+target.hp+' hull / ATK '+target.atk+')',gx(GW/2),gy(27));
  }
  textSize(sz(10));fill(C.TEXT_DIM);
  text('Equipped: '+gs.equipped.length+'/3    Gold: '+gs.gold,gx(GW/2),gy(42));
  text('Tap card to equip / unequip (max 3)',gx(GW/2),gy(56));
  for(var i=0;i<gs.backpack.length;i++){
    var r=equipCardRect(i);
    drawEquipCard(gs.backpack[i],r.x,r.y,r.w,r.h,gs.equipped.indexOf(i)>=0);
  }
  var canFight=gs.equipped.length>0;
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  fill(canFight?(gs.finalBoss?'#9400d3':C.GOLD):'#334455');noStroke();
  rect(gx(bx),gy(by),sz(bw),sz(bh),sz(10));
  fill(canFight?C.TEXT:'#556677');
  textAlign(CENTER,CENTER);textSize(sz(14));textStyle(BOLD);
  text(gs.finalBoss?'FACE THE KRAKEN!':'WEIGH ANCHOR!',gx(GW/2),gy(by+bh/2));
  textStyle(NORMAL);
  pop();
}

function drawEquipCard(card,cx,cy,w,h,equipped){
  push();
  fill(equipped?'#1a3a5c':C.PANEL);
  stroke(equipped?C.GOLD:C.BORDER);strokeWeight(sz(equipped?2.5:1.5));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));
  noStroke();
  fill(equipped?C.GOLD:C.TEXT);textAlign(LEFT,TOP);textSize(sz(11));textStyle(BOLD);
  text(card.name,gx(cx+7),gy(cy+7));
  textStyle(NORMAL);
  var s0=card.slots[0]===null?'?':''+card.slots[0];
  var s1=card.slots[1]===null?'?':''+card.slots[1];
  fill(C.ROPE);textSize(sz(10));
  text('['+s0+'|'+s1+']',gx(cx+7),gy(cy+22));
  fill(C.TEXT_DIM);textSize(sz(9));
  text(card.desc,gx(cx+7),gy(cy+36),sz(w-14),sz(h-40));
  if(equipped){fill(C.GOLD);textAlign(RIGHT,TOP);textSize(sz(9));text('[ON DECK]',gx(cx+w-6),gy(cy+7));}
  pop();
}

// ── COMBAT ─────────────────────────────────────────────────────────────────────────────
var CB={
  shipY:68,hpBarY:136,intentY:156,
  cardY:182,cardH:110,
  domW:54,domH:28,domPad:6,domRowGap:5,
  domLabelY:306,domY:318,
  btnW:130,btnH:38
};

function domPerRow(total){
  return Math.min(total,Math.max(1,Math.floor((GW-14)/(CB.domW+CB.domPad))));
}
function getDomPos(di,total){
  var ppr=domPerRow(total),row=Math.floor(di/ppr),col=di%ppr;
  var rows=Math.ceil(total/ppr);
  var rowCount=(row<rows-1)?ppr:(total-row*ppr);
  var rowW=rowCount*(CB.domW+CB.domPad)-CB.domPad;
  return{x:(GW-rowW)/2+col*(CB.domW+CB.domPad),y:CB.domY+row*(CB.domH+CB.domRowGap)};
}
function domBtnY(total){
  var rows=Math.ceil(total/domPerRow(total));
  return CB.domY+rows*(CB.domH+CB.domRowGap)-CB.domRowGap+12;
}

function startCombat(){
  for(var i=0;i<gs.equipped.length;i++) gs.backpack[gs.equipped[i]].assigned=[null,null];
  var node=getMapNode(gs.floorMap.fightingNodeId);
  var def=gs.finalBoss?ENEMY_DB[5]:(node?ENEMY_DB[node.eId]:ENEMY_DB[0]);
  var domCount=4+gs.player.extraDraw;
  gs.player.extraDraw=0;
  var enemy={
    name:def.name,hp:def.hp,maxHp:def.hp,
    atk:def.atk,gold:def.gold,moveset:def.moveset,
    stunned:false,braceActive:false,moveIdx:0
  };
  gs.combat={
    enemy:enemy,
    dominoes:rollDominoes(domCount),
    selDom:null,turn:1,
    nextMove:pickMove(enemy),
    enemyAnim:0,animIsStun:false,
    animDom:rollDominoes(1)[0],
    dragDomIdx:null,dragX:0,dragY:0,isDragging:false
  };
  gs.screen='combat';
  if(gs.finalBoss){
    showMsg('THE KRAKEN rises! Fight for your life, Captain!');
  } else {
    showMsg('A '+def.name+' approaches! Man the cannons!');
  }
}

function drawCombat(){
  var cm=gs.combat;
  push();
  fill(gs.finalBoss?'#0d001a':C.DEEP);noStroke();
  rect(gx(0),gy(GH*0.62),sz(GW),sz(GH*0.38));
  drawWaves(GH*0.64);

  if(gs.finalBoss&&imgKraken){
    var kw=110,kh=110;
    image(imgKraken,gx(GW/2-kw/2),gy(CB.shipY-kh*0.6),sz(kw),sz(kh));
  }else{
    drawShip(GW/2,CB.shipY,90,true);
  }

  fill(gs.finalBoss?'#cc44ff':C.TEXT);textAlign(CENTER,TOP);textSize(sz(12));textStyle(BOLD);
  text(cm.enemy.name,gx(GW/2),gy(8));
  textStyle(NORMAL);

  var ehpW=200,ehpH=16,ehpX=(GW-ehpW)/2;
  fill(gs.finalBoss?'#1a0030':C.EN_BG);noStroke();
  rect(gx(ehpX),gy(CB.hpBarY),sz(ehpW),sz(ehpH),sz(4));
  fill(gs.finalBoss?'#9400d3':C.EN_FG);
  rect(gx(ehpX),gy(CB.hpBarY),sz(ehpW*max(0,cm.enemy.hp/cm.enemy.maxHp)),sz(ehpH),sz(4));
  fill(C.TEXT);textAlign(CENTER,CENTER);textSize(sz(9));
  text(cm.enemy.hp+'/'+cm.enemy.maxHp+' hull',gx(GW/2),gy(CB.hpBarY+ehpH/2));

  var ms=cm.enemy.moveset;
  var pillW=54,pillH=14,pillGap=4;
  var totalPW=ms.length*(pillW+pillGap)-pillGap;
  var pillX=(GW-totalPW)/2;
  for(var mi=0;mi<ms.length;mi++){
    var mId=ms[mi];
    var mBase=MOVE_DB[mId];
    var isNext=(mi===cm.enemy.moveIdx%ms.length);
    var pBg=mBase.type==='atk'?'#3a0808':mBase.type==='heal'?'#0a2a0a':'#0a1428';
    var pFg=mBase.type==='atk'?C.DANGER:mBase.type==='heal'?C.HP_FG:C.ROPE;
    fill(pBg);
    stroke(pFg);strokeWeight(sz(isNext?2:0.8));
    rect(gx(pillX+mi*(pillW+pillGap)),gy(CB.hpBarY-18),sz(pillW),sz(pillH),sz(3));
    noStroke();
    var pc=color(pFg);
    fill(red(pc),green(pc),blue(pc),isNext?255:130);
    textAlign(CENTER,CENTER);textSize(sz(7.5));
    text(mBase.name,gx(pillX+mi*(pillW+pillGap)+pillW/2),gy(CB.hpBarY-18+pillH/2));
  }

  var move=cm.nextMove;
  var iBg=move.type==='atk'?'#3a0808':move.type==='heal'?'#0a2a0a':'#0a1428';
  var iFg=move.type==='atk'?C.DANGER:move.type==='heal'?C.HP_FG:C.ROPE;
  if(cm.enemy.stunned){iBg='#2a2a00';iFg=C.GOLD;}
  fill(iBg);stroke(iFg);strokeWeight(sz(1.5));
  rect(gx(ehpX),gy(CB.intentY),sz(ehpW),sz(20),sz(3));
  noStroke();fill(iFg);
  textAlign(LEFT,CENTER);textSize(sz(9));
  var iLabel=cm.enemy.stunned?'ANCHORED':move.name;
  text(iLabel,gx(ehpX+6),gy(CB.intentY+10));
  var iRight=cm.enemy.stunned?'skips turn':
    move.type==='atk'?('-'+move.dmg+' crew'):
    move.type==='heal'?('+'+move.healAmt+' hull'):'blocks next hit';
  textAlign(RIGHT,CENTER);
  text(iRight,gx(ehpX+ehpW-6),gy(CB.intentY+10));

  var phpW=120,phpH=14,phpX=6,phpY=6;
  fill(C.HP_BG);noStroke();
  rect(gx(phpX),gy(phpY),sz(phpW),sz(phpH),sz(3));
  fill(C.HP_FG);
  rect(gx(phpX),gy(phpY),sz(phpW*max(0,gs.player.hp/gs.player.maxHp)),sz(phpH),sz(3));
  fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(9));
  text('Crew: '+gs.player.hp+'/'+gs.player.maxHp,gx(phpX+3),gy(phpY+2));
  fill(C.TEXT_DIM);textAlign(RIGHT,TOP);
  text('T'+cm.turn+'  G:'+gs.gold,gx(GW-6),gy(6));

  var fl=FLOORS[min(gs.floorIdx,FLOORS.length-1)];
  fill(gs.finalBoss?'#cc44ff':C.TEXT_DIM);textAlign(CENTER,TOP);textSize(sz(9));
  text(gs.finalBoss?'FINAL BOSS':(fl.name+' - Floor '+(gs.floorIdx+1)+'/'+FLOORS.length),gx(GW/2),gy(CB.hpBarY-32));

  var nc=gs.equipped.length;
  var cardW=(GW-12-(nc-1)*6)/nc;
  for(var ci=0;ci<nc;ci++){
    var card=gs.backpack[gs.equipped[ci]];
    drawCombatCard(card,6+ci*(cardW+6),CB.cardY,cardW,CB.cardH,cm);
  }

  fill(C.TEXT_DIM);textAlign(CENTER,BOTTOM);textSize(sz(10));
  if(cm.isDragging) text('Drop onto a card to place',gx(GW/2),gy(CB.domLabelY));
  else if(cm.selDom===null) text('Drag or tap a domino',gx(GW/2),gy(CB.domLabelY));
  else text('Tap a card to place  [tap again to cancel]',gx(GW/2),gy(CB.domLabelY));

  var total=cm.dominoes.length;
  for(var di=0;di<total;di++){
    var dom=cm.dominoes[di];
    var pos=getDomPos(di,total);
    if(!dom.used){
      if(cm.isDragging&&cm.dragDomIdx===di){
        push();noFill();stroke(C.BORDER);strokeWeight(sz(1));
        rect(gx(pos.x),gy(pos.y),sz(CB.domW),sz(CB.domH),sz(4));pop();
      } else {
        drawDomino(dom,pos.x,pos.y,CB.domW,CB.domH,(cm.selDom===di)&&!cm.isDragging);
      }
    } else {
      push();fill(C.PANEL2);stroke(C.BORDER);strokeWeight(sz(1));
      rect(gx(pos.x),gy(pos.y),sz(CB.domW),sz(CB.domH),sz(4));pop();
    }
  }

  var btnY=domBtnY(total),etX=GW/2-CB.btnW/2;
  var animActive=cm.enemyAnim>0;
  fill(animActive?'#0d1f30':C.DECK);
  stroke(animActive?'#1a3040':C.BORDER);strokeWeight(sz(1.5));
  rect(gx(etX),gy(btnY),sz(CB.btnW),sz(CB.btnH),sz(8));
  noStroke();fill(animActive?'#334455':C.TEXT);
  textAlign(CENTER,CENTER);textSize(sz(12));
  text('End Turn',gx(GW/2),gy(btnY+CB.btnH/2));

  if(cm.isDragging&&cm.dragDomIdx!==null&&!cm.dominoes[cm.dragDomIdx].used){
    drawDomino(cm.dominoes[cm.dragDomIdx],cm.dragX,cm.dragY,CB.domW,CB.domH,true);
  }
  pop();
}

function drawCombatCard(card,cx,cy,w,h,cm){
  push();
  var ready=isReady(card);
  var dragHover=false,dragFit=false;
  if(cm.isDragging&&cm.dragDomIdx!==null&&!cm.dominoes[cm.dragDomIdx].used){
    var dcx=cm.dragX+CB.domW/2,dcy=cm.dragY+CB.domH/2;
    if(dcx>=cx&&dcx<=cx+w&&dcy>=cy&&dcy<=cy+h){
      dragHover=true;
      dragFit=dominoFits(cm.dominoes[cm.dragDomIdx],card);
    }
  }
  var fitType=false;
  if(!cm.isDragging&&cm.selDom!==null&&!cm.dominoes[cm.selDom].used)
    fitType=dominoFits(cm.dominoes[cm.selDom],card);
  var fits=fitType!==false;
  var goodDrop=dragHover&&(dragFit!==false);
  var badDrop=dragHover&&(dragFit===false);
  fill(ready?C.GREEN_HI:goodDrop?'#1a4a1a':badDrop?'#2a0a0a':fits?'#1a2f50':C.PANEL);
  stroke(ready?C.GREEN_BD:goodDrop?'#50ee50':badDrop?C.DANGER:fits?C.GOLD:C.BORDER);
  strokeWeight(sz((goodDrop||badDrop||fits||ready)?2.5:1.5));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));
  noStroke();
  fill(ready?'#7fff7f':C.TEXT);textAlign(CENTER,TOP);textSize(sz(9));textStyle(BOLD);
  text(card.name,gx(cx+w/2),gy(cy+5));textStyle(NORMAL);
  var sW=w*0.82,sH=24,sX=cx+(w-sW)/2,sY=cy+20;
  fill(C.OCEAN);stroke(C.BORDER);strokeWeight(sz(1));
  rect(gx(sX),gy(sY),sz(sW),sz(sH),sz(3));
  line(gx(sX+sW/2),gy(sY+3),gx(sX+sW/2),gy(sY+sH-3));
  for(var si=0;si<2;si++){
    var halfX=sX+si*(sW/2)+sW/4,asgn=card.assigned[si],req=card.slots[si];
    noStroke();
    if(asgn!==null){fill(C.GOLD);textSize(sz(13));textStyle(BOLD);textAlign(CENTER,CENTER);text(''+asgn,gx(halfX),gy(sY+sH/2));textStyle(NORMAL);}
    else{fill(fits||goodDrop?'#88aacc':C.TEXT_DIM);textSize(sz(11));textAlign(CENTER,CENTER);text(req===null?'?':''+req,gx(halfX),gy(sY+sH/2));}
  }
  noStroke();fill(C.TEXT_DIM);textAlign(LEFT,TOP);textSize(sz(8));
  text(card.desc,gx(cx+4),gy(sY+sH+4),sz(w-8),sz(h-sH-30));
  if(ready){fill(C.GOLD);textAlign(CENTER,BOTTOM);textSize(sz(10));textStyle(BOLD);text('FIRE!',gx(cx+w/2),gy(cy+h-3));textStyle(NORMAL);}
  else if(goodDrop){fill('#50ee50');textAlign(CENTER,BOTTOM);textSize(sz(10));textStyle(BOLD);text('DROP HERE',gx(cx+w/2),gy(cy+h-3));textStyle(NORMAL);}
  else if(badDrop){fill(C.DANGER);textAlign(CENTER,BOTTOM);textSize(sz(9));text("won't fit",gx(cx+w/2),gy(cy+h-3));}
  else if(fits){fill(C.GOLD);textAlign(CENTER,BOTTOM);textSize(sz(9));text('PLACE',gx(cx+w/2),gy(cy+h-3));}
  pop();
}

function drawDomino(dom,dx,dy,w,h,selected){
  push();
  fill(selected?C.DECK:C.PANEL2);
  stroke(selected?C.GOLD:C.BORDER);strokeWeight(sz(selected?2.5:1.5));
  rect(gx(dx),gy(dy),sz(w),sz(h),sz(4));
  stroke(selected?C.GOLD:'#2e5a8a');strokeWeight(sz(1));
  line(gx(dx+w/2),gy(dy+4),gx(dx+w/2),gy(dy+h-4));
  noStroke();fill(selected?C.GOLD:C.TEXT);
  textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
  text(''+dom.left,gx(dx+w/4),gy(dy+h/2));
  text(''+dom.right,gx(dx+3*w/4),gy(dy+h/2));
  textStyle(NORMAL);pop();
}

function drawEnemyDomino(dom,dx,dy,w,h,a){
  push();
  fill(30,0,0,a);stroke(220,80,80,a);strokeWeight(sz(2));
  rect(gx(dx),gy(dy),sz(w),sz(h),sz(4));
  stroke(200,60,60,Math.round(a*0.65));strokeWeight(sz(1));
  line(gx(dx+w/2),gy(dy+4),gx(dx+w/2),gy(dy+h-4));
  noStroke();fill(255,150,150,a);
  textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
  text(''+dom.left,gx(dx+w/4),gy(dy+h/2));
  text(''+dom.right,gx(dx+3*w/4),gy(dy+h/2));
  textStyle(NORMAL);pop();
}

function drawEnemyTurnOverlay(cm){
  var TOTAL=70,f=cm.enemyAnim,entered=TOTAL-f;
  var alpha=Math.min(Math.min(entered/8.0,1.0),Math.min(f/8.0,1.0));
  if(alpha<0.01) return;
  var a220=Math.round(alpha*220),a160=Math.round(alpha*160);
  var isStun=cm.animIsStun,move=cm.nextMove;
  push();
  fill(0,0,15,Math.round(alpha*210));noStroke();
  rect(gx(0),gy(0),sz(GW),sz(GH));
  if(isStun){
    var pulse=sin(entered*0.3)*0.5+0.5;
    var gc2=color(C.GOLD);
    fill(red(gc2),green(gc2),blue(gc2),a220);
    textAlign(CENTER,CENTER);textSize(sz(28+pulse*4));textStyle(BOLD);
    text('ANCHORED!',gx(GW/2),gy(GH*0.36));textStyle(NORMAL);
    fill(red(gc2),green(gc2),blue(gc2),a160);textSize(sz(12));
    text('Enemy skips this attack',gx(GW/2),gy(GH*0.48));
    pop();return;
  }
  var pulse2=sin(entered*0.28)*0.5+0.5;
  var rc=color(C.DANGER);
  fill(red(rc),green(rc),blue(rc),Math.round(alpha*(160+pulse2*50)));
  textAlign(CENTER,TOP);textSize(sz(10));textStyle(BOLD);
  text("ENEMY'S TURN",gx(GW/2),gy(12));textStyle(NORMAL);
  var cw=220,ch=134,cx=GW/2-cw/2,cy=155;
  var slotW=80,slotH=32,slotX=GW/2-slotW/2,slotY=cy+56;
  var mc=color(move.type==='atk'?'#3a0808':move.type==='heal'?'#0a2a0a':'#0a1428');
  var mb=color(move.type==='atk'?C.DANGER:move.type==='heal'?C.HP_FG:C.ROPE);
  for(var fo=2;fo>=1;fo--){
    var fOff=fo*9;
    fill(50,0,0,a220);stroke(100,30,30,a220);strokeWeight(sz(1.5));
    rect(gx(cx-fOff),gy(cy-fOff*0.5),sz(cw),sz(ch),sz(8));
    noStroke();fill(80,20,20,a160);
    textAlign(CENTER,CENTER);textSize(sz(20));textStyle(BOLD);
    text('?',gx(GW/2-fOff),gy(cy-fOff*0.5+ch/2));textStyle(NORMAL);
  }
  fill(0,0,0,Math.round(alpha*90));noStroke();
  rect(gx(cx+4),gy(cy+4),sz(cw),sz(ch),sz(10));
  fill(red(mc),green(mc),blue(mc),a220);
  stroke(red(mb),green(mb),blue(mb),a220);strokeWeight(sz(2.5));
  rect(gx(cx),gy(cy),sz(cw),sz(ch),sz(10));
  noStroke();fill(red(mb),green(mb),blue(mb),Math.round(alpha*70));
  rect(gx(cx),gy(cy),sz(cw),sz(26),sz(10));
  rect(gx(cx),gy(cy+16),sz(cw),sz(10));
  fill(red(mb),green(mb),blue(mb),a220);
  textAlign(CENTER,TOP);textSize(sz(13));textStyle(BOLD);
  text(move.name,gx(GW/2),gy(cy+5));textStyle(NORMAL);
  fill(red(mb),green(mb),blue(mb),a160);textSize(sz(8));
  var tl=move.type==='atk'?'ATTACK':move.type==='heal'?'HEAL':'DEFEND';
  text(tl,gx(GW/2),gy(cy+22));
  fill(0,0,0,Math.round(alpha*100));
  stroke(red(mb),green(mb),blue(mb),a160);strokeWeight(sz(1.5));
  rect(gx(slotX),gy(slotY),sz(slotW),sz(slotH),sz(4));
  strokeWeight(sz(1));
  line(gx(slotX+slotW/2),gy(slotY+4),gx(slotX+slotW/2),gy(slotY+slotH-4));
  var rawT=(entered-8)/26.0,slideT=Math.min(Math.max(rawT,0),1);
  var eased=1.0-Math.pow(1.0-slideT,2.5);
  var animY=38+(slotY-38)*eased;
  var arrived=(entered>=34);
  var dom=cm.animDom;
  if(!arrived){
    var floatA=Math.round(Math.min(Math.max(entered-6,0)/3.0,1)*alpha*220);
    if(floatA>0) drawEnemyDomino(dom,slotX,animY,slotW,slotH,floatA);
    noStroke();fill(red(mb),green(mb),blue(mb),a160);
    textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
    text('?',gx(slotX+slotW/4),gy(slotY+slotH/2));
    text('?',gx(slotX+3*slotW/4),gy(slotY+slotH/2));textStyle(NORMAL);
  } else {
    drawEnemyDomino(dom,slotX,slotY,slotW,slotH,a220);
    var ff=entered-34;
    if(ff<12){noStroke();fill(255,255,255,Math.round(alpha*140*(1.0-ff/12.0)));rect(gx(cx),gy(cy),sz(cw),sz(ch),sz(10));}
    var effA=Math.round(Math.min((entered-34)/8.0,1.0)*alpha*220);
    var effStr,effR,effG,effB;
    if(move.type==='atk'){effStr='-'+move.dmg+' crew HP';effR=255;effG=80;effB=80;}
    else if(move.type==='heal'){effStr='+'+move.healAmt+' hull repaired';var hc=color(C.HP_FG);effR=red(hc);effG=green(hc);effB=blue(hc);}
    else{effStr='BRACING - next hit halved!';var rc2=color(C.ROPE);effR=red(rc2);effG=green(rc2);effB=blue(rc2);}
    fill(effR,effG,effB,effA);
    textAlign(CENTER,TOP);textSize(sz(15));textStyle(BOLD);
    text(effStr,gx(GW/2),gy(cy+ch+12));textStyle(NORMAL);
    var dc=color(C.TEXT_DIM);
    fill(red(dc),green(dc),blue(dc),Math.round(Math.min((entered-34)/10.0,1.0)*alpha*150));
    textSize(sz(9));text(move.desc,gx(GW/2),gy(cy+ch+32));
  }
  pop();
}

function resolveEnemyTurn(cm){
  var move=cm.nextMove;
  if(cm.animIsStun){
    cm.enemy.stunned=false;
    showMsg(cm.enemy.name+' was anchored and skipped its attack!');
  } else {
    if(move.type==='atk'){
      gs.player.hp-=move.dmg;
      showMsg(cm.enemy.name+' fires '+move.name+'! -'+move.dmg+' HP!');
      if(gs.player.hp<=0){
        gs.player.hp=0;
        showMsg('Your ship is sunk! Starting over...');
        setTimeout(function(){initGS();},2200);
        return;
      }
    } else if(move.type==='heal'){
      cm.enemy.hp=min(cm.enemy.maxHp,cm.enemy.hp+move.healAmt);
      showMsg(cm.enemy.name+' patches hull! +'+move.healAmt+' HP!');
    } else {
      cm.enemy.braceActive=true;
      showMsg(cm.enemy.name+' braces! Your next hit is halved!');
    }
  }
  cm.nextMove=pickMove(cm.enemy);
  cm.animDom=rollDominoes(1)[0];
  cm.turn++;
  for(var i=0;i<gs.equipped.length;i++) gs.backpack[gs.equipped[i]].assigned=[null,null];
  var domCount=4+gs.player.extraDraw;
  gs.player.extraDraw=0;
  cm.dominoes=rollDominoes(domCount);
  cm.selDom=null;cm.dragDomIdx=null;cm.isDragging=false;
}

// ── LOOT ─────────────────────────────────────────────────────────────────────────────
function startLoot(){
  var node=getMapNode(gs.floorMap.fightingNodeId);
  var def=gs.finalBoss?ENEMY_DB[5]:(node?ENEMY_DB[node.eId]:ENEMY_DB[0]);
  gs.gold+=def.gold;
  if(gs.finalBoss){
    gs.finalBoss=false;
    showMsg('THE KRAKEN IS SLAIN! You rule the seven seas! VICTORY!');
    setTimeout(function(){initGS();},3500);
    return;
  }
  var ownedIds=gs.backpack.map(function(c){return c.id;});
  var pool=CARD_DB.filter(function(c){return ownedIds.indexOf(c.id)<0;});
  for(var i=pool.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;
  }
  var choices=pool.slice(0,min(2,pool.length)).map(function(c){return cloneCard(c);});
  gs.loot={choices:choices};
  gs.screen='loot';
  showMsg('Victory! +'+def.gold+' gold! Choose your plunder!');
}

function afterLoot(){
  gs.floorMap.visited.push(gs.floorMap.fightingNodeId);
  gs.floorMap.fightingNodeId=null;
  gs.screen='floor';
}

function drawLoot(){
  push();
  fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(22));textStyle(BOLD);
  text('PLUNDER!',gx(GW/2),gy(16));textStyle(NORMAL);
  textSize(sz(11));fill(C.TEXT_DIM);
  text('Choose a card to add to your hold.   Gold: '+gs.gold,gx(GW/2),gy(46));
  var cards=gs.loot.choices,cw=170,ch=120;
  var totalW=cards.length*cw+(cards.length-1)*12;
  var cStartX=(GW-totalW)/2,cStartY=66;
  if(cards.length===0){
    fill(C.TEXT_DIM);textSize(sz(12));text('No new cards available.',gx(GW/2),gy(GH/2));
    var bw=160,bh=40,bx=GW/2-bw/2,by2=GH*0.65;
    fill(C.GOLD);noStroke();rect(gx(bx),gy(by2),sz(bw),sz(bh),sz(10));
    fill(C.OCEAN);textSize(sz(14));textStyle(BOLD);text('Continue',gx(GW/2),gy(by2+bh/2));textStyle(NORMAL);
    pop();return;
  }
  for(var i=0;i<cards.length;i++) drawLootCard(cards[i],cStartX+i*(cw+12),cStartY,cw,ch);
  fill(C.TEXT_DIM);textAlign(CENTER,TOP);textSize(sz(11));
  text('- tap here to sail on without plunder -',gx(GW/2),gy(cStartY+ch+20));
  pop();
}

function drawLootCard(card,cx,cy,w,h){
  push();
  fill(C.PANEL2);stroke(C.GOLD);strokeWeight(sz(2));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(8));noStroke();
  fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(12));textStyle(BOLD);
  text(card.name,gx(cx+w/2),gy(cy+10));textStyle(NORMAL);
  var s0=card.slots[0]===null?'?':''+card.slots[0];
  var s1=card.slots[1]===null?'?':''+card.slots[1];
  fill(C.ROPE);textAlign(CENTER,TOP);textSize(sz(11));text('['+s0+'|'+s1+']',gx(cx+w/2),gy(cy+28));
  fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(10));
  text(card.desc,gx(cx+7),gy(cy+46),sz(w-14),sz(h-52));
  pop();
}

// ── PORT ─────────────────────────────────────────────────────────────────────────────
function portItemH(item){return item.type==='card'?90:62;}
function portItemY(idx){
  var y=74;
  for(var i=0;i<idx;i++) y+=portItemH(gs.port.items[i])+8;
  return y;
}

function drawPort(){
  var port=gs.port;
  push();
  fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(18));textStyle(BOLD);
  text(port.portName,gx(GW/2),gy(8));textStyle(NORMAL);
  textSize(sz(11));fill(C.ROPE);
  text(port.isInFloor?'A hidden harbour. Spend wisely.':'A safe harbour. Spend wisely.',gx(GW/2),gy(28));
  fill(C.GOLD);textSize(sz(13));text('Gold: '+gs.gold,gx(GW/2),gy(46));
  for(var i=0;i<port.items.length;i++){
    var item=port.items[i];
    drawPortItem(item,12,portItemY(i),GW-24,portItemH(item),gs.gold>=item.cost,item.done);
  }
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  fill(C.GOLD);noStroke();
  rect(gx(bx),gy(by),sz(bw),sz(bh),sz(10));
  fill(C.OCEAN);textAlign(CENTER,CENTER);textSize(sz(14));textStyle(BOLD);
  text('SET SAIL!',gx(GW/2),gy(by+bh/2));textStyle(NORMAL);
  pop();
}

function drawPortItem(item,cx,cy,w,h,canAfford,done){
  push();
  fill(done?'#0a1a28':(canAfford?C.PANEL2:C.PANEL));
  stroke(done?'#1a3040':(canAfford?C.GOLD:C.BORDER));
  strokeWeight(sz(canAfford&&!done?2:1.5));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));noStroke();
  fill(done?C.TEXT_DIM:(canAfford?C.GOLD:C.DANGER));
  textAlign(RIGHT,TOP);textSize(sz(11));
  text(done?'[done]':(item.cost+'g'),gx(cx+w-8),gy(cy+8));
  fill(done?C.TEXT_DIM:(canAfford?C.TEXT:'#556677'));
  textAlign(LEFT,TOP);textSize(sz(11));textStyle(BOLD);
  text(item.label,gx(cx+8),gy(cy+8));textStyle(NORMAL);
  if(item.type==='card'){
    fill(C.ROPE);textSize(sz(10));text(item.slotStr,gx(cx+8),gy(cy+24));
    fill(C.TEXT_DIM);textSize(sz(9));text(item.desc,gx(cx+8),gy(cy+38),sz(w-16),sz(h-44));
  } else {
    fill(done?'#334455':C.TEXT_DIM);textSize(sz(9));text(item.desc,gx(cx+8),gy(cy+26),sz(w-16),sz(h-32));
  }
  pop();
}

// ── INPUT ─────────────────────────────────────────────────────────────────────────────
function mousePressed(){
  var mx=toGX(mouseX),my=toGY(mouseY);
  if     (gs.screen==='title')  handleTitle(mx,my);
  else if(gs.screen==='floor')  handleFloor(mx,my);
  else if(gs.screen==='equip')  handleEquip(mx,my);
  else if(gs.screen==='combat') handleCombat(mx,my);
  else if(gs.screen==='loot')   handleLoot(mx,my);
  else if(gs.screen==='port')   handlePort(mx,my);
}
function touchStarted(){mousePressed();return false;}
function mouseDragged(){handleDrag();}
function touchMoved(){handleDrag();return false;}
function mouseReleased(){handleRelease();}
function touchEnded(){handleRelease();return false;}

function handleDrag(){
  if(gs.screen!=='combat') return;
  var cm=gs.combat;
  if(!cm||cm.enemyAnim>0||cm.dragDomIdx===null) return;
  var mx=toGX(mouseX),my=toGY(mouseY);
  cm.dragX=mx-CB.domW/2;cm.dragY=my-CB.domH/2;
  cm.isDragging=true;
}

function handleRelease(){
  if(gs.screen!=='combat') return;
  var cm=gs.combat;
  if(!cm||cm.enemyAnim>0) return;
  if(cm.isDragging&&cm.dragDomIdx!==null&&!cm.dominoes[cm.dragDomIdx].used){
    var mx=toGX(mouseX),my=toGY(mouseY);
    var nc=gs.equipped.length;
    var cardW=(GW-12-(nc-1)*6)/nc;
    for(var ci=0;ci<nc;ci++){
      var card=gs.backpack[gs.equipped[ci]];
      var ccx=6+ci*(cardW+6);
      if(mx>=ccx&&mx<=ccx+cardW&&my>=CB.cardY&&my<=CB.cardY+CB.cardH){
        var dom=cm.dominoes[cm.dragDomIdx];
        var fitType=dominoFits(dom,card);
        if(!fitType){showMsg("That domino doesn't fit "+card.name+'!');}
        else{
          if(fitType==='normal'){card.assigned[0]=dom.left;card.assigned[1]=dom.right;}
          else{card.assigned[0]=dom.right;card.assigned[1]=dom.left;}
          dom.used=true;cm.selDom=null;
          applyCard(card,cm);
          if(cm.enemy.hp<=0){cm.dragDomIdx=null;cm.isDragging=false;startLoot();return;}
        }
        break;
      }
    }
  }
  cm.dragDomIdx=null;cm.isDragging=false;
}

function handleTitle(mx,my){
  var bw=190,bh=46,bx=GW/2-bw/2,by=GH*0.76;
  if(mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh) gs.screen='floor';
}

function handleEquip(mx,my){
  for(var i=0;i<gs.backpack.length;i++){
    var r=equipCardRect(i);
    if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){
      var idx=gs.equipped.indexOf(i);
      if(idx>=0){gs.equipped.splice(idx,1);showMsg('Unequipped '+gs.backpack[i].name+'.');}
      else if(gs.equipped.length<3){gs.equipped.push(i);showMsg('Equipped '+gs.backpack[i].name+'!');}
      else showMsg('Already have 3 cards equipped!');
      return;
    }
  }
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  if(gs.equipped.length>0&&mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh) startCombat();
}

function handleCombat(mx,my){
  var cm=gs.combat;
  if(cm.enemyAnim>0) return;
  var total=cm.dominoes.length;
  for(var di=0;di<total;di++){
    if(cm.dominoes[di].used) continue;
    var pos=getDomPos(di,total);
    if(mx>=pos.x&&mx<=pos.x+CB.domW&&my>=pos.y&&my<=pos.y+CB.domH){
      cm.selDom=(cm.selDom===di)?null:di;
      cm.dragDomIdx=di;cm.isDragging=false;
      cm.dragX=pos.x;cm.dragY=pos.y;
      return;
    }
  }
  if(cm.selDom!==null&&!cm.isDragging){
    var nc=gs.equipped.length;
    var cardW=(GW-12-(nc-1)*6)/nc;
    for(var ci=0;ci<nc;ci++){
      var card=gs.backpack[gs.equipped[ci]];
      var ccx=6+ci*(cardW+6);
      if(mx>=ccx&&mx<=ccx+cardW&&my>=CB.cardY&&my<=CB.cardY+CB.cardH){
        var dom=cm.dominoes[cm.selDom];
        var fitType=dominoFits(dom,card);
        if(!fitType){showMsg("That domino doesn't fit "+card.name+'!');return;}
        if(fitType==='normal'){card.assigned[0]=dom.left;card.assigned[1]=dom.right;}
        else{card.assigned[0]=dom.right;card.assigned[1]=dom.left;}
        dom.used=true;cm.selDom=null;cm.dragDomIdx=null;
        applyCard(card,cm);
        if(cm.enemy.hp<=0){startLoot();return;}
        return;
      }
    }
    cm.selDom=null;cm.dragDomIdx=null;return;
  }
  var btnY=domBtnY(total),etX=GW/2-CB.btnW/2;
  if(mx>=etX&&mx<=etX+CB.btnW&&my>=btnY&&my<=btnY+CB.btnH) doEndTurn();
}

function doEndTurn(){
  var cm=gs.combat;
  cm.animIsStun=cm.enemy.stunned;
  cm.animDom=rollDominoes(1)[0];
  cm.enemyAnim=70;
}

function handleLoot(mx,my){
  var cards=gs.loot.choices,cw=170,ch=120;
  var totalW=cards.length*cw+(cards.length-1)*12;
  var cStartX=(GW-totalW)/2,cStartY=66;
  if(cards.length===0){
    var bw=160,bh=40,bx=GW/2-bw/2,by=GH*0.65;
    if(mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh) afterLoot();
    return;
  }
  for(var i=0;i<cards.length;i++){
    var cx=cStartX+i*(cw+12);
    if(mx>=cx&&mx<=cx+cw&&my>=cStartY&&my<=cStartY+ch){
      gs.backpack.push(cards[i]);
      showMsg('Added '+cards[i].name+' to your hold!');
      afterLoot();return;
    }
  }
  if(my>cStartY+ch+10){showMsg('You sail on without taking plunder.');afterLoot();}
}

function handlePort(mx,my){
  var port=gs.port;
  for(var i=0;i<port.items.length;i++){
    var item=port.items[i];
    var iy=portItemY(i),ih=portItemH(item);
    if(mx>=12&&mx<=GW-12&&my>=iy&&my<=iy+ih){
      if(item.done){showMsg('Already purchased.');return;}
      if(gs.gold<item.cost){showMsg('Need '+item.cost+'g - not enough gold!');return;}
      gs.gold-=item.cost;item.done=true;
      if(item.type==='heal'){gs.player.hp=min(gs.player.maxHp,gs.player.hp+15);showMsg('Hull patched! +15 HP. ('+gs.gold+'g left)');}
      else if(item.type==='fullheal'){gs.player.hp=gs.player.maxHp;showMsg('Full overhaul! Hull at max. ('+gs.gold+'g left)');}
      else if(item.type==='card'){gs.backpack.push(item.card);showMsg('Acquired '+item.card.name+'! ('+gs.gold+'g left)');}
      return;
    }
  }
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  if(mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh){
    if(port.isInFloor){
      gs.screen='floor';
    } else {
      initFloorState();
      gs.screen='floor';
    }
  }
}

'use strict';

var GW = 400, GH = 700;
var sc = 1, ox = 0, oy = 0;
var VW, VH;

var C = {
  OCEAN:'#1565c0', DEEP:'#1976d2', DECK:'#1e88e5',
  PLANK:'#9b7a4e', ROPE:'#d4a84b', GOLD:'#f0c040', GOLD2:'#d4a820',
  SAIL:'#f5eed8', DANGER:'#e53935', TEXT:'#eef2ff', TEXT_DIM:'#8aa4cc',
  HP_FG:'#43a047', HP_BG:'#1b5e20', EN_FG:'#ef5350', EN_BG:'#4a1515',
  PANEL:'#0d47a1', PANEL2:'#1565c0', BORDER:'#64b5f6',
  GREEN_HI:'#0c2010', GREEN_BD:'#00d060',
  CARD_BG:'#0d1421', CARD_FACE:'#131d2e', CARD_BD:'#1e2d4a',
  CARD_NAME:'#d8c890', CARD_DESC:'#5a78a8', CARD_SLOT:'#060c16'
};

var imgShipPlayer = null, imgShipEnemy = null, imgKraken = null;
var imgTreasureChest = null, imgCannon = null, imgGhostShip = null;

// maxUses = how many times a card can fire per player turn
var CARD_DB = [
  {id:'rusty_cannon',name:'Rusty Cannon', slots:[null,null],dmg:4, heal:0,extraDraw:0,stun:false,loadedDice:false,maxUses:2,charges:4,desc:'Deal 4 dmg. (2x/turn)'},
  {id:'bilge_pump',  name:'Bilge Pump',   slots:[null,null],dmg:0, heal:4,extraDraw:0,stun:false,loadedDice:false,maxUses:1,charges:3,desc:'Heal 4 HP.'},
  {id:'crows_nest',  name:"Crow's Nest",  slots:[null,null],dmg:0, heal:0,extraDraw:2,stun:false,loadedDice:false,maxUses:1,charges:3,desc:'+2 dominoes next turn.'},
  {id:'iron_cannon', name:'Iron Cannon',  slots:[null,6],   dmg:9, heal:0,extraDraw:0,stun:false,loadedDice:false,maxUses:2,charges:4,desc:'Needs a 6. Deal 9 dmg. (2x/turn)'},
  {id:'grapeshot',   name:'Grapeshot',    slots:[3,null],   dmg:6, heal:0,extraDraw:0,stun:false,loadedDice:false,maxUses:2,charges:4,desc:'Needs a 3. Deal 6 dmg. (2x/turn)'},
  {id:'broadside',   name:'Broadside',    slots:[5,5],      dmg:16,heal:0,extraDraw:0,stun:false,loadedDice:false,maxUses:1,charges:2,desc:'Double 5s only! Deal 16.'},
  {id:'powder_keg',  name:'Powder Keg',   slots:[6,6],      dmg:24,heal:0,extraDraw:0,stun:false,loadedDice:false,maxUses:1,charges:2,desc:'Double 6s only! Deal 24.'},
  {id:'sea_witch',   name:'Sea Witch',    slots:[null,null],dmg:0, heal:10,extraDraw:0,stun:false,loadedDice:false,maxUses:1,charges:2,desc:'Heal 10 HP.'},
  {id:'anchor_drop', name:'Anchor Drop',  slots:[null,null],dmg:2, heal:0,extraDraw:0,stun:true, loadedDice:false,maxUses:1,charges:3,desc:'Stun enemy. Deal 2 dmg.'},
  {id:'nav_chart',   name:'Nav Chart',    slots:[null,null],dmg:0, heal:0,extraDraw:3,stun:false,loadedDice:false,maxUses:1,charges:3,desc:'+3 dominoes next turn.'},
  {id:'loaded_dice', name:'Loaded Dice',  slots:[null,null],dmg:0, heal:0,extraDraw:0,stun:false,loadedDice:true, maxUses:1,charges:2,desc:'Spawns [5|5]+[6|6] in hand!'}
];

var MOVE_DB = {
  light: {name:'Pot Shot',   type:'atk',mult:0.6,desc:'A quick poke'},
  cannon:{name:'Cannon Fire',type:'atk',mult:1.0,desc:'Standard volley'},
  heavy: {name:'Broadside',  type:'atk',mult:1.5,desc:'Full broadside!'},
  brace: {name:'Brace',      type:'def',mult:0,  desc:'Halves next hit'},
  repair:{name:'Patch Hull', type:'heal',mult:0, desc:'Emergency repairs'}
};

// Each enemy is a named captain with a personality-driven strategy
var ENEMY_DB = [
  {
    name:'Dinghy', captain:'Barnsworth', title:'Bilge Rat',
    hp:14, atk:2, gold:1,
    moveset:['light','light','brace'],
    intro:'Come get some, landlubber!',
    strategy:'reckless'
  },
  {
    name:'Sloop', captain:'Vane', title:'Quickshot',
    hp:24, atk:4, gold:2,
    moveset:['cannon','light','repair'],
    intro:"I'll be counting yer gold soon!",
    strategy:'opportunist'
  },
  {
    name:'Brigantine', captain:'Ironhook', title:'Captain',
    hp:38, atk:6, gold:3,
    moveset:['cannon','heavy','brace'],
    intro:"Another ship to add to me tally!",
    strategy:'disciplined'
  },
  {
    name:'Man-o-War', captain:'Reeves', title:'Admiral',
    hp:55, atk:9, gold:4,
    moveset:['heavy','cannon','brace','heavy','cannon'],
    intro:'Full broadside! Fire at will!',
    strategy:'relentless'
  },
  {
    name:'Ghost Ship', captain:'Morvaine', title:'The Revenant',
    hp:75, atk:13, gold:5,
    moveset:['heavy','heavy','repair','heavy','brace','heavy'],
    intro:'The dead do not yield...',
    strategy:'undying'
  },
  {
    name:'The Kraken', captain:'The Kraken', title:'Ancient Terror',
    hp:150, atk:22, gold:15,
    moveset:['heavy','cannon','heavy','repair','heavy','brace','cannon','heavy'],
    intro:'FROM THE DEEP IT RISES!',
    strategy:'leviathan'
  }
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
  return {
    id:def.id, name:def.name, slots:[def.slots[0],def.slots[1]],
    dmg:def.dmg, heal:def.heal, extraDraw:def.extraDraw, stun:def.stun,
    loadedDice:!!def.loadedDice, maxUses:def.maxUses||1,
    charges:def.charges!==undefined?def.charges:3,
    usesThisTurn:0, desc:def.desc, assigned:[null,null], backpackIdx:-1
  };
}

function shuffleArray(arr){
  for(var i=arr.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=arr[i];arr[i]=arr[j];arr[j]=t;
  }
}

// -- MAP GENERATION -----------------------------------------------------------
var NW = 172, NH = 70;
var xL = 10, xR = 218, xC = 114;
var yR = [100, 238, 376, 510];

function generateFloorMap(flIdx) {
  var fl = FLOORS[min(flIdx, FLOORS.length-1)];
  var pool = fl.enemies;
  var nodes = [], nid = 0;
  function rnd(){return pool[Math.floor(Math.random()*pool.length)];}
  function boss(){var b=pool[0];for(var i=1;i<pool.length;i++){if(pool[i]>b)b=pool[i];}return b;}
  function mk(type,x,y,eId){nodes.push({id:nid,type:type,eId:eId||0,x:x,y:y,next:[]});return nid++;}
  var tpl=Math.floor(Math.random()*3), entryIds;
  if(tpl===0){
    var hasPort=Math.random()<0.55;
    var nA=mk('enemy',xL,yR[0],rnd());
    var nB=hasPort?mk('port',xR,yR[0]):mk('enemy',xR,yR[0],rnd());
    var nMid=mk('enemy',xC,yR[1],rnd());
    var nBs=mk('enemy',xC,yR[2],boss());
    var nEx=mk('exit',xC,yR[3]);
    nodes[nA].next=[nMid];nodes[nB].next=[nMid];
    nodes[nMid].next=[nBs];nodes[nBs].next=[nEx];
    entryIds=[nA,nB];
  } else if(tpl===1){
    var n0=mk('enemy',xC,yR[0],rnd());
    var nGd=mk('enemy',xL,yR[1],rnd());
    var nSk=mk('enemy',xR,yR[1],rnd());
    var nPt=mk('port',xL,yR[2]);
    var nBs=mk('enemy',xR,yR[2],boss());
    var nEx=mk('exit',xC,yR[3]);
    nodes[n0].next=[nGd,nSk];nodes[nGd].next=[nPt];
    nodes[nSk].next=[nBs];nodes[nPt].next=[nBs];nodes[nBs].next=[nEx];
    entryIds=[n0];
  } else {
    var portRight=Math.random()<0.5;
    var nL1=mk('enemy',xL,yR[0],rnd());
    var nR1=mk('enemy',xR,yR[0],rnd());
    var nL2=portRight?mk('enemy',xL,yR[1],rnd()):mk('port',xL,yR[1]);
    var nR2=portRight?mk('port',xR,yR[1]):mk('enemy',xR,yR[1],rnd());
    var nBs=mk('enemy',xC,yR[2],boss());
    var nEx=mk('exit',xC,yR[3]);
    nodes[nL1].next=[nL2];nodes[nR1].next=[nR2];
    nodes[nL2].next=[nBs];nodes[nR2].next=[nBs];nodes[nBs].next=[nEx];
    entryIds=[nL1,nR1];
  }
  return {nodes:nodes, entryIds:entryIds, visited:[], fightingNodeId:null};
}

function getMapNode(id){
  if(!gs.floorMap) return null;
  for(var i=0;i<gs.floorMap.nodes.length;i++){
    if(gs.floorMap.nodes[i].id===id) return gs.floorMap.nodes[i];
  }
  return null;
}

function getReachable(){
  var map=gs.floorMap;
  if(!map) return [];
  var vis=map.visited, out=[];
  for(var i=0;i<map.nodes.length;i++){
    var n=map.nodes[i];
    if(vis.indexOf(n.id)>=0) continue;
    var ok=false;
    if(vis.length===0&&map.entryIds.indexOf(n.id)>=0) ok=true;
    for(var j=0;j<vis.length&&!ok;j++){
      var vn=getMapNode(vis[j]);
      if(vn&&vn.next.indexOf(n.id)>=0) ok=true;
    }
    if(ok) out.push(n.id);
  }
  return out;
}

function initFloorState(){gs.floorMap=generateFloorMap(gs.floorIdx);}

function initGS(){
  gs={
    screen:'title',
    player:{hp:30,maxHp:30,extraDraw:0},
    backpack:[cloneCard(CARD_DB[0]),cloneCard(CARD_DB[1]),cloneCard(CARD_DB[2])],
    backpackMax:8,floorIdx:0,floorMap:null,gold:2,
    combat:null,loot:null,port:null,
    finalBoss:false,msg:'',msgTimer:0,wave:0
  };
  initFloorState();
}

// -- DOMINO / COMBAT HELPERS --------------------------------------------------
function makeDomino(l,r){return{left:l,right:r,used:false};}
function rollDominoes(n){
  var r=[];
  for(var i=0;i<n;i++) r.push(makeDomino(Math.floor(Math.random()*7),Math.floor(Math.random()*7)));
  return r;
}

function pickMove(enemy){
  var id=enemy.moveset[enemy.moveIdx%enemy.moveset.length];
  var base=MOVE_DB[id];
  return{
    id:id,name:base.name,type:base.type,
    dmg:   base.type==='atk' ?Math.max(1,Math.round(enemy.atk*base.mult)):0,
    healAmt:base.type==='heal'?Math.max(3,Math.round(enemy.maxHp*0.15)) :0,
    desc:base.desc
  };
}
function advanceMoveIdx(enemy){enemy.moveIdx=(enemy.moveIdx+1)%enemy.moveset.length;}

function dominoFits(dom,card){
  // exhausted cards can't accept more dominoes this turn
  if((card.usesThisTurn||0)>=(card.maxUses||1)) return false;
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
    } else {msgs.push('BOOM! -'+dmg+' hull!');}
    cm.enemy.hp-=dmg;
  }
  if(card.heal>0){gs.player.hp=min(gs.player.maxHp,gs.player.hp+card.heal);msgs.push('Healed +'+card.heal+' HP!');}
  if(card.extraDraw>0){gs.player.extraDraw+=card.extraDraw;msgs.push('+'+card.extraDraw+' draws next turn!');}
  if(card.stun){cm.enemy.stunned=true;msgs.push('Enemy anchored!');}
  if(card.loadedDice){
    cm.dominoes.push(makeDomino(5,5));
    cm.dominoes.push(makeDomino(6,6));
    msgs.push('[5|5] and [6|6] loaded into hand!');
  }
  card.usesThisTurn=(card.usesThisTurn||0)+1;
  card.assigned=[null,null];
  // Burn one charge from the backpack original
  if(card.backpackIdx>=0&&gs.backpack[card.backpackIdx]){
    gs.backpack[card.backpackIdx].charges=Math.max(0,gs.backpack[card.backpackIdx].charges-1);
  }
  if(msgs.length>0) showMsg(msgs.join(' '));
  // Discard card once maxUses reached, draw replacement
  if(card.usesThisTurn>=(card.maxUses||1)){
    var hi=cm.hand.indexOf(card);
    if(hi>=0){cm.hand.splice(hi,1);cm.discard.push(card);}
    drawCard(cm);
  }
}

// resetCardUses removed - refillHand(cm) is used instead

function showMsg(m){gs.msg=m;gs.msgTimer=180;}
function toGX(px){return(px-ox)/sc;}
function toGY(py){return(py-oy)/sc;}
function gx(x){return ox+x*sc;}
function gy(y){return oy+y*sc;}
function sz(v){return v*sc;}

function recalcScale(){
  VW=windowWidth;VH=windowHeight;
  sc=min(VW/GW,VH/GH);
  ox=(VW-GW*sc)/2;oy=(VH-GH*sc)/2;
}

// -- PIP DRAWING --------------------------------------------------------------
function drawPips(val,hx,hy,hw,hh,pr,pg,pb,pa){
  if(pa===undefined) pa=255;
  if(val===0) return;
  var r=Math.min(hw,hh)*0.13;
  var d=Math.max(sz(r)*2,2.5);
  var lx=hx+hw*0.28,rx=hx+hw*0.72,cx2=hx+hw*0.50;
  var ty=hy+hh*0.27,midy=hy+hh*0.50,by2=hy+hh*0.73;
  fill(pr,pg,pb,pa);noStroke();
  if(val===1){
    ellipse(gx(cx2),gy(midy),d,d);
  } else if(val===2){
    ellipse(gx(rx),gy(ty),d,d);ellipse(gx(lx),gy(by2),d,d);
  } else if(val===3){
    ellipse(gx(rx),gy(ty),d,d);ellipse(gx(cx2),gy(midy),d,d);ellipse(gx(lx),gy(by2),d,d);
  } else if(val===4){
    ellipse(gx(lx),gy(ty),d,d);ellipse(gx(rx),gy(ty),d,d);
    ellipse(gx(lx),gy(by2),d,d);ellipse(gx(rx),gy(by2),d,d);
  } else if(val===5){
    ellipse(gx(lx),gy(ty),d,d);ellipse(gx(rx),gy(ty),d,d);
    ellipse(gx(cx2),gy(midy),d,d);
    ellipse(gx(lx),gy(by2),d,d);ellipse(gx(rx),gy(by2),d,d);
  } else if(val===6){
    ellipse(gx(lx),gy(ty),d,d);ellipse(gx(rx),gy(ty),d,d);
    ellipse(gx(lx),gy(midy),d,d);ellipse(gx(rx),gy(midy),d,d);
    ellipse(gx(lx),gy(by2),d,d);ellipse(gx(rx),gy(by2),d,d);
  }
}

var imgDinghy=null,imgSloop=null,imgBrigantine=null,imgManOWar=null;

function preload(){
  imgShipPlayer   =loadImage('assets/svg/ship_player.svg');
  imgShipEnemy    =loadImage('assets/svg/ship_enemy.svg');
  imgKraken       =loadImage('assets/svg/kraken.svg');
  imgTreasureChest=loadImage('assets/svg/treasure_chest.svg');
  imgCannon       =loadImage('assets/svg/cannon.svg');
  imgGhostShip    =loadImage('assets/svg/ghost_ship.svg');
  imgDinghy       =loadImage('assets/svg/dinghy.svg');
  imgSloop        =loadImage('assets/svg/sloop.svg');
  imgBrigantine   =loadImage('assets/svg/brigantine.svg');
  imgManOWar      =loadImage('assets/svg/man_o_war.svg');
}

function getEnemyImg(name){
  if(name==='Dinghy')     return imgDinghy;
  if(name==='Sloop')      return imgSloop;
  if(name==='Brigantine') return imgBrigantine;
  if(name==='Man-o-War')  return imgManOWar;
  if(name==='Ghost Ship') return imgGhostShip;
  if(name==='The Kraken') return imgKraken;
  return imgShipEnemy;
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
  push();noFill();strokeWeight(sz(1.5));
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
  if(img){image(img,gx(cx-w/2),gy(cy-h*1.15),sz(w),sz(w*0.75));return;}
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
  fill(10,30,80,a);noStroke();
  rect(gx(GW/2),gy(GH-52),sz(GW-30),sz(34),sz(8));
  var gc=color(C.GOLD);
  fill(red(gc),green(gc),blue(gc),a);
  textAlign(CENTER,CENTER);textSize(sz(12));
  text(gs.msg,gx(GW/2),gy(GH-52));
  pop();
}

// -- TITLE --------------------------------------------------------------------
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
  text('SEAS',gx(GW/2),gy(GH*0.27));
  textStyle(NORMAL);
  textSize(sz(13));fill(C.TEXT_DIM);
  text('A pirate dominoes game',gx(GW/2),gy(GH*0.36));
  var bw=190,bh=46,bx=GW/2-bw/2,by=GH*0.76;
  fill(C.GOLD);noStroke();
  rect(gx(bx),gy(by),sz(bw),sz(bh),sz(12));
  fill(C.OCEAN);textSize(sz(16));textStyle(BOLD);
  text('SET SAIL',gx(GW/2),gy(by+bh/2));
  textStyle(NORMAL);
  pop();
}

// -- FLOOR MAP ----------------------------------------------------------------
function drawFloor(){
  var map=gs.floorMap;
  var fl=FLOORS[min(gs.floorIdx,FLOORS.length-1)];
  var reach=getReachable();
  push();
  fill(C.DEEP);noStroke();
  rect(gx(0),gy(GH*0.5),sz(GW),sz(GH*0.5));
  drawWaves(GH*0.52);
  fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(18));textStyle(BOLD);
  text(fl.name,gx(GW/2),gy(8));textStyle(NORMAL);
  fill(C.TEXT_DIM);textSize(sz(10));
  text('Floor '+(gs.floorIdx+1)+' of '+FLOORS.length,gx(GW/2),gy(29));
  var phpW=110,phpH=12,phpX=8,phpY=46;
  fill(C.HP_BG);noStroke();
  rect(gx(phpX),gy(phpY),sz(phpW),sz(phpH),sz(3));
  fill(C.HP_FG);
  rect(gx(phpX),gy(phpY),sz(phpW*max(0,gs.player.hp/gs.player.maxHp)),sz(phpH),sz(3));
  noStroke();fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(9));
  text('Crew: '+gs.player.hp+'/'+gs.player.maxHp,gx(phpX+2),gy(phpY+2));
  fill(C.GOLD);textAlign(RIGHT,TOP);textSize(sz(12));textStyle(BOLD);
  text('G: '+gs.gold,gx(GW-8),gy(46));textStyle(NORMAL);
  for(var ni=0;ni<map.nodes.length;ni++){
    var n=map.nodes[ni];
    for(var nj=0;nj<n.next.length;nj++){
      var nn=getMapNode(n.next[nj]);
      if(!nn) continue;
      var x1=n.x+NW/2,y1t=n.y+NH,x2=nn.x+NW/2,y2t=nn.y;
      var srcVis=map.visited.indexOf(n.id)>=0;
      var dstReach=reach.indexOf(nn.id)>=0;
      var dstVis=map.visited.indexOf(nn.id)>=0;
      if(srcVis&&dstReach){stroke(C.ROPE);strokeWeight(sz(2.5));}
      else if(srcVis&&dstVis){stroke(C.TEXT_DIM);strokeWeight(sz(1));}
      else{stroke('#1e3a5a');strokeWeight(sz(1.5));}
      line(gx(x1),gy(y1t),gx(x2),gy(y2t));
    }
  }
  for(var ni=0;ni<map.nodes.length;ni++){
    var n=map.nodes[ni];
    drawMapNode(n,map.visited.indexOf(n.id)>=0,reach.indexOf(n.id)>=0,fl);
  }
  pop();
}

function drawMapNode(n,visited,reachable,fl){
  push();
  var isFinalFloor=gs.floorIdx>=FLOORS.length-1;
  var bg,bd,bw;
  if(visited){bg='#0d3060';bd='#1e5090';bw=1;}
  else if(reachable){
    if(n.type==='exit'){
      if(isFinalFloor){bg='#1a0040';bd='#9400d3';bw=3;}
      else{bg='#1a3a6a';bd=C.GOLD;bw=2.5;}
    } else if(n.type==='port'){bg=C.PANEL;bd=C.GOLD;bw=2.5;}
    else{bg=C.PANEL2;bd=C.BORDER;bw=2;}
  } else {bg='#0a2040';bd='#1a3a5a';bw=1;}
  fill(bg);stroke(bd);strokeWeight(sz(bw));
  rect(gx(n.x),gy(n.y),sz(NW),sz(NH),sz(6));
  if(visited){
    noStroke();fill(C.TEXT_DIM);textAlign(CENTER,CENTER);textSize(sz(10));
    var capName=n.type==='enemy'?ENEMY_DB[n.eId].captain:'';
    var vl=n.type==='enemy'?('~ '+capName+' defeated ~'):n.type==='port'?'~ Port visited ~':'~ Departed ~';
    text(vl,gx(n.x+NW/2),gy(n.y+NH/2));pop();return;
  }
  if(!reachable){
    noStroke();fill('#3a6a9a');textAlign(CENTER,CENTER);textSize(sz(10));
    text(n.type==='enemy'?'?? Captain ??':n.type==='port'?'Port':'Exit',gx(n.x+NW/2),gy(n.y+NH/2));
    pop();return;
  }
  noStroke();
  if(n.type==='enemy'){
    var def=ENEMY_DB[n.eId];
    drawShip(n.x+24,n.y+NH/2,28,true);
    // show captain name + strategy hint
    fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(10));textStyle(BOLD);
    text(def.captain,gx(n.x+48),gy(n.y+6));textStyle(NORMAL);
    fill(C.TEXT_DIM);textSize(sz(8));
    text(def.title+' / '+def.name,gx(n.x+48),gy(n.y+20));
    fill(C.EN_FG);textSize(sz(8));
    text(def.hp+' hull  ATK '+def.atk,gx(n.x+48),gy(n.y+33));
    fill(C.GOLD);textSize(sz(8));
    text('+'+def.gold+'g',gx(n.x+48),gy(n.y+46));
    fill(C.GOLD);textAlign(RIGHT,CENTER);textSize(sz(16));textStyle(BOLD);
    text('>',gx(n.x+NW-8),gy(n.y+NH/2));textStyle(NORMAL);
  } else if(n.type==='port'){
    fill(C.GOLD);textAlign(CENTER,CENTER);textSize(sz(12));textStyle(BOLD);
    text('PORT: '+fl.portName,gx(n.x+NW/2),gy(n.y+NH/2-10));textStyle(NORMAL);
    fill(C.TEXT_DIM);textSize(sz(9));text('Rest & restock',gx(n.x+NW/2),gy(n.y+NH/2+10));
  } else {
    if(isFinalFloor){
      fill('#cc44ff');textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
      text('THE KRAKEN',gx(n.x+NW/2),gy(n.y+NH/2-14));
      text('AWAITS',gx(n.x+NW/2),gy(n.y+NH/2+1));textStyle(NORMAL);
      fill('#ee88ff');textSize(sz(8));text('150 hull   ATK 22',gx(n.x+NW/2),gy(n.y+NH/2+15));
    } else {
      fill(C.GOLD);textAlign(CENTER,CENTER);textSize(sz(13));textStyle(BOLD);
      text('DEPART',gx(n.x+NW/2),gy(n.y+NH/2-9));textStyle(NORMAL);
      fill(C.TEXT_DIM);textSize(sz(9));text('Advance to next floor >>',gx(n.x+NW/2),gy(n.y+NH/2+9));
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
        map.fightingNodeId=n.id;gs.screen='equip';
      } else if(n.type==='port'){
        map.visited.push(n.id);
        gs.port=buildPortItems(fl,true);gs.screen='port';
        showMsg('Welcome to '+fl.portName+'!');
      } else {
        if(gs.floorIdx>=FLOORS.length-1){
          gs.finalBoss=true;map.fightingNodeId=n.id;gs.screen='equip';
          showMsg('THE KRAKEN RISES FROM THE DEEP!');
        } else {exitFloor();}
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
    setTimeout(function(){initGS();},3500);return;
  }
  gs.port=buildPortItems(fl,false);gs.screen='port';
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
    {type:'heal',    label:'Patch Hull',   desc:'+15 HP to your crew',   cost:2,done:false},
    {type:'fullheal',label:'Full Overhaul',desc:'Repair hull to full HP', cost:5,done:false}
  ];
  for(var k=0;k<portCards.length;k++){
    var c=portCards[k];
    items.push({type:'card',label:c.name,slot0:c.slots[0],slot1:c.slots[1],desc:c.desc,cost:2,card:c,done:false});
  }
  return{portName:fl.portName,items:items,isInFloor:isInFloor};
}

// -- EQUIP --------------------------------------------------------------------
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
    text("SHIP'S HOLD",gx(GW/2),gy(8));textStyle(NORMAL);
    textSize(sz(10));fill('#ee88ff');
    text('THE KRAKEN awaits!  (150 hull / ATK 22)',gx(GW/2),gy(27));
  } else {
    fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(15));textStyle(BOLD);
    text("SHIP'S HOLD",gx(GW/2),gy(8));textStyle(NORMAL);
    textSize(sz(10));fill(C.TEXT_DIM);
    text('Facing: '+target.title+' '+target.captain+'  ('+target.hp+' hull)',gx(GW/2),gy(27));
  }
  textSize(sz(9));fill(C.TEXT_DIM);textAlign(CENTER,TOP);
  text('Draw 4 at start  |  Draw 2 per turn  |  Max 5 in hand  |  Cards cycle from discard',gx(GW/2),gy(42));
  fill(C.BORDER);textSize(sz(9));
  text(gs.backpack.length+'/'+(gs.backpackMax||8)+' cards in hold    Gold: '+gs.gold,gx(GW/2),gy(54));
  for(var i=0;i<gs.backpack.length;i++){
    var r=equipCardRect(i);
    drawEquipCard(gs.backpack[i],r.x,r.y,r.w,r.h,false);
  }
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  fill(gs.finalBoss?'#9400d3':C.GOLD);noStroke();
  rect(gx(bx),gy(by),sz(bw),sz(bh),sz(10));
  if(imgCannon){
    var canW=52,canH=30;
    image(imgCannon,gx(bx-canW-8),gy(by+bh/2-canH/2),sz(canW),sz(canH));
    push();
    translate(gx(bx+bw+8+canW),gy(by+bh/2-canH/2));
    scale(-1,1);
    image(imgCannon,0,0,sz(canW),sz(canH));
    pop();
  }
  fill(C.TEXT);
  textAlign(CENTER,CENTER);textSize(sz(14));textStyle(BOLD);
  text(gs.finalBoss?'FACE THE KRAKEN!':'WEIGH ANCHOR!',gx(GW/2),gy(by+bh/2));
  textStyle(NORMAL);
  pop();
}

function drawEquipCard(card,cx,cy,w,h,equipped){
  push();
  fill(C.CARD_BG);stroke(equipped?C.GOLD:C.CARD_BD);strokeWeight(sz(equipped?2:1.5));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));
  // title strip
  noStroke();fill(equipped?'#161e10':C.CARD_FACE);
  rect(gx(cx+1),gy(cy+1),sz(w-2),sz(17),sz(5));
  rect(gx(cx+1),gy(cy+10),sz(w-2),sz(8));
  // card name
  fill(equipped?C.GOLD:C.CARD_NAME);textAlign(LEFT,CENTER);textSize(sz(9));textStyle(BOLD);
  text(card.name,gx(cx+6),gy(cy+9));textStyle(NORMAL);
  // charge diamonds (top-right of title)
  var chgE=card.charges!==undefined?card.charges:3;
  for(var ceI=0;ceI<chgE;ceI++){
    noStroke();fill(equipped?C.GOLD:'#c09028');
    var dxE=cx+w-4-(chgE-1-ceI)*7;
    beginShape();
    vertex(gx(dxE+3),gy(cy+5));vertex(gx(dxE+6),gy(cy+9));
    vertex(gx(dxE+3),gy(cy+13));vertex(gx(dxE),gy(cy+9));
    endShape(CLOSE);
  }
  // maxUses badge
  if(card.maxUses>1){
    noStroke();fill(C.CARD_DESC);textAlign(RIGHT,TOP);textSize(sz(7.5));
    text(card.maxUses+'x/turn',gx(cx+w-6),gy(cy+20));
  }
  // domino slot preview
  var dEW=w-14,dEH=20,dEX=cx+7,dEY=cy+20;
  fill(C.CARD_SLOT);stroke(C.CARD_BD);strokeWeight(sz(0.8));
  rect(gx(dEX),gy(dEY),sz(dEW),sz(dEH),sz(3));
  stroke(C.CARD_BD);strokeWeight(sz(0.6));
  line(gx(dEX+dEW/2),gy(dEY+2),gx(dEX+dEW/2),gy(dEY+dEH-2));
  for(var seI=0;seI<2;seI++){
    var hEx=dEX+seI*(dEW/2),reqE=card.slots[seI];
    if(reqE!==null){
      drawPips(reqE,hEx,dEY,dEW/2,dEH,240,230,210);
    } else {
      noStroke();fill(C.CARD_DESC);textSize(sz(9));textAlign(CENTER,CENTER);
      text('?',gx(hEx+dEW/4),gy(dEY+dEH/2));
    }
  }
  // description
  noStroke();fill(C.CARD_DESC);textAlign(LEFT,TOP);textSize(sz(8.5));
  text(card.desc,gx(cx+7),gy(dEY+dEH+5),sz(w-14),sz(h-dEH-35));
  pop();
}


// -- COMBAT -------------------------------------------------------------------
var CB={
  shipY:60,hpBarY:130,intentY:150,
  cardY:176,cardH:110,
  domW:56,domH:28,domPad:6,domRowGap:5,
  domLabelY:300,domY:312,
  btnW:130,btnH:38,
  // Pokémon layout: enemy top-right, player bottom-left
  enemyX:220,enemyY:16,enemyW:130,
  playerX:10,playerY:70,playerW:80
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
  var node=getMapNode(gs.floorMap.fightingNodeId);
  var def=gs.finalBoss?ENEMY_DB[5]:(node?ENEMY_DB[node.eId]:ENEMY_DB[0]);
  var domCount=4+gs.player.extraDraw;
  gs.player.extraDraw=0;
  var enemy={
    name:def.name,captain:def.captain,title:def.title,
    hp:def.hp,maxHp:def.hp,atk:def.atk,gold:def.gold,
    moveset:def.moveset,stunned:false,braceActive:false,moveIdx:0
  };
  // Build shuffled hold from backpack, draw opening hand of 4
  var hold=[];
  for(var bi=0;bi<gs.backpack.length;bi++){
    var hc=cloneCard(gs.backpack[bi]);
    hc.backpackIdx=bi;
    hold.push(hc);
  }
  shuffleArray(hold);
  var hand=[];
  for(var di=0;di<4&&hold.length>0;di++) hand.push(hold.pop());
  gs.combat={
    enemy:enemy,
    dominoes:rollDominoes(domCount),
    selDom:null,turn:1,
    nextMove:pickMove(enemy),
    enemyAnim:0,animIsStun:false,pendingTurns:0,
    animDom:rollDominoes(1)[0],
    dragDomIdx:null,dragX:0,dragY:0,isDragging:false,
    hold:hold,hand:hand,discard:[],handMax:5
  };
  gs.screen='combat';
  if(gs.finalBoss) showMsg('THE KRAKEN: "'+def.intro+'"');
  else showMsg(def.captain+': "'+def.intro+'"');
}

function drawCard(cm){
  if(cm.hand.length>=cm.handMax) return;
  if(cm.hold.length===0){
    if(cm.discard.length===0) return;
    cm.hold=cm.discard.slice();
    cm.discard=[];
    shuffleArray(cm.hold);
    showMsg('Hold reshuffled!');
  }
  var c=cm.hold.pop();
  c.usesThisTurn=0;c.assigned=[null,null];
  cm.hand.push(c);
}

function refillHand(cm){
  for(var i=0;i<cm.hand.length;i++){
    cm.hand[i].usesThisTurn=0;
    cm.hand[i].assigned=[null,null];
  }
  for(var d=0;d<2;d++) drawCard(cm);
}

function drawCombat(){
  var cm=gs.combat;
  push();
  fill(gs.finalBoss?'#1a0040':C.DEEP);noStroke();
  rect(gx(0),gy(GH*0.62),sz(GW),sz(GH*0.38));
  drawWaves(GH*0.64);
  // Enemy sprite - Pokemon style: upper-right corner
  var eImg=getEnemyImg(cm.enemy.name);
  if(eImg){
    image(eImg,gx(CB.enemyX),gy(CB.enemyY),sz(CB.enemyW),sz(CB.enemyW*0.75));
  } else {
    drawShip(CB.enemyX+CB.enemyW/2,CB.enemyY+CB.enemyW*0.3,CB.enemyW,true);
  }
  // Player sprite - lower-left corner
  if(imgShipPlayer){
    image(imgShipPlayer,gx(CB.playerX),gy(CB.playerY),sz(CB.playerW),sz(CB.playerW*0.75));
  } else {
    drawShip(CB.playerX+CB.playerW/2,CB.playerY+CB.playerW*0.3,CB.playerW,false);
  }
  // captain name + ship class
  var eCol=gs.finalBoss?'#cc44ff':(cm.enemy.name==='Ghost Ship'?'#88ddff':C.TEXT);
  var eColDim=gs.finalBoss?'#ee88ff':(cm.enemy.name==='Ghost Ship'?'#55bbdd':C.TEXT_DIM);
  fill(eCol);textAlign(CENTER,TOP);textSize(sz(12));textStyle(BOLD);
  text(cm.enemy.title+' '+cm.enemy.captain,gx(GW/2),gy(6));textStyle(NORMAL);
  fill(eColDim);textSize(sz(8));
  text('[ '+cm.enemy.name+' ]',gx(GW/2),gy(21));
  var ehpW=200,ehpH=16,ehpX=(GW-ehpW)/2;
  fill(gs.finalBoss?'#2a0050':C.EN_BG);noStroke();
  rect(gx(ehpX),gy(CB.hpBarY),sz(ehpW),sz(ehpH),sz(4));
  fill(gs.finalBoss?'#9400d3':C.EN_FG);
  rect(gx(ehpX),gy(CB.hpBarY),sz(ehpW*max(0,cm.enemy.hp/cm.enemy.maxHp)),sz(ehpH),sz(4));
  fill(C.TEXT);textAlign(CENTER,CENTER);textSize(sz(9));
  text(cm.enemy.hp+'/'+cm.enemy.maxHp+' hull',gx(GW/2),gy(CB.hpBarY+ehpH/2));
  // moveset pills
  var ms=cm.enemy.moveset;
  var pillW=Math.min(52,Math.floor((GW-10)/ms.length)-4),pillH=16,pillGap=3;
  var totalPW=ms.length*(pillW+pillGap)-pillGap;
  var pillX=(GW-totalPW)/2;
  for(var mi=0;mi<ms.length;mi++){
    var mId=ms[mi],mBase=MOVE_DB[mId];
    var isNext=(mi===cm.enemy.moveIdx%ms.length);
    var pBg=mBase.type==='atk'?'#3a0808':mBase.type==='heal'?'#0a3a0a':'#1a3a6a';
    var pFg=mBase.type==='atk'?C.DANGER:mBase.type==='heal'?C.HP_FG:C.TEXT_DIM;
    fill(pBg);stroke(pFg);strokeWeight(sz(isNext?2.5:0.8));
    rect(gx(pillX+mi*(pillW+pillGap)),gy(CB.hpBarY-22),sz(pillW),sz(pillH),sz(3));
    noStroke();
    var pc=color(pFg);
    fill(red(pc),green(pc),blue(pc),isNext?255:130);
    textAlign(CENTER,CENTER);textSize(sz(isNext?8:7));
    text(mBase.name,gx(pillX+mi*(pillW+pillGap)+pillW/2),gy(CB.hpBarY-22+pillH/2));
  }
  // intent bar
  var move=cm.nextMove;
  var iBg=move.type==='atk'?'#3a0808':move.type==='heal'?'#0a3a0a':'#1a3a6a';
  var iFg=move.type==='atk'?C.DANGER:move.type==='heal'?C.HP_FG:C.TEXT_DIM;
  if(cm.enemy.stunned){iBg='#3a3a00';iFg=C.GOLD;}
  fill(iBg);stroke(iFg);strokeWeight(sz(1.5));
  rect(gx(ehpX),gy(CB.intentY),sz(ehpW),sz(20),sz(3));
  noStroke();fill(iFg);
  textAlign(LEFT,CENTER);textSize(sz(9));
  text(cm.enemy.stunned?'ANCHORED':move.name,gx(ehpX+6),gy(CB.intentY+10));
  var iRight=cm.enemy.stunned?'skips turn':
    move.type==='atk'?('-'+move.dmg+' crew'):
    move.type==='heal'?('+'+move.healAmt+' hull'):'blocks next hit';
  textAlign(RIGHT,CENTER);text(iRight,gx(ehpX+ehpW-6),gy(CB.intentY+10));
  // player HP
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
  text(gs.finalBoss?'FINAL BOSS':(fl.name+' - Floor '+(gs.floorIdx+1)+'/'+FLOORS.length),gx(GW/2),gy(CB.hpBarY-38));
  // hold / discard indicators
  noStroke();fill(C.TEXT_DIM);textSize(sz(9));textAlign(LEFT,TOP);
  text('Hold:'+cm.hold.length,gx(6),gy(CB.cardY-13));
  textAlign(RIGHT,TOP);
  text('Disc:'+cm.discard.length,gx(GW-6),gy(CB.cardY-13));
  // combat cards from hand
  var nc=cm.hand.length;
  if(nc===0){
    noStroke();fill(C.TEXT_DIM);textAlign(CENTER,CENTER);textSize(sz(10));
    text('No cards in hand - End Turn to draw',gx(GW/2),gy(CB.cardY+CB.cardH/2));
  } else {
    var cardW=(GW-12-(nc-1)*6)/nc;
    for(var ci=0;ci<nc;ci++){
      drawCombatCard(cm.hand[ci],6+ci*(cardW+6),CB.cardY,cardW,CB.cardH,cm);
    }
  }
  // domino label
  fill(C.TEXT_DIM);textAlign(CENTER,BOTTOM);textSize(sz(10));
  if(cm.isDragging) text('Drop onto a card to place',gx(GW/2),gy(CB.domLabelY));
  else if(cm.selDom===null) text('Drag or tap a domino',gx(GW/2),gy(CB.domLabelY));
  else text('Tap a card to place  [tap again to cancel]',gx(GW/2),gy(CB.domLabelY));
  // dominoes
  var total=cm.dominoes.length;
  for(var di=0;di<total;di++){
    var dom=cm.dominoes[di];
    var pos=getDomPos(di,total);
    if(!dom.used){
      if(cm.isDragging&&cm.dragDomIdx===di){
        push();noFill();stroke(C.BORDER);strokeWeight(sz(1));
        rect(gx(pos.x),gy(pos.y),sz(CB.domW),sz(CB.domH),sz(5));pop();
      } else {
        drawDomino(dom,pos.x,pos.y,CB.domW,CB.domH,(cm.selDom===di)&&!cm.isDragging);
      }
    } else {
      push();fill('#1a1a1a');stroke('#333333');strokeWeight(sz(1));
      rect(gx(pos.x),gy(pos.y),sz(CB.domW),sz(CB.domH),sz(5));pop();
    }
  }
  // end turn button
  var btnY=domBtnY(total),etX=GW/2-CB.btnW/2;
  var animActive=cm.enemyAnim>0;
  fill(animActive?'#1a3a6a':C.DECK);
  stroke(C.BORDER);strokeWeight(sz(1.5));
  rect(gx(etX),gy(btnY),sz(CB.btnW),sz(CB.btnH),sz(8));
  noStroke();fill(animActive?'#6a9ac0':C.TEXT);
  textAlign(CENTER,CENTER);textSize(sz(12));
  text('End Turn',gx(GW/2),gy(btnY+CB.btnH/2));
  // dragged domino
  if(cm.isDragging&&cm.dragDomIdx!==null&&!cm.dominoes[cm.dragDomIdx].used){
    drawDomino(cm.dominoes[cm.dragDomIdx],cm.dragX,cm.dragY,CB.domW,CB.domH,true);
  }
  pop();
}

function drawCombatCard(card,cx,cy,w,h,cm){
  push();
  var ready=isReady(card);
  var exhausted=(card.usesThisTurn||0)>=(card.maxUses||1);
  // drag/select detection
  var dragHover=false,dragFit=false;
  if(cm.isDragging&&cm.dragDomIdx!==null&&!cm.dominoes[cm.dragDomIdx].used){
    var dmx=cm.dragX+CB.domW/2,dmy=cm.dragY+CB.domH/2;
    if(dmx>=cx&&dmx<=cx+w&&dmy>=cy&&dmy<=cy+h){
      dragHover=true;dragFit=dominoFits(cm.dominoes[cm.dragDomIdx],card);
    }
  }
  var fitType=false;
  if(!cm.isDragging&&cm.selDom!==null&&!cm.dominoes[cm.selDom].used)
    fitType=dominoFits(cm.dominoes[cm.selDom],card);
  var fits=fitType!==false;
  var goodDrop=dragHover&&(dragFit!==false);
  var badDrop=dragHover&&(dragFit===false);
  // card shell
  fill(ready?C.GREEN_HI:goodDrop?C.GREEN_HI:badDrop?'#1e0808':C.CARD_BG);
  stroke(ready?C.GREEN_BD:goodDrop?C.GREEN_BD:badDrop?C.DANGER:fits?C.GOLD:C.CARD_BD);
  strokeWeight(sz(ready||fits||goodDrop||badDrop?2.5:1.5));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));
  // title strip
  noStroke();fill(ready?'#102016':C.CARD_FACE);
  rect(gx(cx+1),gy(cy+1),sz(w-2),sz(17),sz(5));
  rect(gx(cx+1),gy(cy+10),sz(w-2),sz(8));
  // card name (left-aligned in title)
  fill(ready?'#80ffaa':C.CARD_NAME);
  textAlign(LEFT,CENTER);textSize(sz(8));textStyle(BOLD);
  text(card.name,gx(cx+5),gy(cy+9));textStyle(NORMAL);
  // per-turn uses (right side of title, dots)
  if(card.maxUses>1){
    var used4=card.usesThisTurn||0;
    for(var ui4=0;ui4<card.maxUses;ui4++){
      noStroke();fill(ui4<used4?'#1e2840':C.GOLD);
      ellipse(gx(cx+w-5-(card.maxUses-1-ui4)*8),gy(cy+9),sz(5),sz(5));
    }
  }
  // domino slot
  var sW4=w-8,sH4=24,sX4=cx+4,sY4=cy+20;
  fill(C.CARD_SLOT);stroke(C.CARD_BD);strokeWeight(sz(0.8));
  rect(gx(sX4),gy(sY4),sz(sW4),sz(sH4),sz(3));
  stroke('#2a3550');strokeWeight(sz(0.7));
  line(gx(sX4+sW4/2),gy(sY4+3),gx(sX4+sW4/2),gy(sY4+sH4-3));
  for(var si4=0;si4<2;si4++){
    var hx4=sX4+si4*(sW4/2),asgn4=card.assigned[si4],req4=card.slots[si4];
    if(asgn4!==null){
      var apc4=color(C.GOLD);drawPips(asgn4,hx4,sY4,sW4/2,sH4,red(apc4),green(apc4),blue(apc4));
    } else if(req4!==null){
      var rpc4=color(fits||goodDrop?'#88ccee':C.CARD_DESC);
      drawPips(req4,hx4,sY4,sW4/2,sH4,red(rpc4),green(rpc4),blue(rpc4),140);
    } else {
      noStroke();fill(fits||goodDrop?'#88ccee':C.CARD_DESC);
      textSize(sz(10));textAlign(CENTER,CENTER);
      text('?',gx(hx4+sW4/4),gy(sY4+sH4/2));
    }
  }
  // description
  noStroke();fill(C.CARD_DESC);textAlign(LEFT,TOP);textSize(sz(7.5));
  text(card.desc,gx(cx+5),gy(sY4+sH4+5),sz(w-10),sz(20));
  // lifetime charge diamonds (bottom-left row)
  var liveChg4=(card.backpackIdx>=0&&gs.backpack[card.backpackIdx])?gs.backpack[card.backpackIdx].charges:(card.charges||3);
  var maxChg4=card.charges||3;
  var dotY4=cy+h-18;
  for(var cd4=0;cd4<maxChg4;cd4++){
    noStroke();fill(cd4<liveChg4?C.GOLD:'#1e2840');
    var dx4=cx+5+cd4*7;
    beginShape();
    vertex(gx(dx4+2.5),gy(dotY4));vertex(gx(dx4+5),gy(dotY4+3.5));
    vertex(gx(dx4+2.5),gy(dotY4+7));vertex(gx(dx4),gy(dotY4+3.5));
    endShape(CLOSE);
  }
  // action label
  if(!exhausted){
    if(ready){
      fill(C.GREEN_BD);textAlign(CENTER,BOTTOM);textSize(sz(10));textStyle(BOLD);
      text('FIRE!',gx(cx+w/2),gy(cy+h-2));textStyle(NORMAL);
    } else if(goodDrop){
      fill('#50ee50');textAlign(CENTER,BOTTOM);textSize(sz(9));textStyle(BOLD);
      text('DROP',gx(cx+w/2),gy(cy+h-2));textStyle(NORMAL);
    } else if(badDrop){
      fill(C.DANGER);textAlign(CENTER,BOTTOM);textSize(sz(8));
      text('no fit',gx(cx+w/2),gy(cy+h-2));
    } else if(fits){
      fill(C.GOLD);textAlign(CENTER,BOTTOM);textSize(sz(9));textStyle(BOLD);
      text('PLACE',gx(cx+w/2),gy(cy+h-2));textStyle(NORMAL);
    }
  }
  // SPENT overlay
  if(exhausted){
    noStroke();fill(0,5,15,210);
    rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));
    fill(C.CARD_DESC);textAlign(CENTER,CENTER);textSize(sz(11));textStyle(BOLD);
    text('SPENT',gx(cx+w/2),gy(cy+h/2));textStyle(NORMAL);
  }
  pop();
}

function drawDomino(dom,dx,dy,w,h,selected){
  push();
  fill(selected?'#222222':'#111111');
  stroke(selected?C.GOLD:'#555555');strokeWeight(sz(selected?2.5:1.5));
  rect(gx(dx),gy(dy),sz(w),sz(h),sz(5));
  stroke('#555555');strokeWeight(sz(0.8));
  line(gx(dx+w/2),gy(dy+3),gx(dx+w/2),gy(dy+h-3));
  if(selected){
    var gc=color(C.GOLD);
    drawPips(dom.left,dx,dy,w/2,h,red(gc),green(gc),blue(gc));
    drawPips(dom.right,dx+w/2,dy,w/2,h,red(gc),green(gc),blue(gc));
  } else {
    drawPips(dom.left,dx,dy,w/2,h,240,235,220);
    drawPips(dom.right,dx+w/2,dy,w/2,h,240,235,220);
  }
  pop();
}

function drawEnemyDomino(dom,dx,dy,w,h,a){
  push();
  fill(20,0,0,a);stroke(200,60,60,a);strokeWeight(sz(2));
  rect(gx(dx),gy(dy),sz(w),sz(h),sz(5));
  stroke(160,40,40,Math.round(a*0.6));strokeWeight(sz(0.8));
  line(gx(dx+w/2),gy(dy+3),gx(dx+w/2),gy(dy+h-3));
  drawPips(dom.left,dx,dy,w/2,h,255,140,140,a);
  drawPips(dom.right,dx+w/2,dy,w/2,h,255,140,140,a);
  pop();
}

function drawEnemyMoveCard(moveId,cx,cy,w,h,isActive,alpha,cm){
  var base=MOVE_DB[moveId];
  var bg=base.type==='atk'?'#3a0808':base.type==='heal'?'#0a3a0a':'#0a1a3a';
  var bd=base.type==='atk'?C.DANGER:base.type==='heal'?C.HP_FG:C.TEXT_DIM;
  var bgc=color(bg),bdc=color(bd);
  push();
  fill(red(bgc),green(bgc),blue(bgc),Math.round(alpha*(isActive?220:100)));
  stroke(red(bdc),green(bdc),blue(bdc),Math.round(alpha*(isActive?255:70)));
  strokeWeight(sz(isActive?2.5:1));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(5));noStroke();
  fill(red(bdc),green(bdc),blue(bdc),Math.round(alpha*(isActive?230:85)));
  textAlign(CENTER,TOP);textSize(sz(isActive?9:7));textStyle(isActive?BOLD:NORMAL);
  text(base.name,gx(cx+w/2),gy(cy+5));textStyle(NORMAL);
  fill(red(bdc),green(bdc),blue(bdc),Math.round(alpha*(isActive?160:60)));
  textSize(sz(6.5));
  text(base.type==='atk'?'ATTACK':base.type==='heal'?'HEAL':'DEFEND',gx(cx+w/2),gy(cy+16));
  var sW=w*0.84,sH=20,sX=cx+(w-sW)/2,sY=cy+26;
  fill(0,0,0,Math.round(alpha*(isActive?180:60)));
  stroke(red(bdc),green(bdc),blue(bdc),Math.round(alpha*(isActive?150:45)));
  strokeWeight(sz(0.8));
  rect(gx(sX),gy(sY),sz(sW),sz(sH),sz(3));
  strokeWeight(sz(0.6));
  line(gx(sX+sW/2),gy(sY+2),gx(sX+sW/2),gy(sY+sH-2));
  noStroke();
  fill(red(bdc),green(bdc),blue(bdc),Math.round(alpha*(isActive?170:60)));
  textAlign(CENTER,TOP);textSize(sz(7.5));
  var effStr='';
  if(base.type==='atk') effStr='-'+Math.max(1,Math.round(cm.enemy.atk*base.mult))+'hp';
  else if(base.type==='heal') effStr='+'+Math.max(3,Math.round(cm.enemy.maxHp*0.15))+'hull';
  else effStr='blocks';
  text(effStr,gx(cx+w/2),gy(sY+sH+3));
  if(isActive){
    fill(red(bdc),green(bdc),blue(bdc),Math.round(alpha*120));
    textAlign(CENTER,BOTTOM);textSize(sz(8));textStyle(BOLD);
    text('PLAYING',gx(cx+w/2),gy(cy+h-3));textStyle(NORMAL);
  }
  pop();
}

function drawEnemyTurnOverlay(cm){
  var TOTAL=70,f=cm.enemyAnim,entered=TOTAL-f;
  var alpha=Math.min(Math.min(entered/8.0,1.0),Math.min(f/8.0,1.0));
  if(alpha<0.01) return;
  var a220=Math.round(alpha*220),a160=Math.round(alpha*160);
  var isStun=cm.animIsStun,move=cm.nextMove;
  push();
  // Darken player area only (cards + dominoes region)
  fill(0,8,20,Math.round(alpha*210));noStroke();
  rect(gx(0),gy(CB.cardY-16),sz(GW),sz(GH-(CB.cardY-16)));
  if(isStun){
    var pulse=sin(entered*0.3)*0.5+0.5;
    var gc2=color(C.GOLD);
    fill(red(gc2),green(gc2),blue(gc2),a220);
    textAlign(CENTER,CENTER);textSize(sz(28+pulse*4));textStyle(BOLD);
    text('ANCHORED!',gx(GW/2),gy(CB.cardY+CB.cardH/2));textStyle(NORMAL);
    fill(red(gc2),green(gc2),blue(gc2),a160);textSize(sz(12));
    text('Enemy skips this attack',gx(GW/2),gy(CB.cardY+CB.cardH/2+28));
    pop();return;
  }
  // "CAPTAIN ATTACKS!" header
  var pulse2=sin(entered*0.28)*0.5+0.5;
  var rc=color(C.DANGER);
  fill(red(rc),green(rc),blue(rc),Math.round(alpha*(155+pulse2*90)));
  textAlign(CENTER,TOP);textSize(sz(10));textStyle(BOLD);
  text(cm.enemy.captain.toUpperCase()+' ATTACKS!',gx(GW/2),gy(CB.cardY-13));
  textStyle(NORMAL);
  // Enemy move cards (up to 5, centered on active)
  var ms=cm.enemy.moveset,nc=ms.length;
  var dispN=Math.min(nc,5);
  var actIdx=cm.enemy.moveIdx%nc;
  var startMi=Math.max(0,Math.min(actIdx-2,nc-dispN));
  var cardW2=Math.min(76,Math.floor((GW-12-(dispN-1)*5)/dispN));
  var totalCW=dispN*(cardW2+5)-5;
  var cStartX=(GW-totalCW)/2;
  for(var di=0;di<dispN;di++){
    var realMi=startMi+di;
    var cxe=cStartX+di*(cardW2+5);
    drawEnemyMoveCard(ms[realMi],cxe,CB.cardY,cardW2,CB.cardH,(realMi===actIdx),alpha,cm);
  }
  // Domino slides from domino row UP into the active card slot
  var actDispIdx=actIdx-startMi;
  var actCX=cStartX+actDispIdx*(cardW2+5);
  var slotY2=CB.cardY+26;
  var domStartY=CB.domY+4;
  var rawT=(entered-8)/22.0;
  var slideT=Math.min(Math.max(rawT,0),1);
  var eased=1.0-Math.pow(1.0-slideT,2.5);
  var arrived=(entered>=32);
  var animDomX=actCX+(cardW2-CB.domW)/2;
  var animDomY=domStartY+(slotY2-domStartY)*eased;
  if(!arrived){
    var floatA=Math.round(Math.min(Math.max(entered-5,0)/3.0,1)*alpha*235);
    if(floatA>0) drawEnemyDomino(cm.animDom,animDomX,animDomY,CB.domW,CB.domH,floatA);
  } else {
    drawEnemyDomino(cm.animDom,animDomX,slotY2,CB.domW,CB.domH,a220);
    var ff=entered-32;
    // Flash on landing
    if(ff<10){
      noStroke();fill(255,80,80,Math.round(alpha*130*(1.0-ff/10.0)));
      rect(gx(actCX),gy(CB.cardY),sz(cardW2),sz(CB.cardH),sz(5));
    }
    // Effect text
    var effA=Math.round(Math.min(ff/8.0,1.0)*alpha*235);
    if(effA>0){
      var effStr2,effR,effG,effB;
      if(move.type==='atk'){effStr2='-'+move.dmg+' crew!';effR=255;effG=80;effB=80;}
      else if(move.type==='heal'){var hcol=color(C.HP_FG);effStr2='+'+move.healAmt+' hull!';effR=red(hcol);effG=green(hcol);effB=blue(hcol);}
      else{var rc2=color(C.TEXT_DIM);effStr2='BRACING!';effR=red(rc2);effG=green(rc2);effB=blue(rc2);}
      fill(effR,effG,effB,effA);
      textAlign(CENTER,TOP);textSize(sz(17));textStyle(BOLD);
      text(effStr2,gx(GW/2),gy(CB.cardY+CB.cardH+10));textStyle(NORMAL);
      fill(effR,effG,effB,Math.round(effA*0.55));
      textSize(sz(9));text(move.desc,gx(GW/2),gy(CB.cardY+CB.cardH+31));
    }
  }
  pop();
}

function resolveEnemyTurn(cm){
  var move=cm.nextMove;
  if(cm.animIsStun){
    cm.enemy.stunned=false;
    showMsg(cm.enemy.captain+' was anchored and skipped the attack!');
  } else {
    if(move.type==='atk'){
      gs.player.hp-=move.dmg;
      showMsg(cm.enemy.captain+' fires '+move.name+'! -'+move.dmg+' HP!');
      if(gs.player.hp<=0){
        gs.player.hp=0;
        showMsg('Your ship is sunk! Starting over...');
        setTimeout(function(){initGS();},2200);return;
      }
    } else if(move.type==='heal'){
      cm.enemy.hp=min(cm.enemy.maxHp,cm.enemy.hp+move.healAmt);
      showMsg(cm.enemy.captain+' patches hull! +'+move.healAmt+' HP!');
    } else {
      cm.enemy.braceActive=true;
      showMsg(cm.enemy.captain+' braces! Next hit is halved!');
    }
  }
  advanceMoveIdx(cm.enemy);
  cm.nextMove=pickMove(cm.enemy);
  cm.turn++;
  refillHand(cm);
  var domCount=4+gs.player.extraDraw;
  gs.player.extraDraw=0;
  cm.dominoes=rollDominoes(domCount);
  cm.selDom=null;cm.dragDomIdx=null;cm.isDragging=false;
}

// -- LOOT ---------------------------------------------------------------------
function startLoot(){
  // Remove cards that ran out of charges during combat
  gs.backpack=gs.backpack.filter(function(c){return c.charges>0;});
  var node=getMapNode(gs.floorMap.fightingNodeId);
  var def=gs.finalBoss?ENEMY_DB[5]:(node?ENEMY_DB[node.eId]:ENEMY_DB[0]);
  gs.gold+=def.gold;
  if(gs.finalBoss){
    gs.finalBoss=false;
    showMsg('THE KRAKEN IS SLAIN! Victory at last!');
    setTimeout(function(){initGS();},3500);return;
  }
  var ownedIds=gs.backpack.map(function(c){return c.id;});
  var pool=CARD_DB.filter(function(c){return ownedIds.indexOf(c.id)<0;});
  for(var i=pool.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;
  }
  var choices=pool.slice(0,min(2,pool.length)).map(function(c){return cloneCard(c);});
  gs.loot={choices:choices};gs.screen='loot';
  showMsg(def.captain+' defeated! +'+def.gold+'g! Choose your plunder!');
}

function afterLoot(){
  gs.floorMap.visited.push(gs.floorMap.fightingNodeId);
  gs.floorMap.fightingNodeId=null;gs.screen='floor';
}

function drawLoot(){
  push();
  if(imgTreasureChest) image(imgTreasureChest,gx(GW/2-36),gy(4),sz(72),sz(54));
  fill(C.GOLD);textAlign(CENTER,TOP);textSize(sz(22));textStyle(BOLD);
  text('PLUNDER!',gx(GW/2),gy(60));textStyle(NORMAL);
  textSize(sz(11));fill(C.TEXT_DIM);
  var holdFull=gs.backpack.length>=(gs.backpackMax||8);
  text('Choose a card to add to your hold.   Gold: '+gs.gold,gx(GW/2),gy(86));
  if(holdFull){fill(C.DANGER);textSize(sz(9));text('HOLD FULL ('+gs.backpack.length+'/'+(gs.backpackMax||8)+')',gx(GW/2),gy(98));}
  var cards=gs.loot.choices,cw=170,ch=120;
  var totalW=cards.length*cw+(cards.length-1)*12;
  var cStartX=(GW-totalW)/2,cStartY=104;
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
  fill(C.CARD_BG);stroke(C.GOLD);strokeWeight(sz(2));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(8));
  // gold title strip
  noStroke();fill('#16140a');
  rect(gx(cx+1),gy(cy+1),sz(w-2),sz(19),sz(7));
  rect(gx(cx+1),gy(cy+12),sz(w-2),sz(8));
  // card name
  fill(C.GOLD);textAlign(CENTER,CENTER);textSize(sz(10));textStyle(BOLD);
  text(card.name,gx(cx+w/2),gy(cy+10));textStyle(NORMAL);
  // charge diamonds (top-right)
  var chgL=card.charges!==undefined?card.charges:3;
  for(var clI=0;clI<chgL;clI++){
    noStroke();fill(C.GOLD);
    var dxL=cx+w-5-(chgL-1-clI)*8;
    beginShape();
    vertex(gx(dxL+3),gy(cy+5));vertex(gx(dxL+6),gy(cy+10));
    vertex(gx(dxL+3),gy(cy+15));vertex(gx(dxL),gy(cy+10));
    endShape(CLOSE);
  }
  // domino slot
  var dLW=w-14,dLH=22,dLX=cx+7,dLY=cy+23;
  fill(C.CARD_SLOT);stroke(C.CARD_BD);strokeWeight(sz(0.8));
  rect(gx(dLX),gy(dLY),sz(dLW),sz(dLH),sz(4));
  stroke(C.CARD_BD);strokeWeight(sz(0.7));
  line(gx(dLX+dLW/2),gy(dLY+2),gx(dLX+dLW/2),gy(dLY+dLH-2));
  for(var slL=0;slL<2;slL++){
    var hLx=dLX+slL*(dLW/2),reqL=card.slots[slL];
    if(reqL!==null){
      drawPips(reqL,hLx,dLY,dLW/2,dLH,240,235,220);
    } else {
      noStroke();fill(C.CARD_DESC);textSize(sz(9));textAlign(CENTER,CENTER);
      text('?',gx(hLx+dLW/4),gy(dLY+dLH/2));
    }
  }
  // description
  noStroke();fill(C.TEXT);textAlign(LEFT,TOP);textSize(sz(9));
  text(card.desc,gx(cx+7),gy(dLY+dLH+7),sz(w-14),sz(h-dLH-42));
  if(card.maxUses>1){
    fill(C.GOLD);textAlign(CENTER,BOTTOM);textSize(sz(8));
    text(card.maxUses+'x per turn',gx(cx+w/2),gy(cy+h-5));
  }
  pop();
}


// -- PORT ---------------------------------------------------------------------
function portItemH(item){return item.type==='card'?96:62;}
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
  textSize(sz(11));fill(C.TEXT_DIM);
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
  fill(done?'#1a3a6a':(canAfford?C.PANEL2:C.PANEL));
  stroke(done?C.BORDER:(canAfford?C.GOLD:C.BORDER));
  strokeWeight(sz(canAfford&&!done?2:1.5));
  rect(gx(cx),gy(cy),sz(w),sz(h),sz(6));noStroke();
  fill(done?C.TEXT_DIM:(canAfford?C.GOLD:C.DANGER));
  textAlign(RIGHT,TOP);textSize(sz(11));
  text(done?'[done]':(item.cost+'g'),gx(cx+w-8),gy(cy+8));
  fill(done?C.TEXT_DIM:(canAfford?C.TEXT:'#6a9ac0'));
  textAlign(LEFT,TOP);textSize(sz(11));textStyle(BOLD);
  text(item.label,gx(cx+8),gy(cy+8));textStyle(NORMAL);
  if(item.type==='card'){
    var dPW=46,dPH=20,dPX=cx+8,dPY=cy+26;
    fill('#111111');stroke(done?'#555555':C.BORDER);strokeWeight(sz(1));
    rect(gx(dPX),gy(dPY),sz(dPW),sz(dPH),sz(3));
    stroke('#555555');strokeWeight(sz(0.8));
    line(gx(dPX+dPW/2),gy(dPY+2),gx(dPX+dPW/2),gy(dPY+dPH-2));
    var pAlpha=done?100:220;
    if(item.slot0!==null){
      drawPips(item.slot0,dPX,dPY,dPW/2,dPH,240,235,220,pAlpha);
    } else {
      noStroke();fill(C.TEXT_DIM);textSize(sz(9));textAlign(CENTER,CENTER);
      text('?',gx(dPX+dPW/4),gy(dPY+dPH/2));
    }
    if(item.slot1!==null){
      drawPips(item.slot1,dPX+dPW/2,dPY,dPW/2,dPH,240,235,220,pAlpha);
    } else {
      noStroke();fill(C.TEXT_DIM);textSize(sz(9));textAlign(CENTER,CENTER);
      text('?',gx(dPX+3*dPW/4),gy(dPY+dPH/2));
    }
    noStroke();fill(done?C.TEXT_DIM:C.TEXT_DIM);textSize(sz(9));
    text(item.desc,gx(cx+8),gy(cy+50),sz(w-16),sz(h-56));
  } else {
    noStroke();fill(C.TEXT_DIM);textSize(sz(9));
    text(item.desc,gx(cx+8),gy(cy+26),sz(w-16),sz(h-32));
  }
  pop();
}

// -- INPUT --------------------------------------------------------------------
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
    var nc=cm.hand.length;
    var cardW=(GW-12-(nc-1)*6)/nc;
    for(var ci=0;ci<nc;ci++){
      var card=cm.hand[ci];
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
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  if(mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh) startCombat();
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
    var nc=cm.hand.length;
    var cardW=(GW-12-(nc-1)*6)/nc;
    for(var ci=0;ci<nc;ci++){
      var card=cm.hand[ci];
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
  var cStartX=(GW-totalW)/2,cStartY=104;
  if(cards.length===0){
    var bw=160,bh=40,bx=GW/2-bw/2,by=GH*0.65;
    if(mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh) afterLoot();
    return;
  }
  for(var i=0;i<cards.length;i++){
    var cx=cStartX+i*(cw+12);
    if(mx>=cx&&mx<=cx+cw&&my>=cStartY&&my<=cStartY+ch){
      if(gs.backpack.length>=(gs.backpackMax||8)){showMsg('Backpack full! Discard first.');return;}
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
      else if(item.type==='card'){if(gs.backpack.length>=(gs.backpackMax||8)){showMsg('Backpack full!');return;}gs.backpack.push(item.card);showMsg('Acquired '+item.card.name+'! ('+gs.gold+'g left)');}
      return;
    }
  }
  var bw=180,bh=42,bx=GW/2-bw/2,by=GH-56;
  if(mx>=bx&&mx<=bx+bw&&my>=by&&my<=by+bh){
    if(port.isInFloor) gs.screen='floor';
    else{initFloorState();gs.screen='floor';}
  }
}

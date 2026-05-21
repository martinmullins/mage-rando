// SIGIL RITES — Triangle Piece Roguelike

const C = {
  VOID:'#0a0a0f', DEEP:'#12121e', PANEL:'#1a1a2e', PANEL_ALT:'#16213e',
  BORDER:'#2d2d5e', ACCENT:'#7c3aed', ACCENT2:'#a855f7',
  DANGER:'#dc2626', GOLD:'#f59e0b', TEXT:'#e5e7eb',
  TEXT_DIM:'#6b7280', TEXT_MUT:'#374151',
  HP_FG:'#22c55e', HP_BG:'#14241a',
  EN_FG:'#dc2626', EN_BG:'#1f1515'
};

const TSIGILS = [
  {id:'void',  sym:'⊕', color:'#7c3aed', fx:'heal',   fxLabel:'HEAL/combo'},
  {id:'blood', sym:'⊗', color:'#dc2626', fx:'bonus',  fxLabel:'+3 dmg'},
  {id:'star',  sym:'⊛', color:'#f59e0b', fx:'double', fxLabel:'x2 on \xd74'},
  {id:'bone',  sym:'◈', color:'#6b7280', fx:'lone',   fxLabel:'\xd72 if alone'},
  {id:'dream', sym:'⊜', color:'#0ea5e9', fx:'stun',   fxLabel:'stun on \xd73+'},
  {id:'rift',  sym:'◆', color:'#22c55e', fx:'draw',   fxLabel:'+1 card'},
];

const ENEMIES = [
  {id:'herald',  name:'Herald of the Void',     hp:40,  atk:6,  voids:1, glyph:'◈', color:'#6d28d9'},
  {id:'watcher', name:'Watcher Between Seconds', hp:65,  atk:9,  voids:1, glyph:'⊗', color:'#9333ea'},
  {id:'choir',   name:'Choir of Unmaking',       hp:95,  atk:12, voids:2, glyph:'⊛', color:'#7e22ce'},
  {id:'sleeper', name:'Sleeper Beneath All',     hp:150, atk:15, voids:2, glyph:'⊜', color:'#4c1d95', boss:true}
];

const FLOORS = [
  {id:1, name:'The Whispering Crypts',  enemies:['herald','watcher']},
  {id:2, name:'The Drowned Cathedral',  enemies:['watcher','choir']},
  {id:3, name:'The Void Between Stars', enemies:['sleeper']}
];

const LOOT_POOL = [
  {id:'extra-hp',  name:'Void Vitality',   glyph:'♥', desc:'+10 max HP, restore 10.',    color:'#22c55e'},
  {id:'heal',      name:'Ritual Mending',  glyph:'⊕', desc:'Restore 15 HP.',             color:'#34d399'},
  {id:'power',     name:'Sigil of Power',  glyph:'⊛', desc:'+1 base damage per piece.',  color:'#f59e0b'},
  {id:'combo-amp', name:'Echo Resonance',  glyph:'◆', desc:'+1 to all combo multipliers.',color:'#a855f7'},
  {id:'ward',      name:'Void Ward',       glyph:'⊜', desc:'Enemy voids one fewer cell.', color:'#0ea5e9'},
];

// ── Triangle grid math ─────────────────────────────────────────────────────
const BOARD_COLS = 13, BOARD_ROWS = 8;

function isUp(r, c) { return (r + c) % 2 === 0; }

function triVerts(BX, BY, r, c, S) {
  const H = S * Math.sqrt(3) / 2;
  const x0 = BX + c * S / 2, y0 = BY + r * H;
  return isUp(r, c)
    ? [[x0+S/2,y0],[x0,y0+H],[x0+S,y0+H]]
    : [[x0,y0],[x0+S,y0],[x0+S/2,y0+H]];
}

function triCenter(BX, BY, r, c, S) {
  const v = triVerts(BX, BY, r, c, S);
  return [(v[0][0]+v[1][0]+v[2][0])/3,(v[0][1]+v[1][1]+v[2][1])/3];
}

function triNeighbors(r, c) {
  return isUp(r,c) ? [
    {nr:r,   nc:c+1, my:[0,2], th:[0,2]},
    {nr:r,   nc:c-1, my:[0,1], th:[1,2]},
    {nr:r+1, nc:c,   my:[1,2], th:[0,1]},
  ] : [
    {nr:r,   nc:c-1, my:[0,2], th:[0,2]},
    {nr:r,   nc:c+1, my:[1,2], th:[0,1]},
    {nr:r-1, nc:c,   my:[0,1], th:[1,2]},
  ];
}

function nearestCell(mx, my, BX, BY, S) {
  const H = S * Math.sqrt(3) / 2;
  const roughR = Math.round((my-BY)/H), roughC = Math.round((mx-BX)/(S/2));
  let best=null, bestD=Infinity;
  for (let dr=-2; dr<=2; dr++) for (let dc=-3; dc<=3; dc++) {
    const r=roughR+dr, c=roughC+dc;
    if (r<0||c<0||r>=BOARD_ROWS||c>=BOARD_COLS) continue;
    const [cx,cy]=triCenter(BX,BY,r,c,S);
    const d=(mx-cx)**2+(my-cy)**2;
    if (d<bestD){bestD=d;best=[r,c];}
  }
  return best;
}

function getPlayableCells(board, voided) {
  const cells = new Set();
  if (board.size === 0) {
    for (let r=0; r<BOARD_ROWS; r++) for (let c=0; c<BOARD_COLS; c++) {
      const k=`${r},${c}`;
      if (!voided.has(k)) cells.add(k);
    }
  } else {
    board.forEach((_,key) => {
      const [r,c]=key.split(',').map(Number);
      for (const {nr,nc} of triNeighbors(r,c)) {
        const nk=`${nr},${nc}`;
        if (!board.has(nk)&&!voided.has(nk)&&nr>=0&&nr<BOARD_ROWS&&nc>=0&&nc<BOARD_COLS)
          cells.add(nk);
      }
    });
  }
  return cells;
}

// ── Piece helpers ─────────────────────────────────────────────────────────
function randomPiece() {
  const sig = TSIGILS[Math.floor(Math.random()*TSIGILS.length)];
  return {sigilId:sig.id, corners:[1+Math.floor(Math.random()*5),1+Math.floor(Math.random()*5),1+Math.floor(Math.random()*5)], rotation:0};
}

function rotatedCorners(piece) {
  const c=piece.corners, rot=piece.rotation%3;
  if (rot===1) return [c[2],c[0],c[1]];
  if (rot===2) return [c[1],c[2],c[0]];
  return [...c];
}

// ── State ──────────────────────────────────────────────────────────────────────
let state;
function initState(handSize) {
  state = {
    screen:'title', floor:1,
    player:{hp:30, maxHp:30, baseDmg:4, comboBonus:0, handSize:handSize||3, voidWard:0},
    combat:null, lootOptions:[],
    msg:null, msgTimer:0, hover:null
  };
}

function makeHand(n) { return Array.from({length:n}, randomPiece); }

function startCombat(def) {
  state.combat = {
    enemy:{...def, curHp:def.hp},
    board:new Map(), voided:new Set(),
    hand:makeHand(state.player.handSize),
    selected:null, hoverCell:null, power:0, stunned:false,
    particles:[], streak:0, flash:null
  };
}

function showMsg(m) { state.msg=m; state.msgTimer=230; }

function bestEdgeSum(board, r, c, corners) {
  let best=Infinity;
  for (const {nr,nc,my,th} of triNeighbors(r,c)) {
    const nb=board.get(`${nr},${nc}`);
    if (!nb) continue;
    const s=corners[my[0]]+nb.corners[th[0]]+corners[my[1]]+nb.corners[th[1]];
    if (s<best) best=s;
  }
  return best;
}

function hasNeighbor(board, r, c) {
  return triNeighbors(r,c).some(({nr,nc})=>board.has(`${nr},${nc}`));
}

function multiplier(edgeSum, comboBonus) {
  if (edgeSum===Infinity) return 1+comboBonus;
  if (edgeSum<=2) return 4+comboBonus;
  if (edgeSum<=5) return 3+comboBonus;
  if (edgeSum<=8) return 2+comboBonus;
  return 1+comboBonus;
}

function applyEffect(sigilId, multi, r, c) {
  const {combat, player} = state;
  const sigil = TSIGILS.find(s=>s.id===sigilId);
  switch(sigil.fx) {
    case 'heal':
      if (multi>=2) { const h=multi-1; player.hp=Math.min(player.maxHp,player.hp+h); return `+${h}HP`; }
      break;
    case 'bonus':  combat.power+=3; return '+3!';
    case 'double': if (multi>=4) { combat.power+=player.baseDmg*multi; return 'DOUBLE HIT!'; } break;
    case 'lone':   if (!hasNeighbor(combat.board, r, c)) { combat.power+=player.baseDmg; return 'LONE x2!'; } break;
    case 'stun':   if (multi>=3) { combat.stunned=true; return 'STUNNED!'; } break;
    case 'draw':   if (combat.hand.length<7) { combat.hand.push(randomPiece()); return '+1 card!'; } break;
  }
  return null;
}

function placePiece(hIdx, r, c) {
  const {combat,player}=state;
  const piece=combat.hand[hIdx]; if(!piece) return;
  const key=`${r},${c}`;
  if (combat.board.has(key)||combat.voided.has(key)){showMsg('Occupied!');return;}
  const corners=rotatedCorners(piece);
  const sigil=TSIGILS.find(s=>s.id===piece.sigilId);
  const isolated=!hasNeighbor(combat.board,r,c);
  const es=bestEdgeSum(combat.board,r,c,corners);
  const multi=multiplier(es,player.comboBonus);
  const effectiveMult = (sigil.fx==='lone'&&isolated) ? Math.max(multi,2) : multi;
  const dmg=player.baseDmg*effectiveMult;
  combat.board.set(key,{corners,sigilId:piece.sigilId,color:sigil.color});
  combat.power+=dmg;
  combat.hand.splice(hIdx,1);
  combat.selected=null; combat.hoverCell=null;
  // Streak tracking
  if (effectiveMult>=2) { combat.streak++; } else { combat.streak=0; }
  // Flash overlay on high combo
  if (effectiveMult>=4) { combat.flash={r,c,timer:40,color:C.GOLD}; }
  else if (effectiveMult>=3) { combat.flash={r,c,timer:25,color:C.ACCENT2}; }
  // Floating damage particle stored in grid coords
  const ptColor=effectiveMult>=4?C.GOLD:effectiveMult>=3?C.ACCENT2:effectiveMult>=2?C.TEXT:C.TEXT_DIM;
  combat.particles.push({r,c,yOff:0,life:80,maxLife:80,text:`+${dmg}`,color:ptColor,big:effectiveMult>=3});
  const fxMsg=applyEffect(piece.sigilId,effectiveMult,r,c);
  const tier=effectiveMult>=4?'RESONANCE! ':effectiveMult>=3?'ECHO! ':effectiveMult>=2?'LINK! ':'';
  const streakStr=combat.streak>=3?` (CHAIN x${combat.streak})`:combat.streak>=2?' (chain!):'';
  showMsg(`${tier}x${effectiveMult}  +${dmg}dmg${fxMsg?' · '+fxMsg:''}${streakStr}`);
}

function addVoidCells(combat) {
  const voids=Math.max(0,(combat.enemy.voids||1)-state.player.voidWard);
  if (voids<=0) return;
  const candidates=[];
  combat.board.forEach((_,key)=>{
    const [r,c]=key.split(',').map(Number);
    for (const {nr,nc} of triNeighbors(r,c)) {
      const nk=`${nr},${nc}`;
      if (!combat.board.has(nk)&&!combat.voided.has(nk)&&nr>=0&&nr<BOARD_ROWS&&nc>=0&&nc<BOARD_COLS)
        candidates.push(nk);
    }
  });
  for (let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  candidates.slice(0,voids).forEach(k=>combat.voided.add(k));
}

function endTurn() {
  const {combat,player}=state;
  if (combat.power>0) {
    combat.enemy.curHp=Math.max(0,combat.enemy.curHp-combat.power);
    if (combat.enemy.curHp<=0){
      showMsg(`${combat.enemy.name} annihilated! (${combat.power}dmg)`);
      setTimeout(()=>transitionToLoot(),700);
      return;
    }
  }
  let msg;
  if (combat.stunned) {
    msg=`Dealt ${combat.power}dmg. Enemy STUNNED — skips attack!`;
  } else {
    player.hp=Math.max(0,player.hp-combat.enemy.atk);
    if (player.hp<=0){state.screen='gameover';return;}
    addVoidCells(combat);
    msg=`Dealt ${combat.power}dmg. Enemy strikes ${combat.enemy.atk}!`;
  }
  // Board saturation: if corruption has blocked all placements, purge it
  if (combat.board.size>0) {
    const playable=getPlayableCells(combat.board,combat.voided);
    if (playable.size===0) {
      combat.voided.clear();
      msg+=` Void overflow — purged!`;
    }
  }
  showMsg(msg);
  combat.hand=makeHand(player.handSize);
  combat.power=0; combat.stunned=false; combat.selected=null; combat.hoverCell=null;
  combat.streak=0; combat.particles=[];
}

function transitionToLoot() {
  state.lootOptions=[...LOOT_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  state.screen='loot';
}

function pickLoot(i) {
  const item=state.lootOptions[i]; if(!item) return;
  const p=state.player;
  if      (item.id==='extra-hp')  {p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+10);}
  else if (item.id==='heal')      {p.hp=Math.min(p.maxHp,p.hp+15);}
  else if (item.id==='power')     {p.baseDmg+=1;}
  else if (item.id==='combo-amp') {p.comboBonus+=1;}
  else if (item.id==='ward')      {p.voidWard+=1;}
  const next=FLOORS.find(f=>f.id===state.floor+1);
  if (next){state.floor++;startCombat(ENEMIES.find(e=>e.id===next.enemies[Math.floor(Math.random()*next.enemies.length)]));state.screen='combat';}
  else state.screen='victory';
}

// ── p5 sketch ──────────────────────────────────────────────────────────────────
new p5(function(p) {

  let GW,GH,sc,portrait,ox,oy,VW,VH;
  let TRI_S, BX, BY;

  function vw(){return window.visualViewport?window.visualViewport.width:window.innerWidth;}
  function vh(){return window.visualViewport?window.visualViewport.height:window.innerHeight;}

  function relayout(){
    VW=vw();VH=vh();portrait=VH>VW;
    GW=portrait?390:800;GH=portrait?750:600;
    sc=Math.min(VW/GW,VH/GH);ox=(VW-GW*sc)/2;oy=(VH-GH*sc)/2;
    if(portrait){
      TRI_S=44;
      const bw=BOARD_COLS*TRI_S/2+TRI_S;
      BX=Math.floor((GW-bw)/2); BY=172;
    }else{
      TRI_S=50;
      const H=TRI_S*Math.sqrt(3)/2;
      BX=8; BY=Math.floor((GH-BOARD_ROWS*H)/2);
    }
  }

  function toGX(x){return(x-ox)/sc;} function toGY(y){return(y-oy)/sc;}

  // ── Drawing helpers ─────────────────────────────────────────────────────
  function dr(x,y,w,h,col,r=0){p.fill(col);p.noStroke();r?p.rect(x,y,w,h,r):p.rect(x,y,w,h);}
  function dro(x,y,w,h,col,sw,r=0){p.noFill();p.stroke(col);p.strokeWeight(sw);r?p.rect(x,y,w,h,r):p.rect(x,y,w,h);p.noStroke();}
  function tx(s,x,y,col,sz,al='LEFT'){p.fill(col);p.noStroke();p.textSize(sz);p.textAlign(p[al]);p.text(s,x,y);}
  function ir(mx,my,x,y,w,h){return mx>=x&&mx<=x+w&&my>=y&&my<=y+h;}
  function bar(x,y,w,h,cur,max,fg,bg,lbl){
    dr(x,y,w,h,bg);dr(x,y,Math.round(w*Math.max(0,cur)/Math.max(1,max)),h,fg);
    dro(x,y,w,h,C.BORDER,1);tx(lbl+': '+Math.max(0,cur)+'/'+max,x+4,y+h-4,C.TEXT,9);
  }

  function drawTri(verts,corners,sigilId,alpha){
    const sigil=TSIGILS.find(s=>s.id===sigilId);
    const [v0,v1,v2]=verts;
    const cx=(v0[0]+v1[0]+v2[0])/3, cy=(v0[1]+v1[1]+v2[1])/3;
    const col=p.color(sigil.color); col.setAlpha(alpha*0.75);
    p.fill(col); const sc2=p.color(sigil.color); sc2.setAlpha(alpha);
    p.stroke(sc2); p.strokeWeight(1.5);
    p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]); p.noStroke();
    const br=TRI_S*0.14;
    [[v0,0],[v1,1],[v2,2]].forEach(([v,i])=>{
      const bx=v[0]*0.62+cx*0.38, by=v[1]*0.62+cy*0.38;
      const bg=p.color(C.DEEP); bg.setAlpha(alpha*0.9);
      p.fill(bg); const sc3=p.color(sigil.color); sc3.setAlpha(alpha);
      p.stroke(sc3); p.strokeWeight(1); p.circle(bx,by,br*2.2); p.noStroke();
      const tc=p.color(255,255,255); tc.setAlpha(alpha);
      p.fill(tc); p.textSize(br); p.textAlign(p.CENTER,p.CENTER); p.text(corners[i],bx,by);
    });
    const symC=p.color(255,255,255); symC.setAlpha(alpha);
    p.fill(symC); p.textSize(TRI_S*0.24); p.textAlign(p.CENTER,p.CENTER); p.text(sigil.sym,cx,cy+1);
  }

  function drawMiniTri(sigilId,corners,rotation,cx,cy,size){
    const piece={sigilId,corners,rotation};
    const rc=rotatedCorners(piece);
    const sigil=TSIGILS.find(s=>s.id===sigilId);
    const h=size*Math.sqrt(3)/2;
    const verts=[[cx,cy-h*0.6],[cx-size/2,cy+h*0.4],[cx+size/2,cy+h*0.4]];
    p.fill(sigil.color+'cc'); p.stroke(sigil.color); p.strokeWeight(1.2);
    p.triangle(verts[0][0],verts[0][1],verts[1][0],verts[1][1],verts[2][0],verts[2][1]); p.noStroke();
    const br=size*0.13;
    verts.forEach(([vx,vy],i)=>{
      const bx=vx*0.65+cx*0.35, by=vy*0.65+cy*0.35;
      p.fill(C.DEEP); p.stroke(sigil.color); p.strokeWeight(0.8); p.circle(bx,by,br*2.2); p.noStroke();
      p.fill(C.TEXT); p.textSize(br); p.textAlign(p.CENTER,p.CENTER); p.text(rc[i],bx,by);
    });
    p.fill(C.TEXT); p.textSize(size*0.22); p.textAlign(p.CENTER,p.CENTER); p.text(sigil.sym,cx,cy+1);
  }

  function boardBottom(){return BY+BOARD_ROWS*TRI_S*Math.sqrt(3)/2;}

  function drawHints(board,voided){
    const shown=new Set();
    board.forEach((_,key)=>{
      const [r,c]=key.split(',').map(Number);
      for (const {nr,nc} of triNeighbors(r,c)){
        const nk=`${nr},${nc}`;
        if(board.has(nk)||voided.has(nk)||shown.has(nk)||nr<0||nc<0||nr>=BOARD_ROWS||nc>=BOARD_COLS) continue;
        const [v0,v1,v2]=triVerts(BX,BY,nr,nc,TRI_S);
        p.noFill(); p.stroke(C.ACCENT+'55'); p.strokeWeight(1);
        p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]); p.noStroke();
        shown.add(nk);
      }
    });
    if(board.size===0){
      const cr=Math.floor(BOARD_ROWS/2), cc=Math.floor(BOARD_COLS/2);
      for(let dr=-1;dr<=1;dr++) for(let dc=-2;dc<=2;dc++){
        const r=cr+dr, c=cc+dc;
        if(r<0||c<0||r>=BOARD_ROWS||c>=BOARD_COLS) continue;
        const [v0,v1,v2]=triVerts(BX,BY,r,c,TRI_S);
        p.noFill(); p.stroke(C.ACCENT+'33'); p.strokeWeight(0.8);
        p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]); p.noStroke();
      }
    }
  }

  function drawBoard(combat){
    const {board,voided,hand,selected,hoverCell,particles,flash}=combat;
    const H=TRI_S*Math.sqrt(3)/2;
    const boardW=BOARD_COLS*TRI_S/2+TRI_S, boardH=BOARD_ROWS*H;
    dr(BX-4,BY-4,boardW+8,boardH+8,C.DEEP,6);
    dro(BX-4,BY-4,boardW+8,boardH+8,C.BORDER,1,6);

    if (selected!==null) drawHints(board,voided);

    // Placed pieces
    board.forEach((cell,key)=>{
      const [r,c]=key.split(',').map(Number);
      drawTri(triVerts(BX,BY,r,c,TRI_S),cell.corners,cell.sigilId,255);
    });

    // Flash overlay on high-combo placements
    if (flash&&flash.timer>0) {
      const {r,c,color}=flash;
      const [v0,v1,v2]=triVerts(BX,BY,r,c,TRI_S);
      const a=(flash.timer/40)*170;
      const fc=p.color(color); fc.setAlpha(a);
      p.fill(fc); p.noStroke();
      p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]);
      flash.timer--;
    }

    // Voided cells (enemy corruption)
    voided.forEach(key=>{
      const [r,c]=key.split(',').map(Number);
      const [v0,v1,v2]=triVerts(BX,BY,r,c,TRI_S);
      const cx=(v0[0]+v1[0]+v2[0])/3, cy=(v0[1]+v1[1]+v2[1])/3;
      p.fill(C.DANGER+'22'); p.stroke(C.DANGER+'77'); p.strokeWeight(1);
      p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]); p.noStroke();
      p.stroke(C.DANGER+'aa'); p.strokeWeight(1.5);
      const s=TRI_S*0.15;
      p.line(cx-s,cy-s,cx+s,cy+s); p.line(cx+s,cy-s,cx-s,cy+s); p.noStroke();
    });

    // Ghost preview
    if(selected!==null&&hoverCell){
      const [r,c]=hoverCell;
      const key=`${r},${c}`;
      if(!board.has(key)&&!voided.has(key)){
        const piece=hand[selected];
        const corners=rotatedCorners(piece);
        const verts=triVerts(BX,BY,r,c,TRI_S);
        drawTri(verts,corners,piece.sigilId,120);
        const es=bestEdgeSum(board,r,c,corners);
        const multi=multiplier(es,state.player.comboBonus);
        if(multi>1){
          const [gcx,gcy]=triCenter(BX,BY,r,c,TRI_S);
          const col=multi>=4?C.GOLD:multi>=3?C.ACCENT2:C.TEXT;
          const pulse=0.7+0.3*Math.sin(p.frameCount*0.18);
          p.textSize(11*pulse); p.fill(col); p.noStroke(); p.textAlign(p.CENTER,p.CENTER);
          p.text('x'+multi,gcx,gcy-H*0.55);
        }
      }
    }

    // Floating damage particles (grid-coord anchored)
    for (let i=particles.length-1;i>=0;i--) {
      const pt=particles[i];
      pt.yOff-=1.2; pt.life--;
      if (pt.life<=0) { particles.splice(i,1); continue; }
      const [pcx,pcy]=triCenter(BX,BY,pt.r,pt.c,TRI_S);
      const a=(pt.life/pt.maxLife)*255;
      const col=p.color(pt.color); col.setAlpha(a);
      p.fill(col); p.noStroke();
      p.textSize(pt.big?14:10); p.textAlign(p.CENTER,p.CENTER);
      p.text(pt.text,pcx,pcy+pt.yOff);
    }
  }

  // ── Layout helpers ─────────────────────────────────────────────────────────
  function handLayout(){
    if(portrait){
      const hY=boardBottom()+12;
      const n=state.combat?Math.max(state.combat.hand.length,1):state.player.handSize;
      const cardW=Math.min(88,Math.floor((GW-16)/n)-6), gap=6;
      return{hY,cardW,cardH:80,gap,sx:(GW-(n*(cardW+gap)-gap))/2};
    } else {
      const boardW=BOARD_COLS*TRI_S/2+TRI_S;
      const RX=BX+boardW+14, RW=GW-RX-10;
      return{hY:290,cardW:Math.floor(RW/3)-4,cardH:90,gap:4,RX,RW};
    }
  }
  function btnRect(){
    if(portrait){const{hY,cardH}=handLayout();return{x:GW/2-85,y:hY+cardH+10,w:170,h:38};}
    const{hY,cardH,RX,RW}=handLayout();return{x:RX,y:hY+cardH+10,w:RW,h:38};
  }

  function drawHandCards(hand,selected){
    const hl=handLayout();
    const{hY,cardW,cardH,gap}=hl;
    const sx=portrait?hl.sx:hl.RX;
    hand.forEach((piece,i)=>{
      const cx=sx+i*(cardW+gap), sel=selected===i;
      const sigil=TSIGILS.find(s=>s.id===piece.sigilId);
      dr(cx,hY,cardW,cardH,sel?C.PANEL_ALT:C.PANEL,8);
      dro(cx,hY,cardW,cardH,sel?sigil.color:C.BORDER,sel?2:1,8);
      drawMiniTri(piece.sigilId,piece.corners,piece.rotation,cx+cardW/2,hY+cardH*0.40,cardW*0.52);
      tx(sigil.fxLabel,cx+cardW/2,hY+cardH-18,sel?sigil.color:C.TEXT_MUT,7,'CENTER');
      tx(sel?'rotate':'tap',cx+cardW/2,hY+cardH-8,C.TEXT_MUT,7,'CENTER');
    });
    if(!hand.length) tx('No sigils — end turn.',portrait?GW/2:hl.RX+hl.RW/2,hY+30,C.TEXT_DIM,10,'CENTER');
  }

  // ── Screens ──────────────────────────────────────────────────────────────────
  function drawTitle(){
    const cx=GW/2, cy=GH/2;
    TSIGILS.forEach((sig,i)=>{
      const a=i/TSIGILS.length*Math.PI*2+p.frameCount*0.005, r=90;
      const tx2=cx+Math.cos(a)*r, ty2=cy+Math.sin(a)*r;
      const col=p.color(sig.color); col.setAlpha(60); p.fill(col); p.noStroke();
      p.triangle(tx2,ty2-20,tx2-17,ty2+10,tx2+17,ty2+10);
    });
    tx('SIGIL RITES',cx,cy-42,C.ACCENT2,portrait?28:36,'CENTER');
    tx('TRIANGLES  CORNER MATCHING  COMBO MULTIPLIERS',cx,cy-22,C.TEXT_DIM,portrait?7:9,'CENTER');
    tx('HOW MANY SIGILS PER TURN?',cx,cy+12,C.TEXT,11,'CENTER');
    const modes=[['1','hardest','1'],['3','recommended','3'],['5','easiest','5']];
    const bw=86,bh=46,gap=10,totalW=3*(bw+gap)-gap,bsx=cx-totalW/2;
    modes.forEach(([lbl,sub,n],i)=>{
      const bx=bsx+i*(bw+gap),by=cy+26;
      const hov=state.hover===('mode'+n);
      dr(bx,by,bw,bh,hov?C.ACCENT:C.PANEL,8);
      dro(bx,by,bw,bh,hov?C.ACCENT2:C.BORDER,hov?2:1,8);
      tx(lbl,bx+bw/2,by+22,C.TEXT,18,'CENTER');
      tx(sub,bx+bw/2,by+38,C.TEXT_DIM,8,'CENTER');
    });
    tx('SIGIL EFFECTS:',cx,cy+88,C.TEXT_DIM,9,'CENTER');
    TSIGILS.forEach((sig,i)=>{
      const row=Math.floor(i/3), col2=i%3;
      const lx=cx-130+col2*90, ly=cy+104+row*16;
      tx(sig.sym+' '+sig.id,lx,ly,sig.color,8);
      tx(sig.fxLabel,lx+44,ly,C.TEXT_MUT,8);
    });
  }

  function drawCombatPort(){
    const{combat,player,floor}=state;
    const{enemy,hand,selected,power,stunned,streak}=combat;
    const fd=FLOORS.find(f=>f.id===floor),W=GW-20;
    dr(10,8,W,62,C.DEEP,8);
    tx('FLOOR '+floor+' — '+(fd?fd.name:''),15,22,C.TEXT_DIM,9);
    bar(15,26,W/2-10,16,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    tx('ATK '+player.baseDmg+(player.comboBonus>0?'+'+player.comboBonus+' cmb':''),15,56,C.TEXT_DIM,8);
    tx(enemy.name,GW/2+5,22,C.TEXT,9);
    bar(GW/2+5,26,W/2-10,16,enemy.curHp,enemy.hp,C.EN_FG,C.EN_BG,'ENEMY');
    tx((stunned?'STUNNED':'Atk '+enemy.atk),GW/2+5,56,stunned?C.GOLD:C.DANGER,8);
    tx('PWR +'+power+(streak>=2?' CHAIN x'+streak:''),GW-12,56,power>0?C.GOLD:C.TEXT_DIM,8,'RIGHT');
    dr(10,76,W,88,C.DEEP,8);
    tx(enemy.glyph,GW/2,147,enemy.color,50,'CENTER');
    if(enemy.boss) tx('BOSS',GW-18,92,C.DANGER,9,'RIGHT');
    drawBoard(combat);
    drawHandCards(hand,selected);
    const btn=btnRect();
    dr(btn.x,btn.y,btn.w,btn.h,state.hover==='endturn'?'#b91c1c':C.DANGER,8);
    tx('END TURN',btn.x+btn.w/2,btn.y+btn.h*0.66,C.TEXT,14,'CENTER');
    if(selected!==null) tx('tap board to place  tap card again to rotate',GW/2,btn.y+btn.h+14,C.ACCENT,8,'CENTER');
    if(state.msg&&state.msgTimer>0){
      const big=state.msg.includes('RESONANCE')||state.msg.includes('ECHO')||state.msg.includes('DOUBLE');
      tx(state.msg,GW/2,btn.y+btn.h+28,big?C.GOLD:C.TEXT,big?11:10,'CENTER');
    }
  }

  function drawCombatLand(){
    const{combat,player,floor}=state;
    const{enemy,hand,selected,power,stunned,streak}=combat;
    const fd=FLOORS.find(f=>f.id===floor);
    const hl=handLayout();const{RX,RW}=hl;
    tx('SIGIL BOARD',BX,BY-12,C.TEXT_DIM,9);
    drawBoard(combat);
    dr(RX,10,RW,68,C.DEEP,8);
    tx('FLOOR '+floor,RX+8,26,C.TEXT_DIM,10);tx(fd?fd.name:'',RX+8,40,C.TEXT,11);
    bar(RX+8,44,RW-16,18,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    tx('ATK '+player.baseDmg+(player.comboBonus>0?'+'+player.comboBonus:'')+(state.player.voidWard>0?' WRD'+state.player.voidWard:''),RX+RW-8,26,C.TEXT_DIM,9,'RIGHT');
    dr(RX,86,RW,125,C.DEEP,8);
    tx(enemy.name,RX+8,102,C.TEXT,11);
    if(enemy.boss) tx('BOSS',RX+RW-10,102,C.DANGER,10,'RIGHT');
    tx(enemy.glyph,RX+RW/2,170,enemy.color,50,'CENTER');
    bar(RX+8,216,RW-16,16,enemy.curHp,enemy.hp,C.EN_FG,C.EN_BG,'ENEMY HP');
    tx((stunned?'STUNNED — skips!':'Attacks '+enemy.atk+'/turn'),RX+8,246,stunned?C.GOLD:C.DANGER,10);
    dr(RX,252,RW,28,C.PANEL,6);
    tx('PENDING: +'+power+(streak>=2?'  CHAIN x'+streak:''),RX+RW/2,270,power>0?C.GOLD:C.TEXT_DIM,12,'CENTER');
    drawHandCards(hand,selected);
    const btn=btnRect();
    dr(btn.x,btn.y,btn.w,btn.h,state.hover==='endturn'?'#b91c1c':C.DANGER,8);
    tx('END TURN',btn.x+btn.w/2,btn.y+btn.h*0.66,C.TEXT,15,'CENTER');
    if(selected!==null) tx('tap board to place  tap card to rotate',btn.x+btn.w/2,btn.y+btn.h+14,C.ACCENT,8,'CENTER');
    if(state.msg&&state.msgTimer>0){
      const big=state.msg.includes('RESONANCE')||state.msg.includes('ECHO')||state.msg.includes('DOUBLE');
      tx(state.msg,btn.x+btn.w/2,btn.y+btn.h+28,big?C.GOLD:C.TEXT,big?11:10,'CENTER');
    }
  }

  function drawLoot(){
    const opts=state.lootOptions;
    tx('THE VOID OFFERS TRIBUTE',GW/2,40,C.ACCENT2,portrait?16:20,'CENTER');
    tx('Choose one boon:',GW/2,58,C.TEXT_DIM,11,'CENTER');
    if(portrait){
      opts.forEach((item,i)=>{
        const y=70+i*90,W=GW-20,hov=state.hover===('loot'+i);
        dr(10,y,W,82,hov?C.PANEL_ALT:C.PANEL,10);
        dro(10,y,W,82,hov?C.ACCENT:C.BORDER,hov?2:1,10);
        tx(item.glyph,32,y+48,item.color,22,'CENTER');
        tx(item.name,52,y+22,C.TEXT,13);
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.LEFT);
        p.text(item.desc,52,y+36,W-62,38);
        tx('TAP TO CLAIM',GW-15,y+74,hov?C.ACCENT:C.TEXT_DIM,9,'RIGHT');
      });
    }else{
      const cw=190,gap=18,total=opts.length*(cw+gap)-gap,sx=GW/2-total/2;
      opts.forEach((item,i)=>{
        const cx=sx+i*(cw+gap),cy=78,hov=state.hover===('loot'+i);
        dr(cx,cy,cw,220,hov?C.PANEL_ALT:C.PANEL,12);
        dro(cx,cy,cw,220,hov?C.ACCENT:C.BORDER,hov?2:1,12);
        tx(item.glyph,cx+cw/2,cy+68,item.color,32,'CENTER');
        tx(item.name,cx+cw/2,cy+94,C.TEXT,13,'CENTER');
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.CENTER);
        p.text(item.desc,cx+12,cy+112,cw-24,52);
        dr(cx+20,cy+175,cw-40,32,hov?C.ACCENT:C.ACCENT,6);
        tx('CLAIM',cx+cw/2,cy+196,C.TEXT,12,'CENTER');
      });
    }
  }

  function drawGameOver(){
    tx('⊗',GW/2,GH/2-58,C.DANGER,52,'CENTER');
    tx('YOU HAVE BEEN UNMADE',GW/2,GH/2-8,C.DANGER,portrait?18:26,'CENTER');
    tx('The sigils could not hold.',GW/2,GH/2+16,C.TEXT_DIM,11,'CENTER');
    dr(GW/2-80,GH/2+50,160,40,C.ACCENT,6);tx('TRY AGAIN',GW/2,GH/2+76,C.TEXT,13,'CENTER');
  }
  function drawVictory(){
    tx('⊕',GW/2,GH/2-58,C.GOLD,52,'CENTER');
    tx('THE RITUAL IS COMPLETE',GW/2,GH/2-8,C.GOLD,portrait?18:26,'CENTER');
    tx('The Sleeper stirs. The sigils hold.',GW/2,GH/2+16,C.TEXT_DIM,11,'CENTER');
    dr(GW/2-80,GH/2+50,160,40,C.ACCENT,6);tx('PLAY AGAIN',GW/2,GH/2+76,C.TEXT,13,'CENTER');
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  function updateHover(mx,my){
    state.hover=null;
    if(state.screen==='title'){
      [1,3,5].forEach((n,i)=>{
        const bw=86,bh=46,gap=10,totalW=3*(bw+gap)-gap,bsx=GW/2-totalW/2;
        if(ir(mx,my,bsx+i*(bw+gap),GH/2+26,bw,bh)) state.hover='mode'+n;
      });
    }
    if(state.screen==='combat'){
      const btn=btnRect();
      if(ir(mx,my,btn.x,btn.y,btn.w,btn.h)) state.hover='endturn';
      if(state.combat) state.combat.hoverCell=nearestCell(mx,my,BX,BY,TRI_S);
    }
    if(state.screen==='loot'){
      if(portrait){state.lootOptions.forEach((_,i)=>{if(ir(mx,my,10,70+i*90,GW-20,82)) state.hover='loot'+i;}); }
      else{const cw=190,gap=18,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) state.hover='loot'+i;});}
    }
  }

  function click(rawX,rawY){
    const mx=toGX(rawX),my=toGY(rawY);
    updateHover(mx,my);
    if(state.screen==='title'){
      [1,3,5].forEach((n,i)=>{
        const bw=86,bh=46,gap=10,totalW=3*(bw+gap)-gap,bsx=GW/2-totalW/2;
        if(ir(mx,my,bsx+i*(bw+gap),GH/2+26,bw,bh)){
          initState(n);
          const ff=FLOORS[0];
          startCombat(ENEMIES.find(e=>e.id===ff.enemies[Math.floor(Math.random()*ff.enemies.length)]));
          state.screen='combat';
        }
      }); return;
    }
    if(state.screen==='gameover'||state.screen==='victory'){
      if(ir(mx,my,GW/2-80,GH/2+50,160,40)) initState(); return;
    }
    if(state.screen==='loot'){
      if(portrait){state.lootOptions.forEach((_,i)=>{if(ir(mx,my,10,70+i*90,GW-20,82)) pickLoot(i);});}
      else{const cw=190,gap=18,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) pickLoot(i);});}
      return;
    }
    if(state.screen==='combat'){
      const{combat}=state;
      const btn=btnRect();
      if(ir(mx,my,btn.x,btn.y,btn.w,btn.h)){endTurn();return;}
      const hl=handLayout();const{hY,cardW,cardH,gap}=hl;
      const n=combat.hand.length, sx=portrait?hl.sx:hl.RX;
      for(let i=0;i<n;i++){
        if(ir(mx,my,sx+i*(cardW+gap),hY,cardW,cardH)){
          if(combat.selected===i){combat.hand[i].rotation=(combat.hand[i].rotation+1)%3;combat.hoverCell=null;}
          else combat.selected=i;
          return;
        }
      }
      const cell=nearestCell(mx,my,BX,BY,TRI_S);
      if(cell&&combat.selected!==null){placePiece(combat.selected,cell[0],cell[1]);return;}
      if(!cell) combat.selected=null;
    }
  }

  p.setup=function(){
    relayout();p.createCanvas(VW,VH);p.textFont('Courier New');initState();
    if(window.visualViewport) window.visualViewport.addEventListener('resize',()=>{relayout();p.resizeCanvas(VW,VH);});
  };
  p.windowResized=function(){relayout();p.resizeCanvas(VW,VH);};
  p.draw=function(){
    if(state.msgTimer>0) state.msgTimer--;
    p.background(C.VOID);p.push();p.translate(ox,oy);p.scale(sc);
    switch(state.screen){
      case 'title':    drawTitle();    break;
      case 'combat':   portrait?drawCombatPort():drawCombatLand(); break;
      case 'loot':     drawLoot();     break;
      case 'gameover': drawGameOver(); break;
      case 'victory':  drawVictory();  break;
    }
    p.pop();
  };
  p.mouseMoved=p.mouseDragged=function(){updateHover(toGX(p.mouseX),toGY(p.mouseY));};
  p.mouseClicked=function(){click(p.mouseX,p.mouseY);};
  p.touchStarted=function(){if(p.touches.length>0)click(p.touches[0].x,p.touches[0].y);return false;};
});

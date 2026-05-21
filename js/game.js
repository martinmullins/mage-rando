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
  {id:'void',  sym:'⊕', color:'#7c3aed'},
  {id:'blood', sym:'⊗', color:'#dc2626'},
  {id:'star',  sym:'⊛', color:'#f59e0b'},
  {id:'bone',  sym:'◈', color:'#6b7280'},
  {id:'dream', sym:'⊜', color:'#0ea5e9'},
  {id:'rift',  sym:'◆', color:'#22c55e'},
];

const ENEMIES = [
  {id:'herald',  name:'Herald of the Void',     hp:40,  atk:6,  glyph:'◈', color:'#6d28d9'},
  {id:'watcher', name:'Watcher Between Seconds', hp:65,  atk:9,  glyph:'⊗', color:'#9333ea'},
  {id:'choir',   name:'Choir of Unmaking',       hp:95,  atk:12, glyph:'⊛', color:'#7e22ce'},
  {id:'sleeper', name:'Sleeper Beneath All',     hp:150, atk:15, glyph:'⊜', color:'#4c1d95', boss:true}
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
];

// ── Triangle grid math ─────────────────────────────────────────────────────
const BOARD_COLS = 13, BOARD_ROWS = 8;

function isUp(r, c) { return (r + c) % 2 === 0; }

function triVerts(BX, BY, r, c, S) {
  const H = S * Math.sqrt(3) / 2;
  const x0 = BX + c * S / 2, y0 = BY + r * H;
  return isUp(r, c)
    ? [[x0+S/2, y0], [x0, y0+H], [x0+S, y0+H]]
    : [[x0, y0], [x0+S, y0], [x0+S/2, y0+H]];
}

function triCenter(BX, BY, r, c, S) {
  const v = triVerts(BX, BY, r, c, S);
  return [(v[0][0]+v[1][0]+v[2][0])/3, (v[0][1]+v[1][1]+v[2][1])/3];
}

// Which of MY corners [i,j] touch which of THEIR corners [i,j]
function triNeighbors(r, c) {
  return isUp(r, c) ? [
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
  const roughR = Math.round((my - BY) / H);
  const roughC = Math.round((mx - BX) / (S / 2));
  let best = null, bestD = Infinity;
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      const r = roughR+dr, c = roughC+dc;
      if (r<0||c<0||r>=BOARD_ROWS||c>=BOARD_COLS) continue;
      const [cx,cy] = triCenter(BX, BY, r, c, S);
      const d = (mx-cx)**2 + (my-cy)**2;
      if (d < bestD) { bestD=d; best=[r,c]; }
    }
  }
  return best;
}

// ── Piece helpers ─────────────────────────────────────────────────────────────
function randomPiece() {
  const sig = TSIGILS[Math.floor(Math.random() * TSIGILS.length)];
  return {
    sigilId: sig.id,
    corners: [1+Math.floor(Math.random()*5), 1+Math.floor(Math.random()*5), 1+Math.floor(Math.random()*5)],
    rotation: 0
  };
}

function rotatedCorners(piece) {
  const c = piece.corners, rot = piece.rotation % 3;
  if (rot === 1) return [c[2], c[0], c[1]];
  if (rot === 2) return [c[1], c[2], c[0]];
  return [...c];
}

// ── State ──────────────────────────────────────────────────────────────────────
let state;
function initState(handSize) {
  state = {
    screen: 'title', floor: 1,
    player: {hp:30, maxHp:30, baseDmg:4, comboBonus:0, handSize: handSize||3},
    combat: null, lootOptions: [],
    msg: null, msgTimer: 0, hover: null
  };
}

function makeHand(n) { return Array.from({length:n}, randomPiece); }

function startCombat(def) {
  state.combat = {
    enemy: {...def, curHp:def.hp},
    board: new Map(),
    hand: makeHand(state.player.handSize),
    selected: null, hoverCell: null, power: 0
  };
}

function showMsg(m) { state.msg=m; state.msgTimer=220; }

function bestEdgeSum(board, r, c, corners) {
  let best = Infinity;
  for (const {nr,nc,my,th} of triNeighbors(r,c)) {
    const nb = board.get(`${nr},${nc}`);
    if (!nb) continue;
    const s = corners[my[0]]+nb.corners[th[0]] + corners[my[1]]+nb.corners[th[1]];
    if (s < best) best = s;
  }
  return best;
}

function multiplier(edgeSum, comboBonus) {
  if (edgeSum === Infinity) return 1 + comboBonus;
  if (edgeSum <= 2) return 4 + comboBonus;   // both corners 1+1
  if (edgeSum <= 5) return 3 + comboBonus;
  if (edgeSum <= 8) return 2 + comboBonus;
  return 1 + comboBonus;
}

function placePiece(hIdx, r, c) {
  const {combat, player} = state;
  const piece = combat.hand[hIdx]; if (!piece) return;
  const key = `${r},${c}`;
  if (combat.board.has(key)) { showMsg('Occupied!'); return; }
  const corners = rotatedCorners(piece);
  const sigil = TSIGILS.find(s => s.id === piece.sigilId);
  const es = bestEdgeSum(combat.board, r, c, corners);
  const multi = multiplier(es, player.comboBonus);
  const dmg = player.baseDmg * multi;
  combat.board.set(key, {corners, sigilId:piece.sigilId, color:sigil.color});
  combat.power += dmg;
  combat.hand.splice(hIdx, 1);
  combat.selected = null; combat.hoverCell = null;
  const label = multi>=4?'RESONANCE! ':multi>=3?'ECHO! ':multi>=2?'LINK! ':'';
  showMsg(`${label}×${multi}  +${dmg} dmg`);
}

function endTurn() {
  const {combat, player} = state;
  if (combat.power > 0) {
    combat.enemy.curHp = Math.max(0, combat.enemy.curHp - combat.power);
    if (combat.enemy.curHp <= 0) {
      showMsg(`${combat.enemy.name} annihilated! (${combat.power} dmg)`);
      setTimeout(() => transitionToLoot(), 700);
      return;
    }
  }
  player.hp = Math.max(0, player.hp - combat.enemy.atk);
  if (player.hp <= 0) { state.screen='gameover'; return; }
  showMsg(`Dealt ${combat.power} dmg. Enemy strikes for ${combat.enemy.atk}!`);
  combat.hand = makeHand(player.handSize);
  combat.power = 0; combat.selected = null; combat.hoverCell = null;
}

function transitionToLoot() {
  state.lootOptions = [...LOOT_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  state.screen = 'loot';
}

function pickLoot(i) {
  const item = state.lootOptions[i]; if (!item) return;
  const p = state.player;
  if      (item.id==='extra-hp')  { p.maxHp+=10; p.hp=Math.min(p.maxHp,p.hp+10); }
  else if (item.id==='heal')      { p.hp=Math.min(p.maxHp,p.hp+15); }
  else if (item.id==='power')     { p.baseDmg+=1; }
  else if (item.id==='combo-amp') { p.comboBonus+=1; }
  const next = FLOORS.find(f=>f.id===state.floor+1);
  if (next) {
    state.floor++;
    startCombat(ENEMIES.find(e=>e.id===next.enemies[Math.floor(Math.random()*next.enemies.length)]));
    state.screen='combat';
  } else { state.screen='victory'; }
}

// ── p5 sketch ──────────────────────────────────────────────────────────────────
new p5(function(p) {

  let GW, GH, sc, portrait, ox, oy, VW, VH;
  let TRI_S, BX, BY;

  function vw() { return window.visualViewport ? window.visualViewport.width  : window.innerWidth;  }
  function vh() { return window.visualViewport ? window.visualViewport.height : window.innerHeight; }

  function relayout() {
    VW=vw(); VH=vh();
    portrait = VH>VW;
    GW=portrait?390:800; GH=portrait?750:600;
    sc=Math.min(VW/GW, VH/GH);
    ox=(VW-GW*sc)/2; oy=(VH-GH*sc)/2;
    if (portrait) {
      TRI_S=44;
      const boardW = BOARD_COLS*TRI_S/2 + TRI_S;
      BX = Math.floor((GW-boardW)/2);
      BY = 172;
    } else {
      TRI_S=50;
      const H = TRI_S*Math.sqrt(3)/2;
      const boardH = BOARD_ROWS*H;
      BX=8; BY=Math.floor((GH-boardH)/2);
    }
  }

  function toGX(x){return(x-ox)/sc;} function toGY(y){return(y-oy)/sc;}

  // ── Drawing helpers ───────────────────────────────────────────────────────
  function dr(x,y,w,h,col,r=0){p.fill(col);p.noStroke();r?p.rect(x,y,w,h,r):p.rect(x,y,w,h);}
  function dro(x,y,w,h,col,sw,r=0){p.noFill();p.stroke(col);p.strokeWeight(sw);r?p.rect(x,y,w,h,r):p.rect(x,y,w,h);p.noStroke();}
  function tx(s,x,y,col,sz,al='LEFT'){p.fill(col);p.noStroke();p.textSize(sz);p.textAlign(p[al]);p.text(s,x,y);}
  function ir(mx,my,x,y,w,h){return mx>=x&&mx<=x+w&&my>=y&&my<=y+h;}
  function bar(x,y,w,h,cur,max,fg,bg,lbl){
    dr(x,y,w,h,bg); dr(x,y,Math.round(w*Math.max(0,cur)/Math.max(1,max)),h,fg);
    dro(x,y,w,h,C.BORDER,1); tx(lbl+': '+Math.max(0,cur)+'/'+max,x+4,y+h-4,C.TEXT,9);
  }

  // Draw one triangle piece (or ghost) given board-space verts
  function drawTri(verts, corners, sigilId, alpha) {
    const sigil = TSIGILS.find(s=>s.id===sigilId);
    const [v0,v1,v2] = verts;
    const cx=(v0[0]+v1[0]+v2[0])/3, cy=(v0[1]+v1[1]+v2[1])/3;
    const col = p.color(sigil.color);
    col.setAlpha(alpha*0.75); p.fill(col);
    col.setAlpha(alpha); p.stroke(col); p.strokeWeight(1.5);
    p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]);
    p.noStroke();
    // corner number bubbles
    const br = TRI_S*0.14;
    [[v0,0],[v1,1],[v2,2]].forEach(([v,i])=>{
      const bx=v[0]*0.62+cx*0.38, by=v[1]*0.62+cy*0.38;
      const bg=p.color(C.DEEP); bg.setAlpha(alpha*0.9);
      p.fill(bg); const sc2=p.color(sigil.color); sc2.setAlpha(alpha);
      p.stroke(sc2); p.strokeWeight(1); p.circle(bx,by,br*2.2); p.noStroke();
      const tc=p.color(255,255,255); tc.setAlpha(alpha);
      p.fill(tc); p.textSize(br*1.0); p.textAlign(p.CENTER,p.CENTER); p.text(corners[i],bx,by);
    });
    // center symbol
    const symC=p.color(255,255,255); symC.setAlpha(alpha);
    p.fill(symC); p.textSize(TRI_S*0.24); p.textAlign(p.CENTER,p.CENTER); p.text(sigil.sym,cx,cy+1);
  }

  // Draw mini triangle for hand cards (centered in a box)
  function drawMiniTri(sigilId, corners, rotation, cx, cy, size) {
    const piece = {sigilId, corners, rotation};
    const rc = rotatedCorners(piece);
    const sigil = TSIGILS.find(s=>s.id===sigilId);
    const h = size*Math.sqrt(3)/2;
    const verts = [[cx, cy-h*0.6], [cx-size/2, cy+h*0.4], [cx+size/2, cy+h*0.4]];
    p.fill(sigil.color+'cc'); p.stroke(sigil.color); p.strokeWeight(1.2);
    p.triangle(verts[0][0],verts[0][1],verts[1][0],verts[1][1],verts[2][0],verts[2][1]);
    p.noStroke();
    const br = size*0.13;
    verts.forEach(([vx,vy],i)=>{
      const bx=vx*0.65+cx*0.35, by=vy*0.65+cy*0.35;
      p.fill(C.DEEP); p.stroke(sigil.color); p.strokeWeight(0.8); p.circle(bx,by,br*2.2); p.noStroke();
      p.fill(C.TEXT); p.textSize(br); p.textAlign(p.CENTER,p.CENTER); p.text(rc[i],bx,by);
    });
    p.fill(C.TEXT); p.textSize(size*0.22); p.textAlign(p.CENTER,p.CENTER); p.text(sigil.sym,cx,cy+1);
  }

  // ── Board rendering ─────────────────────────────────────────────────────────
  function drawBoard(combat) {
    const {board, hand, selected, hoverCell} = combat;
    // Draw board background
    const H = TRI_S*Math.sqrt(3)/2;
    const boardW = BOARD_COLS*TRI_S/2+TRI_S, boardH = BOARD_ROWS*H;
    dr(BX-4, BY-4, boardW+8, boardH+8, C.DEEP, 6);
    dro(BX-4, BY-4, boardW+8, boardH+8, C.BORDER, 1, 6);

    // Draw placed pieces
    board.forEach((cell, key) => {
      const [r,c] = key.split(',').map(Number);
      const verts = triVerts(BX, BY, r, c, TRI_S);
      drawTri(verts, cell.corners, cell.sigilId, 255);
    });

    // Ghost preview
    if (selected !== null && hoverCell) {
      const [r,c] = hoverCell;
      const key = `${r},${c}`;
      if (!board.has(key)) {
        const piece = hand[selected];
        const corners = rotatedCorners(piece);
        const verts = triVerts(BX, BY, r, c, TRI_S);
        const es = bestEdgeSum(board, r, c, corners);
        const multi = multiplier(es, state.player.comboBonus);
        drawTri(verts, corners, piece.sigilId, 140);
        // Show multiplier badge on ghost
        const [gcx,gcy] = triCenter(BX,BY,r,c,TRI_S);
        if (multi > 1) {
          const col = multi>=4?C.GOLD:multi>=3?C.ACCENT2:C.TEXT;
          p.fill(C.DEEP+'cc'); p.noStroke(); p.rect(gcx-14,gcy-H*0.7,28,14,4);
          tx('×'+multi, gcx, gcy-H*0.7+12, col, 10, 'CENTER');
        }
      }
    }
  }

  // ── Layout helpers ──────────────────────────────────────────────────────────
  function boardBottom() { return BY + BOARD_ROWS * TRI_S * Math.sqrt(3)/2; }

  function handLayout() {
    if (portrait) {
      const hY = boardBottom()+12;
      const n = state.combat ? state.combat.hand.length : state.player.handSize;
      const cardW=Math.min(88, (GW-16)/Math.max(n,1)-6), cardH=80, gap=6;
      return {hY, cardW, cardH, gap, sx:(GW-n*(cardW+gap)+gap)/2};
    } else {
      const H=TRI_S*Math.sqrt(3)/2, boardW=BOARD_COLS*TRI_S/2+TRI_S;
      const RX=BX+boardW+14, RW=GW-RX-10;
      return {hY:290, cardW:Math.floor(RW/3)-4, cardH:90, gap:4, RX, RW};
    }
  }

  function btnRect() {
    if (portrait) {
      const {hY,cardH}=handLayout(); return {x:GW/2-85, y:hY+cardH+10, w:170, h:38};
    }
    const {hY,cardH,RX,RW}=handLayout(); return {x:RX, y:hY+cardH+10, w:RW, h:38};
  }

  function drawHandCards(hand, selected) {
    const hl=handLayout();
    const {hY,cardW,cardH,gap} = hl;
    const sx = portrait ? hl.sx : hl.RX;
    hand.forEach((piece,i) => {
      const cx=sx+i*(cardW+gap), sel=selected===i;
      const sigil=TSIGILS.find(s=>s.id===piece.sigilId);
      dr(cx,hY,cardW,cardH,sel?C.PANEL_ALT:C.PANEL,8);
      dro(cx,hY,cardW,cardH,sel?C.ACCENT:C.BORDER,sel?2:1,8);
      dr(cx+cardW-12,hY+6,8,8,sigil.color,4);
      drawMiniTri(piece.sigilId, piece.corners, piece.rotation, cx+cardW/2, hY+cardH*0.42, cardW*0.54);
      tx(sigil.id,cx+cardW/2,hY+cardH-18,sel?C.ACCENT2:C.TEXT_DIM,7,'CENTER');
      tx(sel?'⟳ rotate':'tap',cx+cardW/2,hY+cardH-8,C.TEXT_MUT,7,'CENTER');
    });
    if (!hand.length) tx('No sigils — end turn.',portrait?GW/2:hl.RX+hl.RW/2,hY+30,C.TEXT_DIM,10,'CENTER');
  }

  // ── Screens ──────────────────────────────────────────────────────────────────
  function drawTitle() {
    const cx=GW/2, cy=GH/2;
    // Decorative triangles
    const deco=[[0,'void'],[1,'blood'],[2,'star'],[3,'bone'],[4,'dream'],[5,'rift']];
    deco.forEach(([i,id])=>{
      const a=i/6*Math.PI*2, r=90;
      const tx2=cx+Math.cos(a)*r, ty2=cy+Math.sin(a)*r;
      const sig=TSIGILS.find(s=>s.id===id);
      const col=p.color(sig.color); col.setAlpha(60); p.fill(col); p.noStroke();
      p.triangle(tx2,ty2-20,tx2-17,ty2+10,tx2+17,ty2+10);
    });
    tx('SIGIL RITES',cx,cy-40,C.ACCENT2,portrait?28:36,'CENTER');
    tx('PLACE TRIANGLES · MATCH CORNERS · MULTIPLY DAMAGE',cx,cy-20,C.TEXT_DIM,portrait?8:10,'CENTER');
    tx('HOW MANY SIGILS PER TURN?',cx,cy+14,C.TEXT,11,'CENTER');
    // Mode buttons
    const modes=[['1',1,'✕✕✕ hardest'],['3',3,'recommended'],['5',5,'easiest']];
    const bw=86, bh=44, gap2=10, totalW=3*(bw+gap2)-gap2;
    const bsx=cx-totalW/2;
    modes.forEach(([lbl,n,sub],i)=>{
      const bx=bsx+i*(bw+gap2), by=cy+28;
      const hov=state.hover===('mode'+n);
      dr(bx,by,bw,bh,hov?C.ACCENT:C.PANEL,8);
      dro(bx,by,bw,bh,hov?C.ACCENT2:C.BORDER,hov?2:1,8);
      tx(lbl,bx+bw/2,by+20,C.TEXT,18,'CENTER');
      tx(sub,bx+bw/2,by+36,C.TEXT_DIM,8,'CENTER');
    });
  }

  function drawCombatPort() {
    const {combat,player,floor}=state;
    const {enemy,hand,selected,power}=combat;
    const fd=FLOORS.find(f=>f.id===floor), W=GW-20;
    dr(10,8,W,60,C.DEEP,8);
    tx('FLOOR '+floor+' — '+(fd?fd.name:''),15,22,C.TEXT_DIM,9);
    bar(15,26,W/2-10,16,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    tx(enemy.name,GW/2+5,22,C.TEXT,9);
    bar(GW/2+5,26,W/2-10,16,enemy.curHp,enemy.hp,C.EN_FG,C.EN_BG,'ENEMY');
    tx('Atk '+enemy.atk+'/turn',GW/2+5,54,C.DANGER,9);
    tx('PENDING: +'+power,15,54,power>0?C.GOLD:C.TEXT_DIM,10);
    dr(10,74,W,90,C.DEEP,8);
    tx(enemy.glyph,GW/2,146,enemy.color,52,'CENTER');
    if(enemy.boss) tx('⚠ BOSS',GW-18,90,C.DANGER,9,'RIGHT');
    drawBoard(combat);
    drawHandCards(hand,selected);
    const btn=btnRect();
    dr(btn.x,btn.y,btn.w,btn.h,state.hover==='endturn'?'#b91c1c':C.DANGER,8);
    tx('END TURN  ▶',btn.x+btn.w/2,btn.y+btn.h*0.66,C.TEXT,14,'CENTER');
    if(selected!==null) tx('tap board to place  ·  tap card again to rotate',GW/2,btn.y+btn.h+14,C.ACCENT,8,'CENTER');
    if(state.msg&&state.msgTimer>0){
      const big=state.msg.includes('RESONANCE')||state.msg.includes('ECHO');
      tx(state.msg,GW/2,btn.y+btn.h+28,big?C.GOLD:C.TEXT,big?11:10,'CENTER');
    }
  }

  function drawCombatLand() {
    const {combat,player,floor}=state;
    const {enemy,hand,selected,power}=combat;
    const fd=FLOORS.find(f=>f.id===floor);
    const hl=handLayout(); const {RX,RW}=hl;
    tx('SIGIL BOARD',BX,BY-12,C.TEXT_DIM,9);
    drawBoard(combat);
    dr(RX,10,RW,68,C.DEEP,8);
    tx('FLOOR '+floor,RX+8,26,C.TEXT_DIM,10);
    tx(fd?fd.name:'',RX+8,40,C.TEXT,11);
    bar(RX+8,44,RW-16,18,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    dr(RX,86,RW,125,C.DEEP,8);
    tx(enemy.name,RX+8,102,C.TEXT,11);
    if(enemy.boss) tx('⚠ BOSS',RX+RW-10,102,C.DANGER,10,'RIGHT');
    tx(enemy.glyph,RX+RW/2,170,enemy.color,50,'CENTER');
    bar(RX+8,216,RW-16,16,enemy.curHp,enemy.hp,C.EN_FG,C.EN_BG,'ENEMY HP');
    tx('Attacks '+enemy.atk+' per turn',RX+8,246,C.DANGER,10);
    dr(RX,252,RW,28,C.PANEL,6);
    tx('PENDING: +'+power,RX+RW/2,270,power>0?C.GOLD:C.TEXT_DIM,12,'CENTER');
    drawHandCards(hand,selected);
    const btn=btnRect();
    dr(btn.x,btn.y,btn.w,btn.h,state.hover==='endturn'?'#b91c1c':C.DANGER,8);
    tx('END TURN  ▶',btn.x+btn.w/2,btn.y+btn.h*0.66,C.TEXT,15,'CENTER');
    if(selected!==null) tx('tap board to place  ·  tap card to rotate',btn.x+btn.w/2,btn.y+btn.h+14,C.ACCENT,8,'CENTER');
    if(state.msg&&state.msgTimer>0){
      const big=state.msg.includes('RESONANCE')||state.msg.includes('ECHO');
      tx(state.msg,btn.x+btn.w/2,btn.y+btn.h+28,big?C.GOLD:C.TEXT,big?11:10,'CENTER');
    }
  }

  function drawLoot() {
    const opts=state.lootOptions;
    tx('THE VOID OFFERS TRIBUTE',GW/2,40,C.ACCENT2,portrait?16:20,'CENTER');
    tx('Choose one boon:',GW/2,58,C.TEXT_DIM,11,'CENTER');
    if (portrait) {
      opts.forEach((item,i)=>{
        const y=70+i*90,W=GW-20,hov=state.hover===('loot'+i);
        dr(10,y,W,82,hov?C.PANEL_ALT:C.PANEL,10);
        dro(10,y,W,82,hov?C.ACCENT:C.BORDER,hov?2:1,10);
        tx(item.glyph,32,y+48,item.color,22,'CENTER');
        tx(item.name,52,y+22,C.TEXT,13);
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.LEFT);
        p.text(item.desc,52,y+36,W-62,38);
        tx('TAP TO CLAIM ▶',GW-15,y+74,hov?C.ACCENT:C.TEXT_DIM,9,'RIGHT');
      });
    } else {
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

  function drawGameOver() {
    tx('⊗',GW/2,GH/2-58,C.DANGER,52,'CENTER');
    tx('YOU HAVE BEEN UNMADE',GW/2,GH/2-8,C.DANGER,portrait?18:26,'CENTER');
    tx('The sigils could not hold.',GW/2,GH/2+16,C.TEXT_DIM,11,'CENTER');
    dr(GW/2-80,GH/2+50,160,40,C.ACCENT,6);
    tx('TRY AGAIN',GW/2,GH/2+76,C.TEXT,13,'CENTER');
  }
  function drawVictory() {
    tx('⊕',GW/2,GH/2-58,C.GOLD,52,'CENTER');
    tx('THE RITUAL IS COMPLETE',GW/2,GH/2-8,C.GOLD,portrait?18:26,'CENTER');
    tx('The Sleeper stirs. The sigils hold.',GW/2,GH/2+16,C.TEXT_DIM,11,'CENTER');
    dr(GW/2-80,GH/2+50,160,40,C.ACCENT,6);
    tx('PLAY AGAIN',GW/2,GH/2+76,C.TEXT,13,'CENTER');
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  function updateHover(mx,my) {
    state.hover=null;
    if (state.screen==='title') {
      [1,3,5].forEach(n=>{
        const bw=86,bh=44,gap=10,totalW=3*(bw+gap)-gap,bsx=GW/2-totalW/2;
        const i=[1,3,5].indexOf(n), bx=bsx+i*(bw+gap), by=GH/2+28;
        if(ir(mx,my,bx,by,bw,bh)) state.hover='mode'+n;
      });
    }
    if (state.screen==='combat') {
      const btn=btnRect();
      if(ir(mx,my,btn.x,btn.y,btn.w,btn.h)) state.hover='endturn';
      if(state.combat) state.combat.hoverCell=nearestCell(mx,my,BX,BY,TRI_S);
    }
    if (state.screen==='loot') {
      if(portrait) {
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,10,70+i*90,GW-20,82)) state.hover='loot'+i;});
      } else {
        const cw=190,gap=18,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) state.hover='loot'+i;});
      }
    }
  }

  function click(rawX,rawY) {
    const mx=toGX(rawX), my=toGY(rawY);
    updateHover(mx,my);
    if (state.screen==='title') {
      const modes=[1,3,5];
      const bw=86,bh=44,gap=10,totalW=3*(bw+gap)-gap,bsx=GW/2-totalW/2;
      for(let i=0;i<3;i++){
        const bx=bsx+i*(bw+gap),by=GH/2+28;
        if(ir(mx,my,bx,by,bw,bh)){
          initState(modes[i]);
          const ff=FLOORS[0];
          startCombat(ENEMIES.find(e=>e.id===ff.enemies[Math.floor(Math.random()*ff.enemies.length)]));
          state.screen='combat'; return;
        }
      }
      return;
    }
    if (state.screen==='gameover'||state.screen==='victory') {
      if(ir(mx,my,GW/2-80,GH/2+50,160,40)) initState();
      return;
    }
    if (state.screen==='loot') {
      if(portrait) {
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,10,70+i*90,GW-20,82)) pickLoot(i);});
      } else {
        const cw=190,gap=18,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) pickLoot(i);});
      }
      return;
    }
    if (state.screen==='combat') {
      const {combat}=state;
      const btn=btnRect();
      if(ir(mx,my,btn.x,btn.y,btn.w,btn.h)){endTurn();return;}
      const hl=handLayout();
      const {hY,cardW,cardH,gap}=hl;
      const n=combat.hand.length;
      const sx=portrait?hl.sx:hl.RX;
      for(let i=0;i<n;i++){
        if(ir(mx,my,sx+i*(cardW+gap),hY,cardW,cardH)){
          if(combat.selected===i){combat.hand[i].rotation=(combat.hand[i].rotation+1)%3; combat.hoverCell=null;}
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
    relayout(); p.createCanvas(VW,VH); p.textFont('Courier New'); initState();
    if(window.visualViewport) window.visualViewport.addEventListener('resize',()=>{relayout();p.resizeCanvas(VW,VH);});
  };
  p.windowResized=function(){relayout();p.resizeCanvas(VW,VH);};
  p.draw=function(){
    if(state.msgTimer>0) state.msgTimer--;
    p.background(C.VOID); p.push(); p.translate(ox,oy); p.scale(sc);
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

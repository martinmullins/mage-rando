// SIGIL RITES — Triomino Combo Roguelike

const C = {
  VOID:'#0a0a0f', DEEP:'#12121e', PANEL:'#1a1a2e', PANEL_ALT:'#16213e',
  BORDER:'#2d2d5e', ACCENT:'#7c3aed', ACCENT2:'#a855f7',
  DANGER:'#dc2626', GOLD:'#f59e0b', TEXT:'#e5e7eb',
  TEXT_DIM:'#6b7280', TEXT_MUT:'#374151',
  HP_FG:'#22c55e', HP_BG:'#14241a',
  EN_FG:'#dc2626', EN_BG:'#1f1515'
};

const GRID_COLS = 7, GRID_ROWS = 8;

// Six triomino sigil types: 3 straight (I) and 3 corner (L)
// Same shape, different color/name — identity drives the combo system
const SIGILS = [
  {id:'spine',  name:'Spine Shard',  color:'#7c3aed', cells:[[0,0],[1,0],[2,0]]},  // I
  {id:'needle', name:'The Needle',   color:'#e879f9', cells:[[0,0],[1,0],[2,0]]},  // I
  {id:'pillar', name:'Void Pillar',  color:'#f59e0b', cells:[[0,0],[1,0],[2,0]]},  // I
  {id:'claw',   name:'Talon Mark',   color:'#6d28d9', cells:[[0,0],[1,0],[1,1]]},  // L
  {id:'knot',   name:'Soul Knot',    color:'#0ea5e9', cells:[[0,0],[1,0],[1,1]]},  // L
  {id:'hook',   name:'Rift Hook',    color:'#22c55e', cells:[[0,0],[1,0],[1,1]]},  // L
];

const ENEMIES = [
  {id:'herald',  name:'Herald of the Void',      hp:40,  atk:6,  glyph:'◈', color:'#6d28d9'},
  {id:'watcher', name:'Watcher Between Seconds',  hp:65,  atk:9,  glyph:'⊗', color:'#9333ea'},
  {id:'choir',   name:'Choir of Unmaking',        hp:95,  atk:12, glyph:'⊛', color:'#7e22ce'},
  {id:'sleeper', name:'Sleeper Beneath All',      hp:150, atk:16, glyph:'⊜', color:'#4c1d95', boss:true}
];

const FLOORS = [
  {id:1, name:'The Whispering Crypts',  enemies:['herald','watcher']},
  {id:2, name:'The Drowned Cathedral',  enemies:['watcher','choir']},
  {id:3, name:'The Void Between Stars', enemies:['sleeper']}
];

const LOOT_POOL = [
  {id:'extra-hp',    name:'Void Vitality',     glyph:'♥', desc:'+12 max HP and restore 12.',      color:'#22c55e'},
  {id:'heal',        name:'Ritual Mending',     glyph:'⊕', desc:'Restore 18 HP.',                  color:'#34d399'},
  {id:'power-sigil', name:'Sigil of Power',     glyph:'⊛', desc:'+3 base damage per placement.',   color:'#f59e0b'},
  {id:'clear-boon',  name:'Dissolution Rite',   glyph:'⊠', desc:'+6 damage per line cleared.',     color:'#a855f7'},
  {id:'bigger-hand', name:'Many-Handed Ritual', glyph:'⊞', desc:'Draw 4 sigils per turn.',         color:'#7c3aed'},
  {id:'combo-amp',   name:'Echo Resonance',     glyph:'⧫', desc:'Combo multiplier +1 per piece.',  color:'#e879f9'},
];

// ── Piece rotation ─────────────────────────────────────────────────────────────
function rotateCW(cells) {
  const maxR = Math.max(...cells.map(([r]) => r));
  return cells.map(([r, c]) => [c, maxR - r]);
}
function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells.map(([r, c]) => [r - minR, c - minC]);
}
function getCells(id, rot) {
  let cells = SIGILS.find(s => s.id === id).cells.map(c => [...c]);
  for (let i = 0; i < (rot % 4); i++) cells = normalize(rotateCW(cells));
  return cells;
}

// Count board edges between placed cells and existing same-sigil cells
function countComboEdges(grid, absCells, sigilId) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  let edges = 0;
  for (const [r, c] of absCells) {
    for (const [dr, dc] of dirs) {
      const nr = r+dr, nc = c+dc;
      if (nr>=0 && nr<GRID_ROWS && nc>=0 && nc<GRID_COLS && grid[nr][nc]?.id === sigilId) edges++;
    }
  }
  return edges;
}

// ── State ──────────────────────────────────────────────────────────────────────
let state;
function initState() {
  state = {
    screen: 'title', floor: 1,
    player: {hp:30, maxHp:30, bonusDmg:0, handSize:3, clearBonus:5, comboBonus:0},
    combat: null, lootOptions: [],
    msg: null, msgTimer: 0
  };
}

function makeGrid() {
  return Array.from({length: GRID_ROWS}, () => Array(GRID_COLS).fill(null));
}
function drawHand(n) {
  return Array.from({length: n}, () => ({
    id: SIGILS[Math.floor(Math.random() * SIGILS.length)].id, rotation: 0
  }));
}
function startCombat(def) {
  state.combat = {
    enemy: {...def, curHp: def.hp},
    grid: makeGrid(),
    hand: drawHand(state.player.handSize),
    selected: null, hoverCell: null, power: 0
  };
}
function showMsg(m) { state.msg = m; state.msgTimer = 200; }

function canPlace(grid, cells, ar, ac) {
  for (const [nr, nc] of cells) {
    const r = ar+nr, c = ac+nc;
    if (r<0 || r>=GRID_ROWS || c<0 || c>=GRID_COLS || grid[r][c]) return false;
  }
  return true;
}

function checkClears(grid) {
  let cleared = 0;
  for (let r = GRID_ROWS-1; r >= 0; r--) {
    if (grid[r].every(c => c !== null)) {
      grid.splice(r, 1);
      grid.unshift(Array(GRID_COLS).fill(null));
      cleared++; r++;
    }
  }
  for (let c = 0; c < GRID_COLS; c++) {
    if (grid.every(row => row[c] !== null)) {
      for (let r = 0; r < GRID_ROWS; r++) grid[r][c] = null;
      cleared++;
    }
  }
  return cleared;
}

function placePiece(hIdx, ar, ac) {
  const {combat, player} = state;
  const piece = combat.hand[hIdx]; if (!piece) return;
  const cells = getCells(piece.id, piece.rotation);
  if (!canPlace(combat.grid, cells, ar, ac)) { showMsg("Can't place there!"); return; }
  const sigil = SIGILS.find(s => s.id === piece.id);

  // Combo: count touching edges to same-sigil cells already on board
  const absCells = cells.map(([nr, nc]) => [ar+nr, ac+nc]);
  const edges = countComboEdges(combat.grid, absCells, piece.id);
  const multiplier = edges + 1 + player.comboBonus;   // 1x base, +1 per edge, +upgrade

  for (const [nr, nc] of absCells) combat.grid[ar+nr][ac+nc] = {color: sigil.color, id: piece.id};

  let dmg = (cells.length + player.bonusDmg) * multiplier;
  const cleared = checkClears(combat.grid);
  dmg += cleared * player.clearBonus;

  const parts = [];
  if (multiplier > 1) parts.push(`×${multiplier} COMBO!`);
  if (cleared > 0)    parts.push(`${cleared} line${cleared>1?'s':''} cleared!`);
  parts.push(`+${dmg} dmg`);
  showMsg(parts.join('  '));

  combat.power += dmg;
  combat.hand.splice(hIdx, 1);
  combat.selected = null; combat.hoverCell = null;
}

function endTurn() {
  const {combat, player} = state;
  if (combat.power > 0) {
    combat.enemy.curHp = Math.max(0, combat.enemy.curHp - combat.power);
    if (combat.enemy.curHp <= 0) {
      showMsg(`${combat.enemy.name} annihilated! (${combat.power} total dmg)`);
      setTimeout(() => transitionToLoot(), 700);
      return;
    }
  }
  player.hp = Math.max(0, player.hp - combat.enemy.atk);
  if (player.hp <= 0) { state.screen = 'gameover'; return; }
  showMsg(`Dealt ${combat.power} dmg. Enemy strikes for ${combat.enemy.atk}!`);
  combat.hand = drawHand(player.handSize);
  combat.power = 0; combat.selected = null; combat.hoverCell = null;
}

function transitionToLoot() {
  state.lootOptions = [...LOOT_POOL].sort(() => Math.random()-0.5).slice(0, 3);
  state.screen = 'loot';
}

function pickLoot(i) {
  const item = state.lootOptions[i]; if (!item) return;
  const p = state.player;
  if      (item.id === 'extra-hp')    { p.maxHp+=12; p.hp=Math.min(p.maxHp, p.hp+12); }
  else if (item.id === 'heal')        { p.hp=Math.min(p.maxHp, p.hp+18); }
  else if (item.id === 'power-sigil') { p.bonusDmg+=3; }
  else if (item.id === 'clear-boon')  { p.clearBonus+=6; }
  else if (item.id === 'bigger-hand') { p.handSize=Math.min(5, p.handSize+1); }
  else if (item.id === 'combo-amp')   { p.comboBonus+=1; }
  const next = FLOORS.find(f => f.id === state.floor+1);
  if (next) {
    state.floor++;
    startCombat(ENEMIES.find(e => e.id === next.enemies[Math.floor(Math.random()*next.enemies.length)]));
    state.screen = 'combat';
  } else {
    state.screen = 'victory';
  }
}

// ── p5 sketch ──────────────────────────────────────────────────────────────────
new p5(function(p) {

  let GW, GH, sc, portrait, ox, oy, VW, VH;
  let CELL_SZ, GRID_X0, GRID_Y0;

  function vw() { return window.visualViewport ? window.visualViewport.width  : window.innerWidth;  }
  function vh() { return window.visualViewport ? window.visualViewport.height : window.innerHeight; }

  function relayout() {
    VW=vw(); VH=vh();
    portrait = VH>VW;
    GW=portrait?390:800; GH=portrait?750:600;
    sc=Math.min(VW/GW, VH/GH);
    ox=(VW-GW*sc)/2; oy=(VH-GH*sc)/2;
    if (portrait) {
      CELL_SZ=38;
      GRID_X0=Math.floor((GW-GRID_COLS*CELL_SZ)/2);
      GRID_Y0=176;
    } else {
      CELL_SZ=50;
      GRID_X0=20;
      GRID_Y0=Math.floor((GH-GRID_ROWS*CELL_SZ)/2);
    }
  }

  function toGameX(x) { return (x-ox)/sc; }
  function toGameY(y) { return (y-oy)/sc; }

  // ── Drawing helpers ──────────────────────────────────────────────────────────
  function dr(x,y,w,h,col,r=0) { p.fill(col); p.noStroke(); r?p.rect(x,y,w,h,r):p.rect(x,y,w,h); }
  function dro(x,y,w,h,col,sw,r=0) { p.noFill(); p.stroke(col); p.strokeWeight(sw); r?p.rect(x,y,w,h,r):p.rect(x,y,w,h); p.noStroke(); }
  function tx(s,x,y,col,sz,al='LEFT') { p.fill(col); p.noStroke(); p.textSize(sz); p.textAlign(p[al]); p.text(s,x,y); }
  function ir(mx,my,x,y,w,h) { return mx>=x&&mx<=x+w&&my>=y&&my<=y+h; }
  function bar(x,y,w,h,cur,max,fg,bg,lbl) {
    dr(x,y,w,h,bg);
    dr(x,y,Math.round(w*Math.max(0,cur)/Math.max(1,max)),h,fg);
    dro(x,y,w,h,C.BORDER,1);
    tx(lbl+': '+Math.max(0,cur)+'/'+max, x+4, y+h-4, C.TEXT, 9);
  }

  // Draw grid. highlightId: sigil type to glow (combo preview)
  function drawGrid(gx0, gy0, csz, grid, ghostCells, ghostOk, highlightId) {
    dr(gx0-2, gy0-2, GRID_COLS*csz+4, GRID_ROWS*csz+4, C.DEEP, 4);
    p.stroke(C.BORDER); p.strokeWeight(0.5); p.noFill();
    for (let r=0; r<=GRID_ROWS; r++) p.line(gx0, gy0+r*csz, gx0+GRID_COLS*csz, gy0+r*csz);
    for (let c=0; c<=GRID_COLS; c++) p.line(gx0+c*csz, gy0, gx0+c*csz, gy0+GRID_ROWS*csz);
    p.noStroke();

    for (let r=0; r<GRID_ROWS; r++) {
      for (let c=0; c<GRID_COLS; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        dr(gx0+c*csz+1, gy0+r*csz+1, csz-2, csz-2, cell.color, 2);
        // Combo-eligible cells glow with pulsing ring
        if (highlightId && cell.id === highlightId) {
          const pulse = 0.55+0.45*Math.sin(p.frameCount*0.15);
          p.noFill(); p.stroke(cell.color); p.strokeWeight(pulse*2.5);
          p.rect(gx0+c*csz+2, gy0+r*csz+2, csz-4, csz-4, 3);
          p.noStroke();
        } else {
          p.noFill(); p.stroke(cell.color+'44'); p.strokeWeight(1);
          p.rect(gx0+c*csz+4, gy0+r*csz+4, csz-8, csz-8, 2);
          p.noStroke();
        }
      }
    }

    if (ghostCells) {
      ghostCells.forEach(([nr, nc]) => {
        if (nr>=0 && nr<GRID_ROWS && nc>=0 && nc<GRID_COLS) {
          p.fill(ghostOk ? p.color(150,100,255,90) : p.color(255,50,50,70));
          p.noStroke();
          p.rect(gx0+nc*csz+1, gy0+nr*csz+1, csz-2, csz-2, 2);
        }
      });
    }
    dro(gx0, gy0, GRID_COLS*csz, GRID_ROWS*csz, C.ACCENT, 1.5, 2);
  }

  function drawMiniPiece(id, rot, cx, cy, csz, sel) {
    const cells = getCells(id, rot);
    const maxR = Math.max(...cells.map(([r]) => r));
    const maxC = Math.max(...cells.map(([,c]) => c));
    const offX = cx-(maxC+1)*csz/2, offY = cy-(maxR+1)*csz/2;
    const sigil = SIGILS.find(s => s.id === id);
    cells.forEach(([nr,nc]) => dr(offX+nc*csz, offY+nr*csz, csz-1, csz-1, sel?sigil.color:sigil.color+'aa', 2));
  }

  function gridCell(mx, my) {
    const c = Math.floor((mx-GRID_X0)/CELL_SZ);
    const r = Math.floor((my-GRID_Y0)/CELL_SZ);
    return (r>=0&&r<GRID_ROWS&&c>=0&&c<GRID_COLS) ? [r,c] : null;
  }

  // ── Layout helpers ───────────────────────────────────────────────────────────
  function handLayout() {
    if (portrait) {
      return {hY:GRID_Y0+GRID_ROWS*CELL_SZ+12, cardW:88, cardH:80, gap:8};
    } else {
      const RX=GRID_X0+GRID_COLS*CELL_SZ+20, RW=GW-RX-10;
      return {hY:296, cardW:Math.floor(RW/3)-4, cardH:88, gap:4, RX, RW};
    }
  }
  function endTurnBtn() {
    if (portrait) { const {hY,cardH}=handLayout(); return {x:GW/2-85, y:hY+cardH+10, w:170, h:38}; }
    const {hY,cardH,RX,RW}=handLayout(); return {x:RX, y:hY+cardH+10, w:RW, h:38};
  }

  function selectedSigilId() {
    const c = state.combat;
    return (c && c.selected !== null) ? c.hand[c.selected]?.id : null;
  }

  function drawHandCards(hand, selected) {
    const hl = handLayout();
    const {hY,cardW,cardH,gap} = hl;
    const n = hand.length;
    const totalW = n*(cardW+gap)-gap;
    const sx = portrait ? (GW-totalW)/2 : hl.RX;
    hand.forEach((piece, i) => {
      const cx = sx+i*(cardW+gap), sel = selected===i;
      const sigil = SIGILS.find(s => s.id === piece.id);
      dr(cx, hY, cardW, cardH, sel?C.PANEL_ALT:C.PANEL, 8);
      dro(cx, hY, cardW, cardH, sel?C.ACCENT:C.BORDER, sel?2:1, 8);
      // small color dot
      dr(cx+cardW-14, hY+8, 8, 8, sigil.color, 4);
      drawMiniPiece(piece.id, piece.rotation, cx+cardW/2, hY+cardH*0.40, 10, sel);
      tx(sigil.name, cx+cardW/2, hY+cardH-18, sel?C.ACCENT2:C.TEXT_DIM, 7, 'CENTER');
      tx(sel?'⟳ rotate':'select', cx+cardW/2, hY+cardH-8, C.TEXT_MUT, 7, 'CENTER');
    });
    if (!n) tx('No sigils — end your turn.', portrait?GW/2:hl.RX+hl.RW/2, hY+30, C.TEXT_DIM, 10, 'CENTER');
  }

  // Live combo preview: count edges the hovered placement would form
  function previewCombo(combat) {
    const {hand, selected, hoverCell, grid} = combat;
    if (selected===null || !hoverCell) return {ghostCells:null, ghostOk:false, multi:0};
    const cells = getCells(hand[selected].id, hand[selected].rotation);
    const abs = cells.map(([nr,nc]) => [hoverCell[0]+nr, hoverCell[1]+nc]);
    const ok = canPlace(grid, cells, hoverCell[0], hoverCell[1]);
    const edges = ok ? countComboEdges(grid, abs, hand[selected].id) : 0;
    return {ghostCells: abs, ghostOk: ok, multi: edges+1+state.player.comboBonus};
  }

  // ── Screens ──────────────────────────────────────────────────────────────────
  function drawTitle() {
    const cx=GW/2, cy=GH/2;
    p.noFill();
    for (let i=1; i<=6; i++) { p.stroke(C.BORDER); p.strokeWeight(0.5); p.ellipse(cx,cy,i*55,i*55); }
    p.noStroke();
    const dg = makeGrid();
    // Scatter a few colored triomino-sized blobs as decoration
    [[0,1,'spine'],[0,3,'knot'],[2,2,'hook'],[3,0,'needle'],[4,4,'claw'],[5,2,'pillar'],[1,5,'knot']]
      .forEach(([r,c,id]) => { const s=SIGILS.find(x=>x.id===id); if(r<GRID_ROWS&&c<GRID_COLS) dg[r][c]={color:s.color+'55',id}; });
    const csz=18, dgx=cx-GRID_COLS*csz/2, dgy=cy-GRID_ROWS*csz/2-20;
    drawGrid(dgx, dgy, csz, dg, null, false, null);
    tx('SIGIL RITES', cx, cy+72, C.ACCENT2, portrait?28:36, 'CENTER');
    tx('TRIOMINO COMBO ROGUELIKE', cx, cy+91, C.TEXT_DIM, portrait?8:10, 'CENTER');
    tx('match colours to multiply damage', cx, cy+108, C.TEXT_MUT, portrait?8:9, 'CENTER');
    tx('— tap to begin the ritual —', cx, cy+130, C.ACCENT, 10, 'CENTER');
  }

  function drawCombatPort() {
    const {combat, player, floor} = state;
    const {enemy, grid, hand, selected, power} = combat;
    const fd = FLOORS.find(f=>f.id===floor);
    const W = GW-20;
    const {ghostCells, ghostOk, multi} = previewCombo(combat);
    const hid = selectedSigilId();

    // Top bar
    dr(10, 8, W, 64, C.DEEP, 8);
    tx('FLOOR '+floor+' — '+(fd?fd.name:''), 15, 22, C.TEXT_DIM, 9);
    bar(15, 26, W/2-10, 16, player.hp, player.maxHp, C.HP_FG, C.HP_BG, 'HP');
    tx(enemy.name, GW/2+5, 22, C.TEXT, 9);
    bar(GW/2+5, 26, W/2-10, 16, enemy.curHp, enemy.hp, C.EN_FG, C.EN_BG, 'ENEMY');
    tx('Atk '+enemy.atk+'/turn', GW/2+5, 55, C.DANGER, 9);
    tx('PENDING: +'+power, 15, 55, power>0?C.GOLD:C.TEXT_DIM, 10);

    // Enemy glyph
    dr(10, 78, W, 86, C.DEEP, 8);
    tx(enemy.glyph, GW/2, 144, enemy.color, 56, 'CENTER');
    if (enemy.boss) tx('⚠ BOSS', GW-18, 94, C.DANGER, 9, 'RIGHT');

    // Combo multiplier preview badge
    if (selected!==null && hoverCell) {
      const col = multi>=3?C.GOLD:multi>=2?C.ACCENT2:C.TEXT_DIM;
      tx('×'+multi, GW-18, 170, col, multi>=2?16:11, 'RIGHT');
    }

    drawGrid(GRID_X0, GRID_Y0, CELL_SZ, grid, ghostCells, ghostOk, hid);
    drawHandCards(hand, selected);

    const btn = endTurnBtn();
    dr(btn.x, btn.y, btn.w, btn.h, state.hover==='endturn'?'#b91c1c':C.DANGER, 8);
    tx('END TURN  ▶', btn.x+btn.w/2, btn.y+btn.h*0.66, C.TEXT, 14, 'CENTER');
    if (selected!==null) tx('tap matching colour cells to combo · tap card to rotate', GW/2, btn.y+btn.h+14, C.ACCENT, 8, 'CENTER');
    if (state.msg&&state.msgTimer>0) {
      const isCombo = state.msg.includes('COMBO');
      tx(state.msg, GW/2, btn.y+btn.h+28, isCombo?C.GOLD:C.TEXT, isCombo?11:10, 'CENTER');
    }
  }

  function drawCombatLand() {
    const {combat, player, floor} = state;
    const {enemy, grid, hand, selected, power} = combat;
    const fd = FLOORS.find(f=>f.id===floor);
    const hl = handLayout();
    const {hY, cardH, RX, RW} = hl;
    const {ghostCells, ghostOk, multi} = previewCombo(combat);
    const hid = selectedSigilId();

    tx('SIGIL BOARD', GRID_X0, GRID_Y0-12, C.TEXT_DIM, 9);
    drawGrid(GRID_X0, GRID_Y0, CELL_SZ, grid, ghostCells, ghostOk, hid);

    // Combo multiplier preview badge
    if (selected!==null) {
      const col = multi>=3?C.GOLD:multi>=2?C.ACCENT2:C.TEXT_DIM;
      tx('×'+multi, GRID_X0+GRID_COLS*CELL_SZ-4, GRID_Y0-12, col, multi>=2?14:10, 'RIGHT');
    }

    dr(RX, 10, RW, 68, C.DEEP, 8);
    tx('FLOOR '+floor, RX+8, 26, C.TEXT_DIM, 10);
    tx(fd?fd.name:'', RX+8, 40, C.TEXT, 11);
    bar(RX+8, 44, RW-16, 18, player.hp, player.maxHp, C.HP_FG, C.HP_BG, 'HP');

    dr(RX, 86, RW, 130, C.DEEP, 8);
    tx(enemy.name, RX+8, 102, C.TEXT, 11);
    if (enemy.boss) tx('⚠ BOSS', RX+RW-10, 102, C.DANGER, 10, 'RIGHT');
    tx(enemy.glyph, RX+RW/2, 178, enemy.color, 54, 'CENTER');
    bar(RX+8, 220, RW-16, 16, enemy.curHp, enemy.hp, C.EN_FG, C.EN_BG, 'ENEMY HP');
    tx('Attacks '+enemy.atk+' per turn', RX+8, 250, C.DANGER, 10);

    dr(RX, 258, RW, 28, C.PANEL, 6);
    tx('PENDING DAMAGE: +'+power, RX+RW/2, 276, power>0?C.GOLD:C.TEXT_DIM, 12, 'CENTER');

    drawHandCards(hand, selected);

    const btn = endTurnBtn();
    dr(btn.x, btn.y, btn.w, btn.h, state.hover==='endturn'?'#b91c1c':C.DANGER, 8);
    tx('END TURN  ▶', btn.x+btn.w/2, btn.y+btn.h*0.66, C.TEXT, 15, 'CENTER');
    if (selected!==null) tx('tap matching colour cells to combo · tap card to rotate', btn.x+btn.w/2, btn.y+btn.h+14, C.ACCENT, 8, 'CENTER');
    if (state.msg&&state.msgTimer>0) {
      const isCombo = state.msg.includes('COMBO');
      tx(state.msg, btn.x+btn.w/2, btn.y+btn.h+28, isCombo?C.GOLD:C.TEXT, isCombo?11:10, 'CENTER');
    }
  }

  function drawLoot() {
    const opts = state.lootOptions;
    tx('THE VOID OFFERS TRIBUTE', GW/2, 40, C.ACCENT2, portrait?16:20, 'CENTER');
    tx('Choose one boon:', GW/2, 58, C.TEXT_DIM, 11, 'CENTER');
    if (portrait) {
      opts.forEach((item, i) => {
        const y=70+i*88, W=GW-20, hov=state.hover===('loot'+i);
        dr(10, y, W, 80, hov?C.PANEL_ALT:C.PANEL, 10);
        dro(10, y, W, 80, hov?C.ACCENT:C.BORDER, hov?2:1, 10);
        dr(22, y+28, 12, 12, item.color, 3);
        tx(item.glyph, 32, y+28, item.color, 16, 'CENTER');
        tx(item.name, 52, y+22, C.TEXT, 13);
        p.fill(C.TEXT_DIM); p.noStroke(); p.textSize(10); p.textAlign(p.LEFT);
        p.text(item.desc, 52, y+36, W-62, 36);
        tx('TAP TO CLAIM ▶', GW-15, y+72, hov?C.ACCENT:C.TEXT_DIM, 9, 'RIGHT');
      });
    } else {
      const cw=190, gap=18, total=opts.length*(cw+gap)-gap, sx=GW/2-total/2;
      opts.forEach((item, i) => {
        const cx=sx+i*(cw+gap), cy=78, hov=state.hover===('loot'+i);
        dr(cx, cy, cw, 220, hov?C.PANEL_ALT:C.PANEL, 12);
        dro(cx, cy, cw, 220, hov?C.ACCENT:C.BORDER, hov?2:1, 12);
        tx(item.glyph, cx+cw/2, cy+68, item.color, 32, 'CENTER');
        tx(item.name, cx+cw/2, cy+94, C.TEXT, 13, 'CENTER');
        p.fill(C.TEXT_DIM); p.noStroke(); p.textSize(10); p.textAlign(p.CENTER);
        p.text(item.desc, cx+12, cy+112, cw-24, 52);
        dr(cx+20, cy+175, cw-40, 32, hov?C.ACCENT:C.ACCENT, 6);
        tx('CLAIM', cx+cw/2, cy+196, C.TEXT, 12, 'CENTER');
      });
    }
  }

  function drawGameOver() {
    tx('⊗', GW/2, GH/2-58, C.DANGER, 52, 'CENTER');
    tx('YOU HAVE BEEN UNMADE', GW/2, GH/2-8, C.DANGER, portrait?18:26, 'CENTER');
    tx('The sigils could not hold. The void consumes.', GW/2, GH/2+16, C.TEXT_DIM, 11, 'CENTER');
    dr(GW/2-80, GH/2+50, 160, 40, C.ACCENT, 6);
    tx('TRY AGAIN', GW/2, GH/2+76, C.TEXT, 13, 'CENTER');
  }
  function drawVictory() {
    tx('⊕', GW/2, GH/2-58, C.GOLD, 52, 'CENTER');
    tx('THE RITUAL IS COMPLETE', GW/2, GH/2-8, C.GOLD, portrait?18:26, 'CENTER');
    tx('The Sleeper stirs. The sigils hold — for now.', GW/2, GH/2+16, C.TEXT_DIM, 11, 'CENTER');
    dr(GW/2-80, GH/2+50, 160, 40, C.ACCENT, 6);
    tx('PLAY AGAIN', GW/2, GH/2+76, C.TEXT, 13, 'CENTER');
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  function updateHover(mx, my) {
    state.hover = null;
    if (state.screen==='combat') {
      const btn=endTurnBtn();
      if (ir(mx,my,btn.x,btn.y,btn.w,btn.h)) state.hover='endturn';
      if (state.combat) state.combat.hoverCell = gridCell(mx,my);
    }
    if (state.screen==='loot') {
      if (portrait) {
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,10,70+i*88,GW-20,80)) state.hover='loot'+i; });
      } else {
        const cw=190,gap=18,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) state.hover='loot'+i; });
      }
    }
  }

  function click(rawX, rawY) {
    const mx=toGameX(rawX), my=toGameY(rawY);
    updateHover(mx, my);

    if (state.screen==='title') {
      const ff=FLOORS[0];
      startCombat(ENEMIES.find(e=>e.id===ff.enemies[Math.floor(Math.random()*ff.enemies.length)]));
      state.screen='combat'; return;
    }
    if (state.screen==='gameover'||state.screen==='victory') {
      if (ir(mx,my,GW/2-80,GH/2+50,160,40)) initState();
      return;
    }
    if (state.screen==='loot') {
      if (portrait) {
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,10,70+i*88,GW-20,80)) pickLoot(i); });
      } else {
        const cw=190,gap=18,total=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-total/2;
        state.lootOptions.forEach((_,i)=>{ if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) pickLoot(i); });
      }
      return;
    }
    if (state.screen==='combat') {
      const {combat} = state;
      const btn=endTurnBtn();
      if (ir(mx,my,btn.x,btn.y,btn.w,btn.h)) { endTurn(); return; }

      const hl=handLayout();
      const {hY,cardW,cardH,gap}=hl;
      const n=combat.hand.length;
      const sx=portrait?(GW-n*(cardW+gap)+gap)/2:hl.RX;
      for (let i=0; i<n; i++) {
        if (ir(mx,my,sx+i*(cardW+gap),hY,cardW,cardH)) {
          if (combat.selected===i) {
            combat.hand[i].rotation=(combat.hand[i].rotation+1)%4;
            combat.hoverCell=null;
          } else { combat.selected=i; }
          return;
        }
      }

      const cell=gridCell(mx,my);
      if (cell&&combat.selected!==null) { placePiece(combat.selected,cell[0],cell[1]); return; }
      if (!cell) combat.selected=null;
    }
  }

  p.setup = function() {
    relayout();
    p.createCanvas(VW, VH);
    p.textFont('Courier New');
    initState();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', ()=>{ relayout(); p.resizeCanvas(VW,VH); });
    }
  };
  p.windowResized = function() { relayout(); p.resizeCanvas(VW,VH); };
  p.draw = function() {
    if (state.msgTimer>0) state.msgTimer--;
    p.background(C.VOID);
    p.push(); p.translate(ox,oy); p.scale(sc);
    switch (state.screen) {
      case 'title':    drawTitle();    break;
      case 'combat':   portrait?drawCombatPort():drawCombatLand(); break;
      case 'loot':     drawLoot();     break;
      case 'gameover': drawGameOver(); break;
      case 'victory':  drawVictory();  break;
    }
    p.pop();
  };
  p.mouseMoved = p.mouseDragged = function() { updateHover(toGameX(p.mouseX), toGameY(p.mouseY)); };
  p.mouseClicked = function() { click(p.mouseX, p.mouseY); };
  p.touchStarted = function() {
    if (p.touches.length>0) click(p.touches[0].x, p.touches[0].y);
    return false;
  };
});

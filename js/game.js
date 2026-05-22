// SIGIL RITES

const C = {
  VOID:'#f7f2ea', DEEP:'#e8e2d4', PANEL:'#fdfbf8', PANEL_ALT:'#f0e9db',
  BORDER:'#c8bca6', ACCENT:'#6d28d9', ACCENT2:'#7c3aed',
  DANGER:'#c41c1c', GOLD:'#d97706', TEXT:'#1c1917',
  TEXT_DIM:'#57534e', TEXT_MUT:'#a8a29e',
  HP_FG:'#15803d', HP_BG:'#dcfce7', EN_FG:'#c41c1c', EN_BG:'#fee2e2'
};

const TSIGILS = [
  {id:'void',  sym:'⊕', color:'#7c3aed', fx:'heal',   fxLabel:'HEAL/combo'},
  {id:'blood', sym:'⊗', color:'#dc2626', fx:'bonus',  fxLabel:'+3 dmg'},
  {id:'star',  sym:'⊛', color:'#d97706', fx:'double', fxLabel:'x2 on x4+'},
  {id:'bone',  sym:'◈', color:'#78716c', fx:'lone',   fxLabel:'x2 if alone'},
  {id:'dream', sym:'⊜', color:'#0284c7', fx:'stun',   fxLabel:'stun on x3+'},
  {id:'rift',  sym:'✶', color:'#15803d', fx:'draw',   fxLabel:'+1 card'},
];

const EDGE_SYMS = ['▲','●','■','★'];
const EDGE_COLS = ['#ef4444','#3b82f6','#9333ea','#f59e0b'];

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
  {id:'extra-hp',  name:'Void Vitality',   glyph:'♥', desc:'+10 max HP, restore 10.',      color:'#15803d'},
  {id:'heal',      name:'Ritual Mending',  glyph:'⊕', desc:'Restore 15 HP.',               color:'#16a34a'},
  {id:'power',     name:'Sigil of Power',  glyph:'⊛', desc:'+1 base damage per piece.',    color:'#d97706'},
  {id:'combo-amp', name:'Echo Resonance',  glyph:'◆', desc:'+1 to all combo multipliers.',  color:'#7c3aed'},
  {id:'ward',      name:'Void Ward',       glyph:'⊜', desc:'Enemy voids one fewer cell.',   color:'#0284c7'},
];

const BOARD_COLS = 13, BOARD_ROWS = 8;

function isUp(r,c){return(r+c)%2===0;}

function triVerts(BX,BY,r,c,S){
  const H=S*Math.sqrt(3)/2, x0=BX+c*S/2, y0=BY+r*H;
  return isUp(r,c)
    ?[[x0+S/2,y0],[x0,y0+H],[x0+S,y0+H]]
    :[[x0,y0],[x0+S,y0],[x0+S/2,y0+H]];
}

function triCenter(BX,BY,r,c,S){
  const v=triVerts(BX,BY,r,c,S);
  return[(v[0][0]+v[1][0]+v[2][0])/3,(v[0][1]+v[1][1]+v[2][1])/3];
}

function triNeighbors(r,c){
  return isUp(r,c)?[
    {nr:r,   nc:c+1, myEdge:2, thEdge:2},
    {nr:r,   nc:c-1, myEdge:0, thEdge:1},
    {nr:r+1, nc:c,   myEdge:1, thEdge:0},
  ]:[
    {nr:r,   nc:c-1, myEdge:2, thEdge:2},
    {nr:r,   nc:c+1, myEdge:1, thEdge:0},
    {nr:r-1, nc:c,   myEdge:0, thEdge:1},
  ];
}

function nearestCell(mx,my,BX,BY,S){
  const H=S*Math.sqrt(3)/2;
  const roughR=Math.round((my-BY)/H), roughC=Math.round((mx-BX)/(S/2));
  let best=null, bestD=Infinity;
  for(let dr=-2;dr<=2;dr++) for(let dc=-3;dc<=3;dc++){
    const r=roughR+dr, c=roughC+dc;
    if(r<0||c<0||r>=BOARD_ROWS||c>=BOARD_COLS) continue;
    const[cx,cy]=triCenter(BX,BY,r,c,S);
    const d=(mx-cx)**2+(my-cy)**2;
    if(d<bestD){bestD=d;best=[r,c];}
  }
  return best;
}

function getPlayableCells(board,voided){
  const cells=new Set();
  if(board.size===0){
    for(let r=0;r<BOARD_ROWS;r++) for(let c=0;c<BOARD_COLS;c++){
      const k=r+','+c; if(!voided.has(k)) cells.add(k);
    }
  } else {
    board.forEach((_,key)=>{
      const[r,c]=key.split(',').map(Number);
      for(const{nr,nc}of triNeighbors(r,c)){
        const nk=nr+','+nc;
        if(!board.has(nk)&&!voided.has(nk)&&nr>=0&&nr<BOARD_ROWS&&nc>=0&&nc<BOARD_COLS) cells.add(nk);
      }
    });
  }
  return cells;
}

function randomPiece(){
  const sig=TSIGILS[Math.floor(Math.random()*TSIGILS.length)];
  return{sigilId:sig.id,edges:[Math.floor(Math.random()*4),Math.floor(Math.random()*4),Math.floor(Math.random()*4)],rotation:0};
}

function rotatedEdges(piece){
  const e=piece.edges, rot=piece.rotation%3;
  if(rot===1) return[e[2],e[0],e[1]];
  if(rot===2) return[e[1],e[2],e[0]];
  return[...e];
}

let state;
function initState(handSize){
  state={
    screen:'title', floor:1,
    player:{hp:30,maxHp:30,baseDmg:4,comboBonus:0,handSize:handSize||3,voidWard:0},
    combat:null, lootOptions:[], msg:null, msgTimer:0, hover:null
  };
}

function makeHand(n){return Array.from({length:n},randomPiece);}

function startCombat(def){
  state.combat={
    enemy:{...def,curHp:def.hp},
    board:new Map(), voided:new Set(),
    hand:makeHand(state.player.handSize),
    selected:null, hoverCell:null, power:0, stunned:false,
    particles:[], streak:0, flash:null,
    phase:'player', enemyQueue:[], enemyTimer:0, enemyCombo:0
  };
}

function showMsg(m){state.msg=m;state.msgTimer=230;}

function countMatches(board,r,c,edges){
  let n=0;
  for(const{nr,nc,myEdge,thEdge}of triNeighbors(r,c)){
    const nb=board.get(nr+','+nc);
    if(nb&&edges[myEdge]===nb.edges[thEdge]) n++;
  }
  return n;
}

function hasNeighbor(board,r,c){
  return triNeighbors(r,c).some(({nr,nc})=>board.has(nr+','+nc));
}

function multiplier(matches,comboBonus){
  if(matches===0) return 1+comboBonus;
  if(matches===1) return 2+comboBonus;
  if(matches===2) return 3+comboBonus;
  return 4+comboBonus;
}

function applyEffect(sigilId,multi,r,c){
  const{combat,player}=state;
  const sig=TSIGILS.find(s=>s.id===sigilId);
  switch(sig.fx){
    case 'heal':   if(multi>=2){const h=multi-1;player.hp=Math.min(player.maxHp,player.hp+h);return '+'+h+'HP';}break;
    case 'bonus':  combat.power+=3;return '+3!';
    case 'double': if(multi>=4){combat.power+=player.baseDmg*multi;return 'DOUBLE!';}break;
    case 'lone':   if(!hasNeighbor(combat.board,r,c)){combat.power+=player.baseDmg;return 'LONE x2!';}break;
    case 'stun':   if(multi>=3){combat.stunned=true;return 'STUNNED!';}break;
    case 'draw':   if(combat.hand.length<7){combat.hand.push(randomPiece());return '+1 card!';}break;
  }
  return null;
}

function placePiece(hIdx,r,c){
  const{combat,player}=state;
  if(combat.phase!=='player') return;
  const piece=combat.hand[hIdx]; if(!piece) return;
  const key=r+','+c;
  if(combat.board.has(key)||combat.voided.has(key)){showMsg('Occupied!');return;}
  if(combat.board.size>0&&!hasNeighbor(combat.board,r,c)){
    showMsg('Must place adjacent to existing sigils!');return;
  }
  const edges=rotatedEdges(piece);
  const sig=TSIGILS.find(s=>s.id===piece.sigilId);
  const isolated=!hasNeighbor(combat.board,r,c);
  const matches=countMatches(combat.board,r,c,edges);
  const multi=multiplier(matches,player.comboBonus);
  const effectiveMult=(sig.fx==='lone'&&isolated)?Math.max(multi,2):multi;
  const dmg=player.baseDmg*effectiveMult;
  combat.board.set(key,{edges,sigilId:piece.sigilId,owner:'player'});
  combat.power+=dmg;
  combat.hand.splice(hIdx,1);
  combat.selected=null; combat.hoverCell=null;
  if(effectiveMult>=2){combat.streak++;}else{combat.streak=0;}
  if(effectiveMult>=4){combat.flash={r,c,timer:40,color:C.GOLD};}
  else if(effectiveMult>=3){combat.flash={r,c,timer:25,color:C.ACCENT2};}
  const ptColor=effectiveMult>=4?C.GOLD:effectiveMult>=3?C.ACCENT2:effectiveMult>=2?C.ACCENT:C.TEXT_DIM;
  combat.particles.push({r,c,yOff:0,life:80,maxLife:80,text:'+'+dmg,color:ptColor,big:effectiveMult>=3});
  const fxMsg=applyEffect(piece.sigilId,effectiveMult,r,c);
  const tier=effectiveMult>=4?'RESONANCE! ':effectiveMult>=3?'ECHO! ':effectiveMult>=2?'LINK! ':'';
  const chain=combat.streak>=3?' (CHAIN x'+combat.streak+')':combat.streak>=2?' (chain!)':'';
  showMsg(tier+'x'+effectiveMult+'  +'+dmg+'dmg'+(fxMsg?' · '+fxMsg:'')+chain);
}

function addVoidCells(combat){
  const voids=Math.max(0,(combat.enemy.voids||1)-state.player.voidWard);
  if(voids<=0) return;
  const cands=[];
  combat.board.forEach((_,key)=>{
    const[r,c]=key.split(',').map(Number);
    for(const{nr,nc}of triNeighbors(r,c)){
      const nk=nr+','+nc;
      if(!combat.board.has(nk)&&!combat.voided.has(nk)&&nr>=0&&nr<BOARD_ROWS&&nc>=0&&nc<BOARD_COLS) cands.push(nk);
    }
  });
  for(let i=cands.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cands[i],cands[j]]=[cands[j],cands[i]];}
  cands.slice(0,voids).forEach(k=>combat.voided.add(k));
}

function endTurn(){
  const{combat,player}=state;
  if(combat.phase!=='player') return;
  let dealtMsg='';
  if(combat.power>0){
    dealtMsg='Dealt '+combat.power+'dmg. ';
    combat.enemy.curHp=Math.max(0,combat.enemy.curHp-combat.power);
    if(combat.enemy.curHp<=0){
      showMsg(combat.enemy.name+' annihilated! ('+combat.power+'dmg)');
      setTimeout(()=>transitionToLoot(),700);
      return;
    }
  }
  const voids=Math.max(1,(combat.enemy.voids||1)-player.voidWard);
  combat.enemyQueue=makeHand(voids);
  combat.enemyTimer=0;
  combat.enemyCombo=0;
  combat.power=0;
  combat.streak=0;
  combat.selected=null;
  combat.hoverCell=null;
  combat.particles=[];
  combat.phase='enemy';
  showMsg(dealtMsg+'Enemy rises to play...');
}

function tickEnemyTurn(){
  const{combat,player}=state;
  combat.enemyTimer++;
  if(combat.enemyTimer<55) return;
  combat.enemyTimer=0;
  if(combat.enemyQueue.length>0){
    const piece=combat.enemyQueue.shift();
    const playable=getPlayableCells(combat.board,combat.voided);
    if(playable.size>0){
      const cells=[...playable];
      const key=cells[Math.floor(Math.random()*cells.length)];
      const[r,c]=key.split(',').map(Number);
      const edges=rotatedEdges(piece);
      combat.board.set(key,{edges,sigilId:piece.sigilId,owner:'enemy'});
      const matches=countMatches(combat.board,r,c,edges);
      if(matches>0){
        combat.enemyCombo+=matches;
        const mc=multiplier(matches,0);
        combat.particles.push({r,c,yOff:0,life:90,maxLife:90,text:'ENEMY x'+mc,color:C.DANGER,big:matches>=2});
      }
      const rem=combat.enemyQueue.length;
      showMsg('Enemy places a sigil'+(rem>0?' ('+rem+' more)':'')+'!');
    } else {
      combat.enemyQueue=[];
    }
  } else {
    let msg='';
    if(!combat.stunned){
      const atkDmg=combat.enemy.atk+combat.enemyCombo;
      player.hp=Math.max(0,player.hp-atkDmg);
      if(player.hp<=0){state.screen='gameover';return;}
      addVoidCells(combat);
      msg='Enemy strikes '+(combat.enemyCombo>0?atkDmg+' ('+combat.enemy.atk+'+'+combat.enemyCombo+' combo)!':combat.enemy.atk+'!');
    } else {
      msg='Enemy was STUNNED — skips!';
    }
    if(combat.board.size>0&&getPlayableCells(combat.board,combat.voided).size===0){
      combat.voided.clear(); msg+=' Void overflow!';
    }
    showMsg(msg+' Your turn.');
    combat.phase='player';
    combat.hand=makeHand(player.handSize);
    combat.stunned=false;
    combat.enemyCombo=0;
  }
}

function transitionToLoot(){
  state.lootOptions=[...LOOT_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  state.screen='loot';
}

function pickLoot(i){
  const item=state.lootOptions[i]; if(!item) return;
  const pl=state.player;
  if(item.id==='extra-hp'){pl.maxHp+=10;pl.hp=Math.min(pl.maxHp,pl.hp+10);}
  else if(item.id==='heal'){pl.hp=Math.min(pl.maxHp,pl.hp+15);}
  else if(item.id==='power'){pl.baseDmg+=1;}
  else if(item.id==='combo-amp'){pl.comboBonus+=1;}
  else if(item.id==='ward'){pl.voidWard+=1;}
  const next=FLOORS.find(f=>f.id===state.floor+1);
  if(next){state.floor++;startCombat(ENEMIES.find(e=>e.id===next.enemies[Math.floor(Math.random()*next.enemies.length)]));state.screen='combat';}
  else state.screen='victory';
}

new p5(function(p){

  let GW,GH,sc,portrait,ox,oy,VW,VH,TRI_S,BX,BY;

  function vw(){return window.visualViewport?window.visualViewport.width:window.innerWidth;}
  function vh(){return window.visualViewport?window.visualViewport.height:window.innerHeight;}

  function relayout(){
    VW=vw();VH=vh();portrait=VH>VW;
    GW=portrait?390:800;GH=portrait?760:600;
    sc=Math.min(VW/GW,VH/GH);ox=(VW-GW*sc)/2;oy=(VH-GH*sc)/2;
    if(portrait){
      TRI_S=50;
      const bw=BOARD_COLS*TRI_S/2+TRI_S;
      BX=Math.floor((GW-bw)/2);BY=170;
    } else {
      TRI_S=50;
      BX=8;BY=Math.floor((GH-BOARD_ROWS*TRI_S*Math.sqrt(3)/2)/2);
    }
  }

  function toGX(x){return(x-ox)/sc;}
  function toGY(y){return(y-oy)/sc;}

  function dr(x,y,w,h,col,r){p.fill(col);p.noStroke();r?p.rect(x,y,w,h,r):p.rect(x,y,w,h);}
  function dro(x,y,w,h,col,sw,r){p.noFill();p.stroke(col);p.strokeWeight(sw);r?p.rect(x,y,w,h,r):p.rect(x,y,w,h);p.noStroke();}
  function tx(s,x,y,col,sz,al){p.fill(col);p.noStroke();p.textSize(sz);p.textAlign(al||p.LEFT);p.text(s,x,y);}
  function ir(mx,my,x,y,w,h){return mx>=x&&mx<=x+w&&my>=y&&my<=y+h;}
  function bar(x,y,w,h,cur,max,fg,bg,lbl){
    dr(x,y,w,h,bg);dr(x,y,Math.round(w*Math.max(0,cur)/Math.max(1,max)),h,fg);
    dro(x,y,w,h,C.BORDER,1);tx(lbl+': '+Math.max(0,cur)+'/'+max,x+4,y+h-4,C.TEXT,9);
  }

  function drawTri(verts,edges,sigilId,alpha,owner){
    const sig=TSIGILS.find(s=>s.id===sigilId);
    const[v0,v1,v2]=verts;
    const cx=(v0[0]+v1[0]+v2[0])/3, cy=(v0[1]+v1[1]+v2[1])/3;
    const fill=p.color(sig.color); fill.setAlpha(alpha*0.45);
    p.fill(fill);
    const strkHex=owner==='enemy'?C.DANGER:sig.color;
    const strk=p.color(strkHex); strk.setAlpha(alpha);
    p.stroke(strk); p.strokeWeight(owner==='enemy'?2.8:1.8);
    p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]); p.noStroke();
    const symCol=p.color(sig.color); symCol.setAlpha(alpha);
    p.fill(symCol); p.textSize(TRI_S*0.28); p.textAlign(p.CENTER,p.CENTER);
    p.text(sig.sym,cx,cy);
    if(owner==='enemy'){
      const ec=p.color(C.DANGER); ec.setAlpha(alpha*0.8);
      p.fill(ec); p.noStroke(); p.textSize(TRI_S*0.15); p.textAlign(p.CENTER,p.CENTER);
      p.text('⊗',cx,cy+TRI_S*0.24);
    }
    const ep=[[v0,v1],[v1,v2],[v2,v0]];
    ep.forEach(function(pair,i){
      const ea=pair[0],eb=pair[1];
      const ex=(ea[0]+eb[0])/2*0.7+cx*0.3;
      const ey=(ea[1]+eb[1])/2*0.7+cy*0.3;
      const icol=p.color(EDGE_COLS[edges[i]]); icol.setAlpha(alpha);
      const ibg=p.color(C.PANEL); ibg.setAlpha(alpha*0.92);
      p.fill(ibg); p.stroke(icol); p.strokeWeight(1.4);
      p.circle(ex,ey,TRI_S*0.36); p.noStroke();
      p.fill(icol); p.textSize(TRI_S*0.22); p.textAlign(p.CENTER,p.CENTER);
      p.text(EDGE_SYMS[edges[i]],ex,ey);
    });
  }

  function drawMiniTri(sigilId,edges,rotation,cx,cy,size){
    const piece={sigilId,edges,rotation};
    const re=rotatedEdges(piece);
    const sig=TSIGILS.find(s=>s.id===sigilId);
    const h=size*Math.sqrt(3)/2;
    const v=[[cx,cy-h*0.6],[cx-size/2,cy+h*0.4],[cx+size/2,cy+h*0.4]];
    p.fill(sig.color+'66'); p.stroke(sig.color); p.strokeWeight(1.8);
    p.triangle(v[0][0],v[0][1],v[1][0],v[1][1],v[2][0],v[2][1]); p.noStroke();
    p.fill(sig.color); p.textSize(size*0.26); p.textAlign(p.CENTER,p.CENTER);
    p.text(sig.sym,cx,cy+h*0.05);
    const ep=[[v[0],v[1]],[v[1],v[2]],[v[2],v[0]]];
    ep.forEach(function(pair,i){
      const ea=pair[0],eb=pair[1];
      const ex=(ea[0]+eb[0])/2*0.72+cx*0.28;
      const ey=(ea[1]+eb[1])/2*0.72+cy*0.28;
      p.fill(C.PANEL+'ee'); p.stroke(EDGE_COLS[re[i]]); p.strokeWeight(1.2);
      p.circle(ex,ey,size*0.34); p.noStroke();
      p.fill(EDGE_COLS[re[i]]); p.textSize(size*0.2); p.textAlign(p.CENTER,p.CENTER);
      p.text(EDGE_SYMS[re[i]],ex,ey);
    });
  }

  function drawEnemyPortrait(id,color,cx,cy){
    const t=p.frameCount;
    p.push();
    p.translate(cx,cy);
    if(id==='herald'){
      p.noStroke(); p.fill(color+'22'); p.ellipse(0,0,62,66);
      p.fill(color+'55'); p.stroke(color+'cc'); p.strokeWeight(1.5);
      p.triangle(0,-5,-21,26,21,26);
      p.fill(color+'88');
      p.quad(0,-37,14,-19,0,-5,-14,-19);
      p.fill(color); p.noStroke();
      p.ellipse(-6,-25,5,7); p.ellipse(6,-25,5,7);
      const pu=Math.sin(t*0.05)*2;
      p.stroke(color); p.strokeWeight(1.5); p.noFill();
      p.line(-11,-33,-16,-44-pu);
      p.line(0,-37,0,-50-pu);
      p.line(11,-33,16,-44-pu);
      p.fill(color); p.noStroke();
      p.textSize(10); p.textAlign(p.CENTER,p.CENTER);
      p.text('◈',0,13);
    } else if(id==='watcher'){
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2-Math.PI/2;
        const r1=32,r2=i%3===0?38:35;
        p.stroke(color+'77'); p.strokeWeight(1); p.noFill();
        p.line(Math.cos(a)*r1,Math.sin(a)*r1*0.58,Math.cos(a)*r2,Math.sin(a)*r2*0.58);
      }
      const ha=t*0.03;
      p.stroke(color+'cc'); p.strokeWeight(1.5); p.noFill();
      p.line(0,0,Math.cos(ha)*23,Math.sin(ha)*13);
      p.fill(color+'28'); p.stroke(color); p.strokeWeight(1.8);
      p.ellipse(0,0,62,32);
      p.fill(color+'99'); p.noStroke();
      p.ellipse(0,0,30,30);
      const px3=Math.sin(t*0.02)*5, py3=Math.cos(t*0.015)*3;
      p.fill(15,8,30);
      p.ellipse(px3,py3,16,16);
      p.fill(255,255,255,180);
      p.ellipse(px3-3,py3-3,5,5);
      p.stroke(color); p.strokeWeight(1.2); p.noFill();
      [-20,-10,0,10,20].forEach(function(lx,li){
        const frac=lx/31;
        const ly=-15.5*Math.sqrt(Math.max(0,1-frac*frac));
        const da=Math.PI*(-0.75+li*0.375);
        p.line(lx,ly,lx+Math.cos(da)*6,ly+Math.sin(da)*6);
      });
    } else if(id==='choir'){
      const pos=[[-1,-21],[18,10],[-20,10]];
      pos.forEach(function(fp,idx){
        const fx=fp[0], fy=fp[1];
        const ph=t*0.035+idx*Math.PI*2/3;
        const br=Math.sin(ph)*2;
        p.fill(color+'60'); p.stroke(color+'cc'); p.strokeWeight(1.2);
        p.ellipse(fx,fy+br,25,29);
        p.fill(color); p.noStroke();
        p.ellipse(fx-5,fy-3+br,4,6);
        p.ellipse(fx+5,fy-3+br,4,6);
        const mo=8+Math.abs(Math.sin(ph))*5;
        p.fill(30,15,45); p.stroke(color+'88'); p.strokeWeight(0.8);
        p.ellipse(fx,fy+8+br,7,mo);
      });
    } else if(id==='sleeper'){
      const pu=Math.sin(t*0.02)*3;
      const tents=[[-33,24],[-17,30],[0,33],[17,30],[33,24]];
      p.noFill(); p.strokeWeight(1.5);
      tents.forEach(function(tp,i){
        const tx3=tp[0], ty3=tp[1];
        const sw=Math.sin(t*0.025+i*0.8)*5;
        p.stroke(color+'88');
        p.line(tx3*0.3,15,tx3*0.6,ty3*0.55+sw);
        p.stroke(color+'55');
        p.line(tx3*0.6,ty3*0.55+sw,tx3,ty3+sw*1.5);
      });
      p.fill(color+'55'); p.stroke(color); p.strokeWeight(2);
      p.ellipse(0,3,76,48+pu);
      p.fill(25,12,45); p.noStroke();
      p.ellipse(-21,-3,21,13); p.ellipse(21,-3,21,13);
      p.fill(color+'dd');
      p.ellipse(-21,2.5,9,8); p.ellipse(21,2.5,9,8);
      p.fill(15,8,25);
      p.ellipse(-21,3.5,4,3.5); p.ellipse(21,3.5,4,3.5);
      p.noFill(); p.stroke(color); p.strokeWeight(2.5);
      p.line(-32,-8,-10,-10);
      p.line(10,-10,32,-8);
      p.strokeWeight(1.5); p.stroke(color+'99');
      p.line(-11,15,11,15);
      p.fill(C.GOLD); p.noStroke();
      p.textSize(9); p.textAlign(p.CENTER,p.CENTER);
      p.text('⊜',0,-28);
    }
    p.pop();
  }

  function boardBottom(){return BY+BOARD_ROWS*TRI_S*Math.sqrt(3)/2;}

  function drawHints(board,voided){
    const shown=new Set();
    board.forEach((_,key)=>{
      const[r,c]=key.split(',').map(Number);
      for(const{nr,nc}of triNeighbors(r,c)){
        const nk=nr+','+nc;
        if(board.has(nk)||voided.has(nk)||shown.has(nk)||nr<0||nc<0||nr>=BOARD_ROWS||nc>=BOARD_COLS) continue;
        const[v0,v1,v2]=triVerts(BX,BY,nr,nc,TRI_S);
        p.noFill();p.stroke(C.ACCENT+'55');p.strokeWeight(1.2);
        p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]);p.noStroke();
        shown.add(nk);
      }
    });
    if(board.size===0){
      const cr=Math.floor(BOARD_ROWS/2),cc=Math.floor(BOARD_COLS/2);
      for(let dr=-1;dr<=1;dr++) for(let dc=-2;dc<=2;dc++){
        const r=cr+dr,c=cc+dc;
        if(r<0||c<0||r>=BOARD_ROWS||c>=BOARD_COLS) continue;
        const[v0,v1,v2]=triVerts(BX,BY,r,c,TRI_S);
        p.noFill();p.stroke(C.ACCENT+'33');p.strokeWeight(1);
        p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]);p.noStroke();
      }
    }
  }

  function drawBoard(combat){
    const{board,voided,hand,selected,hoverCell,particles,flash,phase}=combat;
    const H=TRI_S*Math.sqrt(3)/2;
    const bw=BOARD_COLS*TRI_S/2+TRI_S, bh=BOARD_ROWS*H;
    dr(BX-4,BY-4,bw+8,bh+8,C.DEEP,6);
    dro(BX-4,BY-4,bw+8,bh+8,C.BORDER,1,6);

    if(phase==='player'&&selected!==null) drawHints(board,voided);

    board.forEach(function(cell,key){
      const[r,c]=key.split(',').map(Number);
      drawTri(triVerts(BX,BY,r,c,TRI_S),cell.edges,cell.sigilId,255,cell.owner);
    });

    if(flash&&flash.timer>0){
      const{r,c,color}=flash;
      const[v0,v1,v2]=triVerts(BX,BY,r,c,TRI_S);
      const fc=p.color(color); fc.setAlpha((flash.timer/40)*180);
      p.fill(fc);p.noStroke();
      p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]);
      flash.timer--;
    }

    voided.forEach(function(key){
      const[r,c]=key.split(',').map(Number);
      const[v0,v1,v2]=triVerts(BX,BY,r,c,TRI_S);
      const cx2=(v0[0]+v1[0]+v2[0])/3,cy2=(v0[1]+v1[1]+v2[1])/3;
      p.fill(C.DANGER+'22');p.stroke(C.DANGER+'77');p.strokeWeight(1);
      p.triangle(v0[0],v0[1],v1[0],v1[1],v2[0],v2[1]);p.noStroke();
      p.stroke(C.DANGER+'aa');p.strokeWeight(1.5);
      const s=TRI_S*0.14;
      p.line(cx2-s,cy2-s,cx2+s,cy2+s);p.line(cx2+s,cy2-s,cx2-s,cy2+s);p.noStroke();
    });

    if(phase==='player'&&selected!==null&&hoverCell){
      const[r,c]=hoverCell, key=r+','+c;
      const valid=!board.has(key)&&!voided.has(key)&&(board.size===0||hasNeighbor(board,r,c));
      if(valid){
        const piece=hand[selected];
        const edges=rotatedEdges(piece);
        const verts=triVerts(BX,BY,r,c,TRI_S);
        drawTri(verts,edges,piece.sigilId,110,'player');
        const[v0,v1,v2]=verts;
        const ep=[[v0,v1],[v1,v2],[v2,v0]];
        for(const{nr,nc,myEdge,thEdge}of triNeighbors(r,c)){
          const nb=board.get(nr+','+nc);
          if(!nb) continue;
          const match=edges[myEdge]===nb.edges[thEdge];
          const[ea,eb]=ep[myEdge];
          p.stroke(match?C.HP_FG:C.DANGER);p.strokeWeight(3.5);
          p.line(ea[0],ea[1],eb[0],eb[1]);p.noStroke();
        }
        const matches=countMatches(board,r,c,edges);
        const multi=multiplier(matches,state.player.comboBonus);
        if(multi>1){
          const[gcx,gcy]=triCenter(BX,BY,r,c,TRI_S);
          const col=multi>=4?C.GOLD:multi>=3?C.ACCENT2:C.ACCENT;
          const pulse=0.7+0.3*Math.sin(p.frameCount*0.18);
          p.fill(col);p.noStroke();p.textSize(13*pulse);p.textAlign(p.CENTER,p.CENTER);
          p.text('x'+multi,gcx,gcy-H*0.55);
        }
      }
    }

    for(let i=particles.length-1;i>=0;i--){
      const pt=particles[i];
      pt.yOff-=1.2;pt.life--;
      if(pt.life<=0){particles.splice(i,1);continue;}
      const[pcx,pcy]=triCenter(BX,BY,pt.r,pt.c,TRI_S);
      const ac=p.color(pt.color); ac.setAlpha((pt.life/pt.maxLife)*220);
      p.fill(ac);p.noStroke();
      p.textSize(pt.big?16:12);p.textAlign(p.CENTER,p.CENTER);
      p.text(pt.text,pcx,pcy+pt.yOff);
    }
  }

  function handLayout(){
    if(portrait){
      const hY=boardBottom()+12;
      const n=state.combat?Math.max(state.combat.hand.length,1):state.player.handSize;
      const cardW=Math.min(110,Math.floor((GW-16)/n)-6);
      return{hY,cardW,cardH:100,gap:6,sx:(GW-(n*(cardW+6)-6))/2};
    } else {
      const RX=BX+(BOARD_COLS*TRI_S/2+TRI_S)+14, RW=GW-RX-10;
      return{hY:290,cardW:Math.floor(RW/3)-4,cardH:100,gap:4,RX,RW};
    }
  }

  function btnRect(){
    if(portrait){const{hY,cardH}=handLayout();return{x:GW/2-90,y:hY+cardH+10,w:180,h:44};}
    const{hY,cardH,RX,RW}=handLayout();return{x:RX,y:hY+cardH+10,w:RW,h:44};
  }

  function drawHandCards(hand,selected){
    const hl=handLayout(), {hY,cardW,cardH,gap}=hl;
    const sx=portrait?hl.sx:hl.RX;
    hand.forEach((piece,i)=>{
      const cx=sx+i*(cardW+gap), sel=selected===i;
      const sig=TSIGILS.find(s=>s.id===piece.sigilId);
      dr(cx,hY,cardW,cardH,sel?C.PANEL_ALT:C.PANEL,10);
      dro(cx,hY,cardW,cardH,sel?sig.color:C.BORDER,sel?2.5:1.5,10);
      drawMiniTri(piece.sigilId,piece.edges,piece.rotation,cx+cardW/2,hY+cardH*0.42,cardW*0.58);
      tx(sig.fxLabel,cx+cardW/2,hY+cardH-20,sel?sig.color:C.TEXT_DIM,8,p.CENTER);
      tx(sel?'tap: rotate':'tap to select',cx+cardW/2,hY+cardH-9,C.TEXT_MUT,7,p.CENTER);
    });
    if(!hand.length) tx('No sigils — end turn.',portrait?GW/2:hl.RX+hl.RW/2,hY+36,C.TEXT_DIM,10,p.CENTER);
  }

  function drawEnemyQueue(queue){
    const hl=handLayout(), {hY,cardW,cardH,gap}=hl;
    const sx=portrait?hl.sx:hl.RX;
    const lx=portrait?GW/2:hl.RX+hl.RW/2;
    if(queue.length>0){
      tx('ENEMY PLACING:',lx,hY-12,C.DANGER,9,p.CENTER);
      queue.forEach(function(piece,i){
        const cx=sx+i*(cardW+gap);
        dr(cx,hY,cardW,cardH,C.PANEL,10);
        dro(cx,hY,cardW,cardH,C.DANGER+'88',1.5,10);
        drawMiniTri(piece.sigilId,piece.edges,0,cx+cardW/2,hY+cardH*0.42,cardW*0.58);
        tx('INCOMING',cx+cardW/2,hY+cardH-9,C.DANGER+'bb',7,p.CENTER);
      });
    } else {
      tx('ENEMY RESOLVING...',lx,hY+36,C.DANGER,10,p.CENTER);
    }
  }

  function drawTitle(){
    const cx=GW/2, cy=GH/2;
    TSIGILS.forEach((sig,i)=>{
      const a=i/TSIGILS.length*Math.PI*2+p.frameCount*0.005, r=88;
      const tx2=cx+Math.cos(a)*r, ty2=cy+Math.sin(a)*r;
      const col=p.color(sig.color); col.setAlpha(90); p.fill(col); p.noStroke();
      p.triangle(tx2,ty2-20,tx2-17,ty2+10,tx2+17,ty2+10);
    });
    tx('SIGIL RITES',cx,cy-42,C.ACCENT,portrait?28:36,p.CENTER);
    tx('MATCH EDGE ICONS  BUILD COMBOS  SLAY HORRORS',cx,cy-22,C.TEXT_DIM,portrait?7.5:9,p.CENTER);
    tx('EDGE ICONS:',cx,cy+2,C.TEXT_DIM,9,p.CENTER);
    EDGE_SYMS.forEach((sym,i)=>{
      const lx=cx-54+i*36, ly=cy+16;
      p.fill(C.PANEL);p.stroke(EDGE_COLS[i]);p.strokeWeight(1.4);p.circle(lx,ly,24);p.noStroke();
      p.fill(EDGE_COLS[i]);p.textSize(12);p.textAlign(p.CENTER,p.CENTER);p.text(sym,lx,ly);
    });
    tx('Match icons on touching edges for LINK x2 / ECHO x3 / RESONANCE x4',cx,cy+36,C.TEXT_DIM,portrait?7:8,p.CENTER);
    tx('HOW MANY SIGILS PER TURN?',cx,cy+56,C.TEXT,11,p.CENTER);
    const modes=[['1','hardest'],['3','recommended'],['5','easiest']];
    const bw=86,bh=48,gap=10,tot=3*(bw+gap)-gap,bsx=cx-tot/2;
    modes.forEach(([lbl,sub],i)=>{
      const bx=bsx+i*(bw+gap), by=cy+70;
      const hov=state.hover===('mode'+(i===0?1:i===1?3:5));
      dr(bx,by,bw,bh,hov?C.ACCENT:C.PANEL,8);
      dro(bx,by,bw,bh,hov?C.ACCENT2:C.BORDER,hov?2:1.5,8);
      tx(lbl,bx+bw/2,by+24,hov?'#ffffff':C.TEXT,20,p.CENTER);
      tx(sub,bx+bw/2,by+40,hov?'#ffffffaa':C.TEXT_DIM,8,p.CENTER);
    });
    tx('SIGIL EFFECTS:',cx,cy+130,C.TEXT_DIM,9,p.CENTER);
    TSIGILS.forEach((sig,i)=>{
      const row=Math.floor(i/3),col2=i%3;
      const lx=cx-130+col2*90, ly=cy+146+row*16;
      tx(sig.sym+' '+sig.id,lx,ly,sig.color,8);
      tx(sig.fxLabel,lx+46,ly,C.TEXT_MUT,8);
    });
  }

  function drawCombatPort(){
    const{combat,player,floor}=state;
    const{enemy,hand,selected,power,stunned,streak,phase,enemyQueue}=combat;
    const fd=FLOORS.find(f=>f.id===floor), W=GW-20;
    dr(10,8,W,60,C.PANEL,8);
    dro(10,8,W,60,C.BORDER,1,8);
    tx('FLOOR '+floor+' — '+(fd?fd.name:''),15,22,C.TEXT_DIM,9);
    bar(15,26,W/2-10,16,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    tx('ATK '+player.baseDmg+(player.comboBonus>0?'+'+player.comboBonus+' cmb':''),15,56,C.TEXT_DIM,8);
    tx(enemy.name,GW/2+5,22,C.TEXT,9);
    bar(GW/2+5,26,W/2-10,16,enemy.curHp,enemy.hp,C.EN_FG,C.EN_BG,'ENEMY');
    tx(stunned?'STUNNED':'Atk '+enemy.atk,GW/2+5,56,stunned?C.GOLD:C.DANGER,8);
    if(phase==='player'){
      tx('PWR +'+power+(streak>=2?' CHAIN x'+streak:''),GW-12,56,power>0?C.GOLD:C.TEXT_DIM,8,p.RIGHT);
    } else {
      const pulse=0.7+0.3*Math.sin(p.frameCount*0.12);
      const ic=p.color(C.DANGER); ic.setAlpha(pulse*255);
      p.fill(ic); p.noStroke(); p.textSize(9); p.textAlign(p.RIGHT);
      p.text('ENEMY TURN',GW-12,56);
    }
    dr(10,74,W,88,C.PANEL,8);
    dro(10,74,W,88,C.BORDER,1,8);
    if(enemy.boss) tx('BOSS',GW/2,87,C.DANGER,8,p.CENTER);
    drawEnemyPortrait(enemy.id,enemy.color,GW/2,125);
    drawBoard(combat);
    if(phase==='player'){
      drawHandCards(hand,selected);
    } else {
      drawEnemyQueue(enemyQueue);
    }
    const btn=btnRect();
    const btnActive=phase==='player';
    dr(btn.x,btn.y,btn.w,btn.h,btnActive?(state.hover==='endturn'?'#991b1b':C.DANGER):C.BORDER,8);
    tx(btnActive?'END TURN':'ENEMY TURN',btn.x+btn.w/2,btn.y+btn.h*0.65,btnActive?'#ffffff':C.TEXT_DIM,15,p.CENTER);
    if(btnActive&&selected!==null) tx('tap board to place  |  tap card to rotate',GW/2,btn.y+btn.h+14,C.ACCENT,8,p.CENTER);
    if(state.msg&&state.msgTimer>0){
      const big=state.msg.includes('RESONANCE')||state.msg.includes('ECHO')||state.msg.includes('DOUBLE');
      const col=big?C.GOLD:state.msg.includes('Enemy')||state.msg.includes('enemy')?C.DANGER:C.TEXT;
      tx(state.msg,GW/2,btn.y+btn.h+28,col,big?11:10,p.CENTER);
    }
  }

  function drawCombatLand(){
    const{combat,player,floor}=state;
    const{enemy,hand,selected,power,stunned,streak,phase,enemyQueue}=combat;
    const fd=FLOORS.find(f=>f.id===floor);
    const hl=handLayout(),{RX,RW}=hl;
    tx('SIGIL BOARD',BX,BY-12,C.TEXT_DIM,9);
    drawBoard(combat);
    dr(RX,10,RW,68,C.PANEL,8);
    dro(RX,10,RW,68,C.BORDER,1,8);
    tx('FLOOR '+floor,RX+8,26,C.TEXT_DIM,10);
    tx(fd?fd.name:'',RX+8,40,C.TEXT,11);
    bar(RX+8,44,RW-16,18,player.hp,player.maxHp,C.HP_FG,C.HP_BG,'HP');
    if(phase==='player'){
      tx('YOUR TURN',RX+RW-8,26,C.HP_FG,9,p.RIGHT);
      tx('ATK '+player.baseDmg+(player.comboBonus>0?'+'+player.comboBonus:'')+(player.voidWard>0?' WRD'+player.voidWard:''),RX+RW-8,40,C.TEXT_DIM,9,p.RIGHT);
    } else {
      const pulse=0.7+0.3*Math.sin(p.frameCount*0.12);
      const ic=p.color(C.DANGER); ic.setAlpha(pulse*255);
      p.fill(ic); p.noStroke(); p.textSize(9); p.textAlign(p.RIGHT);
      p.text('ENEMY TURN',RX+RW-8,26);
      tx('ATK '+player.baseDmg+(player.comboBonus>0?'+'+player.comboBonus:'')+(player.voidWard>0?' WRD'+player.voidWard:''),RX+RW-8,40,C.TEXT_DIM,9,p.RIGHT);
    }
    dr(RX,86,RW,125,C.PANEL,8);
    dro(RX,86,RW,125,C.BORDER,1,8);
    tx(enemy.name,RX+8,102,C.TEXT,11);
    if(enemy.boss) tx('BOSS',RX+RW-10,102,C.DANGER,10,p.RIGHT);
    drawEnemyPortrait(enemy.id,enemy.color,RX+RW/2,162);
    bar(RX+8,214,RW-16,16,enemy.curHp,enemy.hp,C.EN_FG,C.EN_BG,'ENEMY HP');
    tx(stunned?'STUNNED — skips!':'Attacks '+enemy.atk+'/turn',RX+8,244,stunned?C.GOLD:C.DANGER,10);
    dr(RX,250,RW,28,C.DEEP,6);
    dro(RX,250,RW,28,C.BORDER,1,6);
    tx('PENDING: +'+power+(streak>=2?'  CHAIN x'+streak:''),RX+RW/2,268,power>0?C.GOLD:C.TEXT_DIM,12,p.CENTER);
    if(phase==='player'){
      drawHandCards(hand,selected);
    } else {
      drawEnemyQueue(enemyQueue);
    }
    const btn=btnRect();
    const btnActive=phase==='player';
    dr(btn.x,btn.y,btn.w,btn.h,btnActive?(state.hover==='endturn'?'#991b1b':C.DANGER):C.BORDER,8);
    tx(btnActive?'END TURN':'ENEMY TURN',btn.x+btn.w/2,btn.y+btn.h*0.65,btnActive?'#ffffff':C.TEXT_DIM,15,p.CENTER);
    if(btnActive&&selected!==null) tx('tap board to place  |  tap card to rotate',btn.x+btn.w/2,btn.y+btn.h+14,C.ACCENT,8,p.CENTER);
    if(state.msg&&state.msgTimer>0){
      const big=state.msg.includes('RESONANCE')||state.msg.includes('ECHO')||state.msg.includes('DOUBLE');
      const col=big?C.GOLD:state.msg.includes('Enemy')||state.msg.includes('enemy')?C.DANGER:C.TEXT;
      tx(state.msg,btn.x+btn.w/2,btn.y+btn.h+28,col,big?11:10,p.CENTER);
    }
  }

  function drawLoot(){
    const opts=state.lootOptions;
    tx('THE VOID OFFERS TRIBUTE',GW/2,40,C.ACCENT,portrait?16:20,p.CENTER);
    tx('Choose one boon:',GW/2,58,C.TEXT_DIM,11,p.CENTER);
    if(portrait){
      opts.forEach((item,i)=>{
        const y=70+i*92, W2=GW-20, hov=state.hover===('loot'+i);
        dr(10,y,W2,84,C.PANEL,10);
        dro(10,y,W2,84,hov?C.ACCENT:C.BORDER,hov?2:1.5,10);
        tx(item.glyph,34,y+50,item.color,24,p.CENTER);
        tx(item.name,54,y+24,C.TEXT,13);
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.LEFT);
        p.text(item.desc,54,y+38,W2-64,38);
        tx('TAP TO CLAIM',GW-16,y+76,hov?C.ACCENT:C.TEXT_MUT,9,p.RIGHT);
      });
    } else {
      const cw=190,gap=18,tot=opts.length*(cw+gap)-gap,sx=GW/2-tot/2;
      opts.forEach((item,i)=>{
        const cx=sx+i*(cw+gap),cy=78,hov=state.hover===('loot'+i);
        dr(cx,cy,cw,220,C.PANEL,12);
        dro(cx,cy,cw,220,hov?C.ACCENT:C.BORDER,hov?2:1.5,12);
        tx(item.glyph,cx+cw/2,cy+68,item.color,32,p.CENTER);
        tx(item.name,cx+cw/2,cy+92,C.TEXT,13,p.CENTER);
        p.fill(C.TEXT_DIM);p.noStroke();p.textSize(10);p.textAlign(p.CENTER);
        p.text(item.desc,cx+12,cy+110,cw-24,52);
        dr(cx+20,cy+174,cw-40,32,C.ACCENT,6);
        tx('CLAIM',cx+cw/2,cy+195,'#ffffff',12,p.CENTER);
      });
    }
  }

  function drawGameOver(){
    tx('⊗',GW/2,GH/2-58,C.DANGER,52,p.CENTER);
    tx('YOU HAVE BEEN UNMADE',GW/2,GH/2-8,C.DANGER,portrait?18:26,p.CENTER);
    tx('The sigils could not hold.',GW/2,GH/2+16,C.TEXT_DIM,11,p.CENTER);
    dr(GW/2-80,GH/2+50,160,40,C.ACCENT,6);
    tx('TRY AGAIN',GW/2,GH/2+76,'#ffffff',13,p.CENTER);
  }
  function drawVictory(){
    tx('⊕',GW/2,GH/2-58,C.GOLD,52,p.CENTER);
    tx('THE RITUAL IS COMPLETE',GW/2,GH/2-8,C.GOLD,portrait?18:26,p.CENTER);
    tx('The Sleeper stirs. The sigils hold.',GW/2,GH/2+16,C.TEXT_DIM,11,p.CENTER);
    dr(GW/2-80,GH/2+50,160,40,C.ACCENT,6);
    tx('PLAY AGAIN',GW/2,GH/2+76,'#ffffff',13,p.CENTER);
  }

  function modeN(i){return i===0?1:i===1?3:5;}
  function modeBounds(i){
    const bw=86,bh=48,gap=10,tot=3*(bw+gap)-gap,bsx=GW/2-tot/2;
    return{x:bsx+i*(bw+gap),y:GH/2+70,w:bw,h:bh};
  }

  function updateHover(mx,my){
    state.hover=null;
    if(state.screen==='title'){
      [0,1,2].forEach(i=>{
        const b=modeBounds(i);
        if(ir(mx,my,b.x,b.y,b.w,b.h)) state.hover='mode'+modeN(i);
      });
    }
    if(state.screen==='combat'&&state.combat&&state.combat.phase==='player'){
      const btn=btnRect();
      if(ir(mx,my,btn.x,btn.y,btn.w,btn.h)) state.hover='endturn';
      state.combat.hoverCell=nearestCell(mx,my,BX,BY,TRI_S);
    }
    if(state.screen==='loot'){
      if(portrait){state.lootOptions.forEach((_,i)=>{if(ir(mx,my,10,70+i*92,GW-20,84)) state.hover='loot'+i;});}
      else{const cw=190,gap=18,tot=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-tot/2;
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) state.hover='loot'+i;});}
    }
  }

  function click(rawX,rawY){
    const mx=toGX(rawX),my=toGY(rawY);
    updateHover(mx,my);
    if(state.screen==='title'){
      [0,1,2].forEach(i=>{
        const b=modeBounds(i);
        if(ir(mx,my,b.x,b.y,b.w,b.h)){
          initState(modeN(i));
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
      if(portrait){state.lootOptions.forEach((_,i)=>{if(ir(mx,my,10,70+i*92,GW-20,84)) pickLoot(i);});}
      else{const cw=190,gap=18,tot=state.lootOptions.length*(cw+gap)-gap,sx=GW/2-tot/2;
        state.lootOptions.forEach((_,i)=>{if(ir(mx,my,sx+i*(cw+gap),78,cw,220)) pickLoot(i);});}
      return;
    }
    if(state.screen==='combat'){
      const{combat}=state;
      if(combat.phase!=='player') return;
      const btn=btnRect();
      if(ir(mx,my,btn.x,btn.y,btn.w,btn.h)){endTurn();return;}
      const hl=handLayout(),{hY,cardW,cardH,gap}=hl,sx=portrait?hl.sx:hl.RX;
      for(let i=0;i<combat.hand.length;i++){
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
    if(state.screen==='combat'&&state.combat&&state.combat.phase==='enemy') tickEnemyTurn();
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

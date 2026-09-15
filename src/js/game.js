import startUrl from '../sounds/start.mp3';
import enterterminalUrl from '../sounds/enterterminal.mp3';
import selectUrl from '../sounds/select.mp3';
import coinUrl from '../sounds/coin.mp3';
import jumpUrl from '../sounds/jump.mp3';
import jumpingUrl from '../sounds/jumping.mp3';
import musicUrl from '../sounds/music.mp3';
import gameoverUrl from '../sounds/gameover.mp3';
import startrunUrl from '../sounds/startrun.mp3';
import runagainUrl from '../sounds/runagain.mp3';
import changeUrl from '../sounds/change.mp3';

import { saveScore, fetchLeaderboard } from './vercelApi.js';

// PLAYER LOGIN / LEADERBOARD
// Simple self-reported X/Twitter username. No OAuth required.
const loginOverlay = document.getElementById('arcLogin');
const demoLoginButton = document.getElementById('arcDemoLoginButton');
const usernameInput = document.getElementById('arcUsernameInput');
const loginStatus = document.getElementById('arcLoginStatus');
const leaderboardRows = document.getElementById('arcLeaderboardRows');
let currentPlayer = localStorage.getItem('arcscII_player') || '';

function cleanUsername(v){
  return String(v||'').trim().replace(/^@+/,'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,15);
}

function formatPoints(value){
  const n=Math.max(0,Number(value)||0);
  const units=[
    [1e18,'E'],[1e15,'P'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'k']
  ];
  for(const [unit,suffix] of units){
    if(n>=unit){
      const v=n/unit;
      // 1k, 1.2k, 10k, 100k, 1M, 1.5M, 1B, etc.
      const decimals=v<10?1:0;
      return v.toFixed(decimals).replace(/\.0$/,'')+suffix;
    }
  }
  return String(Math.floor(n));
}

async function refreshLeaderboard(){
  if(!leaderboardRows)return;
  const rows=await fetchLeaderboard();
  if(!rows.length){leaderboardRows.innerHTML='<div class="arcLeaderboardRow"><span>-</span><span>NO SCORES YET</span><span>0</span></div>';return;}
  leaderboardRows.innerHTML=rows.map((x,i)=>{
    const total=Math.max(0,Number(x.points)||0);
    const isMe=x.username===currentPlayer.toLowerCase();
    return `<div class="arcLeaderboardRow ${isMe?'me':''}"><span>#${i+1}</span><span>@${x.username}</span><span>${formatPoints(total)}</span></div>`;
  }).join('');
}

const bootLines = [
  'ARCSCII TERMINAL RUN',
  '> INITIALIZING GAME ENGINE... OK',
  '> LOADING ASCII WORLD... OK',
  '> CONNECTING ARC CHAIN... OK',
  '> MEME ENGINE........ ONLINE',
  '> ALL CHARACTERS...... ONLINE',
  '> READY TO WAR........ YES',
  '> SYSTEM READY'
];
let bootTimer=null;

function runBootSequence(){
  if(!bootText || !startButton)return;
  if(bootTimer)clearTimeout(bootTimer);
  bootText.innerHTML='';
  startButton.disabled=true;
  startButton.style.opacity='.45';
  startButton.style.cursor='not-allowed';

  let i=0;
  const showNext=()=>{
    if(i>=bootLines.length){
      startButton.disabled=false;
      startButton.style.opacity='1';
      startButton.style.cursor='pointer';
      return;
    }
    const line=document.createElement('div');
    line.textContent=bootLines[i++];
    bootText.appendChild(line);
    bootTimer=setTimeout(showNext,420);
  };
  showNext();
}

function finishLogin(username){
  const u=cleanUsername(username);
  if(!u){loginStatus.textContent='> ENTER A VALID X USERNAME';return false;}
  currentPlayer=u;
  localStorage.setItem('arcscII_player',u);
  loginStatus.textContent='> AUTHENTICATED: @'+u;
  playSfx('enterterminal');
  refreshLeaderboard();
  setTimeout(()=>{
    loginOverlay.style.display='none';
    startScreen.style.display='flex';
    runBootSequence();
  },250);
  return true;
}

if(currentPlayer){
  usernameInput.value='@'+currentPlayer;
  loginStatus.textContent='> SAVED PLAYER: @'+currentPlayer;
}

demoLoginButton.onclick=()=>finishLogin(usernameInput.value);
usernameInput.addEventListener('keydown',e=>{if(e.key==='Enter')demoLoginButton.click()});

const canvas = document.getElementById('arcGameMatrix');
const ctx = canvas.getContext('2d');

function resizeMatrix(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resizeMatrix();
addEventListener('resize', resizeMatrix);

const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ$ARCSCII#@%&';
let drops = [];
function resetDrops(){
  const cols = Math.floor(innerWidth / 16);
  drops = Array.from({length:cols},()=>Math.random()*-50);
}
resetDrops();
addEventListener('resize', resetDrops);

function matrix(){
  ctx.fillStyle='rgba(0,0,0,.09)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#2F4D6F';
  ctx.font='16px VT323';
  for(let i=0;i<drops.length;i++){
    const ch=chars[Math.floor(Math.random()*chars.length)];
    ctx.fillText(ch,i*16,drops[i]*16);
    if(drops[i]*16>canvas.height && Math.random()>.975) drops[i]=0;
    drops[i]+=.65;
  }
  requestAnimationFrame(matrix);
}
matrix();

const world = document.getElementById('arcGameWorld');
const player = document.getElementById('arcGamePlayer');
const scoreEl = document.getElementById('arcGameScore');
const bestEl = document.getElementById('arcGameBest');
const speedEl = document.getElementById('arcGameSpeed');
const levelEl = document.getElementById('arcGameLevel');
const startScreen = document.getElementById('arcGameStart');
const bootText = document.getElementById('arcBootText');
const startButton = document.getElementById('arcStartButton');
const gameOver = document.getElementById('arcGameOver');
const finalScore = document.getElementById('arcFinalScore');
const finalBest = document.getElementById('arcFinalBest');
const gameCanvas = document.getElementById('arcGameCanvas');
const chooseScreen = document.getElementById('arcGameChoose');
const characterGrid = document.getElementById('arcCharacterGrid');
const chooseRunButton = document.getElementById('arcChooseRunButton');
const changeCharacterButton = document.getElementById('arcChangeCharacterButton');

// SOUND EFFECTS
// Keep these files next to the game using the exact paths below.
const sfx = {
  start: new Audio(startUrl),
  enterterminal: new Audio(enterterminalUrl),
  select: new Audio(selectUrl),
  coin: new Audio(coinUrl),
  danger: new Audio(),
  jump: new Audio(jumpUrl),
  jumping: new Audio(jumpingUrl),
  music: new Audio(musicUrl),
  small: new Audio(),
  gameover: new Audio(gameoverUrl),
  startrun: new Audio(startrunUrl),
  runagain: new Audio(runagainUrl),
  change: new Audio(changeUrl)
};

Object.values(sfx).forEach(audio=>{
  audio.preload='auto';
  audio.volume=.8;
});
sfx.music.loop=true;
sfx.music.volume=.45;

function playSfx(name){
  const audio=sfx[name];
  if(!audio)return;
  try{
    audio.pause();
    audio.currentTime=0;
    const promise=audio.play();
    if(promise && promise.catch) promise.catch(()=>{});
  }catch(err){}
}

const characters = [
  {id:"red", name:"REX-01", color:"RED", cls:"char-red", shape:"  /\\\\\n /##\\\\\n|====|\n| || |\n \\__/"},
  {id:"white", name:"NULL", color:"WHITE", cls:"char-white", shape:"  .--.\n / __ \\\n| (  ) |\n|  \\/  |\n \\____/"},
  {id:"pink", name:"MEOWTRIX", color:"PINK", cls:"char-pink", shape:"  /\\_/\\\n ( o.o )\n  > ^ <\n /|___|\\\n  /   \\"},
  {id:"green", name:"SYNTAX", color:"GREEN", cls:"char-green", shape:"  .----.\n /|_()_|\\\n|  /\\  |\n| /__\\ |\n \\____/"},
  {id:"yellow", name:"GOLDEN BYTE", color:"YELLOW", cls:"char-yellow", shape:"   /\\\n  /==\\\n | () |\n |/__\\|\n  /  \\"}
];
let selectedCharacter = characters[0];
let selectedCharacterIndex = 0;

function selectCharacter(index, scrollIntoView=true, playSound=true){
  const previousIndex=selectedCharacterIndex;
  selectedCharacterIndex = (index + characters.length) % characters.length;
  selectedCharacter = characters[selectedCharacterIndex];
  if(playSound && selectedCharacterIndex!==previousIndex) playSfx('select');
  characterGrid.querySelectorAll('.arcCharacterOption').forEach((btn,i)=>{
    btn.classList.toggle('selected', i===selectedCharacterIndex);
    if(i===selectedCharacterIndex && scrollIntoView){
      btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
    }
  });
  applyCharacter();
}

function renderCharacterChoices(){
  characterGrid.innerHTML = characters.map((c,i)=>`<button type="button" class="arcCharacterOption ${i===selectedCharacterIndex?'selected':''}" data-char="${c.id}">
      <pre class="arcCharacterPreview ${c.cls}">${c.shape}</pre>
      <div class="arcCharacterName ${c.cls}">${c.name}</div>
    </button>`).join('');
  characterGrid.querySelectorAll('.arcCharacterOption').forEach((btn,i)=>{
    btn.addEventListener('click',()=>{
      selectCharacter(i, false);
    });
  });
}

function applyCharacter(){
  player.textContent=selectedCharacter.shape;
  player.classList.remove('char-red','char-white','char-pink','char-green','char-yellow');
  player.classList.add(selectedCharacter.cls);
}
renderCharacterChoices();
applyCharacter();

let best = Number(localStorage.getItem('arcscII_terminal_best') || 0);
bestEl.textContent = String(best).padStart(6,'0');

let running=false, last=0, score=0, speed=360, elapsed=0;
let playerX=90, playerY=0, velocityY=0, crouching=false;
let obstacles=[], coins=[], jumpAids=[], spawnTimer=0, coinTimer=0, jumpAidTimer=2.5;
const gravity=1800;
const groundY=62;
const playerW=58, playerH=70;

function setGameMobileControlsVisible(visible){
  gameCanvas.classList.toggle('arcRunning', visible);
  if(!visible){
    stopHorizontalHold('left');
    stopHorizontalHold('right');
    crouching=false;
  }
}

function resetGame(){
  applyCharacter();
  running=true; last=performance.now(); score=0; speed=360; elapsed=0;
  setGameMobileControlsVisible(true);
  playerX=90; playerY=0; velocityY=0; crouching=false;
  obstacles=[]; coins=[]; jumpAids=[]; spawnTimer=.8; coinTimer=1.2; jumpAidTimer=2.5;
  scoreEl.textContent='000000';
  speedEl.textContent='1.0';
  startScreen.style.display='none';
  chooseScreen.style.display='none';
  gameOver.style.display='none';
  world.querySelectorAll('.arcGameObstacle,.arcGameCoin,.arcGameJumpAid').forEach(e=>e.remove());
  try{
    sfx.music.currentTime=0;
    const musicPromise=sfx.music.play();
    if(musicPromise && musicPromise.catch) musicPromise.catch(()=>{});
  }catch(err){}
  requestAnimationFrame(loop);
}

// Red ASCII spikes. Difficulty gradually increases:
// EASY = ✶ (few single spikes)
// MEDIUM = ✷ (more spikes, occasional 2-stack)
// HARD = ♦ (many spikes, frequent multi-stack)
function spawnObstacle(){
  const difficulty = elapsed < 30 ? 'easy' : (elapsed < 75 ? 'medium' : 'hard');

  let pattern;
  if(difficulty === 'easy'){
    pattern = Math.random() < .75 ? '✶' : '✶✶';
  }else if(difficulty === 'medium'){
    pattern = Math.random() < .55 ? '✷✷' : '✷';
  }else{
    const count = 2 + Math.floor(Math.random()*3);
    pattern = '♦'.repeat(count);
  }

  /*
    RED SPIKE HEIGHTS:
    1 = FLOOR    -> jump over it
    2 = MIDDLE   -> higher jump needed
    3 = HIGH     -> crouch/duck underneath it

    The high position is deliberately placed across the player's
    head area. Holding ArrowDown makes the player flatten against
    the floor, so the hitbox becomes short enough to pass underneath.
  */
  const roll = Math.random();
  let position, bottom;
  if(roll < .48){
    position = 'floor';
    bottom = 62;
  }else if(roll < .78){
    position = 'middle';
    bottom = 92;
  }else{
    position = 'high';
    bottom = 124;
  }

  const el=document.createElement('pre');
  el.className='arcGameObstacle';
  el.textContent=pattern;
  el.dataset.position=position;
  world.appendChild(el);

  const width = pattern.length * 32;
  const height = 38;
  el.style.bottom=bottom+'px';

  obstacles.push({
    el,
    x:world.clientWidth+30,
    w:width,
    h:height,
    position
  });
}

function spawnJumpAid(){
  const el=document.createElement('pre');
  el.className='arcGameJumpAid';

  // GREEN JUMP LEVELS:
  // ▂▃ = not too high
  // ▅▆ = fairly high
  // ▇▉ = very high
  const levels = [
    {shape:'▂▃', boost:700, width:42},
    {shape:'▅▆', boost:920, width:42},
    {shape:'▇▉', boost:1150, width:42}
  ];
  const level = levels[Math.floor(Math.random()*levels.length)];

  el.textContent=level.shape;
  el.style.width=level.width+'px';
  world.appendChild(el);

  const y=62;
  el.style.bottom=y+'px';
  return {el,x:world.clientWidth+30,w:level.width,h:35,boost:level.boost};
}

function spawnCoin(){
  const el=document.createElement('div');
  el.className='arcGameCoin';
  el.textContent='$';
  world.appendChild(el);
  const y=100+Math.random()*130;
  el.style.bottom=y+'px';
  coins.push({el,x:world.clientWidth+30,y,w:26,h:35});
}

function jump(){
  if(!running)return;
  if(playerY<=1){
    velocityY=700;
    playerY=2;
    playSfx('jump');
  }
}

function move(dir){
  if(!running)return;
  playerX += dir*70;
  playerX=Math.max(10,Math.min(world.clientWidth-100,playerX));
}

// Collision is calculated from the actual on-screen element bounds.
// This keeps the red hazards deadly even when they are moved with CSS transforms.
function elementsCollide(el1, el2){
  const a = el1.getBoundingClientRect();
  const b = el2.getBoundingClientRect();
  const padding = 5;
  return (
    a.left + padding < b.right - padding &&
    a.right - padding > b.left + padding &&
    a.top + padding < b.bottom - padding &&
    a.bottom - padding > b.top + padding
  );
}

async function endGame(){
  if(!running)return;
  running=false;
  setGameMobileControlsVisible(false);
  try{ sfx.music.pause(); }catch(err){}
  playSfx('danger');
  setTimeout(()=>playSfx('gameover'),120);
  if(score>best){
    best=score;
    localStorage.setItem('arcscII_terminal_best',best);
  }
  bestEl.textContent=String(best).padStart(6,'0');
  finalScore.textContent=score;
  finalBest.textContent=best;
  await saveScore(currentPlayer, score);
  refreshLeaderboard();
  gameOver.style.display='flex';
}

function loop(t){
  if(!running)return;
  const dt=Math.min((t-last)/1000,.035);
  last=t; elapsed+=dt;

  speed=360 + Math.min(420,elapsed*8);
  speedEl.textContent=(speed/360).toFixed(1);
  if(levelEl){
    levelEl.textContent = elapsed < 30 ? 'EASY' : (elapsed < 75 ? 'MEDIUM' : 'HARD');
  }

  velocityY-=gravity*dt;
  playerY+=velocityY*dt;
  if(playerY<0){playerY=0;velocityY=0}

  player.style.left=playerX+'px';
  player.style.bottom=(groundY+playerY)+'px';
  player.classList.toggle('crouching',crouching);

  spawnTimer-=dt;
  coinTimer-=dt;
  jumpAidTimer-=dt;

  if(spawnTimer<=0){
    spawnObstacle();
    spawnTimer=1.35+Math.random()*1.15-Math.min(.35,elapsed*.002);
  }
  if(coinTimer<=0){
    spawnCoin();
    coinTimer=1.0+Math.random()*1.5;
  }

  if(jumpAidTimer<=0){
    jumpAids.push(spawnJumpAid());
    jumpAidTimer=4.0+Math.random()*3.0;
  }

  obstacles.forEach(o=>{
    o.x-=speed*dt;
    o.el.style.transform=`translateX(${o.x}px)`;

    // RED HAZARDS = instant game over on contact.
    if(running && elementsCollide(player, o.el)){
      endGame();
    }
  });

  coins.forEach(c=>{
    c.x-=speed*dt;
    c.el.style.transform=`translateX(${c.x}px)`;

    // GOLD $ COINS = collectible points.
    if(!c.collected && elementsCollide(player, c.el)){
      score+=100;
      c.collected=true;
      playSfx('coin');
      c.el.remove();
    }
  });

  jumpAids.forEach(a=>{
    a.x-=speed*dt;
    a.el.style.transform=`translateX(${a.x}px)`;

    // GREEN OBJECT = jump assistance.
    // Play the special high-jump SFX only when the player touches a green aid.
    if(!a.collected && elementsCollide(player, a.el)){
      velocityY=a.boost;
      playerY=Math.max(playerY,4);
      a.collected=true;
      playSfx('jumping');
      a.el.remove();
    }
  });

  obstacles=obstacles.filter(o=>{
    if(o.x<-140){o.el.remove();return false}
    return true;
  });
  coins=coins.filter(c=>!c.collected && c.x>-80);
  jumpAids=jumpAids.filter(a=>!a.collected && a.x>-100);

  score += Math.floor(dt*60);
  scoreEl.textContent=String(score).padStart(6,'0');

  if(running) requestAnimationFrame(loop);
}

function openCharacterSelect(){
  running=false;
  setGameMobileControlsVisible(false);
  gameOver.style.display='none';
  startScreen.style.display='none';
  chooseScreen.style.display='flex';
  selectCharacter(selectedCharacterIndex, false);
}

document.getElementById('arcStartButton').onclick=()=>{
  playSfx('start');
  startScreen.style.display='none';
  chooseScreen.style.display='flex';
  selectCharacter(selectedCharacterIndex, false);
};
chooseRunButton.onclick=()=>{
  playSfx('startrun');
  resetGame();
};
document.getElementById('arcRestartButton').onclick=()=>{
  playSfx('runagain');
  resetGame();
};
if(changeCharacterButton) changeCharacterButton.onclick=()=>{
  playSfx('change');
  openCharacterSelect();
};

const quitButton = document.getElementById('arcQuitButton');
if(quitButton) quitButton.onclick=()=>{
  running=false;
  setGameMobileControlsVisible(false);
  gameOver.style.display='none';
  chooseScreen.style.display='none';
  startScreen.style.display='none';
  loginOverlay.style.display='flex';
  loginStatus.textContent=currentPlayer ? '> SAVED PLAYER: @'+currentPlayer : '';
  try{ sfx.music.pause(); sfx.music.currentTime=0; }catch(err){}
  setTimeout(()=>{ try{ usernameInput.focus(); usernameInput.select(); }catch(err){} },50);
};

const tweetResultButton = document.getElementById('arcTweetResultButton');
if(tweetResultButton) tweetResultButton.onclick=()=>{
  const tweetText = `I just earned ${Number(score||0).toLocaleString()} points on ARCSCII TERMINAL RUN! 🚀\n\nJoin ARCSCII and collect as many points as you can!\n\nVisit https://arcscii.space and follow @ARCSCII`;
  const tweetUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText);
  window.open(tweetUrl, '_blank', 'noopener,noreferrer');
};

addEventListener('keydown',e=>{
  const choosing = chooseScreen.style.display==='flex';
  if(choosing){
    if(['ArrowLeft','ArrowRight','Enter','Space'].includes(e.code)) e.preventDefault();
    if(e.code==='ArrowLeft') selectCharacter(selectedCharacterIndex-1);
    if(e.code==='ArrowRight') selectCharacter(selectedCharacterIndex+1);
    if(e.code==='Enter'||e.code==='Space') chooseRunButton.click();
    return;
  }

  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Space'||e.code==='ArrowUp')jump();
  if(e.code==='ArrowDown'){
    if(!crouching && running) playSfx('small');
    crouching=true;
  }
  if(e.code==='ArrowLeft')move(-1);
  if(e.code==='ArrowRight')move(1);
  if((e.code==='Enter') && !running) resetGame();
});

addEventListener('keyup',e=>{
  if(e.code==='ArrowDown'){
    e.preventDefault();
    crouching=false;
  }
});

function bindMobileTouch(el){
  if(!el)return;
  el.addEventListener('touchstart', function(event){ event.stopPropagation(); }, {passive:true});
  el.addEventListener('touchend', function(event){ event.stopPropagation(); }, {passive:true});
  el.addEventListener('contextmenu', function(event){ event.preventDefault(); });
}
const mobileHoldTimers = {left:null, right:null};
function stopHorizontalHold(key){
  if(mobileHoldTimers[key]){
    clearInterval(mobileHoldTimers[key]);
    mobileHoldTimers[key]=null;
  }
}
function startHorizontalHold(direction){
  if(!running)return;
  const key=direction < 0 ? 'left' : 'right';
  stopHorizontalHold(key);
  move(direction);
  mobileHoldTimers[key]=setInterval(function(){ move(direction); },45);
}
function bindMobileTap(el, action){
  bindMobileTouch(el);
  if(!el)return;
  el.addEventListener('pointerdown', function(event){
    event.preventDefault();
    event.stopPropagation();
    action();
  });
}
function bindMobileHold(el, press, release){
  bindMobileTouch(el);
  if(!el)return;
  el.addEventListener('pointerdown', function(event){
    event.preventDefault();
    event.stopPropagation();
    press();
  });
  ['pointerup','pointerleave','pointercancel'].forEach(function(type){
    el.addEventListener(type, function(event){
      event.preventDefault();
      event.stopPropagation();
      release();
    });
  });
}
bindMobileTap(document.getElementById('arcJump'), jump);
bindMobileHold(document.getElementById('arcLeft'), function(){ startHorizontalHold(-1); }, function(){ stopHorizontalHold('left'); });
bindMobileHold(document.getElementById('arcRight'), function(){ startHorizontalHold(1); }, function(){ stopHorizontalHold('right'); });
bindMobileHold(document.getElementById('arcDown'), function(){
  if(!running)return;
  if(!crouching) playSfx('small');
  crouching=true;
}, function(){
  crouching=false;
});
let touchStartX=0, touchStartY=0, touchStartTime=0, touchCrouchTimer=null;
if(gameCanvas){
  gameCanvas.addEventListener('touchstart', e=>{
    if(!running) return;
    const t=e.changedTouches[0]; touchStartX=t.clientX; touchStartY=t.clientY; touchStartTime=Date.now();
  }, {passive:true});
  gameCanvas.addEventListener('touchend', e=>{
    if(!running) return;
    const t=e.changedTouches[0]; const dx=t.clientX-touchStartX; const dy=t.clientY-touchStartY;
    const distance=Math.hypot(dx,dy); const duration=Date.now()-touchStartTime;
    if(distance<35 || duration>800) return;
    if(Math.abs(dx)>Math.abs(dy)){
      if(dx < -35) move(-1);
      else if(dx > 35) move(1);
    }else{
      if(dy < -35) jump();
      else if(dy > 35){
        if(touchCrouchTimer) clearTimeout(touchCrouchTimer);
        crouching=true; playSfx('small');
        touchCrouchTimer=setTimeout(()=>{crouching=false; touchCrouchTimer=null;},420);
      }
    }
  }, {passive:true});
}
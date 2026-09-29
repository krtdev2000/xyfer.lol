const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const shopEl = document.getElementById('shop');
const noteEl = document.getElementById('note');
const overEl = document.getElementById('over');
const overLineEl = document.getElementById('over-line');
const hud = {
  scrap: document.getElementById('hud-scrap'),
  wave: document.getElementById('hud-wave'),
  best: document.getElementById('hud-best'),
  lives: document.getElementById('hud-lives'),
  combo: document.getElementById('hud-combo'),
  beacon: document.getElementById('hud-beacon')
};

const W = canvas.width;
const H = canvas.height;
const COLS = 9;
const ROWS = 8;
const CELL = 48;
const GRID_X = (W - COLS * CELL) / 2;
const GRID_Y = 40;
const ROW_H = 24;
const WALL_H = ROWS * ROW_H;
const DESCEND = 38;
const PADDLE_Y = H - 44;
const BASE_WAVE_MS = 11000;
const MIN_WAVE_MS = 4200;
const COMBO_WINDOW = 3200;
const OFFLINE_CAP = 8 * 3600 * 1000;
const SAVE_KEY = 'xyfer.brickfall.v1';
const INK = '#fff5f5';
const DIM = '#b58a8d';
const RED = '#ef233c';

const UPGRADES = [
  {key: 'paddle', name: 'paddle', blurb: 'wider, harder to miss'},
  {key: 'power', name: 'power', blurb: 'more damage per hit'},
  {key: 'ball', name: 'multiball', blurb: 'extra ball every 2 levels'},
  {key: 'auto', name: 'autopilot', blurb: 'plays itself, level 1 only'},
  {key: 'shield', name: 'shield', blurb: 'one free life per level'},
  {key: 'beacon', name: 'beacon', blurb: 'scrap every second, works offline'},
  {key: 'wall', name: 'bracing', blurb: 'wall falls slower'}
];

function costOf(key, level) {
  const base = key === 'auto' ? 260 : key === 'beacon' ? 60 : 45;
  return Math.floor(base * Math.pow(1.62, level));
}

function ballCount(level) {
  return 1 + Math.floor(level / 2);
}

function damageOf(level) {
  return 1 + level;
}

function paddleWidth(level) {
  return 96 + level * 18;
}

function brickHealth(wave, row) {
  return 1 + Math.floor((wave + row) / 4);
}

function waveInterval(level, wave) {
  return Math.max(MIN_WAVE_MS, BASE_WAVE_MS - (level + (wave || 1) - 1) * 300);
}

function comboMult(combo) {
  return 1 + Math.min(Math.floor(combo / 4), 11);
}

function beaconRate(level) {
  return level * 0.7;
}

function blankState() {
  const levels = {};
  for (const up of UPGRADES) levels[up.key] = 0;
  return {
    scrap: 0,
    wave: 1,
    lives: 3,
    best: 1,
    kills: 0,
    combo: 0,
    comboAt: 0,
    dropAt: 0,
    dropSpan: BASE_WAVE_MS,
    drops: 0,
    dead: false,
    savedAt: Date.now(),
    levels
  };
}

let state = blankState();
let bricks = [];
let balls = [];
let particles = [];
let paddle = {x: W / 2, hit: 0};
let pointer = null;
let keysDir = 0;
let last = performance.now();
let saveAt = 0;
let shake = 0;

function cleanLevels(raw) {
  const levels = blankState().levels;
  for (const key of Object.keys(levels)) {
    const value = Math.floor(Number(raw?.[key]));
    if (Number.isFinite(value) && value >= 0) levels[key] = Math.min(value, 99);
  }
  return levels;
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return;
    const count = value => Math.max(0, Math.min(Number(value) || 0, 1e12));
    state = {
      scrap: count(data.scrap),
      wave: Math.max(1, Math.floor(count(data.wave)) || 1),
      lives: Math.max(0, Math.floor(count(data.lives))),
      best: Math.max(1, Math.floor(count(data.best)) || 1),
      kills: Math.floor(count(data.kills)),
      combo: 0,
      comboAt: 0,
      dropAt: 0,
      dropSpan: BASE_WAVE_MS,
      drops: 0,
      dead: false,
      savedAt: Number(data.savedAt) || Date.now(),
      levels: cleanLevels(data.levels)
    };
  } catch {
    localStorage.removeItem(SAVE_KEY);
    state = blankState();
  }
}

function save() {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    noteEl.textContent = `auto-saved ${new Date().toLocaleTimeString()}`;
  } catch {
    noteEl.textContent = 'save blocked by the browser';
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  state = blankState();
  newRun();
  noteEl.textContent = 'save erased';
}

function newRow(offset) {
  const health = brickHealth(state.wave, offset);
  const rowBricks = [];
  for (let col = 0; col < COLS; col += 1) {
    if (offset > 0 && (col + offset + state.wave) % 4 === 0) continue;
    rowBricks.push({col, hp: health, max: health});
  }
  return rowBricks;
}

function buildWall() {
  bricks = [];
  for (let row = 0; row < ROWS; row += 1) bricks.push(newRow(row));
}

function scheduleDrop() {
  state.dropSpan = waveInterval(state.levels.wall, state.wave);
  state.dropAt = performance.now() + state.dropSpan;
}

function newRun() {
  state.wave = 1;
  state.lives = 3 + state.levels.shield;
  state.combo = 0;
  state.dead = false;
  state.drops = 0;
  overEl.hidden = true;
  buildWall();
  scheduleDrop();
  balls = [makeBall(W / 2, PADDLE_Y - 12, 320)];
  paddle.x = W / 2;
  particles = [];
}

function makeBall(x, y, speed) {
  const angle = (-90 + (Math.random() * 44 - 22)) * Math.PI / 180;
  return {x, y, r: 7, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed};
}

function breakBrick(row, col) {
  const rowBricks = bricks[row];
  if (!rowBricks) return;
  const index = rowBricks.findIndex(b => b.col === col);
  if (index < 0) return;
  const [brick] = rowBricks.splice(index, 1);
  const mult = comboMult(state.combo);
  state.scrap += Math.floor(2 * mult * (brick.max + 1));
  state.kills += 1;
  state.combo += 1;
  state.comboAt = performance.now();
  const px = GRID_X + brick.col * CELL + CELL / 2;
  const py = GRID_Y + state.drops * DESCEND + row * ROW_H + 12;
  for (let i = 0; i < 10; i += 1) {
    particles.push({x: px, y: py, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.5 + Math.random() * 0.3});
  }
  shake = Math.min(9, shake + 2.5);
}

function hurt() {
  state.best = Math.max(state.best, state.wave);
  state.lives = Math.max(0, state.lives - 1);
  state.combo = 0;
  state.drops = 0;
  state.wave = 1;
  shake = 12;
  if (state.lives > 0) {
    buildWall();
    scheduleDrop();
    balls = [makeBall(W / 2, PADDLE_Y - 12, 320)];
    return;
  }
  state.dead = true;
  overLineEl.textContent = `wave ${state.best}, ${state.kills} broken, scrap kept.`;
  overEl.hidden = false;
}

function dropWall() {
  state.drops += 1;
  state.wave += 1;
  state.best = Math.max(state.best, state.wave);
  if (GRID_Y + state.drops * DESCEND + WALL_H >= PADDLE_Y - 34) {
    hurt();
    return;
  }
  bricks = [newRow(0), ...bricks.slice(0, ROWS - 1)];
  shake = Math.min(9, shake + 1.5);
  scheduleDrop();
}

function bounce(ball) {
  if (ball.y < 12) {
    ball.y = 12;
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.x < 12) {
    ball.x = 12;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x > W - 12) {
    ball.x = W - 12;
    ball.vx = -Math.abs(ball.vx);
  }
  for (let row = 0; row < bricks.length; row += 1) {
    const rowBricks = bricks[row];
    for (const brick of rowBricks) {
      const bx = GRID_X + brick.col * CELL + 3;
      const by = GRID_Y + state.drops * DESCEND + row * ROW_H + 2;
      const bw = CELL - 6;
      const bh = 20;
      if (ball.x + ball.r < bx || ball.x - ball.r > bx + bw) continue;
      if (ball.y + ball.r < by || ball.y - ball.r > by + bh) continue;
      brick.hp -= damageOf(state.levels.power);
      ball.vy = -ball.vy;
      if (Math.abs(ball.vy) < 90) ball.vy = ball.vy < 0 ? -90 : 90;
      if (brick.hp <= 0) breakBrick(row, brick.col);
      else {
        for (let i = 0; i < 4; i += 1) {
          particles.push({x: ball.x, y: ball.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.3});
        }
        state.combo += 1;
        state.comboAt = performance.now();
      }
      return;
    }
  }
}

function autoAim(dt) {
  let target = balls[0] || {x: W / 2};
  let lowest = -1;
  for (const ball of balls) {
    if (ball.y > lowest) {
      lowest = ball.y;
      target = ball;
    }
  }
  const chase = target.x + target.vx * 0.16;
  const diff = Math.max(-1, Math.min(1, (chase - paddle.x) / 90));
  paddle.x += diff * 1150 * dt;
}

function step(dt) {
  const now = performance.now();
  if (state.dead) return;
  if (state.combo && now - state.comboAt > COMBO_WINDOW) state.combo = 0;
  const rate = beaconRate(state.levels.beacon);
  if (rate) state.scrap += rate * dt;
  const width = paddleWidth(state.levels.paddle);
  const half = width / 2;
  if (state.levels.auto) autoAim(dt);
  if (now > state.dropAt) dropWall();
  if (pointer !== null && !state.levels.auto) paddle.x = pointer;
  else if (keysDir && !state.levels.auto) paddle.x += keysDir * 620 * dt;
  paddle.x = Math.max(half, Math.min(W - half, paddle.x));
  const left = paddle.x - half;

  for (const ball of balls) {
    const steps = Math.max(1, Math.ceil(3.2 / dt));
    for (let i = 0; i < steps; i += 1) {
      ball.x += ball.vx * (dt / steps);
      ball.y += ball.vy * (dt / steps);
      bounce(ball);
    }
    if (ball.y + ball.r >= PADDLE_Y && ball.vy > 0 && ball.x > left && ball.x < left + width) {
      ball.y = PADDLE_Y - ball.r;
      const ratio = (ball.x - (left + half)) / half;
      const angle = -Math.PI / 2 + ratio * 1.05;
      ball.speed = Math.min(760, ball.speed * 1.008);
      ball.vx = Math.cos(angle) * ball.speed;
      ball.vy = Math.sin(angle) * ball.speed;
      state.combo = 0;
      paddle.hit = 1;
    }
  }
  const lost = balls.filter(ball => ball.y - ball.r > H);
  if (lost.length) {
    balls = balls.filter(ball => ball.y - ball.r <= H);
    if (!balls.length) hurt();
  }

  particles = particles.filter(p => (p.life -= dt) > 0);
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 320 * dt;
  }
  paddle.hit = Math.max(0, paddle.hit - dt * 3);
  shake = Math.max(0, shake - dt * 26);
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let col = 1; col < COLS; col += 1) {
    const x = Math.round(GRID_X + col * CELL) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, GRID_Y + state.drops * DESCEND);
    ctx.lineTo(x, GRID_Y + state.drops * DESCEND + WALL_H);
    ctx.stroke();
  }

  for (let row = 0; row < bricks.length; row += 1) {
    for (const brick of bricks[row]) {
      const x = GRID_X + brick.col * CELL + 3;
      const y = GRID_Y + state.drops * DESCEND + row * ROW_H + 2;
      const worn = brick.hp / brick.max;
      ctx.fillStyle = worn > 0.6 ? RED : worn > 0.3 ? '#a4081c' : '#6e474a';
      ctx.fillRect(x, y, CELL - 6, 20);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x, y, CELL - 6, 2);
    }
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 1.6);
    ctx.fillStyle = RED;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  const width = paddleWidth(state.levels.paddle);
  const left = paddle.x - width / 2;
  ctx.fillStyle = 'rgba(239,35,60,0.22)';
  ctx.fillRect(left, PADDLE_Y, width, 26);
  ctx.fillStyle = state.levels.auto ? '#ff5368' : INK;
  ctx.fillRect(left, PADDLE_Y + 2, width, paddle.hit > 0 ? 8 : 5);

  for (const ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,35,60,0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }

  const progress = Math.max(0, Math.min(1, 1 - (state.dropAt - performance.now()) / state.dropSpan));
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, W, 3);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, W * progress, 3);

  ctx.fillStyle = DIM;
  ctx.font = '600 11px "Fredoka", sans-serif';
  ctx.fillText(`wave ${state.wave}`, 14, 20);
  ctx.textAlign = 'right';
  ctx.fillText(`${state.lives} lives`, W - 14, 20);
  ctx.textAlign = 'left';
  if (state.combo > 1) {
    ctx.fillStyle = '#ff5368';
    ctx.textAlign = 'center';
    ctx.fillText(`x${comboMult(state.combo)}`, W / 2, 20);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function shopButton(up) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'upgrade';
  const top = document.createElement('span');
  top.className = 'upgrade-top';
  const name = document.createElement('strong');
  const level = document.createElement('span');
  top.append(name, level);
  const blurb = document.createElement('span');
  blurb.className = 'upgrade-blurb';
  button.append(top, blurb);
  button.addEventListener('click', () => buy(up.key));
  return {button, name, level, blurb};
}

const shopRefs = new Map();
for (const up of UPGRADES) {
  const ref = shopButton(up);
  shopRefs.set(up.key, ref);
  shopEl.append(ref.button);
}

function buy(key) {
  const level = state.levels[key];
  const price = costOf(key, level);
  if (state.scrap < price) return;
  state.scrap -= price;
  state.levels[key] = level + 1;
  if (key === 'ball') {
    const extra = ballCount(state.levels.ball) - balls.length;
    for (let i = 0; i < extra; i += 1) {
      const source = balls[balls.length - 1];
      balls.push(makeBall(source ? source.x : W / 2, source ? source.y : PADDLE_Y - 12, source ? source.speed : 320));
    }
  }
  if (key === 'shield' && !state.dead) state.lives += 1;
  if (key === 'wall') scheduleDrop();
  if (key === 'beacon') noteEl.textContent = `beacon online, ${beaconRate(state.levels.beacon).toFixed(1)} scrap a second.`;
  save();
  refreshShop();
}

function refreshShop() {
  for (const up of UPGRADES) {
    const ref = shopRefs.get(up.key);
    const level = state.levels[up.key];
    const price = costOf(up.key, level);
    ref.name.textContent = up.name;
    ref.level.textContent = level ? `lv ${level}` : '';
    ref.blurb.textContent = level ? `${up.blurb} — next ${price}` : `${up.blurb} — ${price}`;
    ref.button.disabled = state.scrap < price;
  }
}

function refreshHud() {
  hud.scrap.textContent = Math.floor(state.scrap).toLocaleString();
  hud.wave.textContent = state.wave;
  hud.best.textContent = state.best;
  hud.lives.textContent = Math.max(0, state.lives);
  hud.combo.textContent = `x${comboMult(state.combo)}`;
  hud.beacon.textContent = `${beaconRate(state.levels.beacon).toFixed(1)}/s`;
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  draw();
  refreshHud();
  if (now - saveAt > 2000) {
    saveAt = now;
    save();
    refreshShop();
  }
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointermove', event => {
  const rect = canvas.getBoundingClientRect();
  pointer = ((event.clientX - rect.left) / rect.width) * W;
});
canvas.addEventListener('pointerleave', () => (pointer = null));
canvas.addEventListener('pointerdown', event => {
  const rect = canvas.getBoundingClientRect();
  pointer = ((event.clientX - rect.left) / rect.width) * W;
  paddle.x = pointer;
  if (event.pointerType === 'touch') canvas.setPointerCapture(event.pointerId);
});
const LEFT_KEYS = ['arrowleft', 'a'];
const RIGHT_KEYS = ['arrowright', 'd'];

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (LEFT_KEYS.includes(key)) keysDir = -1;
  else if (RIGHT_KEYS.includes(key)) keysDir = 1;
  else return;
  event.preventDefault();
});

window.addEventListener('keyup', event => {
  if (LEFT_KEYS.includes(event.key.toLowerCase()) || RIGHT_KEYS.includes(event.key.toLowerCase())) keysDir = 0;
});
document.getElementById('restart').addEventListener('click', () => {
  newRun();
  save();
});
document.getElementById('wipe').addEventListener('click', clearSave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
window.addEventListener('beforeunload', save);

readSave();
const away = Math.min(OFFLINE_CAP, Date.now() - state.savedAt);
const earned = Math.floor(beaconRate(state.levels.beacon) * (away / 1000));
if (earned > 0) {
  state.scrap += earned;
  noteEl.textContent = `beacon earned ${earned.toLocaleString()} scrap while you were away.`;
}
newRun();
refreshShop();
requestAnimationFrame(frame);

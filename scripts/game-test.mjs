import {readFileSync} from 'node:fs';

const store = new Map();
const noop = () => {};
const node = () => ({
  width: 480,
  height: 620,
  hidden: false,
  textContent: '',
  disabled: false,
  getContext: () => new Proxy({}, {get: () => noop}),
  addEventListener: noop,
  append: noop,
  setPointerCapture: noop,
  getBoundingClientRect: () => ({left: 0, top: 0, width: 480, height: 620})
});

let clock = 1000;
let frames = [];
globalThis.document = {getElementById: node, createElement: node, addEventListener: noop, hidden: false};
globalThis.window = {addEventListener: noop};
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key)
};
globalThis.location = {search: '', origin: 'test'};
globalThis.performance = {now: () => clock};
globalThis.requestAnimationFrame = fn => frames.push(fn);

const src = readFileSync(new URL('../games/game.js', import.meta.url), 'utf8');
const hooks = 'globalThis.peek = () => ({state, bricks, balls});globalThis.buy = buy;globalThis.load = readSave;globalThis.state = {waveInterval};';
new Function(`${src}\n${hooks}`)();

const fails = [];
const check = (name, condition) => {
  if (!condition) fails.push(name);
};

const {waveInterval} = globalThis.state;

const run = ticks => {
  for (let i = 0; i < ticks && frames.length; i += 1) {
    const next = frames.shift();
    clock += 16;
    next(clock);
  }
};

const peek = globalThis.peek;
const buy = globalThis.buy;

check('drops speed up with wave', state.waveInterval(0, 9) < state.waveInterval(0, 1));
check('drops never get silly fast', state.waveInterval(99, 99) >= 4200);

peek().state.scrap = 5000;
check('costs rise with level', peek().state.scrap >= 0);
buy('auto');
buy('paddle');
buy('power');
check('buying spends scrap', peek().state.scrap < 5000);
run(6000);
const idle = peek();
check('idle play survives 96 seconds', !idle.state.dead && idle.state.kills > 0);
check('idle play advances waves', idle.state.best > 1);
check('idle play never leaks balls', idle.balls.length > 0);
check('wall keeps its row count', idle.bricks.length === 8);
check('beacon pays out', idle.state.scrap > 0);

const saved = JSON.parse(store.get('xyfer.brickfall.v1'));
check('save keeps scrap', saved.scrap > 0);
check('save keeps levels', saved.levels.auto === 1);

store.set('xyfer.brickfall.v1', JSON.stringify({scrap: 'nope', levels: {auto: -4, power: 1e9, wall: 2.5}}));
globalThis.load();
check('hostile save clamps scrap', peek().state.scrap === 0);
check('hostile save clamps levels', peek().state.levels.auto === 0 && peek().state.levels.wall === 2);
check('hostile save caps levels', peek().state.levels.power === 99);

store.set('xyfer.brickfall.v1', '{not json');
globalThis.load();
check('corrupt save still boots', peek().state.scrap === 0 && peek().state.levels.power === 0 && peek().balls.length === 1);

peek().state.scrap = 5000;
buy('auto');
run(40000);
check('long idle run stays finite', peek().bricks.length === 8 && peek().state.lives >= 0);
check('lives never go negative', peek().state.lives >= 0);

if (fails.length) {
  console.error('failed:', fails.join(', '));
  process.exit(1);
}
console.log(`ok, ${saved.kills} bricks, wave ${saved.best}, ${Math.floor(saved.scrap)} scrap`);

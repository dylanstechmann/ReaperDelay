const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = (name) => readFileSync(path.join(root, name), 'utf8');

function caseFixture(id = 'fixture') {
  return {
    id, type: 'thing', icon: '📚', name: 'A test case ' + id, setup: 'Choose an action.', fact: 'A test fact.',
    choices: [
      { text: 'safe', quality: 'best', delay: 20, lesson: 'A good action.' },
      { text: 'good', quality: 'good', delay: 8, lesson: 'Another action.' },
      { text: 'risky', quality: 'worst', delay: -90, lesson: 'A costly action.' },
      { text: 'bad', quality: 'bad', delay: -10, lesson: 'An unhelpful action.' }
    ]
  };
}

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.textContent = '';
    this.disabled = false;
    const classes = new Set();
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name)
    };
  }
  set innerHTML(_value) { this.children = []; }
  appendChild(child) { this.children.push(child); }
  append(...children) { this.children.push(...children); }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  click() { if (!this.disabled) return this.listeners.click?.(); }
}

function loadGame(progress = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const storage = new Map([['rd_progress', JSON.stringify(progress)]]);
  const intervals = new Map();
  let timerId = 0;
  const context = vm.createContext({
    window: { RD_CASES: Array.from({ length: 8 }, (_, i) => caseFixture('case-' + i)) },
    document: { getElementById: element, createElement: () => new Element() },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    navigator: {}, location: { protocol: 'file:', origin: 'http://localhost' },
    setTimeout: () => 1,
    setInterval: (callback) => { intervals.set(++timerId, callback); return timerId; },
    clearInterval: (id) => intervals.delete(id),
    fetch: async () => { throw new Error('Tests must not make network calls'); }
  });
  vm.runInContext(source('ai.js'), context);
  vm.runInContext(source('app.js'), context);
  return {
    context, element, storage, intervals,
    begin: () => element('btn-begin').click(),
    choice: (text) => element('choices').children.find((button) => button.textContent === text),
    active: (screen) => element('screen-' + screen).classList.contains('active'),
    progress: () => JSON.parse(storage.get('rd_progress'))
  };
}

test('a fatal choice keeps the end screen visible and records exactly one shift', () => {
  const game = loadGame();
  game.begin();
  const queuedClick = game.choice('risky').listeners.click;
  queuedClick();
  assert.equal(game.active('end'), true);
  assert.equal(game.active('resolve'), false);
  assert.equal(game.progress().shifts, 1);
  assert.equal(game.intervals.size, 0);
  assert.equal(Object.keys(game.progress().facts).length, 1);
  queuedClick();
  game.element('btn-continue').click();
  assert.equal(game.progress().shifts, 1);
  assert.equal(game.active('end'), true);
});

test('repeated choice and continue events cannot score or skip extra cases', () => {
  const game = loadGame();
  game.begin();
  const oldChoice = game.choice('safe');
  oldChoice.click();
  oldChoice.listeners.click(); // A queued event can outlive the disabled button.
  assert.equal(game.element('stat-saved').textContent, 1);
  assert.equal(game.element('stat-left').textContent, 7);
  assert.equal(oldChoice.disabled, true);
  game.element('btn-continue').click();
  const nextName = game.element('case-name').textContent;
  game.element('btn-continue').click();
  oldChoice.listeners.click(); // The old case must not answer the next one.
  assert.equal(game.active('play'), true);
  assert.equal(game.element('case-name').textContent, nextName);
  assert.equal(game.element('stat-saved').textContent, 1);
  assert.equal(game.element('stat-left').textContent, 7);
});

test('eight resolved cases finish once, and restarting permits a new completed shift', () => {
  const game = loadGame();
  for (let shift = 1; shift <= 2; shift++) {
    game.begin();
    for (let i = 0; i < 8; i++) {
      game.choice('safe').click();
      assert.equal(game.active('resolve'), true);
      game.element('btn-continue').click();
    }
    assert.equal(game.active('end'), true);
    assert.match(game.element('end-title').textContent, /Dawn/);
    assert.equal(game.progress().shifts, shift);
    game.element('btn-continue').click();
    assert.equal(game.progress().shifts, shift);
  }
});

test('timer defeat stays terminal even when an already queued timer fires again', () => {
  const game = loadGame();
  game.begin();
  const tick = [...game.intervals.values()][0];
  for (let i = 0; i < 100; i++) tick();
  assert.equal(game.active('end'), true);
  assert.equal(game.progress().shifts, 1);
  assert.equal(game.intervals.size, 0);
});

test('malformed persisted cases and non-object progress cannot break a new shift', () => {
  for (const progress of [null, [], 'invalid', { aiCases: {} },
    { aiCases: [null, { id: 'ai-123', setup: 'broken', choices: [] }] }]) {
    const game = loadGame(progress);
    game.begin();
    assert.equal(game.active('play'), true);
    assert.equal(game.element('choices').children.length, 4);
    assert.ok(game.choice('safe'));
  }
});

test('generated cases require complete text and finite, quality-consistent scores', () => {
  const { context } = loadGame();
  const validate = context.window.RD_AI.validateCase;
  assert.equal(validate(caseFixture()).choices.length, 4);
  const mutations = [
    (item) => { item.name = ''; },
    (item) => { item.fact = 4; },
    (item) => { item.type = 'unknown'; },
    (item) => { item.choices.pop(); },
    (item) => { item.choices[0].delay = '20'; },
    (item) => { item.choices[0].delay = NaN; },
    (item) => { item.choices[0].delay = Infinity; },
    (item) => { item.choices[0].delay = -20; },
    (item) => { item.choices[0].delay = 1000; },
    (item) => { item.choices[2].delay = 5; },
    (item) => { item.choices[2].delay = -101; },
    (item) => { item.choices[1].quality = 'best'; },
    (item) => { item.choices[2].lesson = null; }
  ];
  for (const mutate of mutations) {
    const item = caseFixture();
    mutate(item);
    assert.throws(() => validate(item), /Case/);
  }
});

test('extraCase validates the actual model response before it can be saved', async () => {
  const { context, storage } = loadGame();
  storage.set('rd_or_on', '1');
  storage.set('rd_or_key', 'test-only-key');
  const response = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });
  const invalid = caseFixture();
  invalid.choices[0].delay = 'bad-score';
  context.fetch = async () => response(JSON.stringify(invalid));
  await assert.rejects(context.window.RD_AI.extraCase(), /invalid choice scoring/);
  context.fetch = async () => response('```json\n' + JSON.stringify(caseFixture()) + '\n```');
  const result = await context.window.RD_AI.extraCase();
  assert.match(result.id, /^ai-\d+$/);
  assert.equal(result.choices[0].delay, 20);
});

test('service-worker activation deletes only obsolete ReaperDelay caches', async () => {
  const events = {};
  const deleted = [];
  let claimed = false;
  const context = vm.createContext({
    self: { addEventListener: (event, handler) => { events[event] = handler; },
      clients: { claim: async () => { claimed = true; } } },
    caches: { keys: async () => ['reaper-delay-v1', 'reaper-delay-v2', 'reaper-delay-v3', 'anagen-v1', 'other-app'],
      delete: async (key) => { deleted.push(key); } }
  });
  vm.runInContext(source('sw.js'), context);
  let completed;
  events.activate({ waitUntil: (promise) => { completed = promise; } });
  await completed;
  assert.deepEqual(deleted, ['reaper-delay-v1', 'reaper-delay-v2']);
  assert.equal(claimed, true);
});

test('offline installation precaches the exact versioned scripts and stylesheet used by the page', async () => {
  const events = {};
  let cached = [];
  const context = vm.createContext({
    self: { addEventListener: (event, handler) => { events[event] = handler; }, skipWaiting: async () => {} },
    caches: { open: async () => ({ addAll: async (assets) => { cached = Array.from(assets); } }) }
  });
  vm.runInContext(source('sw.js'), context);
  let completed;
  events.install({ waitUntil: (promise) => { completed = promise; } });
  await completed;
  const resources = Array.from(source('index.html').matchAll(/(?:src|href)="([^" ]+\.(?:js|css)\?v=\d+)"/g),
    (match) => './' + match[1]);
  assert.equal(resources.length, 4);
  for (const resource of resources) assert.ok(cached.includes(resource), resource);
});

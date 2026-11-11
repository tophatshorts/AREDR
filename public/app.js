import { TIERS, tier, normalize, pickLevel, UPGRADES, cost, reward, readSave } from '/src/game.js';
import * as accounts from '/accounts.js';

const $ = id => document.getElementById(id);
const fmt = n => Number(n).toLocaleString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GUEST_STORAGE = 'gd-rng-save-v1';
let STORAGE = GUEST_STORAGE;
let state;
try { state = readSave(localStorage.getItem(STORAGE)); } catch { state = readSave(null); }
let pool = [], spinning = false, auto = false, activeView = 'home', autoTimer, toastTimer, audio;
let saveWarning = false, syncing = false;
let user = null, accountLoading = false, cloudReady = false, cloudTimer, cloudPending = null, authMode = 'login', authBusy = false, legacy = {}, dailyGlobal = null;
const localThumbnails = new Set(['112412828','149992717','61079355','10565740','3979721','42584142','86407629','26681070','127323087','148598469']);
const dayKey = () => new Date().toISOString().slice(0,10); // Daily competition resets at midnight UTC for every player.
const bestLevel = () => Object.values(state.collection).sort((a,b) => tier(b).rank-tier(a).rank)[0];
function thumbnail(level) {
  const url = localThumbnails.has(level.id) ? `/assets/levels/${level.id}.webp` : legacy[level.id]?.thumbnail || `https://raw.githubusercontent.com/Prevter/GDLevelThumbs/main/thumbs/${level.id}.png`;
  return `<img class="level-thumbnail" src="${esc(url)}" alt="" loading="lazy" data-fallback="${level.id}">`;
}
document.addEventListener('error', event => {
  const img = event.target;
  if (!img.matches?.('.level-thumbnail')) return;
  if (img.dataset.fallback && !img.src.includes('Prevter')) { img.src = `https://raw.githubusercontent.com/Prevter/GDLevelThumbs/main/thumbs/${img.dataset.fallback}.png`; delete img.dataset.fallback; }
  else img.remove();
}, true);
const reel = $('reel'), viewport = $('reel-window');

function face(level) {
  const name = tier(level).name.toLowerCase();
  const filename = name.includes('demon') ? 'demon-' + name.split(' ')[0] : name;
  return `<img class="face" src="/assets/faces/${filename}.png" alt="${esc(tier(level).name)}" width="62" height="62">`;
}
function card(level, index = 0) {
  const t = tier(level);
  return `<div class="reel-card" data-index="${index}" style="--tier:${t.color}">${thumbnail(level)}<span class="card-stars">${level.stars} ${level.platformer ? '☾' : '★'}</span>${face(level)}<strong>${esc(level.name)}</strong><span class="creator">by ${esc(level.author)}</span><small>${esc(t.name)}</small></div>`;
}
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500); }
function save() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); }
  catch { if (!saveWarning) toast('Browser storage is full or unavailable. Export your save to keep your progress.'); saveWarning = true; }
  document.querySelector('.local-save').innerHTML = `<i></i> ${saveWarning ? 'Save unavailable' : user ? 'Saved on device' : 'Guest · saved on device'}`;
  clearTimeout(cloudTimer);
  if (user && cloudReady) cloudTimer = setTimeout(() => void syncCloud(), 3000);
}
function sound(pitch = 600, length = 0.035, gain = 0.025) {
  if (!state.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator(), volume = audio.createGain();
    oscillator.connect(volume); volume.connect(audio.destination); oscillator.type = 'sine'; oscillator.frequency.value = pitch;
    volume.gain.setValueAtTime(gain, audio.currentTime); volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + length);
    oscillator.start(); oscillator.stop(audio.currentTime + length);
  } catch {}
}
function renderStats() {
  $('balance').textContent = fmt(state.orbs); $('rolls').textContent = fmt(state.rolls);
  const collection = Object.values(state.collection);
  $('collected').textContent = fmt(collection.length); $('nav-count').textContent = collection.length;
  $('luck').textContent = state.upgrades.luck + ' / 10';
  $('luck').title = 'See How the odds work for current pool probabilities.';
  const best = collection.sort((a, b) => tier(b).rank - tier(a).rank)[0];
  $('best').textContent = best?.name || 'Your story starts here'; $('best').style.color = best ? tier(best).color : '';
  $('chase-face').innerHTML = face(best || { difficulty: 'Extreme Demon' });
  $('speed-label').textContent = (duration() / 1000).toFixed(1) + 's / spin';
  $('sound').setAttribute('aria-pressed', state.sound); $('sound').textContent = state.sound ? '♫' : '♪';
  $('auto').setAttribute('aria-pressed', auto);
  $('auto').innerHTML = `↻ <span>Auto roll</span><small>${state.upgrades.auto ? auto ? 'ON' : 'OFF' : 'LOCKED'}</small>`;
  $('roll').disabled = spinning || accountLoading || !pool.length;
  $('quick').setAttribute('aria-pressed', state.quick);
  $('quick-state').textContent = state.quick ? 'ON' : 'OFF';
  $('reduced-motion').checked = state.reducedMotion;
  $('auto-stop').value = state.autoStop;
  renderDaily();
  $('roll').innerHTML = spinning ? '<span>↻</span> ROLLING… <span>···</span>' : '<span>◈</span> ROLL A LEVEL <span>→</span>';
}
function renderUpgrades() {
  $('upgrades').innerHTML = Object.entries(UPGRADES).map(([key, u]) => {
    const level = state.upgrades[key], maxed = level >= u.max, price = cost(key, level);
    return `<div class="upgrade-card"><div class="upgrade-top"><span class="upgrade-icon">${u.icon}</span><div><strong>${u.name}</strong><small>${u.max === 1 ? level ? 'Unlocked' : 'One-time unlock' : `LEVEL ${level} / ${u.max}`}</small></div></div><p>${u.description}</p><button class="buy" data-upgrade="${key}" ${maxed || state.orbs < price ? 'disabled' : ''}><span>${maxed ? 'Fully upgraded' : u.max === 1 ? 'Unlock' : 'Upgrade'} ${maxed ? '✓' : '↑'}</span><b>${maxed ? '' : `◈ ${fmt(price)}`}</b></button></div>`;
  }).join('');
}
function renderRecent() {
  if (!state.recent.length) { $('recent').innerHTML = '<div class="empty"><span>✧</span><strong>A fresh beginning.</strong><p>Your discoveries will find their home here.</p></div>'; return; }
  $('recent').innerHTML = `<div class="recent-list">${state.recent.slice(0, 8).map((l, i) => `<div class="recent-row" style="--tier:${tier(l).color}">${face(l)}<div><strong>${esc(l.name)}</strong><small>by ${esc(l.author)} · ${l.stars} ${l.platformer ? 'moons' : 'stars'}</small></div><span class="recent-tier">${esc(tier(l).name)}</span><a href="https://gdbrowser.com/${l.id}" target="_blank" rel="noopener noreferrer" aria-label="View ${esc(l.name)} on GDBrowser">↗</a></div>`).join('')}</div>`;
}
function renderGrid(kind) {
  const search = $(kind + '-search').value.toLowerCase(), difficulty = $(kind + '-filter').value;
  let levels = kind === 'collection' ? Object.values(state.collection) : pool;
  levels = levels.filter(l => (!difficulty || tier(l).name === difficulty) && `${l.name} ${l.author} ${l.id}`.toLowerCase().includes(search));
  const sort = kind === 'collection' ? $('collection-sort').value : 'rare';
  levels = [...levels].sort(sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : sort === 'count' ? (a, b) => b.count - a.count : (a, b) => tier(b).rank - tier(a).rank || a.name.localeCompare(b.name));
  $(kind + '-grid').innerHTML = levels.length ? levels.slice(0, 400).map(l => `<article class="level-card" style="--tier:${tier(l).color}">${l.count ? `<span class="count">×${fmt(l.count)}</span>` : ''}<div class="thumb-wrap">${thumbnail(l)}${face(l)}</div><h3>${esc(l.name)}</h3><p>by ${esc(l.author)}</p><div class="level-tier">${esc(tier(l).name)} · ${l.stars} ${l.platformer ? '☾' : '★'}</div><a href="https://gdbrowser.com/${l.id}" target="_blank" rel="noopener noreferrer"><span>ID ${l.id}</span><span>View level ↗</span></a></article>`).join('') : `<div class="empty"><span>▦</span><strong>${kind === 'collection' && !state.rolls ? 'Your collection starts with a roll.' : 'No matching levels yet.'}</strong><p>${kind === 'collection' ? 'Discover levels in the roulette to add them here.' : 'More levels arrive as the live pool refreshes.'}</p></div>`;
  if (kind === 'catalog') $('catalog-count').textContent = `${fmt(levels.length)} matching${levels.length > 400 ? ' · showing first 400' : ''}`;
}
function duration() { return state.quick ? Math.max(350, 1500 - state.upgrades.speed * 230) : Math.max(1300, 4800 - state.upgrades.speed * 700); }
function idleReel() {
  if (spinning || !pool.length) return;
  const levels = Array.from({ length: 12 }, () => pickLevel(pool, state.upgrades.luck));
  reel.innerHTML = levels.map(card).join('');
  reel.style.transform = `translateX(${viewport.clientWidth / 2 - 4 * 150 - 70}px)`;
}
function stopAuto() { auto = false; clearTimeout(autoTimer); renderStats(); }
async function roll() {
  if (spinning || accountLoading || activeView !== 'roll' || !pool.length) return;
  spinning = true; clearTimeout(autoTimer); sound(350, 0.1);
  const winner = pickLevel(pool, state.upgrades.luck), speed = duration(), income = state.upgrades.income;
  const fillers = Array.from({ length: 48 }, () => pickLevel(pool, state.upgrades.luck));
  const targetIndex = 39; fillers[targetIndex] = winner;
  reel.innerHTML = fillers.map(card).join('');
  const initial = viewport.clientWidth / 2 - 3 * 150 - 70;
  // Offset remains inside the target card. Width is measured again on resize below.
  const jitter = (Math.random() - 0.5) * 80;
  let end = viewport.clientWidth / 2 - targetIndex * 150 - 70 + jitter;
  reel.style.transform = `translateX(${initial}px)`;
  viewport.classList.add('spinning');
  $('spin-status').textContent = 'Finding your next discovery…';
  $('result').innerHTML = '<span class="result-spark">✧</span><div><strong>Trust the process.</strong><span>Watch the marker. Your discovery is coming.</span></div>';
  renderStats();
  const reduced = state.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animation = reel.animate([{ transform: `translateX(${initial}px)` }, { transform: `translateX(${end}px)` }], { duration: reduced ? 150 : speed, easing: 'cubic-bezier(.12,.75,.15,1)', fill: 'forwards' });
  let lastTick = -1, frame;
  function tick() {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(reel).transform);
    const index = Math.floor((viewport.clientWidth / 2 - matrix.m41) / 150);
    if (index !== lastTick) { lastTick = index; sound(400 + (index % 4) * 60); }
    frame = requestAnimationFrame(tick);
  }
  if (!reduced) frame = requestAnimationFrame(tick);
  try { await animation.finished; } catch {}
  cancelAnimationFrame(frame);
  end = viewport.clientWidth / 2 - targetIndex * 150 - 70 + jitter;
  reel.style.transform = `translateX(${end}px)`; animation.cancel();
  reel.children[targetIndex]?.classList.add('won'); viewport.classList.remove('spinning');
  const isNew = !state.collection[winner.id], earned = reward(winner, income);
  state.collection[winner.id] = { ...winner, count: (state.collection[winner.id]?.count || 0) + 1 };
  state.rolls++; state.orbs += earned; state.recent.unshift(winner); state.recent = state.recent.slice(0, 20);
  const today = dayKey();
  if (state.daily?.date !== today || tier(winner).rank > tier(state.daily.level).rank) state.daily = { date: today, level: winner };
  save(); spinning = false;
  if (state.autoStop && tier(winner).rank >= Number(state.autoStop)) { stopAuto(); toast('Auto roll paused — you found ' + tier(winner).name + '!'); }
  $('result').innerHTML = `<span class="result-spark" style="color:${tier(winner).color}">✦</span><div><strong>${esc(winner.name)} ${isNew ? '<b class="new-badge">NEW DISCOVERY</b>' : '<b class="new-badge">DUPLICATE</b>'}</strong><span>${esc(tier(winner).name)} · <a href="https://gdbrowser.com/${winner.id}" target="_blank" rel="noopener noreferrer">View level ↗</a> · +${fmt(earned)} demon keys</span></div>`;
  $('spin-status').textContent = isNew ? 'A new one for the collection.' : 'Another roll, a little more power.';
  sound(tier(winner).rank >= 6 ? 880 : 660, 0.4, 0.06);
  renderStats(); renderUpgrades(); renderRecent();
  if (activeView === 'collection') renderGrid('collection');
  if (auto && activeView === 'roll' && !document.hidden) autoTimer = setTimeout(roll, 1100);
  void syncPool();
}
async function syncPool() {
  if (syncing) return;
  syncing = true;
  try {
    const response = await fetch('/api/levels', { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    const incoming = Array.isArray(data.levels) ? data.levels.map(normalize).filter(Boolean) : [];
    if (!incoming.length) throw new Error('No levels');
    const merged = new Map([...pool, ...incoming].map(l => [l.id, l])); pool = [...merged.values()];
    $('connection').innerHTML = `<i class="green-dot" style="background:${data.live ? '#76d8a9' : '#cda96c'}"></i> ${data.live ? 'Live catalog' : 'Cached / starter pool'} · ${fmt(pool.length)} loaded`;
    $('catalog-description').textContent = `${fmt(pool.length)} downloaded levels${data.total ? ` from ${fmt(data.total)} rated levels across ${fmt(data.pages)} pages` : ' · waiting for live catalog metadata'}.`;
    if (!reel.children.length) idleReel();
    if (activeView === 'catalog') renderGrid('catalog');
  } catch {
    $('connection').textContent = pool.length ? `Offline · ${fmt(pool.length)} levels in memory` : 'Could not load levels. Start the Node server and refresh.';
  } finally { syncing = false; renderStats(); }
}
function showView(view) {
  if (view === 'home' && spinning) { toast('Let this roll finish before returning to the menu.'); return; }
  if (view !== 'roll') stopAuto(); activeView = view;
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('home-screen').hidden = view !== 'home'; $('game-screen').hidden = view === 'home';
  document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${view}`; });
  document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  if (view === 'collection' || view === 'catalog') renderGrid(view);
  if (view === 'leaderboard') void renderLeaderboard();
  if (view === 'roll') requestAnimationFrame(idleReel);
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => { stopAuto(); $(button.dataset.dialog).showModal(); }));
$('play-guest').addEventListener('click', () => showView('roll'));
$('home-button').addEventListener('click', () => showView('home'));
$('quick').addEventListener('click', () => { state.quick = !state.quick; save(); renderStats(); });
$('reduced-motion').addEventListener('change', event => { state.reducedMotion = event.target.checked; save(); });
$('auto-stop').addEventListener('change', event => { state.autoStop = event.target.value; save(); });
$('roll').addEventListener('click', roll);
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && activeView === 'roll' && !document.querySelector('dialog[open]') && !/INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName)) { event.preventDefault(); void roll(); }
});
$('upgrades').addEventListener('click', event => {
  const button = event.target.closest('[data-upgrade]'); if (!button) return;
  const key = button.dataset.upgrade, level = state.upgrades[key], price = cost(key, level);
  if (level >= UPGRADES[key].max || state.orbs < price) return;
  state.orbs -= price; state.upgrades[key]++; save(); renderStats(); renderUpgrades(); sound(900, 0.15);
  toast(`${UPGRADES[key].name} ${key === 'auto' ? 'unlocked! Turn on Auto roll to begin.' : `upgraded to level ${state.upgrades[key]}.`}`);
});
$('auto').addEventListener('click', () => {
  if (!state.upgrades.auto) { toast('Unlock Auto roller in Upgrades for 180 demon keys.'); $('upgrades-dialog').showModal(); return; }
  if (auto) stopAuto(); else { auto = true; renderStats(); if (!spinning) void roll(); }
});
$('sound').addEventListener('click', () => { state.sound = !state.sound; save(); renderStats(); if (state.sound) sound(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); });
window.addEventListener('resize', () => { if (!spinning) idleReel(); });
for (const kind of ['collection', 'catalog']) {
  $(kind + '-filter').innerHTML += TIERS.map(t => `<option>${t.name}</option>`).join('');
  $(kind + '-search').addEventListener('input', () => renderGrid(kind));
  $(kind + '-filter').addEventListener('change', () => renderGrid(kind));
}
$('collection-sort').addEventListener('change', () => renderGrid('collection'));
$('refresh').addEventListener('click', async () => { await syncPool(); toast('Pool refreshed. Live discovery requests are limited to one per 10 seconds.'); });
$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'gdrng-reborn-save.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('odds-button').addEventListener('click', () => {
  const totals = TIERS.map(t => { const count = pool.filter(l => tier(l).name === t.name).length; return { ...t, count, weight: count * Math.pow(.65 + state.upgrades.luck * .025, t.rank) }; });
  const sum = totals.reduce((a, t) => a + t.weight, 0);
  $('odds-table').innerHTML = '<p>Current pool probabilities at your luck level:</p>' + totals.filter(t => t.count).map(t => `<div class="odds-row"><span style="color:${t.color}">${t.name} (${t.count})</span><span>${(t.weight / sum * 100).toFixed(2)}%</span></div>`).join('');
  stopAuto(); $('odds-dialog').showModal();
});
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));
$('chase-face').innerHTML = face({ id: 0, difficulty: 'Extreme Demon' });

renderStats(); renderUpgrades(); renderRecent();
void syncPool();
// The first response is immediate cache; collect the background fetch shortly after.
setTimeout(syncPool, 11000);
setInterval(syncPool, 30000);

function renderDaily() {
  const today = dayKey();
  $('daily-date').textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: '2-digit', timeZone: 'UTC' }).toUpperCase() + ' · UTC';
  const local = state.daily?.date === today ? state.daily.level : null;
  const global = dailyGlobal?.date === today ? dailyGlobal.entry : null;
  const useGlobal = global && (!local || global.difficultyRank >= tier(local).rank);
  $('daily-scope').textContent = useGlobal ? '· COMMUNITY' : '· YOUR DEVICE';
  $('daily-best').textContent = useGlobal ? global.levelName : local?.name || 'A new day. A new possibility.';
  $('daily-detail').textContent = useGlobal ? `${global.difficulty} · ${global.username}` : local ? tier(local).name : 'Make your first discovery today.';
}
async function refreshDaily() {
  try { const entries = await accounts.leaderboard(dayKey()); dailyGlobal = { date: dayKey(), entry: entries[0] || null }; renderDaily(); }
  catch { /* Personal daily best remains available offline. */ }
}
async function renderLeaderboard() {
  $('leaderboard-list').innerHTML = '<div class="empty"><span>♜</span><strong>Finding the lucky ones…</strong></div>';
  try {
    const entries = await withTimeout(accounts.leaderboard(), 12000);
    $('leaderboard-list').innerHTML = entries.length ? entries.map((entry, index) => `<div class="leaderboard-row"><div><b>${String(index + 1).padStart(2,'0')}</b><span>${esc(entry.username)}</span></div><div>${face({ difficulty: entry.difficulty })}<span>${esc(entry.levelName)}<small>${esc(entry.difficulty)}</small></span></div><span>${fmt(entry.rolls)}</span></div>`).join('') : '<div class="empty"><span>♜</span><strong>The first chapter is unwritten.</strong><p>Sign in and make a discovery to join the leaderboard.</p></div>';
  } catch (error) {
    $('leaderboard-list').innerHTML = `<div class="empty"><span>♜</span><strong>The leaderboard is taking a breather.</strong><p>${esc(accounts.accountError(error))}</p><p>Use Refresh to try again.</p></div>`;
  }
}
$('refresh-leaderboard').addEventListener('click', () => void renderLeaderboard());
function withTimeout(promise, delay) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Connection timed out')), delay); })]).finally(() => clearTimeout(timer));
}
function accountUI() {
  const name = user?.displayName || (user ? 'Dasher' : 'Guest player');
  $('account-button').textContent = name.charAt(0).toUpperCase();
  $('account-button').setAttribute('aria-label', user ? 'Open account for ' + name : 'Sign in');
  $('account-name').textContent = name;
  $('account-email').textContent = user?.email || '';
  $('home-account').textContent = user ? `Welcome back, ${name}. Your next discovery is waiting.` : 'Play as a guest, or sign in to take your collection with you.';
  $('play-guest').innerHTML = user ? 'Continue rolling <span>↗</span>' : 'Enter the roulette <span>↗</span>';
  document.querySelector('.local-save').innerHTML = `<i></i> ${saveWarning ? 'Save unavailable' : user ? 'Saved on device' : 'Guest · saved on device'}`;
}
function syncStatus(message) { $('account-sync').textContent = message; }
async function syncCloud() {
  if (!user || !cloudReady || accountLoading) return false;
  if (cloudPending) return cloudPending;
  const owner = user, snapshot = structuredClone(state), revision = state.updatedAt;
  const best = bestLevel(), daily = state.daily?.date === dayKey() ? state.daily.level : null;
  syncStatus('Saving your collection…');
  cloudPending = accounts.saveProfile(owner, snapshot, best, daily, dayKey()).then(() => {
    if (user?.uid === owner.uid) { syncStatus('Collection saved to your account.'); document.querySelector('.local-save').innerHTML = '<i></i> Cloud saved'; }
    return true;
  }).catch(error => { if (user?.uid === owner.uid) syncStatus(accounts.accountError(error)); return false; }).finally(() => {
    cloudPending = null;
    if (user?.uid === owner.uid && state.updatedAt !== revision && cloudReady) { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => void syncCloud(), 3000); }
  });
  return cloudPending;
}
async function restoreCloud(owner) {
  const profile = await withTimeout(accounts.loadProfile(owner.uid), 12000);
  if (user?.uid !== owner.uid) return;
  if (profile?.save) {
    const remote = readSave(profile.save);
    if (remote.updatedAt > state.updatedAt) state = remote;
  }
  cloudReady = true;
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { saveWarning = true; }
  syncStatus('Your collection is ready.');
}
async function changeAccount(nextUser) {
  accountLoading = true; stopAuto(); clearTimeout(cloudTimer); cloudReady = false;
  // An in-progress roll belongs to the account that started it.
  while (spinning) await new Promise(resolve => setTimeout(resolve, 100));
  if (cloudPending) await cloudPending;
  user = nextUser;
  STORAGE = user ? `gdrng-reborn-account-${user.uid}` : GUEST_STORAGE;
  saveWarning = false;
  try { state = readSave(localStorage.getItem(STORAGE)); } catch { state = readSave(null); }
  accountUI(); renderStats(); renderUpgrades(); renderRecent();
  $('result').innerHTML = '<span class="result-spark">✧</span><div><strong>Something good is coming.</strong><span>Trust your luck. Take a spin.</span></div>';
  if (user) {
    try { await restoreCloud(user); }
    catch (error) { syncStatus(accounts.accountError(error)); toast('Signed in. Cloud save unavailable; your account progress will stay on this device.'); }
  }
  accountLoading = false;
  accountUI(); renderStats(); renderUpgrades(); renderRecent(); idleReel();
  if (activeView === 'collection') renderGrid('collection');
  if (user && cloudReady) { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => void syncCloud(), 1000); }
}
let accountQueue = Promise.resolve();
void accounts.watchAccount(nextUser => {
  accountQueue = accountQueue.then(() => changeAccount(nextUser)).catch(error => { accountLoading = false; toast(accounts.accountError(error)); renderStats(); });
}, () => { syncStatus('Sign-in is temporarily unavailable. Guest play is ready.'); });
function openAuth(mode) {
  if (user) { $('account-dialog').showModal(); return; }
  stopAuto(); authMode = mode;
  $('auth-title').textContent = mode === 'signup' ? 'Your next chapter starts here.' : 'Back for another roll?';
  $('auth-description').textContent = mode === 'signup' ? 'Create an account. Keep every discovery.' : 'Sign in and pick up where your luck left off.';
  $('username-label').hidden = mode !== 'signup'; $('auth-name').required = mode === 'signup';
  $('auth-password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  $('auth-submit').textContent = mode === 'signup' ? 'Create account ↗' : 'Sign in ↗';
  $('auth-switch').textContent = mode === 'signup' ? 'Already rolling? Sign in ↗' : 'New here? Create an account ↗';
  $('forgot-password').hidden = mode === 'signup';
  $('auth-feedback').textContent = ''; $('auth-feedback').classList.remove('error');
  if (!$('auth-dialog').open) $('auth-dialog').showModal();
}
document.querySelectorAll('[data-auth]').forEach(button => button.addEventListener('click', () => openAuth(button.dataset.auth)));
$('account-button').addEventListener('click', () => { stopAuto(); if (user) $('account-dialog').showModal(); else openAuth('login'); });
$('auth-switch').addEventListener('click', () => openAuth(authMode === 'signup' ? 'login' : 'signup'));
async function authAction(mode) {
  if (authBusy) return;
  authBusy = true;
  $('auth-feedback').classList.remove('error'); $('auth-feedback').textContent = mode === 'reset' ? 'Sending reset email…' : 'Connecting your account…';
  const controls = [...$('auth-dialog').querySelectorAll('button:not(.dialog-close),input')];
  controls.forEach(control => control.disabled = true);
  try {
    await withTimeout(accounts.authenticate(mode, $('auth-email').value.trim(), $('auth-password').value, $('auth-name').value), 20000);
    if (mode === 'reset') { $('auth-feedback').textContent = 'If this email has an account, a reset link is on its way. Check your inbox.'; }
    else { $('auth-dialog').close(); $('auth-form').reset(); accountUI(); showView('roll'); toast('Welcome to GDRNG:R. Let’s find something good.'); }
  } catch (error) { $('auth-feedback').textContent = accounts.accountError(error); $('auth-feedback').classList.add('error'); }
  finally { authBusy = false; controls.forEach(control => control.disabled = false); }
}
$('auth-form').addEventListener('submit', event => { event.preventDefault(); void authAction(authMode); });
$('google-login').addEventListener('click', () => void authAction('google'));
$('forgot-password').addEventListener('click', () => { if ($('auth-email').reportValidity()) void authAction('reset'); });
$('sync-now').addEventListener('click', async () => {
  if (!user || accountLoading) return;
  $('sync-now').disabled = true;
  try { if (!cloudReady) { await restoreCloud(user); renderStats(); renderUpgrades(); renderRecent(); } toast(await syncCloud() ? 'Collection saved to your account.' : 'Cloud save unavailable. Your progress is saved on this device.'); }
  catch (error) { syncStatus(accounts.accountError(error)); }
  finally { $('sync-now').disabled = false; }
});
$('logout').addEventListener('click', async () => {
  if (spinning || accountLoading) { toast('Wait for your current roll or account load to finish.'); return; }
  $('logout').disabled = true; clearTimeout(cloudTimer);
  try { await withTimeout(syncCloud(), 12000); await accounts.logout(); $('account-dialog').close(); showView('home'); toast('Signed out. Your account progress is kept separately on this device.'); }
  catch (error) { syncStatus(accounts.accountError(error)); }
  finally { $('logout').disabled = false; }
});
fetch('/legacy-levels.json').then(response => response.json()).then(data => { legacy = data; if (!spinning) idleReel(); }).catch(() => {});
void refreshDaily();
setInterval(() => { renderDaily(); void refreshDaily(); }, 60000);
accountUI();

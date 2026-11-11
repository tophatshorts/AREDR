export const TIERS = [
  { name: 'Auto', color: '#a3b6c9', rank: 0 },
  { name: 'Easy', color: '#5bc8ff', rank: 1 },
  { name: 'Normal', color: '#71e7ac', rank: 2 },
  { name: 'Hard', color: '#ffcf62', rank: 3 },
  { name: 'Harder', color: '#ff9b56', rank: 4 },
  { name: 'Insane', color: '#f17de0', rank: 5 },
  { name: 'Easy Demon', color: '#ae93ff', rank: 6 },
  { name: 'Medium Demon', color: '#c37aff', rank: 7 },
  { name: 'Hard Demon', color: '#ff7979', rank: 8 },
  { name: 'Insane Demon', color: '#ff535f', rank: 9 },
  { name: 'Extreme Demon', color: '#ff3d63', rank: 10 }
];
export function tier(level) { return TIERS.find(t => t.name.toLowerCase() === String(level.difficulty).toLowerCase()) || TIERS[Math.min(5, Math.max(0, Math.ceil((level.stars || 1) / 2)))]; }
export function normalize(level) {
  if (!level || !/^\d+$/.test(String(level.id)) || !(Number(level.stars) > 0) || !level.name) return null;
  return { id: String(level.id), name: String(level.name).slice(0, 100), author: String(level.author || 'Unknown').slice(0, 60), difficulty: String(level.difficulty || 'Auto'), stars: Number(level.stars), platformer: !!level.platformer, rating: String(level.rating || 'Rated'), downloads: Number(level.downloads) || 0 };
}
export function pickLevel(pool, luck = 0, random = Math.random) {
  if (!pool.length) throw new Error('No levels available');
  // Base difficulty weighting keeps demons rare; luck flattens that curve.
  const weights = pool.map(l => Math.pow(0.65 + Math.min(10, luck) * 0.025, tier(l).rank));
  let cursor = random() * weights.reduce((a, b) => a + b, 0);
  return pool.find((_, i) => (cursor -= weights[i]) < 0) || pool.at(-1);
}
export const UPGRADES = {
  luck: { name: 'Lucky charm', icon: '✦', description: 'Increase the weight of harder levels in your roll pool.', base: 60, max: 10 },
  speed: { name: 'Quick spin', icon: 'ϟ', description: 'Shorter spins. More chances to find your next demon.', base: 45, max: 5 },
  income: { name: 'Key amplifier', icon: '◈', description: 'Earn 25% more demon keys per upgrade, on every roll.', base: 80, max: 10 },
  auto: { name: 'Auto roller', icon: '↻', description: 'Keep the reel spinning automatically. Toggle anytime.', base: 180, max: 1 }
};
export const cost = (key, level) => Math.ceil(UPGRADES[key].base * 1.65 ** level);
export const reward = (level, income) => Math.round((12 + tier(level).rank * 4) * (1 + income * 0.25));
export const freshSave = () => ({ version: 1, orbs: 0, rolls: 0, upgrades: { luck: 0, speed: 0, income: 0, auto: 0 }, collection: {}, recent: [], sound: true, quick: false, reducedMotion: false, autoStop: '', daily: null, updatedAt: 0 });
export function readSave(raw) {
  try {
    const s = JSON.parse(raw);
    if (s?.version !== 1) return freshSave();
    const out = freshSave();
    out.orbs = Math.max(0, Math.min(1e12, Math.floor(Number(s.orbs) || 0)));
    out.rolls = Math.max(0, Math.min(1e12, Math.floor(Number(s.rolls) || 0)));
    for (const key in UPGRADES) out.upgrades[key] = Math.max(0, Math.min(UPGRADES[key].max, Math.floor(Number(s.upgrades?.[key]) || 0)));
    for (const [id, item] of Object.entries(s.collection || {})) {
      const level = normalize(item);
      if (level && id === level.id) out.collection[id] = { ...level, count: Math.max(1, Math.floor(Number(item.count) || 1)) };
    }
    out.recent = (Array.isArray(s.recent) ? s.recent : []).map(normalize).filter(Boolean).slice(0, 20);
    out.sound = s.sound !== false;
    out.quick = s.quick === true;
    out.reducedMotion = s.reducedMotion === true;
    out.autoStop = ['6', '8', '10'].includes(s.autoStop) ? s.autoStop : '';
    out.updatedAt = Number.isFinite(s.updatedAt) ? Math.max(0, s.updatedAt) : 0;
    const dailyLevel = normalize(s.daily?.level);
    if (dailyLevel && /^\d{4}-\d{2}-\d{2}$/.test(s.daily?.date)) out.daily = { date: s.daily.date, level: dailyLevel };
    return out;
  } catch { return freshSave(); }
}

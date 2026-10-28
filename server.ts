import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent leaderboard storage file
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard_data.json');

interface LeaderboardRecord {
  id: string;
  username: string;
  demonName: string;
  demonPosition: number;
  rarity: number;
  rollsCount: number;
  timestamp: number;
  dateStr: string;
  monthStr: string;
}

// Initial seeded records for top GD community legends
function getInitialLeaderboard(): LeaderboardRecord[] {
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  return [
    {
      id: 'seed-1',
      username: 'Zoink',
      demonName: 'GRIEF',
      demonPosition: 1,
      rarity: 100000,
      rollsCount: 4120,
      timestamp: now - 3600000 * 2,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-2',
      username: 'Trick',
      demonName: 'Artemis 13',
      demonPosition: 2,
      rarity: 98319,
      rollsCount: 3250,
      timestamp: now - 3600000 * 5,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-3',
      username: 'Doggie',
      demonName: 'Society',
      demonPosition: 3,
      rarity: 96000,
      rollsCount: 2890,
      timestamp: now - 3600000 * 12,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-4',
      username: 'wPopoff',
      demonName: 'Thinking Space II',
      demonPosition: 4,
      rarity: 94000,
      rollsCount: 2100,
      timestamp: now - 3600000 * 20,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-5',
      username: 'Diamond',
      demonName: 'Amethyst',
      demonPosition: 5,
      rarity: 92000,
      rollsCount: 1940,
      timestamp: now - 3600000 * 30,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-6',
      username: 'Viprin',
      demonName: 'Tidal Wave',
      demonPosition: 7,
      rarity: 89000,
      rollsCount: 1450,
      timestamp: now - 3600000 * 48,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-7',
      username: 'Riot',
      demonName: 'Bloodbath',
      demonPosition: 500,
      rarity: 500,
      rollsCount: 420,
      timestamp: now - 3600000 * 80,
      dateStr: todayStr,
      monthStr: monthStr,
    },
    {
      id: 'seed-8',
      username: 'Neigendeu',
      demonName: 'Acu',
      demonPosition: 1604,
      rarity: 4,
      rollsCount: 35,
      timestamp: now - 3600000 * 90,
      dateStr: todayStr,
      monthStr: monthStr,
    },
  ];
}

let leaderboardEntries: LeaderboardRecord[] = [];
try {
  if (fs.existsSync(LEADERBOARD_FILE)) {
    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
    leaderboardEntries = JSON.parse(raw);
  } else {
    leaderboardEntries = getInitialLeaderboard();
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboardEntries, null, 2));
  }
} catch (e) {
  leaderboardEntries = getInitialLeaderboard();
}

// Cached demons data
let cachedDemons: any[] = [];
const DEMONS_CACHE_FILE = path.join(__dirname, 'src/data/demons.json');
try {
  if (fs.existsSync(DEMONS_CACHE_FILE)) {
    const raw = fs.readFileSync(DEMONS_CACHE_FILE, 'utf-8');
    cachedDemons = JSON.parse(raw);
  }
} catch (err) {
  console.error('Failed reading demons.json cache:', err);
}

// Background update from AREDL if available
async function refreshAredlData() {
  try {
    const res = await fetch('https://api.aredl.net/v2/api/aredl/levels', {
      headers: { 'User-Agent': 'GD-Extreme-Demon-RNG/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 500) {
        cachedDemons = data
          .map((d: any) => {
            const pos = d.position;
            let rating = 'Rated';
            if (pos === 1) rating = 'Mythic';
            else if (pos <= 10) rating = 'Legendary';
            else if (pos <= 150) rating = 'Epic';
            else if (pos <= 500) rating = 'Featured';

            // Extract tags and add custom ones
            const tags = Array.isArray(d.tags) ? [...d.tags] : [];
            const name = (d.name || '').toLowerCase();
            
            // Add version tags based on common knowledge/ID thresholds if level_id exists
            if (d.level_id) {
              const lid = Number(d.level_id);
              if (lid >= 27000000) tags.push('2.1');
              else if (lid >= 20000000) tags.push('2.0');
              else if (lid >= 10000000) tags.push('1.9');
              else tags.push('Old School');
            }

            // Style tags
            if (name.includes('flow') || tags.includes('flow')) tags.push('Flow');
            if (name.includes('memory') || tags.includes('memory') || name === 'limbo') tags.push('Memory');
            if (name.includes('learn') || tags.includes('learny') || name.includes('sync')) tags.push('Learny');
            if (pos <= 150) tags.push('Main List');
            if (pos > 150 && pos <= 500) tags.push('Extended List');
            if (pos > 500) tags.push('Legacy');

            // Fix publisher/verifier mapping
            // Many AREDL levels have publisher as a string or object.
            let publisher = 'Unknown';
            if (d.publisher) {
              if (typeof d.publisher === 'string') publisher = d.publisher;
              else if (typeof d.publisher === 'object') publisher = d.publisher.global_name || d.publisher.username || 'Unknown';
            }

            let verifier = publisher;
            if (d.verifier) {
              if (typeof d.verifier === 'string') verifier = d.verifier;
              else if (typeof d.verifier === 'object') verifier = d.verifier.global_name || d.verifier.username || 'Unknown';
            }

            return {
              id: d.id || `aredl-${d.position}`,
              name: d.name,
              position: d.position,
              publisher: publisher,
              verifier: verifier,
              points: d.points || 0,
              tags: [...new Set(tags)], // Unique tags
              description: d.description || null,
              level_id: d.level_id || null,
              difficulty: 'Extreme Demon',
              rating,
              gddl_tier: d.gddl_tier !== null && d.gddl_tier !== undefined ? Math.round(d.gddl_tier * 10) / 10 : null,
              edel_enjoyment: d.edel_enjoyment !== null && d.edel_enjoyment !== undefined ? Math.round(d.edel_enjoyment) : null,
              status: d.status || (pos <= 150 ? 'MainList' : pos <= 500 ? 'Extended' : 'Legacy'),
            };
          })
          .sort((a: any, b: any) => a.position - b.position);
        fs.mkdirSync(path.join(__dirname, 'src/data'), { recursive: true });
        fs.writeFileSync(DEMONS_CACHE_FILE, JSON.stringify(cachedDemons));
        console.log(`Successfully refreshed ${cachedDemons.length} demons from AREDL!`);
      }
    }
  } catch (err) {
    // Keep local cache
  }
}
refreshAredlData();

// API: Get demons list
app.get('/api/demons', (req, res) => {
  res.json({
    count: cachedDemons.length,
    demons: cachedDemons,
  });
});

// API: Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type || 'alltime';
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  let filtered = [...leaderboardEntries];
  if (type === 'daily') {
    filtered = filtered.filter((e) => e.dateStr === todayStr || Date.now() - e.timestamp <= 86400000);
  } else if (type === 'monthly') {
    filtered = filtered.filter((e) => e.monthStr === monthStr || Date.now() - e.timestamp <= 86400000 * 30);
  }

  // Sort by hardest demon (lowest position number), then lowest rolls count, then earliest timestamp
  filtered.sort((a, b) => {
    if (a.demonPosition !== b.demonPosition) return a.demonPosition - b.demonPosition;
    if (a.rollsCount !== b.rollsCount) return a.rollsCount - b.rollsCount;
    return a.timestamp - b.timestamp;
  });

  res.json(filtered.slice(0, 50));
});

// API: Get Daily Hardest
app.get('/api/leaderboard/daily-hardest', (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyEntries = leaderboardEntries
    .filter((e) => e.dateStr === todayStr || Date.now() - e.timestamp <= 86400000)
    .sort((a, b) => a.demonPosition - b.demonPosition);

  const topDaily = dailyEntries.length > 0 ? dailyEntries[0] : null;
  res.json({ dailyHardest: topDaily });
});

// API: Submit personal best to leaderboard
app.post('/api/leaderboard/submit', (req, res) => {
  const { username, demonName, demonPosition, rarity, rollsCount } = req.body;
  if (!username || !demonName || typeof demonPosition !== 'number') {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  // Check if player already exists on leaderboard
  const existingIndex = leaderboardEntries.findIndex((e) => e.username.toLowerCase() === username.toLowerCase());

  const newRecord: LeaderboardRecord = {
    id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    username: username.slice(0, 24),
    demonName,
    demonPosition,
    rarity: rarity || 1,
    rollsCount: rollsCount || 1,
    timestamp: now,
    dateStr,
    monthStr,
  };

  if (existingIndex >= 0) {
    // Only update if new demon is harder (lower position)
    if (demonPosition <= leaderboardEntries[existingIndex].demonPosition) {
      leaderboardEntries[existingIndex] = newRecord;
    }
  } else {
    leaderboardEntries.push(newRecord);
  }

  // Keep up to 200 total records
  leaderboardEntries.sort((a, b) => a.demonPosition - b.demonPosition);
  if (leaderboardEntries.length > 200) {
    leaderboardEntries = leaderboardEntries.slice(0, 200);
  }

  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboardEntries, null, 2));
  } catch (err) {
    console.error('Failed writing leaderboard file:', err);
  }

  res.json({ success: true, record: newRecord });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Extreme Demon RNG server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

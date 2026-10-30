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

// Background update from AREDL & Pointercrate if available
async function refreshAredlData() {
  try {
    // 1. Fetch Pointercrate top demon publisher/verifier data
    const pcMap = new Map<string, { publisher: string; verifier: string }>();
    try {
      const [pc1Res, pc2Res] = await Promise.all([
        fetch('https://pointercrate.com/api/v2/demons/listed?limit=100', { headers: { 'User-Agent': 'GD-Extreme-Demon-RNG/1.0' } }),
        fetch('https://pointercrate.com/api/v2/demons/listed?limit=100&after=100', { headers: { 'User-Agent': 'GD-Extreme-Demon-RNG/1.0' } })
      ]);
      if (pc1Res.ok && pc2Res.ok) {
        const [d1, d2] = await Promise.all([pc1Res.json(), pc2Res.json()]);
        const allPc = [...(Array.isArray(d1) ? d1 : []), ...(Array.isArray(d2) ? d2 : [])];
        for (const item of allPc) {
          if (item?.name) {
            pcMap.set(item.name.toLowerCase().trim(), {
              publisher: item.publisher?.name || 'Unknown',
              verifier: item.verifier?.name || 'Unknown',
            });
          }
        }
      }
    } catch (pcErr) {
      console.warn('Pointercrate metadata fetch notice:', pcErr);
    }

    // Community known creator overrides
    const communityMap: Record<string, { publisher: string; verifier: string }> = {
      'goldcrest palace': { publisher: 'GrenadeofTacos', verifier: 'GrenadeofTacos' },
      'bloodbath': { publisher: 'Riot', verifier: 'Riot' },
      'cataclysm': { publisher: 'Ggb0y', verifier: 'Ggb0y' },
      'kenos': { publisher: 'ChiefFlurry', verifier: 'Npesta' },
      'sonic wave': { publisher: 'lSunix', verifier: 'lSunix' },
      'yatagarasu': { publisher: 'Viprin', verifier: 'Sunix' },
      'zodiac': { publisher: 'Bianox', verifier: 'Technical' },
      'tartarus': { publisher: 'Riot', verifier: 'Dolphy' },
      'kocmoc': { publisher: 'CherryTeam', verifier: 'Doggie' },
      'limbo': { publisher: 'MindCap', verifier: 'BGram' },
    };

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

            // Extract tags and ensure comprehensive coverage
            const tags = Array.isArray(d.tags) ? [...d.tags] : [];
            const cleanName = (d.name || '').toLowerCase().trim();
            
            // Add version tags based on common knowledge/ID thresholds
            if (d.level_id) {
              const lid = Number(d.level_id);
              if (lid >= 27000000 && !tags.some(t => t.includes('2.'))) tags.push('2.1');
              else if (lid >= 20000000 && !tags.some(t => t.includes('2.'))) tags.push('2.0');
              else if (lid >= 10000000 && !tags.some(t => t.includes('1.'))) tags.push('1.9');
            }

            // Style tags
            if (cleanName.includes('flow') && !tags.includes('Flow')) tags.push('Flow');
            if ((cleanName.includes('memory') || cleanName === 'limbo') && !tags.includes('Memory')) tags.push('Memory');
            if ((cleanName.includes('learn') || cleanName.includes('sync')) && !tags.includes('Learny')) tags.push('Learny');
            if (pos <= 150 && !tags.includes('Main List')) tags.push('Main List');
            else if (pos > 150 && pos <= 500 && !tags.includes('Extended List')) tags.push('Extended List');
            else if (pos > 500 && !tags.includes('Legacy')) tags.push('Legacy');

            // Resolve publisher and verifier
            let publisher = 'Unknown';
            let verifier = 'Unknown';

            if (communityMap[cleanName]) {
              publisher = communityMap[cleanName].publisher;
              verifier = communityMap[cleanName].verifier;
            } else if (pcMap.has(cleanName)) {
              const pc = pcMap.get(cleanName)!;
              publisher = pc.publisher;
              verifier = pc.verifier;
            } else if (d.publisher) {
              if (typeof d.publisher === 'string') publisher = d.publisher;
              else if (typeof d.publisher === 'object') publisher = d.publisher.global_name || d.publisher.username || 'Unknown';
              verifier = publisher;
            }

            return {
              id: d.id || `aredl-${d.position}`,
              name: d.name,
              position: d.position,
              publisher: publisher,
              verifier: verifier,
              points: d.points || 0,
              tags: [...new Set(tags)],
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
        console.log(`Successfully refreshed ${cachedDemons.length} demons from AREDL & Pointercrate!`);
      }
    }
  } catch (err) {
    console.warn('AREDL data refresh skipped:', err);
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

// --- Impossible Levels List (ILL) Integration ---
interface ILLLevel {
  id: number;
  name: string;
  creator: string;
  position: number;
  fps?: number;
  videoUrl?: string;
  levelId?: string;
  listType?: string;
}

type ListType = 'ILL' | 'Extended' | 'Legacy';

const ILL_BASE_URL = 'https://api.impossiblelevels.com/api/levels';
const ILL_CACHE_FILE = path.join(__dirname, 'src/data/impossible_levels.json');
let cachedImpossibleLevels: any[] = [];
try {
  if (fs.existsSync(ILL_CACHE_FILE)) {
    cachedImpossibleLevels = JSON.parse(fs.readFileSync(ILL_CACHE_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('Failed reading impossible_levels.json cache:', e);
}

function cleanCreatorName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return 'Community';
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === '0x00' ||
    ['unknown', 'n/a', 'none', 'undefined', 'null', 'community'].includes(trimmed.toLowerCase())
  ) {
    return 'Community';
  }
  return trimmed;
}

/**
 * Master function to fetch and clean Impossible Levels List data
 */
async function fetchAllLists(): Promise<void> {
  console.log('Initiating Impossible Levels List data pull...');

  try {
    const response = await fetch(ILL_BASE_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: any[] = await response.json();
    const rawList = Array.isArray(data) ? data : [];
    const visible = rawList.filter((d) => d.visible !== false && d.name);

    // Deduplicate by levelId or lowercase level name
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of visible) {
      const key = (item.levelId || item.name).toString().toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    unique.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));

    const formatted: any[] = unique.map((item, idx) => {
      const pos = idx + 1;
      const baseRarity = pos === 1 ? 1000000 : Math.max(10, Math.round(980000 - (pos / unique.length) * 900000));
      return {
        id: 'ill-' + (item.id || item.levelId || pos),
        name: item.name,
        position: pos,
        publisher: cleanCreatorName(item.uploader || item.creator || item.publisher),
        verifier: 'Unbeaten (ILL)',
        points: Math.max(100, Math.round(10000 - (pos / unique.length) * 9900)),
        level_id: item.levelId ? (Number(item.levelId) || item.levelId) : null,
        difficulty: 'Impossible Demon',
        rating: pos === 1 ? 'Mythic' : pos <= 10 ? 'Legendary' : 'Epic',
        tags: ['ILL', 'Impossible', pos === 1 ? 'Top 1 ILL' : pos <= 10 ? 'Top 10 ILL' : 'ILL List'],
        description: `Rank #${pos} on the Impossible Levels List. FPS: ${item.fps || 'Physics Breaking'}.`,
        baseRarity,
        isImpossible: true,
        fps: item.fps,
        videoUrl: item.showcaseLink || item.videoUrl,
      };
    });

    const secretStereoMadness = {
      id: "ill-0",
      name: "Stereo Madness",
      position: 0,
      publisher: "RobTop",
      verifier: "RobTop",
      points: 20000,
      level_id: 128,
      difficulty: "Secret / Impossible Demon",
      rating: "Mythic",
      tags: ["ILL", "Secret Tier", "Top 0 ILL", "6969 FPS"],
      description: "Secret #0 on the Impossible Levels List. FPS: 6969.",
      baseRarity: 10000001,
      isImpossible: true,
      fps: 6969
    };

    if (!formatted.some(l => l.position === 0)) {
      formatted.unshift(secretStereoMadness);
    }

    cachedImpossibleLevels = formatted;
    fs.writeFileSync(ILL_CACHE_FILE, JSON.stringify(formatted, null, 2));
    if (formatted.length > 0) {
      console.log(`✅ Loaded ${formatted.length} unique ILL levels. Top 0: ${formatted[0].name} by ${formatted[0].publisher}`);
    }
  } catch (err) {
    console.warn('ILL refresh notice:', err);
  }
}

// Execute the process
fetchAllLists();

// API: Get impossible levels list
app.get('/api/impossible-levels', (req, res) => {
  res.json({
    count: cachedImpossibleLevels.length,
    levels: cachedImpossibleLevels,
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

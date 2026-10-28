const fs = require('fs');
const path = require('path');

async function updateDemons() {
  const demonsPath = path.join(__dirname, '../src/data/demons.json');
  const demons = JSON.parse(fs.readFileSync(demonsPath, 'utf8'));
  console.log(`Loaded ${demons.length} demons from demons.json`);

  // 1. Pointercrate Map
  console.log('Fetching Pointercrate demons...');
  const pcMap = new Map();
  let pcAfter = 0;
  for (let page = 0; page < 15; page++) {
    try {
      const res = await fetch(`https://pointercrate.com/api/v2/demons/listed/?after=${pcAfter}&limit=100`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      for (const d of data) {
        const pub = d.publisher?.name || null;
        const ver = d.verifier?.name || pub || null;
        if (d.name) pcMap.set(d.name.toLowerCase().trim(), { publisher: pub, verifier: ver });
        if (d.level_id) pcMap.set('id_' + d.level_id, { publisher: pub, verifier: ver });
      }
      pcAfter = data[data.length - 1].position;
      if (data.length < 100) break;
    } catch (e) {
      console.warn('Pointercrate page error:', e.message);
      break;
    }
  }
  console.log(`Cached ${pcMap.size} Pointercrate mappings`);

  // 2. AREDL Map
  console.log('Fetching AREDL name map & list...');
  const aredlMap = new Map();
  try {
    const mapRes = await fetch('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/_name_map.json', {
      signal: AbortSignal.timeout(10000),
    });
    const nameMap = mapRes.ok ? await mapRes.json() : {};

    const listRes = await fetch('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/_list.json', {
      signal: AbortSignal.timeout(10000),
    });
    const list = listRes.ok ? await listRes.json() : [];

    console.log(`Fetching ${list.length} AREDL level details...`);
    const chunkSize = 50;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      await Promise.allSettled(
        chunk.map(async (filename) => {
          try {
            const res = await fetch(`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/${filename}.json`, {
              signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return;
            const lvl = await res.json();

            const author = nameMap[String(lvl.author)] || (typeof lvl.author === 'string' ? lvl.author : null);
            const verifier = nameMap[String(lvl.verifier)] || (typeof lvl.verifier === 'string' ? lvl.verifier : author);

            if (lvl.name) {
              aredlMap.set(lvl.name.toLowerCase().trim(), { publisher: author, verifier });
            }
            if (lvl.id) {
              aredlMap.set('id_' + lvl.id, { publisher: author, verifier });
            }
          } catch (e) {}
        })
      );
    }
  } catch (e) {
    console.warn('AREDL fetch errored:', e.message);
  }
  console.log(`Cached ${aredlMap.size} AREDL mappings`);

  // 3. Update local demons
  let pcMatches = 0;
  let aredlMatches = 0;
  let fallbackMatches = 0;

  const updatedDemons = demons.map((d) => {
    const keyName = d.name.toLowerCase().trim();
    const keyId = d.level_id ? 'id_' + d.level_id : null;

    const pc = pcMap.get(keyName) || (keyId ? pcMap.get(keyId) : null);
    const aredl = aredlMap.get(keyName) || (keyId ? aredlMap.get(keyId) : null);

    let pub = pc?.publisher || aredl?.publisher;
    let ver = pc?.verifier || aredl?.verifier;

    if (pc?.publisher) {
      pcMatches++;
    } else if (aredl?.publisher) {
      aredlMatches++;
    } else {
      fallbackMatches++;
    }

    // Clean up if missing or "AREDL Creator"
    if (!pub || pub === 'AREDL Creator') {
      pub = 'GD Creator';
    }
    if (!ver || ver === 'AREDL Creator') {
      ver = pub !== 'GD Creator' ? pub : 'GD Verifier';
    }

    return {
      ...d,
      publisher: pub,
      verifier: ver,
    };
  });

  console.log(`Match breakdown: Pointercrate=${pcMatches}, AREDL=${aredlMatches}, Fallback=${fallbackMatches}`);

  // Write updated demons back to file
  fs.writeFileSync(demonsPath, JSON.stringify(updatedDemons, null, 2), 'utf8');
  console.log('Successfully updated src/data/demons.json!');

  // Print sample top 10
  console.log('Sample updated demons (Top 10):');
  updatedDemons.slice(0, 10).forEach((item) => {
    console.log(`#${item.position} ${item.name} | Publisher: ${item.publisher} | Verifier: ${item.verifier}`);
  });
}

updateDemons().catch(console.error);

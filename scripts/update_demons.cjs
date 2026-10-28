const fs = require('fs');
const path = require('path');

async function updateDemons() {
  const demonsPath = path.join(__dirname, '../src/data/demons.json');
  const demons = JSON.parse(fs.readFileSync(demonsPath, 'utf8'));
  console.log(`Loaded ${demons.length} demons from demons.json`);

  const aredlMap = new Map();

  // 1. Fetch AREDL API (Single request for all levels)
  console.log('Fetching AREDL API levels...');
  try {
    const res = await fetch('https://api.aredl.net/v2/api/aredl/levels', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      for (const lvl of data) {
        const pub = lvl.publisher || lvl.creator || lvl.author || null;
        const ver = lvl.verifier || pub || null;

        if (lvl.name) {
          aredlMap.set(lvl.name.toLowerCase().trim(), { publisher: pub, verifier: ver });
        }
        if (lvl.level_id || lvl.id) {
          aredlMap.set('id_' + (lvl.level_id || lvl.id), { publisher: pub, verifier: ver });
        }
      }
    } else {
      console.warn(`AREDL API status: ${res.status}`);
    }
  } catch (e) {
    console.warn('AREDL API fetch error:', e.message);
  }
  console.log(`Cached ${aredlMap.size} AREDL mappings`);

  // 2. Update local demons
  let aredlMatches = 0;
  let fallbackMatches = 0;

  const updatedDemons = demons.map((d) => {
    const keyName = d.name ? d.name.toLowerCase().trim() : '';
    const keyId = d.level_id ? 'id_' + d.level_id : null;

    const aredl = aredlMap.get(keyName) || (keyId ? aredlMap.get(keyId) : null);

    let pub = aredl?.publisher;
    let ver = aredl?.verifier;

    if (aredl?.publisher) {
      aredlMatches++;
    } else {
      fallbackMatches++;
    }

    // Clean up generic fallbacks
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

  console.log(`Match breakdown: AREDL=${aredlMatches}, Fallback=${fallbackMatches}`);

  fs.writeFileSync(demonsPath, JSON.stringify(updatedDemons, null, 2), 'utf8');
  console.log(`Successfully updated ${demonsPath}!`);

  console.log('\nSample updated demons (Top 10):');
  updatedDemons.slice(0, 10).forEach((item) => {
    console.log(`#${item.position || '?'} ${item.name} | Publisher: ${item.publisher} | Verifier: ${item.verifier}`);
  });
}

updateDemons().catch(console.error);

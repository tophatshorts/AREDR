const fs = require('fs');
const path = require('path');

async function main() {
  const demonsPath = path.join(__dirname, '../src/data/demons.json');
  const demons = JSON.parse(fs.readFileSync(demonsPath, 'utf8'));
  console.log(`Starting enrichment for ${demons.length} demons using AREDL only...`);

  const aredlMap = new Map();

  // 1. Fetch AREDL API (Single request for all levels)
  console.log('Fetching AREDL API...');
  try {
    const res = await fetch('https://api.aredl.net/v2/api/aredl/levels', {
      signal: AbortSignal.timeout(10000),
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
      console.warn(`AREDL API returned status: ${res.status}`);
    }
  } catch (e) {
    console.warn('AREDL API fetch error:', e.message);
  }
  console.log(`AREDL mapped ${aredlMap.size} entries.`);

  // 2. Enrich demons
  let aredlMatches = 0;
  let fallbackMatches = 0;

  const enriched = demons.map((d) => {
    const keyName = d.name ? d.name.toLowerCase().trim() : '';
    const keyId = d.level_id ? 'id_' + d.level_id : null;

    const aredlMatch = aredlMap.get(keyName) || (keyId ? aredlMap.get(keyId) : null);

    let pub = aredlMatch?.publisher;
    let ver = aredlMatch?.verifier;

    if (aredlMatch?.publisher) {
      aredlMatches++;
    } else {
      fallbackMatches++;
    }

    // Clean fallbacks for unlisted/missing levels
    if (!pub || pub === 'AREDL Creator') pub = 'GD Creator';
    if (!ver || ver === 'AREDL Creator') ver = pub !== 'GD Creator' ? pub : 'GD Verifier';

    return {
      ...d,
      publisher: pub,
      verifier: ver,
    };
  });

  console.log(`\nSummary: AREDL Matches=${aredlMatches}, Fallback=${fallbackMatches}`);

  fs.writeFileSync(demonsPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`Updated ${demonsPath} successfully!`);

  console.log('\n--- SAMPLE ENRICHED DEMONS (Top 10) ---');
  enriched.slice(0, 10).forEach((d) => {
    console.log(`#${d.position || '?'} ${d.name} | Publisher: "${d.publisher}" | Verifier: "${d.verifier}"`);
  });
}

main().catch(console.error);

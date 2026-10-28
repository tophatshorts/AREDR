const fs = require('fs');
const path = require('path');

async function main() {
  const demonsPath = path.join(__dirname, '../src/data/demons.json');
  const demons = JSON.parse(fs.readFileSync(demonsPath, 'utf8'));
  console.log(`Starting enrichment for ${demons.length} demons using AREDL only...`);

  const aredlMap = new Map();

  // 1. Fetch AREDL API directly
  console.log('Fetching AREDL API...');
  try {
    const res = await fetch('https://api.aredl.net/v2/api/demons', {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const item of data) {
        const pub = item.publisher || item.creator || item.author || null;
        const ver = item.verifier || pub || null;

        if (item.name) {
          aredlMap.set(item.name.toLowerCase().trim(), { publisher: pub, verifier: ver });
        }
        if (item.level_id || item.id) {
          aredlMap.set('id_' + (item.level_id || item.id), { publisher: pub, verifier: ver });
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
  let aredlCount = 0;
  let fallbackCount = 0;

  const enriched = demons.map((d) => {
    const keyName = d.name ? d.name.toLowerCase().trim() : '';
    const keyId = d.level_id ? 'id_' + d.level_id : null;

    const aredlMatch = aredlMap.get(keyName) || (keyId ? aredlMap.get(keyId) : null);

    let pub = aredlMatch?.publisher;
    let ver = aredlMatch?.verifier;

    if (aredlMatch?.publisher) {
      aredlCount++;
    } else {
      fallbackCount++;
    }

    // Clean fallbacks if missing or generic
    if (!pub || pub === 'AREDL Creator') pub = 'GD Creator';
    if (!ver || ver === 'AREDL Creator') ver = pub !== 'GD Creator' ? pub : 'GD Verifier';

    return {
      ...d,
      publisher: pub,
      verifier: ver,
    };
  });

  console.log(`\nEnrichment Summary: AREDL Matches=${aredlCount}, Fallback=${fallbackCount}`);

  fs.writeFileSync(demonsPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log('Saved enriched demons to src/data/demons.json!');

  console.log('\n--- SAMPLE TOP 10 ---');
  enriched.slice(0, 10).forEach((d) => {
    console.log(`#${d.position || '?'} ${d.name} | Publisher: ${d.publisher} | Verifier: ${d.verifier}`);
  });
}

main().catch(console.error);

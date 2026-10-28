const fs = require('fs');
const path = require('path');

async function main() {
  const demonsPath = path.join(__dirname, '../src/data/demons.json');
  // Load original demons.json or backup
  const demons = JSON.parse(fs.readFileSync(demonsPath, 'utf8'));
  console.log(`Starting enrichment for ${demons.length} demons...`);

  // 1. Fetch ALL Pointercrate Demons
  const pcMap = new Map();
  let pcAfter = 0;
  console.log('Fetching Pointercrate API pages...');
  while (true) {
    try {
      const res = await fetch(`https://pointercrate.com/api/v2/demons/listed/?after=${pcAfter}&limit=100`);
      if (!res.ok) {
        console.warn('Pointercrate status not ok:', res.status);
        break;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      for (const item of data) {
        const pub = item.publisher?.name || null;
        const ver = item.verifier?.name || pub || null;
        if (item.name) pcMap.set(item.name.toLowerCase().trim(), { publisher: pub, verifier: ver });
        if (item.level_id) pcMap.set('id_' + item.level_id, { publisher: pub, verifier: ver });
      }

      pcAfter = data[data.length - 1].position;
      if (data.length < 100) break;
    } catch (e) {
      console.warn('Error fetching Pointercrate page:', e.message);
      break;
    }
  }
  console.log(`Pointercrate mapped ${pcMap.size} entries.`);

  // 2. Fetch AREDL Name Map & Level Files
  const aredlMap = new Map();
  try {
    console.log('Fetching AREDL name map & list...');
    const nameMapRes = await fetch('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/_name_map.json');
    const nameMap = nameMapRes.ok ? await nameMapRes.json() : {};

    const listRes = await fetch('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/_list.json');
    const list = listRes.ok ? await listRes.json() : [];

    console.log(`Fetching ${list.length} AREDL level detail files...`);
    // Fetch in batches of 60
    const batchSize = 60;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (filename) => {
          try {
            const res = await fetch(`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/${filename}.json`);
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
    console.warn('AREDL fetching error:', e.message);
  }
  console.log(`AREDL mapped ${aredlMap.size} entries.`);

  // 3. Combine & Enrich Demons Data
  let pcMatches = 0;
  let aredlMatches = 0;
  let fallbackMatches = 0;

  const enriched = demons.map((d) => {
    const keyName = d.name.toLowerCase().trim();
    const keyId = d.level_id ? 'id_' + d.level_id : null;

    const pcMatch = pcMap.get(keyName) || (keyId ? pcMap.get(keyId) : null);
    const aredlMatch = aredlMap.get(keyName) || (keyId ? aredlMap.get(keyId) : null);

    let pub = pcMatch?.publisher || aredlMatch?.publisher;
    let ver = pcMatch?.verifier || aredlMatch?.verifier;

    if (pcMatch?.publisher) {
      pcMatches++;
    } else if (aredlMatch?.publisher) {
      aredlMatches++;
    } else {
      fallbackMatches++;
    }

    // Clean up fallback if null or "AREDL Creator"
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

  console.log(`Matching Summary: Pointercrate=${pcMatches}, AREDL=${aredlMatches}, Fallback=${fallbackMatches}`);

  // Write back to demons.json
  fs.writeFileSync(demonsPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`Updated ${demonsPath} successfully!`);

  console.log('\n--- SAMPLE ENRICHED DEMONS (Top 15) ---');
  enriched.slice(0, 15).forEach((d) => {
    console.log(`#${d.position} ${d.name} | Publisher: "${d.publisher}" | Verifier: "${d.verifier}"`);
  });

  console.log('\n--- SAMPLE ENRICHED DEMONS (Position 100-110) ---');
  enriched.slice(99, 110).forEach((d) => {
    console.log(`#${d.position} ${d.name} | Publisher: "${d.publisher}" | Verifier: "${d.verifier}"`);
  });
}

main().catch(console.error);

const fs = require('fs');
const path = require('path');

async function main() {
  const demonsPath = path.join(__dirname, '../src/data/demons.json');
  const demons = JSON.parse(fs.readFileSync(demonsPath, 'utf8'));
  console.log(`Starting fast enrichment for ${demons.length} demons...`);

  // 1. Fetch ALL Pointercrate Demons (listed + legacy)
  const pcMap = new Map();
  let pcAfter = 0;
  console.log('Fetching Pointercrate API...');
  for (let page = 0; page < 25; page++) {
    try {
      const res = await fetch(`https://pointercrate.com/api/v2/demons/listed/?after=${pcAfter}&limit=100`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) break;
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
      console.warn('Pointercrate page end/error:', e.message);
      break;
    }
  }
  console.log(`Pointercrate mapped ${pcMap.size} entries.`);

  // Find which local demons are missing from Pointercrate
  const missingFromPC = demons.filter((d) => {
    const keyName = d.name.toLowerCase().trim();
    const keyId = d.level_id ? 'id_' + d.level_id : null;
    return !pcMap.has(keyName) && (!keyId || !pcMap.has(keyId));
  });

  console.log(`Missing from Pointercrate: ${missingFromPC.length} levels.`);

  // 2. Fetch AREDL for missing levels only
  const aredlMap = new Map();
  if (missingFromPC.length > 0) {
    try {
      console.log('Fetching AREDL name map...');
      const mapRes = await fetch('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/_name_map.json', {
        signal: AbortSignal.timeout(5000),
      });
      const nameMap = mapRes.ok ? await mapRes.json() : {};

      const listRes = await fetch('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/_list.json', {
        signal: AbortSignal.timeout(5000),
      });
      const list = listRes.ok ? await listRes.json() : [];

      // Create a set of filenames or level names we need to search
      const neededNames = new Set(missingFromPC.map((d) => d.name.toLowerCase().trim()));

      // Filter list filenames that might match or fetch needed filenames
      console.log(`Filtering AREDL list for ${neededNames.size} needed levels...`);
      const neededFiles = list.filter((fname) => {
        const cleanFname = fname.replace(/_/g, ' ').toLowerCase();
        return Array.from(neededNames).some((n) => cleanFname.includes(n) || n.includes(cleanFname));
      });

      console.log(`Found ${neededFiles.length} candidate AREDL files to fetch.`);

      await Promise.allSettled(
        neededFiles.map(async (filename) => {
          try {
            const res = await fetch(`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/aredl/main/data/${filename}.json`, {
              signal: AbortSignal.timeout(3000),
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
    } catch (e) {
      console.warn('AREDL fetch error:', e.message);
    }
  }

  // 3. Enrich demons
  let pcCount = 0;
  let aredlCount = 0;
  let fallbackCount = 0;

  const enriched = demons.map((d) => {
    const keyName = d.name.toLowerCase().trim();
    const keyId = d.level_id ? 'id_' + d.level_id : null;

    const pcMatch = pcMap.get(keyName) || (keyId ? pcMap.get(keyId) : null);
    const aredlMatch = aredlMap.get(keyName) || (keyId ? aredlMap.get(keyId) : null);

    let pub = pcMatch?.publisher || aredlMatch?.publisher;
    let ver = pcMatch?.verifier || aredlMatch?.verifier;

    if (pcMatch?.publisher) {
      pcCount++;
    } else if (aredlMatch?.publisher) {
      aredlCount++;
    } else {
      fallbackCount++;
    }

    // Clean up fallback so NO level ever says "AREDL Creator"
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

  console.log(`Enrichment Summary: Pointercrate=${pcCount}, AREDL=${aredlCount}, Fallback=${fallbackCount}`);

  // Write enriched demons back
  fs.writeFileSync(demonsPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log('Saved enriched demons to src/data/demons.json!');

  console.log('\n--- SAMPLE TOP 10 ---');
  enriched.slice(0, 10).forEach((d) => {
    console.log(`#${d.position} ${d.name} | Publisher: ${d.publisher} | Verifier: ${d.verifier}`);
  });

  console.log('\n--- SAMPLE POSITIONS 100-110 ---');
  enriched.slice(99, 110).forEach((d) => {
    console.log(`#${d.position} ${d.name} | Publisher: ${d.publisher} | Verifier: ${d.verifier}`);
  });
}

main().catch(console.error);

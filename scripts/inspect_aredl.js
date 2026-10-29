
async function fetchAredl() {
  try {
    const res = await fetch('https://api.aredl.net/v2/api/aredl/levels', {
      headers: { 'User-Agent': 'GD-Extreme-Demon-RNG/1.0' },
    });
    const data = await res.json();
    console.log(JSON.stringify(data[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}
fetchAredl();

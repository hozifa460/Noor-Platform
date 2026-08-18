async function probe() {
  try {
    const res = await fetch('https://everyayah.com/data/');
    const html = await res.text();
    const matches = html.match(/href="([^"]+)"/g) || [];
    const dirs = matches.map(m => m.replace(/href="|"/g, '').replace('/', '')).filter(d => !d.startsWith('?') && !d.startsWith('.'));
    console.log('Total dirs on EveryAyah:', dirs.length);
    console.log('All EveryAyah dirs:', dirs);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

probe();

require('dotenv').config();
const axios = require('axios');
const Uk = require('./ukdevilz_requester');

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const headers = {
  'User-Agent': process.env.UKDEVILZ_AGENT || DEFAULT_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchUrl(url) {
  try {
    const res = await axios.get(url, {
      headers,
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: 'text'
    });
    return res;
  } catch (err) {
    return { error: err.message };
  }
}

(async ()=>{
  const inst = new Uk();
  const cats = inst.getSupportedCategories();
  console.log('Probing categories:', cats.join(', '));

  for (const c of cats) {
    const url = `https://ukdevilz.com/video/${c}`;
    const res = await fetchUrl(url);
    if (res.error) {
      console.log(c, 'ERROR', res.error);
      continue;
    }
    console.log(`\nCategory: ${c} -> status ${res.status} content-type: ${res.headers['content-type'] || ''}`);
    const snippet = (res.data || '').slice(0, 800).replace(/</g, '\\u003c');
    console.log('Snippet:', snippet);
  }

  // probe sample watch page
  const watch = 'https://ukdevilz.com/watch/-127700459_456246190';
  const wres = await fetchUrl(watch);
  console.log('\nSample watch page ->', wres.error ? ('ERROR ' + wres.error) : ('status ' + wres.status));
  if (!wres.error) console.log('Snippet:', (wres.data||'').slice(0,800).replace(/</g,'\\u003c'));

})();

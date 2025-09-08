require('dotenv').config();
const Uk = require('./ukdevilz_requester');
(async ()=>{
  const u = new Uk();
  console.log('SCRAPFLY SDK available?', !!(require.cache[require.resolve('scrapfly-sdk')] || (()=>{try{require('scrapfly-sdk');return true}catch(e){return false}})()));
  console.log('SCRAPFLY_API_KEY present?', !!process.env.SCRAPFLY_API_KEY);

  const urls = [
    'https://ukdevilz.com/video/blowjob',
    'https://ukdevilz.com/watch/-127700459_456246190'
  ];

  for (const url of urls) {
    console.log('\n---\nCalling fetchRendered for:', url);
    try {
      const r = await u.fetchRendered(url, { wait: 3000, timeout: 30000 });
      if (!r) { console.log('fetchRendered returned NULL/undefined'); continue; }
      const s = (typeof r === 'string') ? r : (r.html || r.result || JSON.stringify(r).slice(0,10000));
      console.log('Returned type:', typeof r);
      const snippet = (s || '').toString().slice(0,4000).replace(/</g,'\\u003c');
      console.log('SNIPPET:\n', snippet);
    } catch (e) {
      console.error('ERROR calling fetchRendered:', e && e.message);
    }
  }
})();

require('dotenv').config();
const UkdevilzRequester = require('./ukdevilz_requester');
const axios = require('axios');
const { URL } = require('url');

(async ()=>{
  const u = new UkdevilzRequester();
  try{
    console.log('Fetching random content via ukdevilz_requester...');
    const content = await u.getRandomContent('blowjob');
    console.log('Content:', content);

    const headers = u.getRequestHeaders(content.page);
    console.log('Probe headers:', headers);

    // HEAD probe
    try{
      const head = await axios.head(content.url, { headers, timeout: 10000, maxRedirects: 5, validateStatus: () => true });
      console.log('HEAD status:', head.status, 'content-type:', head.headers['content-type'], 'content-length:', head.headers['content-length']);
      if (head.status >=200 && head.status <400) return;
    }catch(e){ console.log('HEAD probe failed:', e.message); }

    // Range GET probe
    try{
      const r = await axios.get(content.url, { headers: Object.assign({}, headers, { Range: 'bytes=0-0' }), timeout: 10000, responseType: 'stream', maxRedirects: 5, validateStatus: () => true });
      console.log('Range GET status:', r.status, 'headers:', { 'content-length': r.headers['content-length'], 'content-range': r.headers['content-range'] });
    }catch(e){ console.log('Range GET probe failed:', e.message); }

  }catch(e){ console.error('Error:', e && e.message); }
})();

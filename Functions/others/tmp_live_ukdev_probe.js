const axios = require('axios');

(async () => {
    const url = process.argv[2] || 'https://ukdevilz.com/watch/-127700459_456246190';
    const ua = process.env.UKDEVILZ_AGENT || 'Mozilla/5.0 (AuroraBot)';
    console.log('[probe] URL:', url);
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': ua }, timeout: 15000, maxRedirects: 5, validateStatus: () => true, responseType: 'text' });
        console.log('[probe] status:', res.status);
        console.log('[probe] content-type:', res.headers['content-type']);
        const body = (res.data && typeof res.data === 'string') ? res.data : JSON.stringify(res.data).slice(0, 5000);
        const snippet = body.slice(0, 2000).replace(/\n/g, ' ');
        console.log('[probe] body-snippet:', snippet);
        const isCf = /Just a moment|Enable JavaScript and cookies|window\._cf_chl_opt|cf_chl_opt/i.test(snippet);
        console.log('[probe] cloudflare-challenge-detected:', isCf);
    } catch (err) {
        console.error('[probe] request failed:', err && err.message ? err.message : err);
    }
})();

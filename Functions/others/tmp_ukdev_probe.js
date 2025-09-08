require('dotenv').config();
const axios = require('axios');

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const headers = {
  'User-Agent': process.env.UKDEVILZ_AGENT || DEFAULT_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchAndInspect(url) {
  console.log('---\nFETCH:', url);
  try {
    const res = await axios.get(url, {
      headers,
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: 'text'
    });

    console.log('STATUS:', res.status);
    console.log('CONTENT-TYPE:', res.headers['content-type']);
    if (res.headers['set-cookie']) console.log('SET-COOKIE:', res.headers['set-cookie']);

    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const snippet = body.slice(0, 4000).replace(/</g, '\\u003c');
    console.log('BODY_SNIPPET (first 4000 chars):\n', snippet);

    const iframeMatch = body.match(/<iframe[^>]+src=(['"])(.*?)\1/i);
    const iframe = iframeMatch ? iframeMatch[2] : null;
    console.log('IFRAME:', iframe || 'NONE');

    const playlistMatch = body.match(/window\.playlistUrl\s*=\s*['\"]([^'\"]+)/i);
    const playlist = playlistMatch ? playlistMatch[1] : null;
    console.log('PLAYLIST_URL:', playlist || 'NONE');

    const ogMatch = body.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i);
    const og = ogMatch ? ogMatch[1] : null;
    console.log('OG_VIDEO:', og || 'NONE');

    const cdnMatch = body.match(/https?:\/\/cdn\.pvvstream\.pro\/[A-Za-z0-9_\-\/\.\?&=%,]+/i);
    const cdn = cdnMatch ? cdnMatch[0] : null;
    console.log('CDN_MATCH:', cdn || 'NONE');

  } catch (err) {
    console.error('ERROR fetching', url, err && err.message);
  }
}

(async () => {
  await fetchAndInspect('https://ukdevilz.com/video/blowjob');
  await fetchAndInspect('https://ukdevilz.com/watch/-127700459_456246190');
})();

require('dotenv').config();
const scraper = require('./ukdevilz_scraper');
(async ()=>{
  const url = process.argv[2] || 'https://ukdevilz.com/watch/-127700459_456246190';
  console.log('Probing', url);
  try{
    const res = await scraper.getVideoFromWatchPage(url);
    console.log('Result:', res);
  }catch(e){
    console.error('Error:', e && e.message, e && e.stack);
  }
})();

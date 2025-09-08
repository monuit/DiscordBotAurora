require('dotenv').config();
const Uk = require('./ukdevilz_requester');
(async ()=>{
  const u = new Uk();
  try{
    console.log('Calling getVideosByCategory("blowjob")...');
    const v = await u.getVideosByCategory('blowjob');
    console.log('Returned count:', (v && v.length) || 0);
    if (v && v.length) console.log(JSON.stringify(v.slice(0,5), null, 2));
  }catch(e){
    console.error('ERROR', e && e.message, e && e.stack);
  }
})();

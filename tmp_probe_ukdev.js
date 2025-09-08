const axios=require('axios');
const url='https://cdn.pvvstream.pro/videos/-226757017/456239024/vid_480p.mp4?rs=480000&rb=2796202&secure=ihiFl8kyz6bc_6cO1fBrfg%3D%3D%2C1757355545';
const headerSets=[
  {name:'no-headers',h:{}},
  {name:'ua-only',h:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}},
  {name:'with-referer',h:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)','Referer':'https://ukdevilz.com/watch/-226757017_456239024'}},
  {name:'with-origin',h:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)','Referer':'https://ukdevilz.com/watch/-226757017_456239024','Origin':'https://ukdevilz.com'}}
];

(async()=>{
  for(const s of headerSets){
    try{
      const h=s.h;
      let r=await axios.head(url,{headers:h,timeout:8000,validateStatus:()=>true});
      console.log('HEAD',s.name,':',r.status,'cl=',r.headers['content-length']||'n/a','ct=',r.headers['content-type']||'n/a');
    }catch(e){
      console.log('HEAD',s.name,': error',e.message);
    }
    try{
      const r2=await axios.get(url,{headers:Object.assign({},s.h,{'Range':'bytes=0-0'}),timeout:8000,responseType:'stream',validateStatus:()=>true});
      console.log('GET-RANGE',s.name,':',r2.status,'cl=',r2.headers['content-length']||'n/a','cr=',r2.headers['content-range']||'n/a','ct=',r2.headers['content-type']||'n/a');
      r2.data.destroy();
    }catch(e){
      console.log('GET-RANGE',s.name,': error',e.message);
    }
  }
  process.exit(0);
})().catch(err=>{console.error('probe failed',err);process.exit(2)});

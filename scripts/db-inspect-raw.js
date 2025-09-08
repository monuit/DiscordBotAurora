// scripts/db-inspect-raw.js
// Usage: node scripts/db-inspect-raw.js
require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

async function main(){
  const uri = process.env.MONGO_URI;
  if(!uri){ console.error('MONGO_URI not set in .env'); process.exit(2); }
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(); // uses db from URI path if present
  console.log('Using DB:', db.databaseName);
  const cols = await db.listCollections().toArray();
  console.log('Collections:', cols.map(c => c.name).join(', '));

  const names = ['autopostconfigs','prefetchedlinks','postedcontents'];
  for(const name of names){
    const exists = cols.some(c => c.name.toLowerCase() === name);
    if(!exists){
      console.log(`Collection '${name}' not found.`);
      continue;
    }
    const col = db.collection(name);
    const count = await col.countDocuments();
    const samples = await col.find({}).sort({ _id: -1 }).limit(3).toArray();
    console.log(`\n== ${name} ==\nCount: ${count}\nSamples:`);
    samples.forEach(s => console.log(JSON.stringify(s, null, 2)));
  }

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });

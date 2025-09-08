// scripts/create-autopost-config.js
// Usage: node scripts/create-autopost-config.js <channelId> <guildId> <category>
// Example: node scripts/create-autopost-config.js 1414298818471657584 1413582020310990910 amateur

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');

async function main(){
  const [,, channelId, guildId, category] = process.argv;
  if(!channelId || !guildId || !category){
    console.error('Usage: node scripts/create-autopost-config.js <channelId> <guildId> <category>');
    process.exit(2);
  }
  const uri = process.env.MONGO_URI;
  if(!uri){ console.error('MONGO_URI not set in .env'); process.exit(2); }

  await mongoose.connect(uri, { dbName: 'admin', keepAlive: true, useNewUrlParser: true, useUnifiedTopology: true });
  const AutoPostConfig = require('../settings/models/AutoPostConfig');

  const configId = crypto.randomBytes(8).toString('hex');
  const doc = new AutoPostConfig({ configId, channelId, guildId, source: 'redgifs', category, isRunning: true, nextPostTime: new Date(Date.now() + 1000*60*5) });
  await doc.save();
  console.log('Inserted AutoPostConfig:', { configId, channelId, guildId, category });
  await mongoose.disconnect();
}

main().catch(e => { console.error('Error', e); process.exit(1); });

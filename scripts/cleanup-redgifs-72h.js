// scripts/cleanup-redgifs-72h.js
// Safe one-shot cleanup for Redgifs 72-hour dedupe window.
// Usage (dry-run): node scripts/cleanup-redgifs-72h.js
// To actually delete: node scripts/cleanup-redgifs-72h.js --exec
// Or: node scripts/cleanup-redgifs-72h.js --yes --exec

require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

const argv = require('minimist')(process.argv.slice(2));
const EXEC = argv.exec || argv.yes || argv['--exec'] || false;

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env');
    process.exit(2);
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db();

  const now = new Date();
  const before72 = new Date(Date.now() - 72 * 3600 * 1000);

  const postedCol = db.collection('postedcontents');
  const prefetchedCol = db.collection('prefetchedlinks');

  // Query: postedcontents with source exactly 'redgifs' and createdAt or postedAt within last 72h
  const postedQuery = {
    source: 'redgifs',
    $or: [
      { createdAt: { $gt: before72 } },
      { postedAt: { $gt: before72 } }
    ]
  };

  const prefetchedQuery = {
    source: 'redgifs',
    fetchedAt: { $gt: before72 }
  };

  const postedCount = await postedCol.countDocuments(postedQuery);
  const prefetchedCount = await prefetchedCol.countDocuments(prefetchedQuery);

  console.log('Redgifs 72-hour cleanup summary (dry-run):');
  console.log(`  PostedContent to remove: ${postedCount}`);
  console.log(`  PrefetchedLink to remove: ${prefetchedCount}`);

  const postedSamples = await postedCol.find(postedQuery).limit(5).project({ _id: 1, url: 1, category: 1, postedAt: 1, createdAt: 1 }).toArray();
  const prefetchedSamples = await prefetchedCol.find(prefetchedQuery).limit(5).project({ _id: 1, url: 1, category: 1, fetchedAt: 1 }).toArray();

  console.log('\nPostedContent samples:');
  postedSamples.forEach(p => console.log(JSON.stringify(p)));
  console.log('\nPrefetchedLink samples:');
  prefetchedSamples.forEach(p => console.log(JSON.stringify(p)));

  if (!EXEC) {
    console.log('\nNo destructive action taken. To delete these documents, re-run with --exec');
    await client.close();
    return;
  }

  // Extra confirmation check
  const confirm = argv.confirm || argv.c;
  if (!confirm) {
    console.log('\nYou are running with --exec. Please re-run with --exec --confirm=YES to actually delete (case-sensitive)');
    await client.close();
    process.exit(3);
  }
  if (confirm !== 'YES') {
    console.log('\nConfirmation mismatch. To actually delete, set --confirm=YES');
    await client.close();
    process.exit(4);
  }

  // Proceed with deletes
  const postedResult = await postedCol.deleteMany(postedQuery);
  const prefetchedResult = await prefetchedCol.deleteMany(prefetchedQuery);

  console.log('\nDeletion results:');
  console.log(`  PostedContent deleted: ${postedResult.deletedCount}`);
  console.log(`  PrefetchedLink deleted: ${prefetchedResult.deletedCount}`);

  await client.close();
  console.log('\nCleanup complete.');
}

main().catch(e => {
  console.error('Error during cleanup:', e);
  process.exit(1);
});

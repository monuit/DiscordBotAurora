const mongoose = require('mongoose');

const PrefetchedLinkSchema = new mongoose.Schema({
    url: { type: String, required: true, index: true },
    urlHash: { type: String, required: true, unique: true, index: true },
    source: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    title: String,
    thumbnail: String,
    description: String,
    fetchedAt: { type: Date, default: Date.now, index: true }
    ,
    // Claiming fields for worker coordination
    claimed: { type: Boolean, default: false, index: true },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null }
    ,
    // Attempt tracking for retry/backoff policies
    attempts: { type: Number, default: 0, index: false },
    failedAttempts: { type: Number, default: 0, index: true },
    lastAttemptAt: { type: Date, default: null }
}, { timestamps: true });

// Keep links for up to 3 days by default (optional cleanup via TTL or manual pruning)
// TTL: expire prefetched links after 2 days to limit storage
PrefetchedLinkSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 });
// Speed up claim reaper queries
PrefetchedLinkSchema.index({ claimed: 1, claimedAt: 1 });
// Track failures for quick cleanup decisions
PrefetchedLinkSchema.index({ failedAttempts: 1 });
// Index to speed up claiming/pop operations by source, category and fetch time
PrefetchedLinkSchema.index({ source: 1, category: 1, fetchedAt: 1 });

module.exports = mongoose.model('PrefetchedLink', PrefetchedLinkSchema);

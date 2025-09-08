const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const RedgifsRequester = require('./others/redgifs_requester');
const UkdevilzRequester = require('./others/ukdevilz_requester');
const UkdevilzAutoPost = require('./ukdevilzAutoPost');
const XTwitterRequester = require('./others/x_twitter_requester');
const PostedContent = require('../settings/models/PostedContent');
const PrefetchedLink = require('../settings/models/PrefetchedLink');
const AutoPostConfig = require('../settings/models/AutoPostConfig');
const performanceMonitor = require('../utils/performanceMonitor');

class AutoWebScrapeSender {
    constructor(client) {
        this.client = client;
    this.redgifsRequester = new RedgifsRequester();
    this.ukdevilzRequester = new UkdevilzRequester();
    this.ukdevilzAuto = new UkdevilzAutoPost(client);
    this.xTwitterRequester = new XTwitterRequester();

        this.activeAutoPosts = new Map();
        this.supportedSources = ['redgifs', 'x', 'twitter', 'ukdevilz'];

        this.minInterval = 15 * 60 * 1000;
        this.maxInterval = 35 * 60 * 1000;

        this.lastApiCalls = new Map();
        this.minApiGap = 45 * 1000;
        this.maxConcurrentPosts = 8;
        this.activePosts = new Set();

        this.cleanupInterval = null;
        this.maxActiveConfigs = 100;

        this.contentCache = new Map();
        this.maxCacheSize = 1000;
    // Temporary prefetch cache used during immediate prefetch/post lifecycle
    this.tempPrefetch = new Set();
    this.prefetchTimeouts = new Map();

    // Prefetch settings for Redgifs
    // Prefetch tuning
    this.prefetchCount = 6; // batch fetch size per attempt (slightly larger to reduce DB round-trips)
    this.prefetchBeforeMs = 60 * 1000; // prefetch 1 minute before scheduled post
    this.prefetchBufferSize = 10; // maintain at least this many links in DB per category
    this.postCacheClearMs = 60 * 1000; // delay window after posting before aggressive cleanup
    this.prefetchMaxAttempts = 6; // cap attempts while trying to fill buffer
    this.prefetchPerFetch = 8; // items requested per fetch attempt
    this.claimStaleMs = 3 * 60 * 1000; // 3 minutes - stale claim threshold
    this.claimReaperIntervalMs = 60 * 1000; // run reaper every 60s

        this.batchSize = 5;
        this.processingQueue = [];
        this.isProcessingQueue = false;

        this.dbConfigPollingInterval = null;
        this.isInitialized = false;
    this._startClaimReaper();

        this.startMemoryCleanup();
    }

    adjustConcurrencyAndBatchLimits() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        if (heapUsedMB >= 160) this.maxConcurrentPosts = 3;
        else if (heapUsedMB >= 140) this.maxConcurrentPosts = 4;
        else if (heapUsedMB >= 120) this.maxConcurrentPosts = 6;
        else this.maxConcurrentPosts = 8;

        if (this.activeAutoPosts.size > 95) {
            const configs = Array.from(this.activeAutoPosts.entries());
            configs.sort((a, b) => {
                const [, aCfg] = a;
                const [, bCfg] = b;
                if (aCfg.errorCount !== bCfg.errorCount) return aCfg.errorCount - bCfg.errorCount;
                return (bCfg.postCount || 0) - (aCfg.postCount || 0);
            });
            const toPause = configs.slice(80);
            for (const [, cfg] of toPause) {
                cfg.suspended = true;
                if (cfg.timeoutId) { clearTimeout(cfg.timeoutId); cfg.timeoutId = null; }
            }
            setTimeout(() => {
                for (const [, cfg] of toPause) {
                    if (cfg.isRunning) { cfg.suspended = false; cfg.errorCount = 0; }
                }
            }, 15 * 60 * 1000);
        }
    }

    cleanupCacheIfNeeded() {
        if (this.contentCache.size > this.maxCacheSize) {
            const entries = Array.from(this.contentCache.entries());
            const toDelete = entries.slice(0, Math.floor(this.maxCacheSize * 0.3));
            for (const [key] of toDelete) this.contentCache.delete(key);
            console.log(`[AutoWebScrape] Aggressive cache cleanup: Removed ${toDelete.length} entries`);
        }
    }

    startMemoryCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const maxAge = 5 * 60 * 1000;
            for (const [source, timestamp] of this.lastApiCalls.entries()) {
                if (now - timestamp > maxAge) this.lastApiCalls.delete(source);
            }
            if (this.contentCache.size > this.maxCacheSize) {
                const entries = Array.from(this.contentCache.entries());
                const toDelete = entries.slice(0, Math.floor(this.maxCacheSize * 0.3));
                for (const [key] of toDelete) this.contentCache.delete(key);
                console.log(`[AutoWebScrape] Cleaned ${toDelete.length} cache entries`);
            }
            if (global.gc && this.activeAutoPosts.size > 50) global.gc();
            console.log(`[AutoWebScrape] Memory cleanup: ${this.activeAutoPosts.size} active configs, ${this.lastApiCalls.size} API tracks, ${this.contentCache.size} cached items`);
        }, 3 * 60 * 1000);
    }

    async start() {
        if (this.isInitialized) return;
        try {
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            if (heapUsedMB > 90) this.maxConcurrentPosts = 4;
            else if (heapUsedMB > 70) this.maxConcurrentPosts = 6;
            else this.maxConcurrentPosts = 8;

            try { const stats = await PostedContent.getStats(); if (stats) console.log(`[AutoWebScrape] Content tracking initialized - ${stats.total} total records`); } catch (e) {}
            this.startDbConfigPolling();
            performanceMonitor.startMonitoring();
            this.isInitialized = true;
        } catch (err) { console.error('[AutoWebScrape] Failed to initialize:', err.message); throw err; }
    }

    startDbConfigPolling() {
        if (this.dbConfigPollingInterval) return;
        this.dbConfigPollingInterval = setInterval(async () => {
            try {
                const now = new Date();
                const soon = new Date(now.getTime() + 60 * 1000);
                const configs = await AutoPostConfig.find({ isRunning: true, suspended: false, nextPostTime: { $lte: soon, $gte: now } }).limit(this.batchSize);
                if (configs && configs.length) console.log(`[AutoWebScrape] DB Config Polling found ${configs.length} configs: ${configs.map(c => `${c.configId || c.id || 'n/a'}->${c.channelId}`).join(', ')}`);
                for (const cfg of configs) {
                    if (!this.activeAutoPosts.has(cfg.configId)) {
                        this.activeAutoPosts.set(cfg.configId, cfg);
                        this.scheduleDbBackedPost(cfg);
                        // Schedule prefetch for Redgifs if within prefetch window
                        if (cfg.source === 'redgifs') this.schedulePrefetchIfNeeded(cfg);
                    }
                }
            } catch (err) { console.error('[AutoWebScrape] DB config polling error:', err.message); }
        }, 15000);
    }

    async scheduleDbBackedPost(config) {
        if (!config.isRunning || config.suspended) return;
        if (config.timeoutId) { clearTimeout(config.timeoutId); config.timeoutId = null; }
        const now = new Date();
        const delay = Math.max(0, config.nextPostTime - now);
        // If this is a redgifs config, schedule prefetch before the post
        if (config.source === 'redgifs') {
            const prefetchDelay = Math.max(0, config.nextPostTime - new Date(Date.now() + this.prefetchBeforeMs));
            setTimeout(() => this.schedulePrefetchIfNeeded(config), prefetchDelay);
        }
        config.timeoutId = setTimeout(async () => { config.timeoutId = null; try { await this.executeDbBackedAutoPost(config); } catch (e) { console.error('[AutoWebScrape] DB-backed auto-post error:', e.message); } finally { this.activeAutoPosts.delete(config.configId); } }, delay);
    }

    async schedulePrefetchIfNeeded(config) {
        try {
            if (!config || !config.configId) return;
            const configId = config.configId || `${config.channelId}_${config.source}_${config.category}`;
            if (this.tempPrefetch.has(configId)) return; // already prefetched
            // attempt to prefetch until we have a minimum buffer of allowed items
            console.log(`[AutoWebScrape] Prefetching up to ${this.prefetchCount} items (buffer target ${10}) for ${configId}`);
            const crypto = require('crypto');
            const minBuffer = this.prefetchBufferSize;
            const maxAttempts = this.prefetchMaxAttempts || 6;
            const perFetch = Math.max(this.prefetchPerFetch || this.prefetchCount, this.prefetchCount);
            const seenHashes = new Set();

            // Check how many prefetched links already exist for this category/channel (scoped to channel)
            try {
                const existingCount = await PrefetchedLink.countDocuments({ source: 'redgifs', category: config.category, channelId: config.channelId });
                if (existingCount >= minBuffer) return; // buffer already satisfied
            } catch (err) { /* ignore and continue fetching */ }

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                let items = [];
                try { items = await this.redgifsRequester.getRandomBatch(config.category, perFetch); } catch (err) { items = []; }
                if (!items || !items.length) continue;

                // build urlHash list for batch DB checks
                const hashToItem = new Map();
                const hashes = [];
                for (const it of items) {
                    if (!it || !it.url) continue;
                    const h = crypto.createHash('sha256').update(it.url).digest('hex');
                    if (seenHashes.has(h)) continue;
                    seenHashes.add(h);
                    hashToItem.set(h, it);
                    hashes.push(h);
                }
                if (!hashes.length) continue;

                // Batch DB queries:
                // 1) skip any URL already posted (PostedContent.availableAfter > now)
                // 2) skip any URL already in PrefetchedLink (so we don't insert duplicates)
                const now = new Date();
                const [posted, prefetched] = await Promise.all([
                    PostedContent.find({ urlHash: { $in: hashes }, availableAfter: { $gt: now } }).select('urlHash').lean().catch(() => []),
                    // Consider prefetched entries that are either scoped to this channel or legacy entries without channelId
                    PrefetchedLink.find({ urlHash: { $in: hashes }, $or: [{ channelId: config.channelId }, { channelId: { $exists: false } }] }).select('urlHash').lean().catch(() => [])
                ]);
                const blocked = new Set(((posted || []).map(r => r.urlHash)).concat(((prefetched || []).map(r => r.urlHash))));

                const toInsert = [];
                for (const h of hashes) {
                    if (blocked.has(h)) continue;
                    const item = hashToItem.get(h);
                    if (!item) continue;
                    toInsert.push({
                        url: item.url,
                        urlHash: h,
                        source: 'redgifs',
                        category: config.category,
                        // tie prefetched items to the exact posting target
                        channelId: config.channelId,
                        guildId: config.guildId,
                        title: item.title,
                        thumbnail: item.thumbnail,
                        description: item.description
                    });
                }

                if (toInsert.length) {
                    try {
                        // insertMany with ordered:false to continue on duplicates
                        await PrefetchedLink.insertMany(toInsert, { ordered: false });
                    } catch (e) { /* ignore duplicate key errors */ }
                }

                // Check if buffer is now satisfied
                try {
                    const newCount = await PrefetchedLink.countDocuments({ source: 'redgifs', category: config.category, channelId: config.channelId });
                    if (newCount >= minBuffer) break;
                } catch (e) { /* continue attempts */ }
            }
        } catch (e) { console.error('[AutoWebScrape] schedulePrefetchIfNeeded error:', e.message); }
    }

    async executeDbBackedAutoPost(config) {
        if (this.activePosts.size >= this.maxConcurrentPosts) return;
        const postId = `${config.channelId}_${config.source}_${config.category}_${Date.now()}`;
        this.activePosts.add(postId);
        try {
            // Diagnostic: attempt cache first, then fetch; log context to help diagnose "Unknown Channel"
            let channel = this.client.channels.cache.get(config.channelId);
            console.log(`[AutoWebScrape] Resolving channel for DB-backed post - configId=${config.configId || config.id || 'n/a'} channelId=${config.channelId} guildId=${config.guildId || 'n/a'} cached=${!!channel}`);
            if (!channel) {
                try {
                    channel = await this.client.channels.fetch(config.channelId);
                    console.log(`[AutoWebScrape] client.channels.fetch succeeded for channelId=${config.channelId}`);
                } catch (fetchErr) {
                    console.error(`[AutoWebScrape] client.channels.fetch failed for channelId=${config.channelId}:`, fetchErr && fetchErr.stack ? fetchErr.stack : fetchErr);
                    try {
                        const guild = this.client.guilds.cache.get(config.guildId);
                        if (guild) console.log(`[AutoWebScrape] Guild ${config.guildId} present in cache, channels cached=${guild.channels && guild.channels.cache ? guild.channels.cache.size : 'unknown'}`);
                        else console.log(`[AutoWebScrape] Guild ${config.guildId} NOT present in cache`);
                    } catch (e) { /* ignore inspection errors */ }
                    throw new Error(`Unknown Channel: ${config.channelId}`);
                }
            }
            let content;
            let claimedDoc = null;
            if (config.source === 'redgifs') {
                try {
                    const workerId = `${process.pid}_${Date.now()}`;
                    const popped = await PrefetchedLink.findOneAndUpdate(
                        { source: 'redgifs', category: config.category, claimed: false },
                        { $set: { claimed: true, claimedBy: workerId, claimedAt: new Date(), lastAttemptAt: new Date() }, $inc: { attempts: 1 } },
                        { sort: { fetchedAt: 1 }, returnDocument: 'after' }
                    ).lean().catch(() => null);
                    if (popped) {
                        // mark as currently claimed by this worker
                        claimedDoc = popped;
                        const can = await PostedContent.canPostContent(popped.url, 'redgifs', config.category, config.channelId).catch(() => ({ canPost: true }));
                        if (can && can.canPost) {
                            content = { title: popped.title, url: popped.url, thumbnail: popped.thumbnail, description: popped.description, footer: `Source: Redgifs • Category: ${config.category}`, color: '#ff6b6b', tags: [], source: 'redgifs', _prefetchedId: popped._id };
                        } else {
                            // popped item was duplicate - mark it removed (but avoid aggressive deletes)
                            await PrefetchedLink.findByIdAndDelete(popped._id).catch(() => null);
                            claimedDoc = null;
                            let attempts = 0;
                            const maxLoop = Math.max(4, this.prefetchMaxAttempts || 6);
                            while (!content && attempts < maxLoop) {
                                const workerId2 = `${process.pid}_${Date.now()}_${attempts}`;
                                // attempt channel-scoped first, then legacy
                                let next = await PrefetchedLink.findOneAndUpdate({ source: 'redgifs', category: config.category, channelId: config.channelId, claimed: false }, { $set: { claimed: true, claimedBy: workerId2, claimedAt: new Date(), lastAttemptAt: new Date() }, $inc: { attempts: 1 } }, { sort: { fetchedAt: 1 }, returnDocument: 'after' }).lean().catch(() => null);
                                if (!next) next = await PrefetchedLink.findOneAndUpdate({ source: 'redgifs', category: config.category, channelId: { $exists: false }, claimed: false }, { $set: { claimed: true, claimedBy: workerId2, claimedAt: new Date(), lastAttemptAt: new Date() }, $inc: { attempts: 1 } }, { sort: { fetchedAt: 1 }, returnDocument: 'after' }).lean().catch(() => null);
                                attempts++;
                                if (!next) break;
                                const can2 = await PostedContent.canPostContent(next.url, 'redgifs', config.category, config.channelId).catch(() => ({ canPost: true }));
                                if (can2 && can2.canPost) { content = { title: next.title, url: next.url, thumbnail: next.thumbnail, description: next.description, footer: `Source: Redgifs • Category: ${config.category}`, color: '#ff6b6b', tags: [], source: 'redgifs', _prefetchedId: next._id }; claimedDoc = next; break; }
                                else { await PrefetchedLink.findByIdAndDelete(next._id).catch(() => null); }
                            }
                        }
                    }
                } catch (e) { /* continue to live fetch fallback */ }

                if (!content) {
                    // fallback: live fetch loop until we find a DB-allowed item or attempts exhausted
                    let attempts = 0;
                    while (!content && attempts < 8) {
                        const c = await this.redgifsRequester.getRandomContent(config.category).catch(() => null);
                        attempts++;
                        if (!c) continue;
                        try {
                            const can = await PostedContent.canPostContent(c.url, 'redgifs', config.category, config.channelId);
                            if (can && can.canPost) { content = c; break; }
                        } catch (e) { continue; }
                    }
                }
            }
            else if (config.source === 'x' || config.source === 'twitter') content = await this.xTwitterRequester.getRandomContent(config.category);
            else if (config.source === 'ukdevilz') content = await this.ukdevilzRequester.getRandomContent(config.category);
            else throw new Error(`Unknown source: ${config.source}`);
            if (!content || !content.url) throw new Error('No content');
            const message = await channel.send({ content: content.url });
            await PostedContent.recordPostedContent({ url: content.url, source: config.source, category: config.category, title: content.title, thumbnail: content.thumbnail, description: content.description }, config.channelId, channel.guildId, message.id);
            // If we used a prefetched DB item, remove it from the queue (clean up)
            if (content && content._prefetchedId) {
                // Remove the prefetched record now that it was successfully posted
                await PrefetchedLink.findByIdAndDelete(content._prefetchedId).catch(() => null);
            }
            config.postCount = (config.postCount || 0) + 1; config.lastPost = new Date(); config.lastPostTime = Date.now();
            const randomInterval = Math.floor(Math.random() * (this.maxInterval - this.minInterval)) + this.minInterval;
            config.nextPostTime = new Date(Date.now() + randomInterval);
            await config.save();
            performanceMonitor.trackAutoPost(config.source, config.category, config.channelId, randomInterval, true, this.activePosts.size);
        } catch (err) {
            console.error('[AutoWebScrape] Failed to execute DB-backed auto-post:', err.message);
            // If we claimed a doc but failed to post, increment failedAttempts and release or delete based on threshold
            try {
                if (claimedDoc && claimedDoc._id) {
                    const upd = await PrefetchedLink.findByIdAndUpdate(claimedDoc._id, { $inc: { failedAttempts: 1 }, $set: { claimed: false, claimedBy: null, claimedAt: null, lastAttemptAt: new Date() } }, { new: true }).catch(() => null);
                    if (upd && upd.failedAttempts >= 5) {
                        await PrefetchedLink.findByIdAndDelete(claimedDoc._id).catch(() => null);
                    }
                }
            } catch (e) { /* ignore release errors */ }
            throw err;
        } finally { this.activePosts.delete(postId); }
    }

    _startClaimReaper() {
        try {
            if (this._claimReaperInterval) return;
            this._claimReaperInterval = setInterval(async () => {
                try {
                    const cutoff = new Date(Date.now() - (this.claimStaleMs || 3 * 60 * 1000));
                    // Find stale claimed docs
                    const stale = await PrefetchedLink.find({ claimed: true, claimedAt: { $lt: cutoff } }).select('_id failedAttempts').lean().catch(() => []);
                    if (stale && stale.length) {
                        for (const doc of stale) {
                            try {
                                const upd = await PrefetchedLink.findByIdAndUpdate(doc._id, { $inc: { failedAttempts: 1 }, $set: { claimed: false, claimedBy: null, claimedAt: null, lastAttemptAt: new Date() } }, { new: true }).catch(() => null);
                                if (upd && upd.failedAttempts >= 5) {
                                    await PrefetchedLink.findByIdAndDelete(doc._id).catch(() => null);
                                    console.log(`[AutoWebScrape] Deleted prefetched link ${doc._id} after ${upd.failedAttempts} failed attempts`);
                                }
                            } catch (e) { /* ignore per-doc errors */ }
                        }
                        console.log(`[AutoWebScrape] Reaper processed ${stale.length} stale prefetched links`);
                    }
                } catch (e) { /* ignore reaper errors */ }
            }, this.claimReaperIntervalMs || 60 * 1000);
        } catch (e) { console.error('[AutoWebScrape] Failed to start claim reaper:', e.message); }
    }

    async startAutoPost(channelId, source, category, userId) {
        const autoPostId = `${channelId}_${source}_${category}`;
        if (this.activeAutoPosts.size >= this.maxActiveConfigs) throw new Error(`Maximum active auto-posts reached (${this.maxActiveConfigs}).`);
        if (this.activeAutoPosts.has(autoPostId)) throw new Error(`Auto ${source} ${category} is already running in this channel`);
        if (!this.supportedSources.includes(source.toLowerCase())) throw new Error(`Unsupported source: ${source}`);
        const memUsage = process.memoryUsage(); const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024); if (heapUsedMB > 90) throw new Error(`System memory too high (${heapUsedMB}MB).`);
        const config = { id: autoPostId, channelId, source: source.toLowerCase(), category: category.toLowerCase(), userId, isRunning: true, timeoutId: null, startTime: Date.now(), postCount: 0, lastPost: null, nextPostTime: null };
        this.activeAutoPosts.set(autoPostId, config);
        await this.scheduleNextPost(config);
        return config;
    }

    async scheduleNextPost(config) {
        if (!config.isRunning || config.suspended) return;
        if (config.timeoutId) { clearTimeout(config.timeoutId); config.timeoutId = null; }
        const randomInterval = Math.floor(Math.random() * (this.maxInterval - this.minInterval)) + this.minInterval;
        config.nextPostTime = new Date(Date.now() + randomInterval);
        config.timeoutId = setTimeout(async () => { config.timeoutId = null; try { await this.executeAutoPost(config); if (config.isRunning && !config.suspended) await this.scheduleNextPost(config); } catch (e) { console.error('[AutoWebScrape] Error in auto-post:', e.message); if (config.isRunning && !config.suspended) { const backoffDelay = Math.min(5 * 60 * 1000, 30000 * Math.pow(2, config.errorCount || 0)); setTimeout(() => { if (config.isRunning && !config.suspended) this.scheduleNextPost(config); }, backoffDelay); } } }, randomInterval);
    }

    async executeAutoPost(config) {
        if (this.activePosts.size >= this.maxConcurrentPosts) return;
        const postId = `${config.channelId}_${config.source}_${config.category}_${Date.now()}`;
        const startTime = Date.now();
        this.activePosts.add(postId);
    let claimedDoc = null;
        try {
            const memUsage = process.memoryUsage(); const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024); if (heapUsedMB > 95) { console.warn(`[AutoWebScrape] High memory usage (${heapUsedMB}MB), skipping post`); return; }
            // Diagnostic: prefer cache then fetch; provide contextual logs to diagnose missing/cached channels
            let channel = this.client.channels.cache.get(config.channelId);
            console.log(`[AutoWebScrape] Resolving channel for auto-post - id=${config.id || config.configId || 'n/a'} channelId=${config.channelId} guildId=${config.guildId || 'n/a'} cached=${!!channel}`);
            if (!channel) {
                try {
                    channel = await this.client.channels.fetch(config.channelId);
                    console.log(`[AutoWebScrape] client.channels.fetch succeeded for channelId=${config.channelId}`);
                } catch (fetchErr) {
                    console.error(`[AutoWebScrape] client.channels.fetch failed for channelId=${config.channelId}:`, fetchErr && fetchErr.stack ? fetchErr.stack : fetchErr);
                    try {
                        const guild = this.client.guilds.cache.get(config.guildId);
                        if (guild) console.log(`[AutoWebScrape] Guild ${config.guildId} present in cache, channels cached=${guild.channels && guild.channels.cache ? guild.channels.cache.size : 'unknown'}`);
                        else console.log(`[AutoWebScrape] Guild ${config.guildId} NOT present in cache`);
                    } catch (e) { /* ignore inspection errors */ }
                    throw new Error(`Unknown Channel: ${config.channelId}`);
                }
            }
            const now = Date.now(); const lastApiCall = this.lastApiCalls.get(config.source) || 0; const timeSinceLastCall = now - lastApiCall; if (timeSinceLastCall < this.minApiGap) { await new Promise(r => setTimeout(r, this.minApiGap - timeSinceLastCall)); }
            this.lastApiCalls.set(config.source, Date.now());
            let contentPromise;
            switch (config.source) {
                case 'redgifs': {
                        // Try to obtain an item from DB-backed PrefetchedLink queue first
                        contentPromise = (async () => {
                            try {
                                        const workerId = `${process.pid}_${Date.now()}`;
                                        // Prefer channel-scoped prefetched items, fall back to legacy unscoped entries
                                        let popped = await PrefetchedLink.findOneAndUpdate({ source: 'redgifs', category: config.category, channelId: config.channelId, claimed: false }, { $set: { claimed: true, claimedBy: workerId, claimedAt: new Date(), lastAttemptAt: new Date() }, $inc: { attempts: 1 } }, { sort: { fetchedAt: 1 }, returnDocument: 'after' }).lean().catch(() => null);
                                        if (!popped) popped = await PrefetchedLink.findOneAndUpdate({ source: 'redgifs', category: config.category, channelId: { $exists: false }, claimed: false }, { $set: { claimed: true, claimedBy: workerId, claimedAt: new Date(), lastAttemptAt: new Date() }, $inc: { attempts: 1 } }, { sort: { fetchedAt: 1 }, returnDocument: 'after' }).lean().catch(() => null);
                                        if (popped && popped.url) {
                                            claimedDoc = popped;
                                            const can = await PostedContent.canPostContent(popped.url, 'redgifs', config.category, config.channelId).catch(() => ({ canPost: true }));
                                            if (can && can.canPost) return { title: popped.title, url: popped.url, thumbnail: popped.thumbnail, description: popped.description, footer: `Source: Redgifs • Category: ${config.category}`, color: '#ff6b6b', tags: [], source: 'redgifs', _prefetchedId: popped._id };
                                            // if not allowed, remove it
                                            await PrefetchedLink.findByIdAndDelete(popped._id).catch(() => null);
                                            claimedDoc = null;
                                        }
                            } catch (e) { /* ignore and fallback */ }
                            // fallback: live API
                            return await this.redgifsRequester.getRandomContent(config.category);
                        })();
                } break;
                case 'x': case 'twitter': contentPromise = this.xTwitterRequester.getRandomContent(config.category); break;
                case 'ukdevilz': contentPromise = this.ukdevilzRequester.getRandomContent(config.category); break;
                default: throw new Error(`Unknown source: ${config.source}`);
            }
            const content = await Promise.race([contentPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('API request timeout')), 30000))]);
            if (!content || !content.url) throw new Error('No valid content');
            const canPost = await this.checkContentDuplication(content.url, config.source, config.category, config.channelId).catch(() => ({ canPost: true }));
            if (!canPost.canPost && canPost.reason === 'duplicate_same_channel') return;
            let message;
            if (config.source === 'redgifs') {
                message = await channel.send({ content: content.url });
            } else if (config.source === 'ukdevilz') {
                const embed = new EmbedBuilder().setTitle(content.title || 'Ukdevilz Video').setURL(content.page || content.url).setDescription(`Category: ${content.category}`).setColor(content.color || '#6b8cff').setFooter({ text: content.footer || 'Source: Ukdevilz' });
                message = await channel.send({ content: content.url, embeds: [embed] });
            } else {
                message = await channel.send({ content: content.url });
            }
            await this.recordPostedContent({ url: content.url, source: config.source, category: config.category, title: content.title, thumbnail: content.thumbnail, description: content.description }, config.channelId, channel.guildId, message.id);
            config.postCount = (config.postCount || 0) + 1; config.lastPost = new Date(); config.lastPostTime = Date.now(); config.errorCount = 0;
            performanceMonitor.trackAutoPost(config.source, config.category, config.channelId, Date.now() - startTime, true, this.activePosts.size);
                // Clear temp prefetch shortly after posting
                if (config.source === 'redgifs') {
                    const configId = config.id || `${config.channelId}_${config.source}_${config.category}`;
                    if (this.prefetchTimeouts.has(configId)) clearTimeout(this.prefetchTimeouts.get(configId));
                    const clearTid = setTimeout(() => { this.tempPrefetch.delete(configId); this.prefetchTimeouts.delete(configId); }, this.postCacheClearMs);
                    this.prefetchTimeouts.set(configId, clearTid);
                }
        } catch (err) {
            console.error('[AutoWebScrape] Failed to execute auto-post:', err.message);
            config.errorCount = (config.errorCount || 0) + 1;
            if (config.errorCount >= 3) { config.suspended = true; setTimeout(() => { config.suspended = false; config.errorCount = 0; }, 15 * 60 * 1000); }
            performanceMonitor.trackAutoPost(config.source, config.category, config.channelId, Date.now() - startTime, false, this.activePosts.size);
            // If we claimed a prefetched doc but failed to post, release it for retry
            try { if (claimedDoc && claimedDoc._id) await PrefetchedLink.findByIdAndUpdate(claimedDoc._id, { $set: { claimed: false, claimedBy: null, claimedAt: null } }).catch(() => null); } catch (e) { /* ignore */ }
            throw err;
        } finally { this.activePosts.delete(postId); }
    }

    async stopAutoPost(channelId, source, category) {
        const autoPostId = `${channelId}_${source}_${category}`;
        const config = this.activeAutoPosts.get(autoPostId);
        if (config) { config.isRunning = false; if (config.timeoutId) clearTimeout(config.timeoutId); this.activeAutoPosts.delete(autoPostId); return true; }
        return false;
    }

    async stopAllAutoPostsInChannel(channelId) {
        let stoppedCount = 0; for (const [id, cfg] of this.activeAutoPosts.entries()) { if (cfg.channelId === channelId) { cfg.isRunning = false; if (cfg.timeoutId) clearTimeout(cfg.timeoutId); this.activeAutoPosts.delete(id); stoppedCount++; } } return stoppedCount;
    }

    async startRedgifsPosting(channelId, category = 'amateur') { return await this.startAutoPost(channelId, 'redgifs', category, null); }
    async startXPosting(channelId, category = 'amateur') { return await this.startAutoPost(channelId, 'x', category, null); }

    async stopRedgifsPosting(channelId, category = null) { if (category) return await this.stopAutoPost(channelId, 'redgifs', category); const configs = Array.from(this.activeAutoPosts.values()).filter(c => c.channelId === channelId && c.source === 'redgifs'); for (const c of configs) await this.stopAutoPost(channelId, 'redgifs', c.category); return configs.length; }
    async stopXPosting(channelId, category = null) { if (category) return await this.stopAutoPost(channelId, 'x', category); const configs = Array.from(this.activeAutoPosts.values()).filter(c => c.channelId === channelId && c.source === 'x'); for (const c of configs) await this.stopAutoPost(channelId, 'x', c.category); return configs.length; }

    getRedgifsStatus() { const configs = Array.from(this.activeAutoPosts.values()).filter(c => c.source === 'redgifs'); if (configs.length === 0) return { isActive: false, channelId: null, category: null, nextPost: 'Not scheduled', postsSent: 0, uptime: 'Not started', interval: '3-10 minutes (random)', lastPost: 'Never', errors: 0, suspended: false, memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, systemStatus: 'Inactive' }; const config = configs[0]; const uptime = config.startTime ? this.formatUptime(Date.now() - config.startTime) : 'Not started'; let nextPost = 'Not scheduled'; if (config.nextPostTime) { const timeUntil = config.nextPostTime.getTime() - Date.now(); if (timeUntil > 0) { const minutesUntil = Math.floor(timeUntil / (1000 * 60)); const secondsUntil = Math.floor((timeUntil % (1000 * 60)) / 1000); nextPost = `${minutesUntil}m ${secondsUntil}s (${config.nextPostTime.toLocaleTimeString()})`; } else nextPost = 'Overdue - processing...'; } const lastPost = config.lastPostTime ? `${this.formatUptime(Date.now() - config.lastPostTime)} ago` : 'Never'; return { isActive: config.isRunning && !config.suspended, channelId: config.channelId, category: config.category, nextPost, postsSent: config.postCount || 0, uptime, interval: '3-10 minutes (random)', lastPost, errors: config.errorCount || 0, suspended: config.suspended || false, memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, systemStatus: config.isRunning ? (config.suspended ? 'Suspended' : 'Running') : 'Stopped' } }

    async startUkdevilzPosting(channelId, category = 'amateur') { return await this.ukdevilzAuto.startUkdevilzPosting(channelId, category, this); }
    async stopUkdevilzPosting(channelId, category = null) { return await this.ukdevilzAuto.stopUkdevilzPosting(channelId, category); }
    getUkdevilzStatus() { return this.ukdevilzAuto.getUkdevilzStatus(); }

    getXStatus() { const configs = Array.from(this.activeAutoPosts.values()).filter(c => c.source === 'x'); if (configs.length === 0) return { isActive: false, channelId: null, category: null, nextPost: 'Not scheduled', postsSent: 0, uptime: 'Not started', interval: '3-10 minutes (random)', lastPost: 'Never', errors: 0, suspended: false, memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, systemStatus: 'Inactive' }; const config = configs[0]; const uptime = config.startTime ? this.formatUptime(Date.now() - config.startTime) : 'Not started'; let nextPost = 'Not scheduled'; if (config.nextPostTime) { const timeUntil = config.nextPostTime.getTime() - Date.now(); if (timeUntil > 0) { const minutesUntil = Math.floor(timeUntil / (1000 * 60)); const secondsUntil = Math.floor((timeUntil % (1000 * 60)) / 1000); nextPost = `${minutesUntil}m ${secondsUntil}s (${config.nextPostTime.toLocaleTimeString()})`; } else nextPost = 'Overdue - processing...'; } const lastPost = config.lastPostTime ? `${this.formatUptime(Date.now() - config.lastPostTime)} ago` : 'Never'; return { isActive: config.isRunning && !config.suspended, channelId: config.channelId, category: config.category, nextPost, postsSent: config.postCount || 0, uptime, interval: '3-10 minutes (random)', lastPost, errors: config.errorCount || 0, suspended: config.suspended || false, memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, systemStatus: config.isRunning ? (config.suspended ? 'Suspended' : 'Running') : 'Stopped' } }

    formatUptime(milliseconds) { const seconds = Math.floor(milliseconds / 1000); const minutes = Math.floor(seconds / 60); const hours = Math.floor(minutes / 60); if (hours > 0) return `${hours}h ${minutes % 60}m`; else if (minutes > 0) return `${minutes}m ${seconds % 60}s`; else return `${seconds}s`; }

    async emergencyStop() { let stoppedCount = 0; for (const [id, cfg] of this.activeAutoPosts.entries()) { cfg.isRunning = false; cfg.suspended = true; if (cfg.timeoutId) { clearTimeout(cfg.timeoutId); cfg.timeoutId = null; } stoppedCount++; } this.activeAutoPosts.clear(); this.activePosts.clear(); this.lastApiCalls.clear(); this.contentCache.clear(); this.emergencyMode = true; this.emergencyStoppedAt = new Date(); if (global.gc) global.gc(); console.log(`[AutoWebScrape] EMERGENCY STOP COMPLETE - Stopped ${stoppedCount} auto-posts`); return stoppedCount; }

    isEmergencyMode() { return this.emergencyMode || false; }

    cleanup() { performanceMonitor.stopMonitoring(); if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; } for (const [, cfg] of this.activeAutoPosts.entries()) { cfg.isRunning = false; if (cfg.timeoutId) clearTimeout(cfg.timeoutId); } this.activeAutoPosts.clear(); this.activePosts.clear(); this.lastApiCalls.clear(); this.contentCache.clear(); if (global.gc) global.gc(); console.log('[AutoWebScrape] Enhanced cleanup completed - all resources released'); }

    getSystemStats() { const m = process.memoryUsage(); return { heapUsed: Math.round(m.heapUsed / 1024 / 1024), heapTotal: Math.round(m.heapTotal / 1024 / 1024), rss: Math.round(m.rss / 1024 / 1024), external: Math.round(m.external / 1024 / 1024), activeConfigs: this.activeAutoPosts.size, activePosts: this.activePosts.size, maxConfigs: this.maxActiveConfigs, maxConcurrent: this.maxConcurrentPosts }; }

    clearEmergencyMode() { this.emergencyMode = false; this.emergencyStoppedAt = null; console.log('[AutoWebScrape] Emergency mode cleared'); }

    getOverallStatus() { const redgifsStatus = this.getRedgifsStatus(); const xStatus = this.getXStatus(); const totalActive = (redgifsStatus.isActive ? 1 : 0) + (xStatus.isActive ? 1 : 0); const totalSuspended = (redgifsStatus.suspended ? 1 : 0) + (xStatus.suspended ? 1 : 0); const totalPosts = redgifsStatus.postsSent + xStatus.postsSent; const totalErrors = redgifsStatus.errors + xStatus.errors; return { totalAutoPostsActive: totalActive, totalSuspended: totalSuspended, totalPostsSent: totalPosts, totalErrors: totalErrors, emergencyMode: this.isEmergencyMode(), emergencyStoppedAt: this.emergencyStoppedAt || null, memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, systemStatus: this.emergencyMode ? 'Emergency Mode' : totalActive > 0 ? 'Active' : 'Inactive' }; }

    async checkContentDuplication(url, source, category, channelId) {
        try {
            const crypto = require('crypto');
            const urlHash = crypto.createHash('sha256').update(url).digest('hex');
            const cacheKey = `${urlHash}_${channelId}`;
            if (this.contentCache.has(cacheKey)) {
                const cached = this.contentCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 72 * 60 * 60 * 1000) return { canPost: false, reason: 'duplicate_same_channel_cached', lastPosted: new Date(cached.timestamp), availableAfter: new Date(cached.timestamp + 72 * 60 * 60 * 1000) };
                this.contentCache.delete(cacheKey);
            }
            const result = await PostedContent.canPostContent(url, source, category, channelId);
            if (!result.canPost && result.reason === 'duplicate_same_channel') this.contentCache.set(cacheKey, { timestamp: result.lastPosted.getTime(), url });
            return result;
        } catch (err) { console.error(`[AutoWebScrape] Content deduplication check failed: ${err.message}`); return { canPost: true, reason: 'error_fallback' }; }
    }

    async recordPostedContent(contentData, channelId, guildId, messageId) {
        try {
            const res = await PostedContent.recordPostedContent(contentData, channelId, guildId, messageId);
            const crypto = require('crypto'); const urlHash = crypto.createHash('sha256').update(contentData.url).digest('hex'); const cacheKey = `${urlHash}_${channelId}`; this.contentCache.set(cacheKey, { timestamp: Date.now(), url: contentData.url }); return res;
        } catch (err) { console.error(`[AutoWebScrape] Failed to record posted content: ${err.message}`); return null; }
    }

    async getContentStats() { try { const dbStats = await PostedContent.getStats(); return { database: dbStats, cache: { size: this.contentCache.size, maxSize: this.maxCacheSize } }; } catch (err) { console.error(`[AutoWebScrape] Failed to get content stats: ${err.message}`); return null; } }

    async cleanupOldContent() { try { const deletedCount = await PostedContent.cleanupOldRecords(); console.log(`[AutoWebScrape] Cleaned up ${deletedCount} old content records`); return deletedCount; } catch (err) { console.error(`[AutoWebScrape] Failed to cleanup old content: ${err.message}`); return 0; } }
}

module.exports = AutoWebScrapeSender;

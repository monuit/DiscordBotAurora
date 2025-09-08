const UkdevilzRequester = require('./others/ukdevilz_requester');
const PostedContent = require('../settings/models/PostedContent');
const performanceMonitor = require('../utils/performanceMonitor');

class UkdevilzAutoPost {
    constructor(client) {
        this.client = client;
        this.ukdevilzRequester = new UkdevilzRequester();
        this.activeAutoPosts = new Map();
        this.activePosts = new Set();
        this.contentCache = new Map();
    }

    async startAutoPost(channelId, category, mainSender) {
        const autoPostId = `${channelId}_ukdevilz_${category}`;
        if (this.activeAutoPosts.has(autoPostId)) throw new Error('Ukdevilz auto-post already running for this channel/category');
        const config = { id: autoPostId, channelId, source: 'ukdevilz', category, isRunning: true, timeoutId: null, startTime: Date.now(), postCount: 0, lastPostTime: null, errorCount: 0, suspended: false };
        this.activeAutoPosts.set(autoPostId, config);
        // delegate scheduling/backoff to main sender for consistency
        if (mainSender && typeof mainSender.scheduleNextPost === 'function') {
            await mainSender.scheduleNextPost(config);
        }
        return config;
    }

    async stopAutoPost(channelId, category) {
        const id = `${channelId}_ukdevilz_${category}`;
        const cfg = this.activeAutoPosts.get(id);
        if (!cfg) return false;
        cfg.isRunning = false;
        if (cfg.timeoutId) clearTimeout(cfg.timeoutId);
        this.activeAutoPosts.delete(id);
        return true;
    }

    async startUkdevilzPosting(channelId, category = 'amateur', mainSender = null) {
        return await this.startAutoPost(channelId, category, mainSender);
    }

    async stopUkdevilzPosting(channelId, category = null) {
        if (category) return await this.stopAutoPost(channelId, category);
        const configs = Array.from(this.activeAutoPosts.values()).filter(c => c.channelId === channelId);
        for (const c of configs) await this.stopAutoPost(channelId, c.category);
        return configs.length;
    }

    getUkdevilzStatus() {
        const configs = Array.from(this.activeAutoPosts.values());
        if (configs.length === 0) return { isActive: false };
        const cfg = configs[0];
        return { isActive: cfg.isRunning && !cfg.suspended, channelId: cfg.channelId, category: cfg.category, postsSent: cfg.postCount || 0, uptime: cfg.startTime ? `${Math.floor((Date.now() - cfg.startTime) / 1000)}s` : 'Not started' };
    }
}

module.exports = UkdevilzAutoPost;

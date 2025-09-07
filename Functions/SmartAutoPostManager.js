const { webhook_reddit_sender } = require('./WebhookRedditSender.js');

class SmartAutoPostManager {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
        this.activeWebhooks = new Map();
        this.timers = new Map();
        this.lastCheck = 0;
        this.minInterval = 3 * 60 * 1000; // 3 minutes minimum
        this.maxInterval = 5 * 60 * 1000; // 5 minutes maximum
    }

    /**
     * Start the smart auto-post system
     */
    async start() {
        if (this.isRunning) {
            console.log('[SmartAutoPost] System already running');
            return;
        }

        this.isRunning = true;
        console.log('[SmartAutoPost] Starting intelligent auto-post system');
        
        // Initial check and setup
        await this.refreshActiveWebhooks();
        this.scheduleNextCheck();
    }

    /**
     * Stop the auto-post system
     */
    async stop() {
        this.isRunning = false;
        
        // Clear all timers
        for (const [key, timer] of this.timers.entries()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        
        console.log('[SmartAutoPost] Auto-post system stopped');
    }

    /**
     * Refresh active webhooks from database
     */
    async refreshActiveWebhooks() {
        try {
            const AutoFeeds = require('../settings/models/AutoFeeds');
            const webhooks = await AutoFeeds.find({ isActive: { $ne: false } });
            
            const oldCount = this.activeWebhooks.size;
            this.activeWebhooks.clear();
            
            for (const webhook of webhooks) {
                this.activeWebhooks.set(webhook._id.toString(), {
                    id: webhook._id,
                    guildId: webhook.guildId,
                    channelId: webhook.channelId,
                    contenttype: webhook.contenttype,
                    lastPost: webhook.lastPost,
                    totalPosts: webhook.totalPosts || 0
                });
            }
            
            const newCount = this.activeWebhooks.size;
            console.log(`[SmartAutoPost] Refreshed webhooks: ${oldCount} → ${newCount} active`);
            
            return newCount;
        } catch (error) {
            console.error('[SmartAutoPost] Error refreshing webhooks:', error.message);
            return 0;
        }
    }

    /**
     * Schedule next check with intelligent timing
     */
    scheduleNextCheck() {
        if (!this.isRunning) return;

        const webhookCount = this.activeWebhooks.size;
        
        if (webhookCount === 0) {
            // No active webhooks, check again in 10 minutes
            const timer = setTimeout(() => {
                this.refreshActiveWebhooks().then(() => {
                    this.scheduleNextCheck();
                });
            }, 10 * 60 * 1000);
            
            this.timers.set('webhook-check', timer);
            console.log('[SmartAutoPost] No active webhooks, next check in 10 minutes');
            return;
        }

        // Calculate interval based on webhook count (more webhooks = longer intervals to avoid spam)
        const baseInterval = this.minInterval;
        const scalingFactor = Math.min(webhookCount * 0.5, 3); // Max 3x scaling
        const interval = baseInterval + (scalingFactor * 60 * 1000); // Add up to 3 minutes
        const randomOffset = Math.random() * 30 * 1000; // 0-30 second random offset
        
        const finalInterval = Math.min(interval + randomOffset, this.maxInterval);
        
        const timer = setTimeout(async () => {
            await this.executeAutoPost();
            this.scheduleNextCheck();
        }, finalInterval);
        
        this.timers.set('auto-post', timer);
        
        const nextTime = new Date(Date.now() + finalInterval).toLocaleTimeString();
        console.log(`[SmartAutoPost] Next auto-post scheduled for ${nextTime} (${webhookCount} active webhooks)`);
    }

    /**
     * Execute auto-post
     */
    async executeAutoPost() {
        try {
            if (this.activeWebhooks.size === 0) {
                await this.refreshActiveWebhooks();
                return;
            }

            console.log(`[SmartAutoPost] Executing auto-post for ${this.activeWebhooks.size} webhooks`);
            await webhook_reddit_sender(this.client);
            
            // Refresh webhook count after posting (some might have been disabled)
            setTimeout(() => {
                this.refreshActiveWebhooks();
            }, 5000);
            
        } catch (error) {
            console.error('[SmartAutoPost] Error executing auto-post:', error.message);
        }
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeWebhooks: this.activeWebhooks.size,
            timersActive: this.timers.size,
            lastCheck: this.lastCheck,
            nextCheck: this.timers.has('auto-post') ? 'Scheduled' : 'Not scheduled'
        };
    }

    /**
     * Force refresh and restart
     */
    async restart() {
        await this.stop();
        await this.start();
    }
}

// Global instance
let smartAutoPostManager = null;

/**
 * Start the smart auto-post system
 */
async function startSmartAutoPostSystem(client) {
    if (smartAutoPostManager) {
        await smartAutoPostManager.stop();
    }
    
    smartAutoPostManager = new SmartAutoPostManager(client);
    await smartAutoPostManager.start();
    
    // Store globally for emergency stop access
    global.smartAutoPostManager = smartAutoPostManager;
}

/**
 * Get the smart auto-post manager instance
 */
function getSmartAutoPostManager() {
    return smartAutoPostManager;
}

module.exports = {
    SmartAutoPostManager,
    startSmartAutoPostSystem,
    getSmartAutoPostManager
};

const { EmbedBuilder } = require('discord.js');
const RedgifsRequester = require('./others/redgifs_requester');
const XTwitterRequester = require('./others/x_twitter_requester');

class AutoWebScrapeSender {
    constructor(client) {
        this.client = client;
        this.redgifsRequester = new RedgifsRequester();
        this.xTwitterRequester = new XTwitterRequester();
        
        // Active auto-post configurations
        this.activeAutoPosts = new Map();
        
        // Supported sources
        this.supportedSources = ['redgifs', 'x', 'twitter'];
        
        // Random interval configuration (3-10 minutes)
        this.minInterval = 3 * 60 * 1000;  // 3 minutes in milliseconds
        this.maxInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        // System status
        this.isInitialized = false;
    }

    /**
     * Initialize the auto web scrape system
     */
    async start() {
        if (this.isInitialized) {
            console.log('[AutoWebScrape] System already initialized');
            return;
        }

        try {
            console.log('[AutoWebScrape] Initializing auto web scrape system...');
            
            // Initialize scrapers if enabled
            if (process.env.ENABLE_REDGIFS === 'true') {
                console.log('[AutoWebScrape] Redgifs scraping enabled');
            }
            
            if (process.env.ENABLE_X_TWITTER === 'true') {
                console.log('[AutoWebScrape] X (Twitter) scraping enabled');
            }
            
            this.isInitialized = true;
            console.log('[AutoWebScrape] Auto web scrape system initialized successfully');
        } catch (error) {
            console.error('[AutoWebScrape] Failed to initialize:', error.message);
            throw error;
        }
    }

    /**
     * Start auto-posting for a specific source and category
     */
    async startAutoPost(channelId, source, category, userId) {
        const autoPostId = `${channelId}_${source}_${category}`;
        
        // Check if already running
        if (this.activeAutoPosts.has(autoPostId)) {
            throw new Error(`Auto ${source} ${category} is already running in this channel`);
        }

        // Validate source
        if (!this.supportedSources.includes(source.toLowerCase())) {
            throw new Error(`Unsupported source: ${source}. Supported sources: ${this.supportedSources.join(', ')}`);
        }

        // Validate category
        const isValidCategory = await this.validateCategory(source, category);
        if (!isValidCategory) {
            throw new Error(`Category "${category}" is not supported for ${source}`);
        }

        // Create auto-post configuration
        const config = {
            id: autoPostId,
            channelId: channelId,
            source: source.toLowerCase(),
            category: category.toLowerCase(),
            userId: userId,
            isRunning: true,
            timeoutId: null,
            startTime: Date.now(),
            postCount: 0,
            lastPost: null
        };

        // Store configuration
        this.activeAutoPosts.set(autoPostId, config);

        // Start posting
        await this.scheduleNextPost(config);

        console.log(`[AutoWebScrape] Started auto ${source} ${category} in channel ${channelId}`);
        return config;
    }

    /**
     * Stop auto-posting
     */
    async stopAutoPost(channelId, source, category) {
        const autoPostId = `${channelId}_${source}_${category}`;
        
        const config = this.activeAutoPosts.get(autoPostId);
        if (!config) {
            throw new Error(`Auto ${source} ${category} is not running in this channel`);
        }

        // Clear timeout
        if (config.timeoutId) {
            clearTimeout(config.timeoutId);
        }

        // Remove from active posts
        this.activeAutoPosts.delete(autoPostId);

        console.log(`[AutoWebScrape] Stopped auto ${source} ${category} in channel ${channelId}`);
        return config;
    }

    /**
     * Stop all auto-posts in a channel
     */
    async stopAllAutoPostsInChannel(channelId) {
        const stoppedPosts = [];
        
        for (const [autoPostId, config] of this.activeAutoPosts.entries()) {
            if (config.channelId === channelId) {
                if (config.timeoutId) {
                    clearTimeout(config.timeoutId);
                }
                this.activeAutoPosts.delete(autoPostId);
                stoppedPosts.push(config);
            }
        }

        console.log(`[AutoWebScrape] Stopped ${stoppedPosts.length} auto-posts in channel ${channelId}`);
        return stoppedPosts;
    }

    /**
     * Schedule next post with random interval
     */
    async scheduleNextPost(config) {
        if (!config.isRunning) return;

        const randomInterval = Math.floor(Math.random() * (this.maxInterval - this.minInterval + 1)) + this.minInterval;
        const nextPostTime = new Date(Date.now() + randomInterval);

        console.log(`[AutoWebScrape] Next ${config.source} ${config.category} post scheduled for: ${nextPostTime.toLocaleString()}`);

        config.timeoutId = setTimeout(async () => {
            try {
                await this.executeAutoPost(config);
                await this.scheduleNextPost(config); // Schedule next post
            } catch (error) {
                console.error(`[AutoWebScrape] Error in auto-post for ${config.source} ${config.category}:`, error.message);
                
                // Continue scheduling even if one post fails
                await this.scheduleNextPost(config);
            }
        }, randomInterval);
    }

    /**
     * Execute an auto-post with retry mechanism
     */
    async executeAutoPost(config) {
        const maxRetries = 3;
        let attempt = 0;
        let lastError;

        while (attempt < maxRetries) {
            try {
                const channel = await this.client.channels.fetch(config.channelId);
                if (!channel) {
                    throw new Error(`Channel ${config.channelId} not found`);
                }

                let content;
                let currentCategory = config.category;
                
                // If this is a retry, try alternative category names
                if (attempt > 0) {
                    currentCategory = this.getAlternativeCategory(config.category, attempt);
                    console.log(`[AutoWebScrape] Retry ${attempt + 1}/${maxRetries} for ${config.source} using category: ${currentCategory}`);
                }
                
                // Get content based on source
                switch (config.source) {
                    case 'redgifs':
                        if (!process.env.ENABLE_REDGIFS || process.env.ENABLE_REDGIFS !== 'true') {
                            throw new Error('Redgifs scraping is disabled');
                        }
                        content = await this.redgifsRequester.getRandomContent(currentCategory);
                        break;
                        
                    case 'x':
                    case 'twitter':
                        if (!process.env.ENABLE_X_TWITTER || process.env.ENABLE_X_TWITTER !== 'true') {
                            throw new Error('X/Twitter scraping is disabled');
                        }
                        content = await this.xTwitterRequester.getRandomContent(currentCategory);
                        break;
                        
                    default:
                        throw new Error(`Unknown source: ${config.source}`);
                }

                // Create embed
                const embed = new EmbedBuilder()
                    .setTitle(`${config.source.toUpperCase()} - ${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}`)
                    .setDescription(content.description || 'Auto-posted content')
                    .setImage(content.url)
                    .setColor("#ff6b35")
                    .setFooter({ text: `Source: ${config.source} | Category: ${currentCategory}` })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });

                // Update config
                config.postCount = (config.postCount || 0) + 1;
                config.lastPost = new Date();

                console.log(`[AutoWebScrape] Successfully posted ${config.source} ${currentCategory} content to ${channel.name}`);
                return; // Success, exit retry loop

            } catch (error) {
                lastError = error;
                attempt++;
                console.error(`[AutoWebScrape] Attempt ${attempt}/${maxRetries} failed for ${config.source} ${config.category}:`, error.message);
                
                if (attempt >= maxRetries) {
                    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
                }
                
                // Wait 5 seconds before retry
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    /**
     * Get alternative category names for retry attempts
     */
    getAlternativeCategory(originalCategory, attempt) {
        const categoryAliases = {
            'blowjob': ['bj', 'oral', 'fellatio'],
            'amateur': ['homemade', 'real', 'natural'],
            'anal': ['assplay', 'backdoor', 'butt'],
            'asian': ['orientsl', 'japanese', 'chinese'],
            'milf': ['mature', 'cougar', 'older'],
            'lesbian': ['girl-on-girl', 'sapphic', 'wlw'],
            'cumshot': ['facial', 'cum', 'finish'],
            'creampie': ['internal', 'filled', 'breeding'],
            'deepthroat': ['throatfuck', 'facefuck', 'gagging'],
            'hardcore': ['rough', 'intense', 'extreme'],
            'latina': ['hispanic', 'spanish', 'mexican'],
            'redhead': ['ginger', 'red', 'auburn'],
            'blonde': ['blond', 'fair', 'light'],
            'brunette': ['brown', 'dark', 'black'],
            'bbw': ['chubby', 'curvy', 'thick'],
            'big-ass': ['booty', 'pawg', 'big-butt'],
            'big-tits': ['busty', 'boobs', 'big-boobs'],
            'doggystyle': ['doggy', 'from-behind', 'rear'],
            'ebony': ['black', 'african', 'dark'],
            'facial': ['cumshot', 'finish', 'money-shot'],
            'fetish': ['kink', 'bdsm', 'kinky'],
            'fingering': ['touching', 'manual', 'finger'],
            'threesome': ['3some', 'group', 'multiple'],
            'pussy': ['vagina', 'pink', 'wet'],
            'oral': ['mouth', 'licking', 'tongue']
        };

        const aliases = categoryAliases[originalCategory.toLowerCase()];
        if (aliases && aliases[attempt - 1]) {
            return aliases[attempt - 1];
        }
        
        // Fallback to original if no aliases available
        return originalCategory;
    }
            const embed = new EmbedBuilder()
                .setTitle(content.title)
                .setDescription(content.description)
                .setColor(content.color)
                .setFooter({ text: content.footer })
                .setTimestamp();

            if (content.thumbnail) {
                embed.setThumbnail(content.thumbnail);
            }

            if (content.url && content.url !== content.thumbnail) {
                embed.setURL(content.url);
            }

            // Send the post
            const sentMessage = await channel.send({ embeds: [embed] });

            // Update config
            config.postCount++;
            config.lastPost = {
                messageId: sentMessage.id,
                timestamp: Date.now(),
                content: content
            };

            console.log(`[AutoWebScrape] Posted auto ${config.source} ${config.category} content to ${channel.name} (Post #${config.postCount})`);

        } catch (error) {
            console.error(`[AutoWebScrape] Failed to execute auto-post:`, error.message);
            throw error;
        }
    }

    /**
     * Validate category for source
     */
    async validateCategory(source, category) {
        try {
            switch (source.toLowerCase()) {
                case 'redgifs':
                    return this.redgifsRequester.isCategorySupported(category);
                case 'x':
                case 'twitter':
                    return this.xTwitterRequester.isCategorySupported(category);
                default:
                    return false;
            }
        } catch (error) {
            console.error(`[AutoWebScrape] Error validating category ${category} for ${source}:`, error.message);
            return false;
        }
    }

    /**
     * Get supported categories for a source
     */
    getSupportedCategories(source) {
        switch (source.toLowerCase()) {
            case 'redgifs':
                return this.redgifsRequester.getSupportedCategories();
            case 'x':
            case 'twitter':
                return this.xTwitterRequester.getSupportedCategories();
            default:
                return [];
        }
    }

    /**
     * Get all active auto-posts
     */
    getActiveAutoPosts() {
        return Array.from(this.activeAutoPosts.values());
    }

    /**
     * Get active auto-posts for a channel
     */
    getActiveAutoPostsForChannel(channelId) {
        return Array.from(this.activeAutoPosts.values()).filter(config => config.channelId === channelId);
    }

    /**
     * Get status of auto-posts
     */
    getStatus() {
        const active = this.getActiveAutoPosts();
        const status = {
            totalActive: active.length,
            bySource: {},
            byChannel: {}
        };

        active.forEach(config => {
            // Count by source
            status.bySource[config.source] = (status.bySource[config.source] || 0) + 1;
            
            // Count by channel
            status.byChannel[config.channelId] = (status.byChannel[config.channelId] || 0) + 1;
        });

        return status;
    }

    /**
     * Emergency stop all auto-posts (for memory safeguard)
     */
    emergencyStopAll() {
        console.log('[AutoWebScrape] EMERGENCY STOP - Suspending all auto-posts');
        
        const suspendedCount = this.activeAutoPosts.size;
        
        for (const [autoPostId, config] of this.activeAutoPosts.entries()) {
            if (config.timeoutId) {
                clearTimeout(config.timeoutId);
            }
            config.isRunning = false;
            config.suspended = true;
        }

        console.log(`[AutoWebScrape] Emergency suspended ${suspendedCount} auto-posts`);
        return suspendedCount;
    }

    /**
     * Resume all suspended auto-posts
     */
    resumeAll() {
        console.log('[AutoWebScrape] Resuming all suspended auto-posts');
        
        let resumedCount = 0;
        
        for (const [autoPostId, config] of this.activeAutoPosts.entries()) {
            if (config.suspended) {
                config.isRunning = true;
                config.suspended = false;
                this.scheduleNextPost(config);
                resumedCount++;
            }
        }

        console.log(`[AutoWebScrape] Resumed ${resumedCount} auto-posts`);
        return resumedCount;
    }

    /**
     * Convenience method to start Redgifs auto-posting
     */
    async startRedgifsPosting(channelId, category = 'amateur') {
        return await this.startAutoPost(channelId, 'redgifs', category, null);
    }

    /**
     * Convenience method to start X (Twitter) auto-posting
     */
    async startXPosting(channelId, category = 'amateur') {
        return await this.startAutoPost(channelId, 'x', category, null);
    }

    /**
     * Convenience method to stop Redgifs auto-posting
     */
    async stopRedgifsPosting(channelId, category = null) {
        if (category) {
            return await this.stopAutoPost(channelId, 'redgifs', category);
        } else {
            // Stop all Redgifs posts in the channel
            const configs = this.getActiveAutoPostsForChannel(channelId)
                .filter(config => config.source === 'redgifs');
            
            for (const config of configs) {
                await this.stopAutoPost(channelId, 'redgifs', config.category);
            }
            return configs.length;
        }
    }

    /**
     * Convenience method to stop X (Twitter) auto-posting
     */
    async stopXPosting(channelId, category = null) {
        if (category) {
            return await this.stopAutoPost(channelId, 'x', category);
        } else {
            // Stop all X posts in the channel
            const configs = this.getActiveAutoPostsForChannel(channelId)
                .filter(config => config.source === 'x');
            
            for (const config of configs) {
                await this.stopAutoPost(channelId, 'x', config.category);
            }
            return configs.length;
        }
    }

    /**
     * Get status of Redgifs auto-posting
     */
    getRedgifsStatus() {
        const configs = Array.from(this.activeAutoPosts.values())
            .filter(config => config.source === 'redgifs');
        
        if (configs.length === 0) {
            return {
                isActive: false,
                channelId: null,
                category: null,
                nextPost: null,
                postsSent: 0,
                uptime: null
            };
        }

        const config = configs[0]; // Get first active config
        const uptime = config.startTime ? 
            this.formatUptime(Date.now() - config.startTime) : null;
        const nextPost = config.nextPostTime ? 
            config.nextPostTime.toLocaleTimeString() : null;

        return {
            isActive: config.isRunning && !config.suspended,
            channelId: config.channelId,
            category: config.category,
            nextPost: nextPost,
            postsSent: config.postsSent || 0,
            uptime: uptime
        };
    }

    /**
     * Get status of X (Twitter) auto-posting
     */
    getXStatus() {
        const configs = Array.from(this.activeAutoPosts.values())
            .filter(config => config.source === 'x');
        
        if (configs.length === 0) {
            return {
                isActive: false,
                channelId: null,
                category: null,
                nextPost: null,
                postsSent: 0,
                uptime: null
            };
        }

        const config = configs[0]; // Get first active config
        const uptime = config.startTime ? 
            this.formatUptime(Date.now() - config.startTime) : null;
        const nextPost = config.nextPostTime ? 
            config.nextPostTime.toLocaleTimeString() : null;

        return {
            isActive: config.isRunning && !config.suspended,
            channelId: config.channelId,
            category: config.category,
            nextPost: nextPost,
            postsSent: config.postsSent || 0,
            uptime: uptime
        };
    }

    /**
     * Format uptime in human readable format
     */
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

module.exports = AutoWebScrapeSender;

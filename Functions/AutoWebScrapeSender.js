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
        
        // Random interval configuration (10-30 minutes) - Updated for Redgifs protection
        this.minInterval = 10 * 60 * 1000;  // 10 minutes in milliseconds
        this.maxInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        // API call tracking to prevent overlaps and blocking
        this.lastApiCalls = new Map(); // Track last API call times per source
        this.minApiGap = 60 * 1000; // Minimum 1 minute between API calls to same source
        
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
            lastPost: null,
            nextPostTime: null
        };

        // Store configuration
        this.activeAutoPosts.set(autoPostId, config);

        // Start posting
        await this.scheduleNextPost(config);

        console.log(`[AutoWebScrape] Started auto ${source} ${category} in channel ${channelId}`);
        return config;
    }

    /**
     * Schedule the next post
     */
    async scheduleNextPost(config) {
        if (!config.isRunning || config.suspended) {
            return;
        }

        // Generate random interval between 10-30 minutes
        const randomInterval = Math.floor(Math.random() * (this.maxInterval - this.minInterval)) + this.minInterval;
        const nextPostTime = new Date(Date.now() + randomInterval);
        config.nextPostTime = nextPostTime;

        console.log(`[AutoWebScrape] Next ${config.source} ${config.category} post scheduled for: ${nextPostTime.toLocaleString()} (${Math.round(randomInterval / 60000)} minutes)`);

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
     * Execute an auto-post with API overlap prevention
     */
    async executeAutoPost(config) {
        try {
            const channel = await this.client.channels.fetch(config.channelId);
            if (!channel) {
                throw new Error(`Channel ${config.channelId} not found`);
            }

            // Check for API overlap prevention
            const now = Date.now();
            const lastApiCall = this.lastApiCalls.get(config.source) || 0;
            const timeSinceLastCall = now - lastApiCall;
            
            if (timeSinceLastCall < this.minApiGap) {
                const waitTime = this.minApiGap - timeSinceLastCall;
                console.log(`[AutoWebScrape] Preventing API overlap for ${config.source}, waiting ${Math.round(waitTime / 1000)}s`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            // Update last API call time
            this.lastApiCalls.set(config.source, Date.now());

            let content;
            
            // Get content based on source
            switch (config.source) {
                case 'redgifs':
                    if (!process.env.ENABLE_REDGIFS || process.env.ENABLE_REDGIFS !== 'true') {
                        throw new Error('Redgifs scraping is disabled');
                    }
                    content = await this.redgifsRequester.getRandomContent(config.category);
                    break;
                    
                case 'x':
                case 'twitter':
                    if (!process.env.ENABLE_X_TWITTER || process.env.ENABLE_X_TWITTER !== 'true') {
                        throw new Error('X/Twitter scraping is disabled');
                    }
                    content = await this.xTwitterRequester.getRandomContent(config.category);
                    break;
                    
                default:
                    throw new Error(`Unknown source: ${config.source}`);
            }

            // Validate content before posting
            if (!content || !content.url) {
                console.error(`[AutoWebScrape] CRITICAL ERROR: No content or URL received from ${config.source} ${config.category}`);
                console.error(`[AutoWebScrape] Content received:`, content);
                throw new Error(`No valid content URL received from ${config.source}`);
            }

            // Validate URL format
            if (!content.url.startsWith('http')) {
                console.error(`[AutoWebScrape] CRITICAL ERROR: Invalid URL format from ${config.source}: ${content.url}`);
                throw new Error(`Invalid URL format: ${content.url}`);
            }

            console.log(`[AutoWebScrape] Posting ${config.source} content - URL: ${content.url}`);

            // Test URL accessibility for Redgifs (they might have auth issues)
            if (config.source === 'redgifs' && content.url.includes('redgifs.com')) {
                try {
                    const axios = require('axios');
                    const response = await axios.head(content.url, { 
                        timeout: 5000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    if (response.status !== 200) {
                        console.warn(`[AutoWebScrape] Redgifs URL returned status ${response.status}: ${content.url}`);
                    }
                } catch (urlError) {
                    console.warn(`[AutoWebScrape] Redgifs URL test failed: ${urlError.message} - Will try posting anyway`);
                }
            }

            // Send the actual media content with fallback strategies
            try {
                // Strategy 1: Try embed with image
                const embed = new EmbedBuilder()
                    .setDescription(`🔥 **${config.category.toUpperCase()}** from **${config.source.toUpperCase()}**`)
                    .setImage(content.url)
                    .setColor("#ff6b35");
                
                await channel.send({ embeds: [embed] });
                console.log(`[AutoWebScrape] ✅ Successfully posted ${config.source} ${config.category} content as embed`);
                
            } catch (embedError) {
                console.error(`[AutoWebScrape] Embed posting failed, trying text with URL:`, embedError.message);
                
                // Strategy 2: Fallback to text message with URL
                try {
                    await channel.send(`🔥 **${config.category.toUpperCase()}** from **${config.source.toUpperCase()}**\n${content.url}`);
                    console.log(`[AutoWebScrape] ✅ Successfully posted ${config.source} ${config.category} content as text with URL`);
                    
                } catch (textError) {
                    console.error(`[AutoWebScrape] CRITICAL ERROR: Both embed and text posting failed:`, textError.message);
                    throw new Error(`Failed to post content: ${textError.message}`);
                }
            }

            // Update config
            config.postCount = (config.postCount || 0) + 1;
            config.lastPost = new Date();
            config.lastPostTime = Date.now(); // For status tracking

            console.log(`[AutoWebScrape] Successfully posted ${config.source} ${config.category} content to ${channel.name}`);

        } catch (error) {
            console.error(`[AutoWebScrape] Failed to execute auto-post:`, error.message);
            throw error;
        }
    }

    /**
     * Stop auto-posting
     */
    async stopAutoPost(channelId, source, category) {
        const autoPostId = `${channelId}_${source}_${category}`;
        const config = this.activeAutoPosts.get(autoPostId);
        
        if (config) {
            config.isRunning = false;
            if (config.timeoutId) {
                clearTimeout(config.timeoutId);
            }
            this.activeAutoPosts.delete(autoPostId);
            console.log(`[AutoWebScrape] Stopped auto ${source} ${category} in channel ${channelId}`);
            return true;
        }
        
        return false;
    }

    /**
     * Stop all auto-posts in a channel
     */
    async stopAllAutoPostsInChannel(channelId) {
        let stoppedCount = 0;
        
        for (const [autoPostId, config] of this.activeAutoPosts.entries()) {
            if (config.channelId === channelId) {
                config.isRunning = false;
                if (config.timeoutId) {
                    clearTimeout(config.timeoutId);
                }
                this.activeAutoPosts.delete(autoPostId);
                stoppedCount++;
            }
        }
        
        console.log(`[AutoWebScrape] Stopped ${stoppedCount} auto-posts in channel ${channelId}`);
        return stoppedCount;
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
            const configs = Array.from(this.activeAutoPosts.values())
                .filter(config => config.channelId === channelId && config.source === 'redgifs');
            
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
            const configs = Array.from(this.activeAutoPosts.values())
                .filter(config => config.channelId === channelId && config.source === 'x');
            
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
                nextPost: "Not scheduled",
                postsSent: 0,
                uptime: "Not started",
                interval: "3-10 minutes (random)",
                lastPost: "Never",
                errors: 0,
                suspended: false,
                memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                systemStatus: "Inactive"
            };
        }

        const config = configs[0]; // Get first active config
        const uptime = config.startTime ? 
            this.formatUptime(Date.now() - config.startTime) : "Not started";
        
        let nextPost = "Not scheduled";
        if (config.nextPostTime) {
            const timeUntil = config.nextPostTime.getTime() - Date.now();
            if (timeUntil > 0) {
                const minutesUntil = Math.floor(timeUntil / (1000 * 60));
                const secondsUntil = Math.floor((timeUntil % (1000 * 60)) / 1000);
                nextPost = `${minutesUntil}m ${secondsUntil}s (${config.nextPostTime.toLocaleTimeString()})`;
            } else {
                nextPost = "Overdue - processing...";
            }
        }

        const lastPost = config.lastPostTime ? 
            `${this.formatUptime(Date.now() - config.lastPostTime)} ago` : "Never";

        return {
            isActive: config.isRunning && !config.suspended,
            channelId: config.channelId,
            category: config.category,
            nextPost: nextPost,
            postsSent: config.postCount || 0,
            uptime: uptime,
            interval: "3-10 minutes (random)",
            lastPost: lastPost,
            errors: config.errorCount || 0,
            suspended: config.suspended || false,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            systemStatus: config.isRunning ? (config.suspended ? "Suspended" : "Running") : "Stopped"
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
                nextPost: "Not scheduled",
                postsSent: 0,
                uptime: "Not started",
                interval: "3-10 minutes (random)",
                lastPost: "Never",
                errors: 0,
                suspended: false,
                memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                systemStatus: "Inactive"
            };
        }

        const config = configs[0]; // Get first active config
        const uptime = config.startTime ? 
            this.formatUptime(Date.now() - config.startTime) : "Not started";
        
        let nextPost = "Not scheduled";
        if (config.nextPostTime) {
            const timeUntil = config.nextPostTime.getTime() - Date.now();
            if (timeUntil > 0) {
                const minutesUntil = Math.floor(timeUntil / (1000 * 60));
                const secondsUntil = Math.floor((timeUntil % (1000 * 60)) / 1000);
                nextPost = `${minutesUntil}m ${secondsUntil}s (${config.nextPostTime.toLocaleTimeString()})`;
            } else {
                nextPost = "Overdue - processing...";
            }
        }

        const lastPost = config.lastPostTime ? 
            `${this.formatUptime(Date.now() - config.lastPostTime)} ago` : "Never";

        return {
            isActive: config.isRunning && !config.suspended,
            channelId: config.channelId,
            category: config.category,
            nextPost: nextPost,
            postsSent: config.postCount || 0,
            uptime: uptime,
            interval: "3-10 minutes (random)",
            lastPost: lastPost,
            errors: config.errorCount || 0,
            suspended: config.suspended || false,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            systemStatus: config.isRunning ? (config.suspended ? "Suspended" : "Running") : "Stopped"
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

    /**
     * EMERGENCY STOP - Stop all auto-posting immediately
     */
    async emergencyStop() {
        console.log('[AutoWebScrape] EMERGENCY STOP INITIATED');
        
        let stoppedCount = 0;
        
        // Stop all active auto-posts
        for (const [autoPostId, config] of this.activeAutoPosts.entries()) {
            config.isRunning = false;
            config.suspended = true;
            
            if (config.timeoutId) {
                clearTimeout(config.timeoutId);
                config.timeoutId = null;
            }
            
            stoppedCount++;
        }
        
        // Clear the map
        this.activeAutoPosts.clear();
        
        // Set emergency flag
        this.emergencyMode = true;
        this.emergencyStoppedAt = new Date();
        
        console.log(`[AutoWebScrape] EMERGENCY STOP COMPLETE - Stopped ${stoppedCount} auto-posts`);
        return stoppedCount;
    }

    /**
     * Check if system is in emergency mode
     */
    isEmergencyMode() {
        return this.emergencyMode || false;
    }

    /**
     * Clear emergency mode and allow restart
     */
    clearEmergencyMode() {
        this.emergencyMode = false;
        this.emergencyStoppedAt = null;
        console.log('[AutoWebScrape] Emergency mode cleared');
    }

    /**
     * Get overall system status
     */
    getOverallStatus() {
        const redgifsStatus = this.getRedgifsStatus();
        const xStatus = this.getXStatus();
        
        const totalActive = (redgifsStatus.isActive ? 1 : 0) + (xStatus.isActive ? 1 : 0);
        const totalSuspended = (redgifsStatus.suspended ? 1 : 0) + (xStatus.suspended ? 1 : 0);
        const totalPosts = redgifsStatus.postsSent + xStatus.postsSent;
        const totalErrors = redgifsStatus.errors + xStatus.errors;
        
        return {
            totalAutoPostsActive: totalActive,
            totalSuspended: totalSuspended,
            totalPostsSent: totalPosts,
            totalErrors: totalErrors,
            emergencyMode: this.isEmergencyMode(),
            emergencyStoppedAt: this.emergencyStoppedAt || null,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            systemStatus: this.emergencyMode ? 'Emergency Mode' : 
                         totalActive > 0 ? 'Active' : 'Inactive'
        };
    }
}

module.exports = AutoWebScrapeSender;

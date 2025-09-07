const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const RedgifsRequester = require('./others/redgifs_requester');
const XTwitterRequester = require('./others/x_twitter_requester');
const PostedContent = require('../settings/models/PostedContent');
const performanceMonitor = require('../utils/performanceMonitor');

class AutoWebScrapeSender {
    constructor(client) {
        this.client = client;
        this.redgifsRequester = new RedgifsRequester();
        this.xTwitterRequester = new XTwitterRequester();
        
        // Active auto-post configurations with optimized memory management
        this.activeAutoPosts = new Map();
        
        // Supported sources
        this.supportedSources = ['redgifs', 'x', 'twitter'];
        
        // OPTIMIZED FOR 100 CHANNELS: Increased intervals to handle scale
        this.minInterval = 15 * 60 * 1000;  // 15 minutes minimum (reduced from 20)
        this.maxInterval = 35 * 60 * 1000;  // 35 minutes maximum (reduced from 45)
        
        // API call tracking with optimized cleanup for scale
        this.lastApiCalls = new Map(); 
        this.minApiGap = 45 * 1000; // Reduced to 45 seconds for better throughput
        
        // PERFORMANCE OPTIMIZATION: Scaled for 100 channels
        this.maxConcurrentPosts = 8; // Increased from 3 for better throughput
        this.activePosts = new Set(); // Track active posting operations
        
        // MEMORY OPTIMIZATION: Scaled limits for 100 channels
        this.cleanupInterval = null;
        this.maxActiveConfigs = 100; // Increased from 10 to 100 as requested
        
        // CONTENT DEDUPLICATION: Track posted content
        this.contentCache = new Map(); // In-memory cache for faster lookups
        this.maxCacheSize = 1000; // Limit cache size
        
        // PERFORMANCE: Batch operations for efficiency
        this.batchSize = 5; // Process in batches
        this.processingQueue = [];
        this.isProcessingQueue = false;
        
        // System status
        this.isInitialized = false;
        
        // MEMORY LEAK PREVENTION: Enhanced cleanup for scale
        this.startMemoryCleanup();
    }

    /**
     * Enhanced memory cleanup for 100 channel scale
     */
    startMemoryCleanup() {
        // Clear old API call tracking every 3 minutes (more frequent for scale)
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const maxAge = 5 * 60 * 1000; // 5 minutes
            
            // Clean API call tracking
            for (const [source, timestamp] of this.lastApiCalls.entries()) {
                if (now - timestamp > maxAge) {
                    this.lastApiCalls.delete(source);
                }
            }
            
            // Clean content cache if too large
            if (this.contentCache.size > this.maxCacheSize) {
                const entries = Array.from(this.contentCache.entries());
                const toDelete = entries.slice(0, Math.floor(this.maxCacheSize * 0.3)); // Remove 30%
                for (const [key] of toDelete) {
                    this.contentCache.delete(key);
                }
                console.log(`[AutoWebScrape] Cleaned ${toDelete.length} cache entries`);
            }
            
            // Force garbage collection hint for large scale
            if (global.gc && this.activeAutoPosts.size > 50) {
                global.gc();
            }
            
            console.log(`[AutoWebScrape] Memory cleanup: ${this.activeAutoPosts.size} active configs, ${this.lastApiCalls.size} API tracks, ${this.contentCache.size} cached items`);
        }, 3 * 60 * 1000); // Every 3 minutes (more frequent than before)
    }

    /**
     * Initialize the auto web scrape system with enhanced performance for 100 channels
     */
    async start() {
        if (this.isInitialized) {
            console.log('[AutoWebScrape] System already initialized');
            return;
        }

        try {
            console.log('[AutoWebScrape] Initializing SCALED auto web scrape system for 100 channels...');
            
            // Check system resources before starting
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            
            console.log(`[AutoWebScrape] Memory usage: ${heapUsedMB}MB heap`);
            
            // Dynamic scaling based on memory usage
            if (heapUsedMB > 90) {
                console.warn('[AutoWebScrape] High memory usage detected, reducing concurrent limits');
                this.maxConcurrentPosts = 4;
            } else if (heapUsedMB > 70) {
                console.warn('[AutoWebScrape] Moderate memory usage, standard concurrent limits');
                this.maxConcurrentPosts = 6;
            } else {
                console.log('[AutoWebScrape] Low memory usage, maximum concurrent limits');
                this.maxConcurrentPosts = 8;
            }
            
            // Initialize content deduplication system
            try {
                const stats = await PostedContent.getStats();
                if (stats) {
                    console.log(`[AutoWebScrape] Content tracking initialized - ${stats.total} total records, ${stats.last72h} in last 72h`);
                } else {
                    console.log('[AutoWebScrape] Content tracking initialized (empty database)');
                }
            } catch (error) {
                console.warn('[AutoWebScrape] Content tracking initialization failed, continuing without:', error.message);
            }
            
            // Initialize scrapers if enabled
            if (process.env.ENABLE_REDGIFS === 'true') {
                console.log('[AutoWebScrape] Redgifs scraping enabled (optimized for 100 channels)');
            }
            
            if (process.env.ENABLE_X_TWITTER === 'true') {
                console.log('[AutoWebScrape] X (Twitter) scraping enabled (optimized for 100 channels)');
            }
            
            console.log('[AutoWebScrape] SCALED auto web scrape system initialized successfully');
            
            // Start performance monitoring for 100-channel scale
            performanceMonitor.startMonitoring();
            console.log('[AutoWebScrape] Performance monitoring enabled for 100-channel optimization');
        } catch (error) {
            console.error('[AutoWebScrape] Failed to initialize:', error.message);
            throw error;
        }
    }

    /**
     * Start auto-posting for a specific source and category with memory limits
     */
    async startAutoPost(channelId, source, category, userId) {
        const autoPostId = `${channelId}_${source}_${category}`;
        
        // MEMORY OPTIMIZATION: Check active configuration limits
        if (this.activeAutoPosts.size >= this.maxActiveConfigs) {
            throw new Error(`Maximum active auto-posts reached (${this.maxActiveConfigs}). Stop some existing auto-posts first.`);
        }
        
        // Check if already running
        if (this.activeAutoPosts.has(autoPostId)) {
            throw new Error(`Auto ${source} ${category} is already running in this channel`);
        }

        // Validate source
        if (!this.supportedSources.includes(source.toLowerCase())) {
            throw new Error(`Unsupported source: ${source}. Supported sources: ${this.supportedSources.join(', ')}`);
        }

        // PERFORMANCE CHECK: Monitor system resources
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        
        if (heapUsedMB > 90) {
            throw new Error(`System memory too high (${heapUsedMB}MB). Please wait for memory to stabilize before starting new auto-posts.`);
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
     * Schedule the next post with memory optimization
     */
    async scheduleNextPost(config) {
        if (!config.isRunning || config.suspended) {
            return;
        }

        // MEMORY OPTIMIZATION: Clear any existing timeout to prevent memory leaks
        if (config.timeoutId) {
            clearTimeout(config.timeoutId);
            config.timeoutId = null;
        }

        // Generate optimized random interval (20-45 minutes for reduced load)
        const randomInterval = Math.floor(Math.random() * (this.maxInterval - this.minInterval)) + this.minInterval;
        const nextPostTime = new Date(Date.now() + randomInterval);
        config.nextPostTime = nextPostTime;

        console.log(`[AutoWebScrape] Next ${config.source} ${config.category} post scheduled for: ${nextPostTime.toLocaleString()} (${Math.round(randomInterval / 60000)} minutes)`);

        config.timeoutId = setTimeout(async () => {
            // PERFORMANCE: Clear timeout reference immediately
            config.timeoutId = null;
            
            try {
                await this.executeAutoPost(config);
                
                // MEMORY OPTIMIZATION: Only schedule next if still active
                if (config.isRunning && !config.suspended) {
                    await this.scheduleNextPost(config);
                }
            } catch (error) {
                console.error(`[AutoWebScrape] Error in auto-post for ${config.source} ${config.category}:`, error.message);
                
                // RESILIENCE: Continue scheduling with exponential backoff for errors
                if (config.isRunning && !config.suspended) {
                    const backoffDelay = Math.min(5 * 60 * 1000, 30000 * Math.pow(2, config.errorCount || 0));
                    setTimeout(() => {
                        if (config.isRunning && !config.suspended) {
                            this.scheduleNextPost(config);
                        }
                    }, backoffDelay);
                }
            }
        }, randomInterval);
    }

    /**
     * Execute an auto-post with comprehensive optimization
     */
    async executeAutoPost(config) {
        // PERFORMANCE: Check concurrent post limit
        if (this.activePosts.size >= this.maxConcurrentPosts) {
            console.log(`[AutoWebScrape] Max concurrent posts reached (${this.maxConcurrentPosts}), deferring ${config.source} ${config.category}`);
            return;
        }

        const postId = `${config.channelId}_${config.source}_${config.category}_${Date.now()}`;
        const startTime = Date.now();
        this.activePosts.add(postId);

        try {
            // MEMORY CHECK: Monitor memory before proceeding
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            
            if (heapUsedMB > 95) {
                console.warn(`[AutoWebScrape] High memory usage (${heapUsedMB}MB), skipping post to prevent issues`);
                return;
            }

            const channel = await this.client.channels.fetch(config.channelId);
            if (!channel) {
                throw new Error(`Channel ${config.channelId} not found`);
            }

            // Check for API overlap prevention with increased gap
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

            // PERFORMANCE: Use timeout for API calls to prevent hanging
            const contentPromise = (() => {
                switch (config.source) {
                    case 'redgifs':
                        const redgifsEnabled = process.env.ENABLE_REDGIFS === 'true' || process.env.ENABLE_REDGIFS === '1' || !process.env.ENABLE_REDGIFS;
                        if (!redgifsEnabled && process.env.ENABLE_REDGIFS === 'false') {
                            throw new Error('Redgifs scraping is disabled');
                        }
                        return this.redgifsRequester.getRandomContent(config.category);
                        
                    case 'x':
                    case 'twitter':
                        if (!process.env.ENABLE_X_TWITTER || process.env.ENABLE_X_TWITTER !== 'true') {
                            throw new Error('X/Twitter scraping is disabled');
                        }
                        return this.xTwitterRequester.getRandomContent(config.category);
                        
                    default:
                        throw new Error(`Unknown source: ${config.source}`);
                }
            })();

            // PERFORMANCE: Add timeout to prevent hanging requests
            const content = await Promise.race([
                contentPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('API request timeout')), 30000) // 30 second timeout
                )
            ]);

            // Validate content before posting
            if (!content || !content.url) {
                console.error(`[AutoWebScrape] CRITICAL ERROR: No content or URL received from ${config.source} ${config.category}`);
                throw new Error(`No valid content URL received from ${config.source}`);
            }

            // Validate URL format
            if (!content.url.startsWith('http')) {
                console.error(`[AutoWebScrape] CRITICAL ERROR: Invalid URL format from ${config.source}: ${content.url}`);
                throw new Error(`Invalid URL format: ${content.url}`);
            }

            // CONTENT DEDUPLICATION: Check if content was posted recently (72 hour window)
            try {
                const canPost = await this.checkContentDuplication(content.url, config.source, config.category, config.channelId);
                
                if (!canPost.canPost) {
                    if (canPost.reason === 'duplicate_same_channel') {
                        console.log(`[AutoWebScrape] Skipping duplicate content in ${config.channelId} - last posted: ${canPost.lastPosted}, available after: ${canPost.availableAfter}`);
                        // Don't throw error, just skip this content and try again later
                        return;
                    }
                    // For other reasons, we might still want to skip or handle differently
                    console.log(`[AutoWebScrape] Content check result: ${canPost.reason} for ${content.url}`);
                }
            } catch (dupeError) {
                console.warn(`[AutoWebScrape] Content duplication check failed: ${dupeError.message}, proceeding with post`);
            }

            console.log(`[AutoWebScrape] Posting ${config.source} content - URL: ${content.url}`);

            // MEMORY OPTIMIZATION: Use direct posting without complex objects
            let message;
            
            if (config.source === 'redgifs') {
                // For redgifs, post URL directly (like testmedia does)
                message = await channel.send({
                    content: content.url
                });
                console.log(`[AutoWebScrape] Posted redgifs content, scheduling upgrade button for message ID: ${message.id}`);
                
                // MEMORY OPTIMIZATION: Use WeakRef for button timeout to prevent memory leaks
                const messageRef = new WeakRef(message);
                const buttonTimeout = setTimeout(async () => {
                    try {
                        const msg = messageRef.deref();
                        if (!msg) {
                            console.log(`[AutoWebScrape] Message reference cleaned up, skipping button`);
                            return;
                        }
                        
                        const upgradeButton = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel('🚀 Upgrade to Premium')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL('https://upgrade.chat/storeaurora')
                            );
                        
                        await msg.edit({
                            content: content.url,
                            components: [upgradeButton]
                        });
                        console.log(`[AutoWebScrape] ✅ Added upgrade button to redgifs post`);
                    } catch (editError) {
                        console.log(`[AutoWebScrape] Error adding upgrade button: ${editError.message}`);
                    }
                }, 3000);
                
                // MEMORY CLEANUP: Clear timeout reference
                setTimeout(() => {
                    if (buttonTimeout) {
                        clearTimeout(buttonTimeout);
                    }
                }, 10000); // Clear after 10 seconds
                
            } else {
                // For X/Twitter and other sources, post URL directly
                message = await channel.send({
                    content: content.url
                });
            }

            console.log(`[AutoWebScrape] ✅ Successfully posted ${config.source} ${config.category} content using direct URL method`);

            // CONTENT TRACKING: Record posted content for deduplication
            try {
                const contentData = {
                    url: content.url,
                    source: config.source,
                    category: config.category,
                    title: content.title,
                    thumbnail: content.thumbnail,
                    description: content.description
                };
                
                await this.recordPostedContent(contentData, config.channelId, channel.guildId, message.id);
                console.log(`[AutoWebScrape] ✅ Content recorded for deduplication tracking`);
            } catch (recordError) {
                console.warn(`[AutoWebScrape] Failed to record content for deduplication: ${recordError.message}`);
            }

            // Update config with minimal memory footprint
            config.postCount = (config.postCount || 0) + 1;
            config.lastPost = new Date();
            config.lastPostTime = Date.now();
            
            // MEMORY OPTIMIZATION: Reset error count on success
            config.errorCount = 0;

            console.log(`[AutoWebScrape] ✅ Successfully posted ${config.source} ${config.category} content to ${channel.name} (Post #${config.postCount})`);
            
            // PERFORMANCE TRACKING: Record successful auto-post
            const duration = Date.now() - startTime;
            performanceMonitor.trackAutoPost(config.source, config.category, config.channelId, duration, true, this.activePosts.size);

        } catch (error) {
            console.error(`[AutoWebScrape] Failed to execute auto-post:`, error.message);
            
            // PERFORMANCE TRACKING: Record failed auto-post
            const duration = Date.now() - startTime;
            performanceMonitor.trackAutoPost(config.source, config.category, config.channelId, duration, false, this.activePosts.size);
            
            // Increment error count
            config.errorCount = (config.errorCount || 0) + 1;
            
            // PERFORMANCE: More aggressive error handling to prevent resource waste
            if (config.errorCount >= 3) { // Reduced from 5 to 3
                console.log(`[AutoWebScrape] Too many errors (${config.errorCount}), suspending ${config.source} ${config.category} for 15 minutes`);
                config.suspended = true;
                
                // MEMORY OPTIMIZATION: Use WeakRef for timeout
                const configRef = new WeakRef(config);
                setTimeout(() => {
                    const cfg = configRef.deref();
                    if (cfg) {
                        cfg.suspended = false;
                        cfg.errorCount = 0;
                        console.log(`[AutoWebScrape] Resuming ${cfg.source} ${cfg.category} after error cooldown`);
                    }
                }, 15 * 60 * 1000); // 15 minutes (increased from 10)
            }
            
            throw error;
        } finally {
            // MEMORY CLEANUP: Always remove from active posts
            this.activePosts.delete(postId);
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
        this.activePosts.clear();
        
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
     * MEMORY OPTIMIZATION: Cleanup method to prevent memory leaks
     */
    cleanup() {
        // Stop performance monitoring
        performanceMonitor.stopMonitoring();
        
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Stop all auto-posts
        for (const [autoPostId, config] of this.activeAutoPosts.entries()) {
            config.isRunning = false;
            if (config.timeoutId) {
                clearTimeout(config.timeoutId);
            }
        }
        
        // Clear all maps
        this.activeAutoPosts.clear();
        this.activePosts.clear();
        this.lastApiCalls.clear();
        this.contentCache.clear();
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        console.log('[AutoWebScrape] Enhanced cleanup completed - all resources released');
    }

    /**
     * Get system memory and performance stats
     */
    getSystemStats() {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            activeConfigs: this.activeAutoPosts.size,
            activePosts: this.activePosts.size,
            maxConfigs: this.maxActiveConfigs,
            maxConcurrent: this.maxConcurrentPosts
        };
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

    /**
     * CONTENT DEDUPLICATION: Check if content can be posted (72-hour window)
     */
    async checkContentDuplication(url, source, category, channelId) {
        const crypto = require('crypto');
        const urlHash = crypto.createHash('sha256').update(url).digest('hex');
        
        // First check in-memory cache for faster lookup
        const cacheKey = `${urlHash}_${channelId}`;
        if (this.contentCache.has(cacheKey)) {
            const cached = this.contentCache.get(cacheKey);
            if (Date.now() - cached.timestamp < (72 * 60 * 60 * 1000)) {
                console.log(`[AutoWebScrape] Cache hit: Content duplicate detected for ${channelId}`);
                return {
                    canPost: false,
                    reason: 'duplicate_same_channel_cached',
                    lastPosted: new Date(cached.timestamp),
                    availableAfter: new Date(cached.timestamp + (72 * 60 * 60 * 1000))
                };
            } else {
                // Cache entry expired, remove it
                this.contentCache.delete(cacheKey);
            }
        }
        
        // Check database for comprehensive deduplication
        try {
            const result = await PostedContent.canPostContent(url, source, category, channelId);
            
            // Update cache with result if it's a recent duplicate
            if (!result.canPost && result.reason === 'duplicate_same_channel') {
                this.contentCache.set(cacheKey, {
                    timestamp: result.lastPosted.getTime(),
                    url: url
                });
            }
            
            return result;
        } catch (error) {
            console.error(`[AutoWebScrape] Content deduplication check failed: ${error.message}`);
            // On error, allow posting to avoid blocking
            return {
                canPost: true,
                reason: 'error_fallback'
            };
        }
    }

    /**
     * CONTENT TRACKING: Record posted content for deduplication
     */
    async recordPostedContent(contentData, channelId, guildId, messageId) {
        try {
            const result = await PostedContent.recordPostedContent(contentData, channelId, guildId, messageId);
            
            // Update in-memory cache
            const crypto = require('crypto');
            const urlHash = crypto.createHash('sha256').update(contentData.url).digest('hex');
            const cacheKey = `${urlHash}_${channelId}`;
            
            this.contentCache.set(cacheKey, {
                timestamp: Date.now(),
                url: contentData.url
            });
            
            return result;
        } catch (error) {
            console.error(`[AutoWebScrape] Failed to record posted content: ${error.message}`);
            return null;
        }
    }

    /**
     * MAINTENANCE: Get content deduplication statistics
     */
    async getContentStats() {
        try {
            const dbStats = await PostedContent.getStats();
            return {
                database: dbStats,
                cache: {
                    size: this.contentCache.size,
                    maxSize: this.maxCacheSize
                }
            };
        } catch (error) {
            console.error(`[AutoWebScrape] Failed to get content stats: ${error.message}`);
            return null;
        }
    }

    /**
     * MAINTENANCE: Cleanup old content records
     */
    async cleanupOldContent() {
        try {
            const deletedCount = await PostedContent.cleanupOldRecords();
            console.log(`[AutoWebScrape] Cleaned up ${deletedCount} old content records`);
            return deletedCount;
        } catch (error) {
            console.error(`[AutoWebScrape] Failed to cleanup old content: ${error.message}`);
            return 0;
        }
    }
}

module.exports = AutoWebScrapeSender;

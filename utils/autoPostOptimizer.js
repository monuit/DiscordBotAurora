/**
 * Auto-Post Optimizer - Monitors and optimizes auto-posting systems
 * ENHANCED FOR 100 CHANNEL SCALE with content deduplication support
 */

class AutoPostOptimizer {
    constructor(client) {
        this.client = client;
        this.isMonitoring = false;
        this.monitorInterval = null;
        
        // SCALED THRESHOLDS for 100 channels
        this.memoryThresholds = {
            warning: 120, // MB (increased from 80)
            critical: 140, // MB (increased from 95)  
            emergency: 160 // MB (increased from 100)
        };
        
        // Performance counters
        this.stats = {
            optimizations: 0,
            emergencyStops: 0,
            memoryCleanups: 0,
            contentCleanups: 0,
            lastOptimization: null,
            lastContentCleanup: null
        };
        
        // CONTENT MANAGEMENT for 100 channels
        this.contentCleanupInterval = null;
    }

    /**
     * Start monitoring system performance - SCALED for 100 channels
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('[AutoPostOptimizer] Already monitoring');
            return;
        }

        console.log('[AutoPostOptimizer] Starting performance monitoring for 100-channel scale...');
        this.isMonitoring = true;

        // Monitor every 90 seconds for 100 channels (more frequent than 2 minutes)
        this.monitorInterval = setInterval(() => {
            this.checkSystemHealth();
        }, 90 * 1000);

        // Content cleanup every 30 minutes for 100 channels
        this.contentCleanupInterval = setInterval(() => {
            this.performContentCleanup();
        }, 30 * 60 * 1000);

        console.log('[AutoPostOptimizer] Performance monitoring started for 100-channel scale');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        if (this.contentCleanupInterval) {
            clearInterval(this.contentCleanupInterval);
            this.contentCleanupInterval = null;
        }
        
        this.isMonitoring = false;
        console.log('[AutoPostOptimizer] Performance monitoring stopped');
    }

    /**
     * Check system health and optimize if needed - ENHANCED for 100 channels
     */
    checkSystemHealth() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024);

        // Get auto-posting stats
        const autoStats = this.client.autoWebScrapeSender ? 
            this.client.autoWebScrapeSender.getSystemStats() : null;

        console.log(`[AutoPostOptimizer] Health Check - Heap: ${heapUsedMB}MB, RSS: ${rssUsedMB}MB, Active Configs: ${autoStats?.activeConfigs || 0}/100`);

        // SCALED: Emergency memory management for 100 channels
        if (heapUsedMB >= this.memoryThresholds.emergency) {
            this.emergencyOptimization();
        } else if (heapUsedMB >= this.memoryThresholds.critical) {
            this.criticalOptimization();
        } else if (heapUsedMB >= this.memoryThresholds.warning) {
            this.warningOptimization();
        }

        // SCALED: Check for optimal configuration count (100 max, but optimize at 80+)
        if (autoStats && autoStats.activeConfigs > 80) {
            console.warn(`[AutoPostOptimizer] High config count (${autoStats.activeConfigs}/100), optimizing performance...`);
            this.optimizeForHighLoad();
        }
        
        // Check concurrent post efficiency
        if (autoStats && autoStats.activePosts >= autoStats.maxConcurrent * 0.8) {
            console.warn(`[AutoPostOptimizer] High concurrent usage (${autoStats.activePosts}/${autoStats.maxConcurrent}), monitoring closely`);
        }
    }

    /**
     * SCALED: Optimization for high load (80+ channels)
     */
    optimizeForHighLoad() {
        if (!this.client.autoWebScrapeSender) return;
        
        console.log('[AutoPostOptimizer] Applying high-load optimizations for 80+ channels');
        
        // Reduce concurrent posts slightly for stability
        const currentMax = this.client.autoWebScrapeSender.maxConcurrentPosts;
        if (currentMax > 4) {
            this.client.autoWebScrapeSender.maxConcurrentPosts = Math.max(4, currentMax - 2);
            console.log(`[AutoPostOptimizer] Reduced concurrent posts to ${this.client.autoWebScrapeSender.maxConcurrentPosts} for stability`);
        }
        
        // Trigger content cleanup
        this.performContentCleanup();
    }

    /**
     * Emergency optimization - stop everything
     */
    emergencyOptimization() {
        console.error('[AutoPostOptimizer] EMERGENCY: Memory critical, stopping all auto-posts');
        
        if (this.client.autoWebScrapeSender) {
            this.client.autoWebScrapeSender.emergencyStop();
        }

        // Force garbage collection
        if (global.gc) {
            global.gc();
        }

        this.stats.emergencyStops++;
        this.stats.lastOptimization = new Date();

        // Send alert if webhook available
        this.sendAlert('EMERGENCY', 'All auto-posting stopped due to critical memory usage');
    }

    /**
     * Critical optimization - reduce load significantly - SCALED for 100 channels
     */
    criticalOptimization() {
        console.warn('[AutoPostOptimizer] CRITICAL: High memory usage, reducing auto-post load for 100-channel scale');
        
        if (this.client.autoWebScrapeSender) {
            // More gentle reduction for 100 channels - don't be too aggressive
            this.client.autoWebScrapeSender.maxConcurrentPosts = Math.max(3, Math.floor(this.client.autoWebScrapeSender.maxConcurrentPosts * 0.6));
            
            // Pause 25% of configurations instead of stopping them (for 100 channels)
            const configs = Array.from(this.client.autoWebScrapeSender.activeAutoPosts.entries());
            const toPause = configs.slice(0, Math.ceil(configs.length * 0.25));
            
            for (const [autoPostId, config] of toPause) {
                config.suspended = true;
                if (config.timeoutId) {
                    clearTimeout(config.timeoutId);
                    config.timeoutId = null;
                }
            }
            
            console.log(`[AutoPostOptimizer] Paused ${toPause.length} auto-posts temporarily to reduce memory pressure`);
            
            // Resume them after 10 minutes
            setTimeout(() => {
                for (const [autoPostId, config] of toPause) {
                    if (config.isRunning) {
                        config.suspended = false;
                        console.log(`[AutoPostOptimizer] Resumed auto-post ${autoPostId}`);
                    }
                }
            }, 10 * 60 * 1000);
        }

        // Trigger content cleanup
        this.performContentCleanup();

        // Force garbage collection
        if (global.gc) {
            global.gc();
        }

        this.stats.optimizations++;
        this.stats.lastOptimization = new Date();
    }

    /**
     * Warning optimization - gentle optimization for 100 channels
     */
    warningOptimization() {
        console.warn('[AutoPostOptimizer] WARNING: Memory usage high, applying gentle optimizations for 100-channel scale');
        
        if (this.client.autoWebScrapeSender) {
            // Gentle adjustment for 100 channels
            const currentMax = this.client.autoWebScrapeSender.maxConcurrentPosts;
            if (currentMax > 6) {
                this.client.autoWebScrapeSender.maxConcurrentPosts = Math.max(6, currentMax - 1);
            }
        }

        // Perform memory cleanup
        this.performMemoryCleanup();
        
        this.stats.memoryCleanups++;
    }

    /**
     * ENHANCED: Content cleanup for deduplication database
     */
    async performContentCleanup() {
        console.log('[AutoPostOptimizer] Performing content deduplication cleanup...');
        
        try {
            if (this.client.autoWebScrapeSender && this.client.autoWebScrapeSender.cleanupOldContent) {
                const deletedCount = await this.client.autoWebScrapeSender.cleanupOldContent();
                console.log(`[AutoPostOptimizer] Cleaned up ${deletedCount} old content records`);
                
                this.stats.contentCleanups++;
                this.stats.lastContentCleanup = new Date();
            }
        } catch (error) {
            console.error('[AutoPostOptimizer] Content cleanup failed:', error.message);
        }
    }

    /**
     * Optimize active configurations for 100-channel scale
     */
    optimizeActiveConfigs() {
        if (!this.client.autoWebScrapeSender) return;

        const configs = Array.from(this.client.autoWebScrapeSender.activeAutoPosts.entries());
        
        // For 100 channels, only optimize if we're really over capacity (95+)
        if (configs.length < 95) return;
        
        console.log(`[AutoPostOptimizer] Optimizing ${configs.length} configurations for 100-channel scale`);
        
        // Sort by performance metrics (error count, recent activity, post success rate)
        configs.sort((a, b) => {
            const [, configA] = a;
            const [, configB] = b;
            
            // First priority: error count (lower is better)
            if (configA.errorCount !== configB.errorCount) {
                return configA.errorCount - configB.errorCount;
            }
            
            // Second priority: recent activity (more recent is better)
            const lastPostA = configA.lastPostTime || 0;
            const lastPostB = configB.lastPostTime || 0;
            if (lastPostA !== lastPostB) {
                return lastPostB - lastPostA;
            }
            
            // Third priority: post count (more posts = better performance)
            return (configB.postCount || 0) - (configA.postCount || 0);
        });

        // Temporarily pause the worst performing 20% (not delete, just pause)
        const toPause = configs.slice(80); // Keep top 80, pause the rest
        
        for (const [autoPostId, config] of toPause) {
            config.suspended = true;
            if (config.timeoutId) {
                clearTimeout(config.timeoutId);
                config.timeoutId = null;
            }
        }
        
        console.log(`[AutoPostOptimizer] Temporarily paused ${toPause.length} under-performing configurations`);
        
        // Resume them after 15 minutes with improved intervals
        setTimeout(() => {
            for (const [autoPostId, config] of toPause) {
                if (config.isRunning) {
                    config.suspended = false;
                    // Reset error count for fresh start
                    config.errorCount = 0;
                    console.log(`[AutoPostOptimizer] Resumed configuration ${autoPostId} with fresh start`);
                }
            }
        }, 15 * 60 * 1000);
    }

    /**
     * Perform memory cleanup
     */
    performMemoryCleanup() {
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }

        // Clear old API call tracking
        if (this.client.autoWebScrapeSender) {
            const now = Date.now();
            const maxAge = 5 * 60 * 1000; // 5 minutes
            
            for (const [source, timestamp] of this.client.autoWebScrapeSender.lastApiCalls.entries()) {
                if (now - timestamp > maxAge) {
                    this.client.autoWebScrapeSender.lastApiCalls.delete(source);
                }
            }
        }

        console.log('[AutoPostOptimizer] Memory cleanup completed');
    }

    /**
     * Send alert if webhook is configured
     */
    sendAlert(level, message) {
        if (!process.env.ER_WEBHOOK) return;

        try {
            const { WebhookClient, EmbedBuilder } = require('discord.js');
            const webhook = new WebhookClient({ url: process.env.ER_WEBHOOK });
            
            const embed = new EmbedBuilder()
                .setTitle(`🚨 AutoPost Optimizer - ${level}`)
                .setDescription(message)
                .setColor(level === 'EMERGENCY' ? '#ff0000' : '#ff9900')
                .addFields(
                    { name: 'Stats', value: `Optimizations: ${this.stats.optimizations}\nEmergency Stops: ${this.stats.emergencyStops}`, inline: true }
                )
                .setTimestamp();
                
            webhook.send({ embeds: [embed] }).catch(console.error);
        } catch (error) {
            console.error('[AutoPostOptimizer] Failed to send alert:', error.message);
        }
    }

    /**
     * Get optimizer statistics - ENHANCED for 100 channels with content tracking
     */
    async getStats() {
        const memUsage = process.memoryUsage();
        const autoStats = this.client.autoWebScrapeSender ? 
            this.client.autoWebScrapeSender.getSystemStats() : null;

        // Get content deduplication stats
        let contentStats = null;
        try {
            if (this.client.autoWebScrapeSender && this.client.autoWebScrapeSender.getContentStats) {
                contentStats = await this.client.autoWebScrapeSender.getContentStats();
            }
        } catch (error) {
            console.warn('[AutoPostOptimizer] Failed to get content stats:', error.message);
        }

        return {
            monitoring: this.isMonitoring,
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                thresholds: this.memoryThresholds
            },
            autoPost: autoStats,
            contentDeduplication: contentStats,
            optimization: {
                ...this.stats,
                scale: '100-channel-optimized'
            }
        };
    }
}

module.exports = AutoPostOptimizer;

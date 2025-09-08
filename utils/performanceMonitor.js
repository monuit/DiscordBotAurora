/**
 * Performance monitoring utility for the Discord bot
 * Optimized for 100-channel auto-posting scale
 */

const os = require('os');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            memory: [],
            database: [],
            autoPost: [],
            concurrent: []
        };
        
        // memory thresholds can be configured via env or will be derived from system memory
        const totalMB = Math.round(os.totalmem() / 1024 / 1024);
        const env = process.env || {};
        const defaultWarning = Math.max(120, Math.round(totalMB * 0.10));
        const defaultCritical = Math.max(140, Math.round(totalMB * 0.15));
        const defaultEmergency = Math.max(160, Math.round(totalMB * 0.20));

        this.thresholds = {
            memory: {
                warning: env.PERF_MEMORY_WARNING ? parseInt(env.PERF_MEMORY_WARNING, 10) : defaultWarning,
                critical: env.PERF_MEMORY_CRITICAL ? parseInt(env.PERF_MEMORY_CRITICAL, 10) : defaultCritical,
                emergency: env.PERF_MEMORY_EMERGENCY ? parseInt(env.PERF_MEMORY_EMERGENCY, 10) : defaultEmergency
            },
            database: {
                slow: 100, // ms
                very_slow: 500, // ms
                critical: 1000 // ms
            },
            concurrent: {
                max: 8,
                warning: 6,
                critical: 8
            }
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
    // throttle repeated memory warnings to at most one per minute
    this._lastMemoryWarningAt = 0;
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('[PerfMonitor] Already monitoring');
            return;
        }

        this.isMonitoring = true;
        console.log('[PerfMonitor] Starting performance monitoring for 100-channel scale');

        // Monitor every 30 seconds
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 30000);

        // Initial collection
        this.collectMetrics();
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('[PerfMonitor] Stopped performance monitoring');
    }

    /**
     * Collect current system metrics
     */
    collectMetrics() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const timestamp = Date.now();

        // Memory metrics
        const memMetric = {
            timestamp,
            heapUsed: heapUsedMB,
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
        };

        this.metrics.memory.push(memMetric);

        // Keep only last 10 minutes of data (20 entries at 30s intervals)
        if (this.metrics.memory.length > 20) {
            this.metrics.memory = this.metrics.memory.slice(-20);
        }

        // Check memory thresholds, but throttle repeated logs (1 minute cooldown)
        const now = Date.now();
        const throttleMs = 60 * 1000;
        if (heapUsedMB >= this.thresholds.memory.emergency) {
            if (now - this._lastMemoryWarningAt > throttleMs) {
                console.error(`[PerfMonitor] 🚨 EMERGENCY: Memory usage at ${heapUsedMB}MB (threshold: ${this.thresholds.memory.emergency}MB)`);
                this._lastMemoryWarningAt = now;
            }
        } else if (heapUsedMB >= this.thresholds.memory.critical) {
            if (now - this._lastMemoryWarningAt > throttleMs) {
                console.warn(`[PerfMonitor] ⚠️ CRITICAL: Memory usage at ${heapUsedMB}MB (threshold: ${this.thresholds.memory.critical}MB)`);
                this._lastMemoryWarningAt = now;
            }
        } else if (heapUsedMB >= this.thresholds.memory.warning) {
            if (now - this._lastMemoryWarningAt > throttleMs) {
                console.warn(`[PerfMonitor] ⚠️ WARNING: Memory usage at ${heapUsedMB}MB (threshold: ${this.thresholds.memory.warning}MB)`);
                this._lastMemoryWarningAt = now;
            }
        }

        // Log status every 5 minutes
        if (this.metrics.memory.length % 10 === 0) {
            this.logSystemStatus();
        }
    }

    /**
     * Track database query performance
     */
    trackDatabaseQuery(operation, duration, collection = 'unknown') {
        const metric = {
            timestamp: Date.now(),
            operation,
            duration,
            collection
        };

        this.metrics.database.push(metric);

        // Keep only last 50 queries
        if (this.metrics.database.length > 50) {
            this.metrics.database = this.metrics.database.slice(-50);
        }

        // Check database performance thresholds
        if (duration >= this.thresholds.database.critical) {
            console.error(`[PerfMonitor] 🚨 CRITICAL DB QUERY: ${operation} on ${collection} took ${duration}ms`);
        } else if (duration >= this.thresholds.database.very_slow) {
            console.warn(`[PerfMonitor] ⚠️ VERY SLOW DB QUERY: ${operation} on ${collection} took ${duration}ms`);
        } else if (duration >= this.thresholds.database.slow) {
            console.warn(`[PerfMonitor] SLOW DB QUERY: ${operation} on ${collection} took ${duration}ms`);
        }
    }

    /**
     * Track auto-post performance
     */
    trackAutoPost(source, category, channelId, duration, success = true, concurrent = 0) {
        const metric = {
            timestamp: Date.now(),
            source,
            category,
            channelId,
            duration,
            success,
            concurrent
        };

        this.metrics.autoPost.push(metric);

        // Keep only last 100 auto-posts
        if (this.metrics.autoPost.length > 100) {
            this.metrics.autoPost = this.metrics.autoPost.slice(-100);
        }

        // Track concurrent posting metrics
        this.metrics.concurrent.push({
            timestamp: Date.now(),
            count: concurrent
        });

        // Keep only last 100 concurrent measurements
        if (this.metrics.concurrent.length > 100) {
            this.metrics.concurrent = this.metrics.concurrent.slice(-100);
        }

        // Check concurrent limits
        if (concurrent >= this.thresholds.concurrent.critical) {
            console.warn(`[PerfMonitor] ⚠️ CONCURRENT LIMIT REACHED: ${concurrent}/${this.thresholds.concurrent.max} active posts`);
        }
    }

    /**
     * Get current performance statistics
     */
    getStats() {
        const now = Date.now();
        const last5min = now - (5 * 60 * 1000);

        // Memory stats
        const recentMemory = this.metrics.memory.filter(m => m.timestamp > last5min);
        const avgMemory = recentMemory.length > 0 
            ? Math.round(recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length)
            : 0;
        const maxMemory = recentMemory.length > 0 
            ? Math.max(...recentMemory.map(m => m.heapUsed))
            : 0;

        // Database stats
        const recentDb = this.metrics.database.filter(d => d.timestamp > last5min);
        const avgDbTime = recentDb.length > 0
            ? Math.round(recentDb.reduce((sum, d) => sum + d.duration, 0) / recentDb.length)
            : 0;
        const maxDbTime = recentDb.length > 0
            ? Math.max(...recentDb.map(d => d.duration))
            : 0;

        // Auto-post stats
        const recentPosts = this.metrics.autoPost.filter(p => p.timestamp > last5min);
        const successRate = recentPosts.length > 0
            ? Math.round((recentPosts.filter(p => p.success).length / recentPosts.length) * 100)
            : 100;

        // Concurrent stats
        const recentConcurrent = this.metrics.concurrent.filter(c => c.timestamp > last5min);
        const avgConcurrent = recentConcurrent.length > 0
            ? Math.round((recentConcurrent.reduce((sum, c) => sum + c.count, 0) / recentConcurrent.length) * 10) / 10
            : 0;
        const maxConcurrent = recentConcurrent.length > 0
            ? Math.max(...recentConcurrent.map(c => c.count))
            : 0;

        return {
            memory: {
                current: this.metrics.memory.length > 0 ? this.metrics.memory[this.metrics.memory.length - 1].heapUsed : 0,
                average: avgMemory,
                max: maxMemory,
                status: this.getMemoryStatus()
            },
            database: {
                queries: recentDb.length,
                avgDuration: avgDbTime,
                maxDuration: maxDbTime,
                status: this.getDatabaseStatus(avgDbTime, maxDbTime)
            },
            autoPost: {
                total: recentPosts.length,
                successRate: successRate,
                status: this.getAutoPostStatus(successRate)
            },
            concurrent: {
                current: recentConcurrent.length > 0 ? recentConcurrent[recentConcurrent.length - 1].count : 0,
                average: avgConcurrent,
                max: maxConcurrent,
                limit: this.thresholds.concurrent.max
            }
        };
    }

    /**
     * Get memory status
     */
    getMemoryStatus() {
        const current = this.metrics.memory.length > 0 ? this.metrics.memory[this.metrics.memory.length - 1].heapUsed : 0;
        
        if (current >= this.thresholds.memory.emergency) return 'EMERGENCY';
        if (current >= this.thresholds.memory.critical) return 'CRITICAL';
        if (current >= this.thresholds.memory.warning) return 'WARNING';
        return 'GOOD';
    }

    /**
     * Get database status
     */
    getDatabaseStatus(avgTime, maxTime) {
        if (maxTime >= this.thresholds.database.critical) return 'CRITICAL';
        if (avgTime >= this.thresholds.database.very_slow) return 'SLOW';
        if (avgTime >= this.thresholds.database.slow) return 'WARNING';
        return 'GOOD';
    }

    /**
     * Get auto-post status
     */
    getAutoPostStatus(successRate) {
        if (successRate < 80) return 'CRITICAL';
        if (successRate < 90) return 'WARNING';
        return 'GOOD';
    }

    /**
     * Log system status
     */
    logSystemStatus() {
        const stats = this.getStats();
        console.log(`[PerfMonitor] System Status Report:`);
        console.log(`  Memory: ${stats.memory.current}MB (${stats.memory.status}) - Avg: ${stats.memory.average}MB, Max: ${stats.memory.max}MB`);
        console.log(`  Database: ${stats.database.queries} queries, Avg: ${stats.database.avgDuration}ms (${stats.database.status})`);
        console.log(`  Auto-Posts: ${stats.autoPost.total} posts, Success: ${stats.autoPost.successRate}% (${stats.autoPost.status})`);
        console.log(`  Concurrent: ${stats.concurrent.current}/${stats.concurrent.limit}, Avg: ${stats.concurrent.average}, Max: ${stats.concurrent.max}`);
    }
}

module.exports = new PerformanceMonitor();

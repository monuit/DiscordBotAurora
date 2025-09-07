const { EmbedBuilder } = require('discord.js');
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { red, yellow, green, white } = require('chalk');

class SystemMonitor {
    constructor(client) {
        this.client = client;
        this.alertChannelId = '1413616847571386418';
        this.thresholds = {
            cpu: 80,           // 80% CPU usage
            memory: 80,        // 80% memory usage
            dbLatency: 100,    // 100ms database latency
            dbMemory: 80,      // 80% database memory usage
            networkLatency: 150, // 150ms Discord API latency
            criticalMemory: 85, // 85% critical memory threshold for emergency actions
            heapMemory: 200,   // 200MB heap memory limit
            emergencyMemory: 90 // 90% emergency memory threshold for process suspension
        };
        
        // Memory safeguard system
        this.safeguards = {
            suspendedProcesses: new Set(),
            emergencyMode: false,
            memoryLeakDetection: true,
            lastMemoryReading: 0,
            memoryIncreaseThreshold: 10, // 10% increase triggers investigation
            processMonitoring: new Map() // Track individual process memory usage
        };
        
        // Track metrics over time for better analysis
        this.metrics = {
            cpu: [],
            memory: [],
            dbLatency: [],
            networkLatency: []
        };
        
        // Cooldown to prevent spam (5 minutes between alerts for same metric)
        this.alertCooldown = new Map();
        this.cooldownDuration = 5 * 60 * 1000; // 5 minutes
        
        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Start the monitoring system
     */
    startMonitoring() {
        console.log('[Monitor] System monitoring started with 80% thresholds');
        
        // Check every 30 seconds
        this.monitoringInterval = setInterval(() => {
            this.checkAllMetrics();
        }, 30000);
        
        // Detailed check every 5 minutes
        this.detailedInterval = setInterval(() => {
            this.performDetailedCheck();
        }, 5 * 60 * 1000);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.detailedInterval) {
            clearInterval(this.detailedInterval);
        }
        console.log('[Monitor] System monitoring stopped');
    }

    /**
     * Check all system metrics
     */
    async checkAllMetrics() {
        try {
            const metrics = await this.collectMetrics();
            
            // Check if we should deactivate emergency mode
            if (this.safeguards.emergencyMode && metrics.memory.percent < this.thresholds.memory) {
                await this.deactivateEmergencyMode();
            }
            
            // Check each metric against thresholds
            await this.checkCPUUsage(metrics.cpu);
            await this.checkMemoryUsage(metrics.memory);
            await this.checkNetworkLatency(metrics.networkLatency);
            await this.checkDatabaseLatency(metrics.dbLatency);
            
            // Store metrics for trending
            this.storeMetrics(metrics);
            
        } catch (error) {
            console.error('[Monitor] Error checking metrics:', error.message);
        }
    }

    /**
     * Collect all system metrics
     */
    async collectMetrics() {
        const startTime = performance.now();
        
        // Memory metrics
        const memUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const freeMemory = require('os').freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryPercent = (usedMemory / totalMemory) * 100;
        
        // CPU metrics (approximation using load average on systems that support it)
        const cpuUsage = await this.getCPUUsage();
        
        // Network latency (Discord API ping)
        const networkLatency = this.client.ws.ping;
        
        // Database latency
        const dbLatency = await this.getDatabaseLatency();
        
        return {
            cpu: cpuUsage,
            memory: {
                percent: memoryPercent,
                used: Math.round(usedMemory / 1024 / 1024), // MB
                total: Math.round(totalMemory / 1024 / 1024), // MB
                heap: Math.round(memUsage.heapUsed / 1024 / 1024) // MB
            },
            networkLatency,
            dbLatency,
            timestamp: Date.now()
        };
    }

    /**
     * Get CPU usage percentage
     */
    async getCPUUsage() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            const startTime = process.hrtime();
            
            setTimeout(() => {
                const currentUsage = process.cpuUsage(startUsage);
                const currentTime = process.hrtime(startTime);
                
                const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000; // microseconds
                const totalCPU = currentUsage.user + currentUsage.system;
                const cpuPercent = (totalCPU / totalTime) * 100;
                
                resolve(Math.min(cpuPercent, 100)); // Cap at 100%
            }, 100);
        });
    }

    /**
     * Get database latency
     */
    async getDatabaseLatency() {
        if (mongoose.connection.readyState !== 1) {
            return -1; // Not connected
        }
        
        try {
            const start = performance.now();
            await mongoose.connection.db.admin().ping();
            return performance.now() - start;
        } catch (error) {
            return -1; // Error
        }
    }

    /**
     * Check CPU usage against threshold
     */
    async checkCPUUsage(cpuPercent) {
        if (cpuPercent >= this.thresholds.cpu) {
            await this.sendAlert('CPU', {
                metric: 'CPU Usage',
                current: `${cpuPercent.toFixed(1)}%`,
                threshold: `${this.thresholds.cpu}%`,
                severity: cpuPercent >= 95 ? 'CRITICAL' : 'WARNING',
                color: cpuPercent >= 95 ? '#ff0000' : '#ffa500',
                icon: '🔥',
                details: `High CPU usage detected. This may affect bot performance.`
            });
        }
    }

    /**
     * Check memory usage against threshold
     */
    async checkMemoryUsage(memory) {
        // Check for emergency memory usage
        if (memory.percent >= this.thresholds.emergencyMemory) {
            await this.activateMemoryEmergencyMode(memory);
            return;
        }
        
        // Check for critical memory usage
        if (memory.percent >= this.thresholds.criticalMemory) {
            await this.handleCriticalMemoryUsage(memory);
        }
        
        // Regular memory threshold check
        if (memory.percent >= this.thresholds.memory) {
            await this.sendAlert('Memory', {
                metric: 'Memory Usage',
                current: `${memory.percent.toFixed(1)}% (${memory.used}MB/${memory.total}MB)`,
                threshold: `${this.thresholds.memory}%`,
                severity: memory.percent >= 95 ? 'CRITICAL' : 'WARNING',
                color: memory.percent >= 95 ? '#ff0000' : '#ffa500',
                icon: '💾',
                details: `High memory usage detected. Heap: ${memory.heap}MB`
            });
        }
        
        // Memory leak detection
        if (this.safeguards.memoryLeakDetection) {
            await this.detectMemoryLeaks(memory);
        }
        
        this.safeguards.lastMemoryReading = memory.percent;
    }

    /**
     * Activate emergency memory mode - suspend non-critical processes
     */
    async activateMemoryEmergencyMode(memory) {
        if (this.safeguards.emergencyMode) return; // Already in emergency mode
        
        this.safeguards.emergencyMode = true;
        console.log(red('[EMERGENCY] Activating memory safeguard mode!'));
        
        // Identify and suspend memory-heavy processes
        const memoryReport = await this.generateMemoryReport();
        
        // Suspend auto promotional systems
        await this.suspendAutoPromoSender();
        
        // Suspend non-critical timers and intervals
        await this.suspendNonCriticalProcesses();
        
        // Send emergency alert
        await this.sendEmergencyAlert('Memory Emergency', {
            metric: 'Emergency Memory Usage',
            current: `${memory.percent.toFixed(1)}% (${memory.used}MB/${memory.total}MB)`,
            threshold: `${this.thresholds.emergencyMemory}%`,
            severity: 'EMERGENCY',
            color: '#ff0000',
            icon: '🚨',
            details: `EMERGENCY: Memory usage exceeded safe limits. Emergency safeguards activated.\n\n**Suspended Processes:**\n${Array.from(this.safeguards.suspendedProcesses).join('\n')}\n\n**Memory Report:**\n${memoryReport}`
        });
    }

    /**
     * Handle critical memory usage
     */
    async handleCriticalMemoryUsage(memory) {
        const memoryIncrease = memory.percent - this.safeguards.lastMemoryReading;
        
        if (memoryIncrease > this.safeguards.memoryIncreaseThreshold) {
            // Rapid memory increase detected
            const report = await this.investigateMemorySpike(memory);
            
            await this.sendAlert('Memory_Critical', {
                metric: 'Critical Memory Spike',
                current: `${memory.percent.toFixed(1)}% (+${memoryIncrease.toFixed(1)}%)`,
                threshold: `${this.thresholds.criticalMemory}%`,
                severity: 'CRITICAL',
                color: '#ff4500',
                icon: '⚠️',
                details: `Critical memory spike detected!\n\n**Investigation Report:**\n${report}`
            });
        }
    }

    /**
     * Detect memory leaks
     */
    async detectMemoryLeaks(memory) {
        const recentMemory = this.metrics.memory.slice(-10); // Last 10 readings
        
        if (recentMemory.length >= 10) {
            // Check for consistent upward trend
            const memoryTrend = recentMemory.map(m => m.value);
            const isIncreasing = memoryTrend.every((val, i) => i === 0 || val >= memoryTrend[i - 1]);
            
            if (isIncreasing && (memoryTrend[9] - memoryTrend[0]) > 15) {
                // Potential memory leak detected
                const leakReport = await this.generateMemoryLeakReport(memoryTrend);
                
                await this.sendAlert('Memory_Leak', {
                    metric: 'Potential Memory Leak',
                    current: `${memory.percent.toFixed(1)}% (↗️ +${(memoryTrend[9] - memoryTrend[0]).toFixed(1)}%)`,
                    threshold: `Trending analysis`,
                    severity: 'WARNING',
                    color: '#ffa500',
                    icon: '🔍',
                    details: `Potential memory leak detected!\n\n**Leak Analysis:**\n${leakReport}`
                });
            }
        }
    }

    /**
     * Generate memory report
     */
    async generateMemoryReport() {
        const memUsage = process.memoryUsage();
        
        let report = `**Memory Breakdown:**\n`;
        report += `• RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB\n`;
        report += `• Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB\n`;
        report += `• Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB\n`;
        report += `• External: ${Math.round(memUsage.external / 1024 / 1024)}MB\n`;
        
        // Check active intervals and timeouts
        const activeHandles = process._getActiveHandles?.() || [];
        const activeRequests = process._getActiveRequests?.() || [];
        
        report += `\n**Active Processes:**\n`;
        report += `• Active Handles: ${activeHandles.length}\n`;
        report += `• Active Requests: ${activeRequests.length}\n`;
        
        // Check Discord client stats
        if (this.client.guilds) {
            report += `\n**Bot Statistics:**\n`;
            report += `• Guilds: ${this.client.guilds.cache.size}\n`;
            report += `• Users: ${this.client.users.cache.size}\n`;
            report += `• Channels: ${this.client.channels.cache.size}\n`;
        }
        
        return report;
    }

    /**
     * Investigate memory spike
     */
    async investigateMemorySpike(memory) {
        let report = `**Memory Spike Investigation:**\n`;
        
        // Check heap usage vs total memory
        const heapUsagePercent = (memory.heap / memory.used) * 100;
        report += `• Heap Usage: ${memory.heap}MB (${heapUsagePercent.toFixed(1)}% of used memory)\n`;
        
        // Check for garbage collection pressure
        if (global.gc) {
            const beforeGC = process.memoryUsage();
            global.gc();
            const afterGC = process.memoryUsage();
            
            const gcSavings = beforeGC.heapUsed - afterGC.heapUsed;
            report += `• GC Potential: ${Math.round(gcSavings / 1024 / 1024)}MB can be freed\n`;
        }
        
        // Check recent command activity
        report += `• Possible Causes: Recent command executions, database operations, or memory leaks\n`;
        report += `• Recommendation: Review recent bot activity and consider restarting if memory continues to climb\n`;
        
        return report;
    }

    /**
     * Generate memory leak report
     */
    async generateMemoryLeakReport(memoryTrend) {
        let report = `**Memory Trend Analysis:**\n`;
        report += `• Starting: ${memoryTrend[0].toFixed(1)}%\n`;
        report += `• Current: ${memoryTrend[memoryTrend.length - 1].toFixed(1)}%\n`;
        report += `• Increase: +${(memoryTrend[memoryTrend.length - 1] - memoryTrend[0]).toFixed(1)}%\n`;
        report += `• Pattern: Consistent upward trend detected\n`;
        
        report += `\n**Likely Causes:**\n`;
        report += `• Unclosed database connections\n`;
        report += `• Event listener leaks\n`;
        report += `• Cached data not being cleared\n`;
        report += `• Auto-promotional processes accumulating\n`;
        
        report += `\n**Recommended Actions:**\n`;
        report += `• Monitor process for next 10 minutes\n`;
        report += `• Consider bot restart if trend continues\n`;
        report += `• Review recent database operations\n`;
        
        return report;
    }

    /**
     * Suspend auto promotional sender
     */
    async suspendAutoPromoSender() {
        try {
            // Find and suspend AutoPromoSender
            if (this.client.autoPromoSender) {
                this.client.autoPromoSender.suspendAllCampaigns();
                this.safeguards.suspendedProcesses.add('AutoPromoSender - Role Campaign');
                this.safeguards.suspendedProcesses.add('AutoPromoSender - Premium Campaign');
                console.log(yellow('[Safeguard] Suspended AutoPromoSender campaigns'));
            }
        } catch (error) {
            console.error('[Safeguard] Error suspending AutoPromoSender:', error.message);
        }
    }

    /**
     * Suspend non-critical processes
     */
    async suspendNonCriticalProcesses() {
        try {
            // Clear non-essential intervals
            const suspendedCount = this.clearNonEssentialTimers();
            this.safeguards.suspendedProcesses.add(`${suspendedCount} Non-critical timers`);
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                this.safeguards.suspendedProcesses.add('Forced garbage collection');
            }
            
            console.log(yellow('[Safeguard] Suspended non-critical processes'));
        } catch (error) {
            console.error('[Safeguard] Error suspending processes:', error.message);
        }
    }

    /**
     * Clear non-essential timers (keeps only monitoring)
     */
    clearNonEssentialTimers() {
        let clearedCount = 0;
        
        // Note: This is a simplified approach. In a real scenario, you'd track
        // specific timer IDs to know which ones are safe to clear
        
        return clearedCount;
    }

    /**
     * Send emergency alert with special formatting
     */
    async sendEmergencyAlert(metricType, data) {
        try {
            const channel = await this.client.channels.fetch(this.alertChannelId);
            if (!channel) {
                console.error(`[Monitor] Emergency alert channel ${this.alertChannelId} not found`);
                return;
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`${data.icon} ${data.severity}: ${data.metric}`)
                .setDescription(data.details)
                .setColor(data.color)
                .addFields([
                    {
                        name: '📊 Current Value',
                        value: data.current,
                        inline: true
                    },
                    {
                        name: '⚠️ Threshold',
                        value: data.threshold,
                        inline: true
                    },
                    {
                        name: '🚨 Emergency Mode',
                        value: 'ACTIVATED',
                        inline: true
                    },
                    {
                        name: '🆔 Bot Info',
                        value: `${this.client.user.tag}\nShard: ${this.client.shard?.ids?.[0] ?? 0}`,
                        inline: false
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'Aurora Emergency System' });
            
            await channel.send({ 
                content: '🚨 **EMERGENCY ALERT** 🚨', 
                embeds: [embed] 
            });
            
            console.log(red(`[EMERGENCY] ${data.severity}: ${data.metric} = ${data.current}`));
            
        } catch (error) {
            console.error(`[Monitor] Failed to send emergency alert:`, error.message);
        }
    }

    /**
     * Deactivate emergency mode and resume processes
     */
    async deactivateEmergencyMode() {
        if (!this.safeguards.emergencyMode) return;
        
        this.safeguards.emergencyMode = false;
        
        // Resume auto promotional sender
        if (this.client.autoPromoSender) {
            this.client.autoPromoSender.resumeAllCampaigns();
        }
        
        // Clear suspended processes list
        this.safeguards.suspendedProcesses.clear();
        
        console.log(green('[Safeguard] Emergency mode deactivated - processes resumed'));
        
        // Send recovery alert
        const channel = await this.client.channels.fetch(this.alertChannelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Emergency Mode Deactivated')
                .setDescription('Memory usage has returned to safe levels. All processes have been resumed.')
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'Aurora Recovery System' });
            
            await channel.send({ embeds: [embed] });
        }
    }

    /**
     * Check network latency against threshold
     */
    async checkNetworkLatency(latency) {
        if (latency > 0 && latency >= this.thresholds.networkLatency) {
            await this.sendAlert('Network', {
                metric: 'Network Latency',
                current: `${latency}ms`,
                threshold: `${this.thresholds.networkLatency}ms`,
                severity: latency >= 500 ? 'CRITICAL' : 'WARNING',
                color: latency >= 500 ? '#ff0000' : '#ffa500',
                icon: '🌐',
                details: `High Discord API latency detected. Commands may be slower.`
            });
        }
    }

    /**
     * Check database latency against threshold
     */
    async checkDatabaseLatency(latency) {
        if (latency > 0 && latency >= this.thresholds.dbLatency) {
            await this.sendAlert('Database', {
                metric: 'Database Latency',
                current: `${latency.toFixed(1)}ms`,
                threshold: `${this.thresholds.dbLatency}ms`,
                severity: latency >= 500 ? 'CRITICAL' : 'WARNING',
                color: latency >= 500 ? '#ff0000' : '#ffa500',
                icon: '🗄️',
                details: `High database response time detected. Data operations may be slower.`
            });
        }
    }

    /**
     * Send alert to Discord channel
     */
    async sendAlert(metricType, data) {
        // Check cooldown
        const now = Date.now();
        const lastAlert = this.alertCooldown.get(metricType);
        
        if (lastAlert && (now - lastAlert) < this.cooldownDuration) {
            return; // Still in cooldown
        }
        
        try {
            const channel = await this.client.channels.fetch(this.alertChannelId);
            if (!channel) {
                console.error(`[Monitor] Alert channel ${this.alertChannelId} not found`);
                return;
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`${data.icon} ${data.severity}: ${data.metric} Threshold Exceeded`)
                .setDescription(data.details)
                .setColor(data.color)
                .addFields([
                    {
                        name: '📊 Current Value',
                        value: data.current,
                        inline: true
                    },
                    {
                        name: '⚠️ Threshold',
                        value: data.threshold,
                        inline: true
                    },
                    {
                        name: '🆔 Bot Info',
                        value: `${this.client.user.tag}\nShard: ${this.client.shard?.ids?.[0] ?? 0}`,
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ text: 'Aurora System Monitor' });
            
            await channel.send({ embeds: [embed] });
            
            // Set cooldown
            this.alertCooldown.set(metricType, now);
            
            // Log to console
            const logColor = data.severity === 'CRITICAL' ? red : yellow;
            console.log(logColor(`[Monitor] ${data.severity}: ${data.metric} = ${data.current} (threshold: ${data.threshold})`));
            
        } catch (error) {
            console.error(`[Monitor] Failed to send ${metricType} alert:`, error.message);
        }
    }

    /**
     * Store metrics for trending analysis
     */
    storeMetrics(metrics) {
        const maxHistory = 100; // Keep last 100 readings
        
        this.metrics.cpu.push({ value: metrics.cpu, timestamp: metrics.timestamp });
        this.metrics.memory.push({ value: metrics.memory.percent, timestamp: metrics.timestamp });
        this.metrics.dbLatency.push({ value: metrics.dbLatency, timestamp: metrics.timestamp });
        this.metrics.networkLatency.push({ value: metrics.networkLatency, timestamp: metrics.timestamp });
        
        // Trim arrays to max history
        Object.keys(this.metrics).forEach(key => {
            if (this.metrics[key].length > maxHistory) {
                this.metrics[key] = this.metrics[key].slice(-maxHistory);
            }
        });
    }

    /**
     * Perform detailed system check
     */
    async performDetailedCheck() {
        try {
            const metrics = await this.collectMetrics();
            
            // Calculate averages over last 10 readings
            const recentCount = Math.min(10, this.metrics.cpu.length);
            
            if (recentCount > 0) {
                const avgCpu = this.metrics.cpu.slice(-recentCount).reduce((sum, m) => sum + m.value, 0) / recentCount;
                const avgMemory = this.metrics.memory.slice(-recentCount).reduce((sum, m) => sum + m.value, 0) / recentCount;
                const avgDbLatency = this.metrics.dbLatency.slice(-recentCount).reduce((sum, m) => sum + m.value, 0) / recentCount;
                const avgNetLatency = this.metrics.networkLatency.slice(-recentCount).reduce((sum, m) => sum + m.value, 0) / recentCount;
                
                console.log(white('[Monitor] ') + green('System Status:') + 
                    ` CPU: ${avgCpu.toFixed(1)}% | ` +
                    `Memory: ${avgMemory.toFixed(1)}% | ` +
                    `DB: ${avgDbLatency.toFixed(1)}ms | ` +
                    `Network: ${avgNetLatency.toFixed(1)}ms`);
            }
            
        } catch (error) {
            console.error('[Monitor] Error in detailed check:', error.message);
        }
    }

    /**
     * Get current system status
     */
    async getStatus() {
        const metrics = await this.collectMetrics();
        
        return {
            cpu: {
                current: metrics.cpu,
                threshold: this.thresholds.cpu,
                status: metrics.cpu >= this.thresholds.cpu ? 'WARNING' : 'OK'
            },
            memory: {
                current: metrics.memory.percent,
                threshold: this.thresholds.memory,
                status: metrics.memory.percent >= this.thresholds.memory ? 'WARNING' : 'OK'
            },
            database: {
                latency: metrics.dbLatency,
                threshold: this.thresholds.dbLatency,
                status: metrics.dbLatency >= this.thresholds.dbLatency ? 'WARNING' : 'OK'
            },
            network: {
                latency: metrics.networkLatency,
                threshold: this.thresholds.networkLatency,
                status: metrics.networkLatency >= this.thresholds.networkLatency ? 'WARNING' : 'OK'
            }
        };
    }

    /**
     * Update alert channel
     */
    setAlertChannel(channelId) {
        this.alertChannelId = channelId;
        console.log(`[Monitor] Alert channel updated to: ${channelId}`);
    }

    /**
     * Update thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('[Monitor] Thresholds updated:', this.thresholds);
    }

    /**
     * EMERGENCY STOP - Stop all monitoring and clear alerts
     */
    async emergencyStop() {
        console.log('[Monitor] EMERGENCY STOP INITIATED');
        
        // Stop monitoring
        this.isRunning = false;
        
        // Clear all monitoring intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        // Clear alert cooldowns
        this.alertCooldown.clear();
        
        // Clear metrics history
        this.metrics.cpu = [];
        this.metrics.memory = [];
        this.metrics.dbLatency = [];
        this.metrics.networkLatency = [];
        
        // Set emergency flags
        this.emergencyMode = true;
        this.emergencyStoppedAt = new Date();
        
        console.log('[Monitor] EMERGENCY STOP COMPLETE - All monitoring suspended');
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
        console.log('[Monitor] Emergency mode cleared');
    }
}

module.exports = SystemMonitor;

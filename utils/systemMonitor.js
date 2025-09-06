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
            networkLatency: 150 // 150ms Discord API latency
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
}

module.exports = SystemMonitor;

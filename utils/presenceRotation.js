const { ActivityType } = require('discord.js');
const logger = require('./jsonLogger');

class PresenceRotation {
    constructor(client) {
        this.client = client;
        this.currentIndex = 0;
        this.rotationTimer = null;
        
        // NSFW-themed presence statuses
        this.presenceList = [
            { name: "🔥 1.3M+ Content Items", type: ActivityType.Watching },
            { name: "💦 Premium Adult Content", type: ActivityType.Streaming, url: "https://upgrade.chat/storeaurora" },
            { name: "🍑 with Aurora Community", type: ActivityType.Playing },
            { name: "🔞 Adult Entertainment Hub", type: ActivityType.Watching },
            { name: "💋 Curated NSFW Collection", type: ActivityType.Competing },
            { name: "🌶️ Spicy Content Library", type: ActivityType.Watching },
            { name: "💎 Premium Adult Videos", type: ActivityType.Streaming, url: "https://upgrade.chat/storeaurora" },
            { name: "🔥 Hot Adult Content", type: ActivityType.Playing },
            { name: "💜 NSFW Discord Bot", type: ActivityType.Listening },
            { name: "🍒 Adult Content Curator", type: ActivityType.Competing },
            { name: "🌙 Late Night Entertainment", type: ActivityType.Watching },
            { name: "💕 Adult Community Hub", type: ActivityType.Playing },
            { name: "🔞 18+ Content Provider", type: ActivityType.Streaming, url: "https://upgrade.chat/storeaurora" },
            { name: "🍑 Premium Adult Collection", type: ActivityType.Watching },
            { name: "💦 NSFW Content Database", type: ActivityType.Competing },
            { name: "🔥 Adult Entertainment Bot", type: ActivityType.Listening },
            { name: "💋 Sensual Content Hub", type: ActivityType.Playing },
            { name: "🌶️ Spicy Video Collection", type: ActivityType.Watching },
            { name: "💎 VIP Adult Content", type: ActivityType.Streaming, url: "https://upgrade.chat/storeaurora" },
            { name: "🍒 Adult Content Portal", type: ActivityType.Competing }
        ];
        
        this.isRotating = false;
    }

    /**
     * Start the presence rotation system
     */
    startRotation() {
        if (this.isRotating) {
            console.log('[Presence] Rotation already active');
            return;
        }

        this.isRotating = true;
        console.log('[Presence] Starting presence rotation system');
        
        // Set initial presence
        this.updatePresence();
        
        // Schedule next rotation
        this.scheduleNextRotation();
        
        logger.info('Presence rotation started', {
            totalStatuses: this.presenceList.length,
            rotationActive: true
        });
    }

    /**
     * Stop the presence rotation system
     */
    stopRotation() {
        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }
        
        this.isRotating = false;
        console.log('[Presence] Presence rotation stopped');
        
        logger.info('Presence rotation stopped', {
            rotationActive: false
        });
    }

    /**
     * Update the bot's presence to the next status
     */
    updatePresence() {
        if (!this.client.user) {
            console.log('[Presence] Bot not ready, skipping presence update');
            return;
        }

        const presence = this.presenceList[this.currentIndex];
        
        try {
            this.client.user.setPresence({
                activities: [{
                    name: presence.name,
                    type: presence.type,
                    ...(presence.url && { url: presence.url })
                }],
                status: 'online'
            });

            console.log(`[Presence] Updated to: ${presence.name} (${ActivityType[presence.type]})`);
            
            logger.info('Presence updated', {
                status: presence.name,
                type: ActivityType[presence.type],
                index: this.currentIndex,
                hasUrl: !!presence.url
            });

            // Move to next presence (loop back to start if at end)
            this.currentIndex = (this.currentIndex + 1) % this.presenceList.length;
            
        } catch (error) {
            console.error('[Presence] Failed to update presence:', error);
            
            logger.error('Presence update failed', {
                error: error.message,
                statusName: presence.name,
                index: this.currentIndex
            });
        }
    }

    /**
     * Schedule the next presence rotation with random interval
     */
    scheduleNextRotation() {
        if (!this.isRotating) return;

        // Random interval between 6 hours (21,600,000ms) and 72 hours (259,200,000ms)
        const minInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        const maxInterval = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
        
        const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
        
        // Convert to human readable format for logging
        const hours = Math.floor(randomInterval / (60 * 60 * 1000));
        const minutes = Math.floor((randomInterval % (60 * 60 * 1000)) / (60 * 1000));
        
        console.log(`[Presence] Next rotation scheduled in ${hours}h ${minutes}m`);
        
        logger.info('Next presence rotation scheduled', {
            intervalMs: randomInterval,
            intervalHours: hours,
            intervalMinutes: minutes,
            nextUpdateTime: new Date(Date.now() + randomInterval).toISOString()
        });

        this.rotationTimer = setTimeout(() => {
            this.updatePresence();
            this.scheduleNextRotation(); // Schedule the next one
        }, randomInterval);
    }

    /**
     * Manually trigger the next presence update (for testing)
     */
    forceUpdate() {
        console.log('[Presence] Forcing presence update');
        this.updatePresence();
        
        // Reschedule the next automatic rotation
        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
        }
        this.scheduleNextRotation();
    }

    /**
     * Get current presence status information
     */
    getStatus() {
        return {
            isRotating: this.isRotating,
            currentIndex: this.currentIndex,
            currentPresence: this.presenceList[this.currentIndex],
            totalStatuses: this.presenceList.length,
            nextRotationActive: !!this.rotationTimer
        };
    }

    /**
     * Add a new presence status to the rotation
     */
    addPresence(name, type, url = null) {
        const newPresence = { name, type };
        if (url) newPresence.url = url;
        
        this.presenceList.push(newPresence);
        
        console.log(`[Presence] Added new status: ${name}`);
        logger.info('New presence status added', { name, type: ActivityType[type], url });
    }

    /**
     * Remove a presence status from the rotation
     */
    removePresence(index) {
        if (index >= 0 && index < this.presenceList.length) {
            const removed = this.presenceList.splice(index, 1)[0];
            
            // Adjust current index if necessary
            if (this.currentIndex >= this.presenceList.length) {
                this.currentIndex = 0;
            }
            
            console.log(`[Presence] Removed status: ${removed.name}`);
            logger.info('Presence status removed', { removedStatus: removed.name, newTotal: this.presenceList.length });
            
            return removed;
        }
        return null;
    }
}

module.exports = PresenceRotation;

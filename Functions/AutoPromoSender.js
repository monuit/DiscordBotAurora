const { EmbedBuilder, WebhookClient, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const AutoPromoConfig = require('../settings/models/AutoPromoConfig');
const { SAFE_MODE } = require('../config/safeMode');

class AutoPromoSender {
    constructor(client) {
        this.client = client;
        
        // Role acquisition promo configuration
        this.rolePromoConfig = {
            channelId: '1413584747007054005',
            roleId: '1413584315912294690',
            adminUserId: '1016447789644910602',
            modMailUserId: '575252669443211264',
            lastMessageId: null,
            isRunning: false,
            timeoutId: null,
            minInterval: 60, // 60 minutes
            maxInterval: 120 // 120 minutes
        };

        // Premium content promo configuration
        this.premiumPromoConfig = {
            channelId: '1413584740052897954',
            previewChannelId: '1413584598104932364',
            reviewsChannelId: '1413584483990503484',
            lastMessageId: null,
            isRunning: false,
            timeoutId: null,
            minInterval: 12 * 60, // 12 hours
            maxInterval: 24 * 60  // 24 hours
        };
    }

    /**
     * Get promotional message content for role acquisition
     */
    getRolePromoMessage() {
    const extra = this.rolePromoConfig.extra || {};
    const roleId = extra.roleId || this.rolePromoConfig.roleId || '1413584315912294690';
    const adminUserId = extra.adminUserId || this.rolePromoConfig.adminUserId || '1016447789644910602';
    const modMailUserId = extra.modMailUserId || this.rolePromoConfig.modMailUserId || '575252669443211264';
    return `||@everyone||\n\nYou can get the <@&${roleId}> role for free by posting 3 reddit posts, please follow the steps:\nPick one option to get access:\n\n✅ **Option 1: Comment on Reddit**\n1. Search for posts with keywords like "nsfw discord", "onlyfans leaks", etc.\n2️. Comment under these posts with:\n👉 " They're here: https://discord.gg/fPge4RpbNZ\n3. Repeat on 10 recent/popular posts\n4. Send a screenshot to <@${adminUserId}>\n\n**List of posts:**\nhttps://www.reddit.com/r/findaserver/comments/1h3gl7q/best_tiktok_leaks_discord_server/m3qkkxl/\nhttps://www.reddit.com/r/findaserver/comments/1dmjadn/best_nsfw_discord_server/\n\n✅ **Option 2: Post on Your Reddit Profile**\n1. Go to your Reddit profile and click Create a post\n2. Use a title from this list ➡️ https://pastelink.net/kqc0i660\n3. Add the Discord server link using the "URL" button (https://discord.gg/fPge4RpbNZ)\n4. Post 3 times on your profile\n5. Send a screenshot to <@${adminUserId}>\n\n⚠️ **Don't use pastelink in your posts titles!** It's only useful for getting good titles for your posts when you open the pastelink on google!\n\n📩 Once verified, you get free access with the <@&${roleId}> role! For any problems, directly DM <@${modMailUserId}> (ModMail) and we'll answer your questions ASAP.`;
    }

    /**
     * Get promotional message content for premium content
     */
    getPremiumPromoMessage() {
    const extra = this.premiumPromoConfig.extra || {};
    const previewChannelId = extra.previewChannelId || this.premiumPromoConfig.previewChannelId || '1413584598104932364';
    const reviewsChannelId = extra.reviewsChannelId || this.premiumPromoConfig.reviewsChannelId || '1413584483990503484';
    return `**Welcome to Aurora!**\nㅤ\n**Providing Top quality leaks from all over the web with content added Daily!**\n\n**Once you pay, you will be added to the Content server automatically!**\n\n**》$50 - Aurora Lifetime (All content + NSFW)**\nAll packages displayed on our website\nExclusive N.S.F.W categories\nMassive amounts of Videos\nPreview: <#${previewChannelId}>\n\n**》$25- Exclusive leaks**\nVideos and pictures over 1000+ girls\nOver 200,000+ files\nOver 500GB of content and updated daily\nPreview: <#${previewChannelId}>\n\n**》$10.99- Snap leaks (Snapchat Leaks)**\nSnapchat leaks from 1000+ girls\nOver 200,000+ files\nOver 500GB of content and updated daily\nPreview: <#${previewChannelId}>\n\n**》$6.99 - Premium (OnlyFans Leaks)**\nOnlyfans leaks from 200+ girls\nOver 5TB of content\nCustom Requests\nNew mega folders\nPreview: <#${previewChannelId}>\n\n**Customer Reviews:** <#${reviewsChannelId}>\n\n**Click the link below to purchase! ⤵️**\n\nhttps://upgrade.chat/storeaurora`;
    }

    /**
     * Send role acquisition promotional message
     */
    async sendRolePromoMessage() {
        try {
            const channel = await this.client.channels.fetch(this.rolePromoConfig.channelId);
            if (!channel) {
                console.error(`[AutoPromo] Role promo channel ${this.rolePromoConfig.channelId} not found`);
                return false;
            }
            // Try to clear any previous promo messages first (respecting DISABLE_DESTRUCTIVE_ACTIONS)
            try {
                await this.clearRolePromoMessages();
            } catch (e) {
                console.warn('[AutoPromo] clearRolePromoMessages failed before sending role promo:', e && e.message ? e.message : e);
            }

            const message = this.getRolePromoMessage();
            
            // Create upgrade button
            const upgradeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🚀 Upgrade to Premium - Skip the Wait!')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://upgrade.chat/storeaurora')
                );
            
            const sentMessage = await channel.send({
                content: message,
                components: [upgradeButton],
                allowedMentions: {
                    everyone: true,
                    roles: [this.rolePromoConfig.roleId]
                }
            });

            // Store the message ID for future deletion
            this.rolePromoConfig.lastMessageId = sentMessage.id;

            // Persist lastSentAt and nextSendAt to DB
            try {
                const cfg = await AutoPromoConfig.findOne({ campaignType: 'role', channelId: this.rolePromoConfig.channelId });
                if (cfg) {
                    cfg.lastSentAt = new Date();
                    cfg.nextSendAt = new Date(Date.now() + this.getRolePromoInterval());
                    cfg.lastMessageId = sentMessage.id;
                    await cfg.save();
                }
            } catch (e) {
                console.warn('[AutoPromo] Failed to persist role promo schedule to DB:', e.message);
            }

            console.log(`[AutoPromo] Role promo message sent to ${channel.name} (${this.rolePromoConfig.channelId}) - Message ID: ${sentMessage.id}`);
            return true;
        } catch (error) {
            console.error('[AutoPromo] Error sending role promotional message:', error);
            return false;
        }
    }

    /**
     * Send premium content promotional message
     */
    async sendPremiumPromoMessage() {
        try {
            const channel = await this.client.channels.fetch(this.premiumPromoConfig.channelId);
            if (!channel) {
                console.error(`[AutoPromo] Premium promo channel ${this.premiumPromoConfig.channelId} not found`);
                return false;
            }
            // Try to clear any previous premium promo messages first (respecting DISABLE_DESTRUCTIVE_ACTIONS)
            try {
                await this.clearPremiumPromoMessages();
            } catch (e) {
                console.warn('[AutoPromo] clearPremiumPromoMessages failed before sending premium promo:', e && e.message ? e.message : e);
            }

            const message = this.getPremiumPromoMessage();
            
            // Create upgrade button
            const upgradeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🚀 Upgrade Now - Instant Access')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://upgrade.chat/storeaurora')
                );
            
            const sentMessage = await channel.send({
                content: message,
                components: [upgradeButton],
                allowedMentions: {
                    everyone: false,
                    roles: [],
                    users: []
                }
            });

            // Store the message ID for future deletion
            this.premiumPromoConfig.lastMessageId = sentMessage.id;

            // Persist lastSentAt and nextSendAt to DB
            try {
                const cfg = await AutoPromoConfig.findOne({ campaignType: 'premium', channelId: this.premiumPromoConfig.channelId });
                if (cfg) {
                    cfg.lastSentAt = new Date();
                    cfg.nextSendAt = new Date(Date.now() + this.getPremiumPromoInterval());
                    cfg.lastMessageId = sentMessage.id;
                    await cfg.save();
                }
            } catch (e) {
                console.warn('[AutoPromo] Failed to persist premium promo schedule to DB:', e.message);
            }

            console.log(`[AutoPromo] Premium promo message sent to ${channel.name} (${this.premiumPromoConfig.channelId}) - Message ID: ${sentMessage.id}`);
            return true;
        } catch (error) {
            console.error('[AutoPromo] Error sending premium promotional message:', error);
            return false;
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    async sendPromoMessage() {
        return await this.sendRolePromoMessage();
    }

    /**
     * Get random interval for role promo (60-120 minutes in milliseconds)
     */
    getRolePromoInterval() {
        const randomMinutes = Math.floor(Math.random() * (this.rolePromoConfig.maxInterval - this.rolePromoConfig.minInterval + 1)) + this.rolePromoConfig.minInterval;
        return randomMinutes * 60 * 1000; // Convert to milliseconds
    }

    /**
     * Get random interval for premium promo (12-24 hours in milliseconds)
     */
    getPremiumPromoInterval() {
        const randomMinutes = Math.floor(Math.random() * (this.premiumPromoConfig.maxInterval - this.premiumPromoConfig.minInterval + 1)) + this.premiumPromoConfig.minInterval;
        return randomMinutes * 60 * 1000; // Convert to milliseconds
    }

    /**
     * Legacy method for backward compatibility
     */
    getRandomInterval() {
        return this.getRolePromoInterval();
    }

    /**
     * Schedule next role promotional message
     */
    scheduleRolePromoNext() {
        if (this.rolePromoConfig.timeoutId) {
            clearTimeout(this.rolePromoConfig.timeoutId);
        }

        const interval = this.getRolePromoInterval();
        const nextTime = new Date(Date.now() + interval);
        
        console.log(`[AutoPromo] Next role promo message scheduled for: ${nextTime.toLocaleString()}`);
        
        this.rolePromoConfig.timeoutId = setTimeout(async () => {
            await this.sendRolePromoMessage();
            this.scheduleRolePromoNext(); // Schedule the next one
        }, interval);
    }

    /**
     * Schedule next premium promotional message
     */
    schedulePremiumPromoNext() {
        if (this.premiumPromoConfig.timeoutId) {
            clearTimeout(this.premiumPromoConfig.timeoutId);
        }

        const interval = this.getPremiumPromoInterval();
        const nextTime = new Date(Date.now() + interval);
        
        console.log(`[AutoPromo] Next premium promo message scheduled for: ${nextTime.toLocaleString()}`);
        
        this.premiumPromoConfig.timeoutId = setTimeout(async () => {
            await this.sendPremiumPromoMessage();
            this.schedulePremiumPromoNext(); // Schedule the next one
        }, interval);
    }

    /**
     * Legacy method for backward compatibility
     */
    scheduleNext() {
        this.scheduleRolePromoNext();
    }

    /**
     * Clear any existing promotional messages in the role promo channel
     */
    async clearRolePromoMessages() {
        try {
            // Startup-safe mode: skip cleanup if destructive actions disabled at startup
            if (SAFE_MODE) {
                console.log('[AutoPromo] Skipping role promo cleanup because startup SAFE_MODE is enabled');
                return;
            }
            const channel = await this.client.channels.fetch(this.rolePromoConfig.channelId);
            if (!channel) {
                console.error(`[AutoPromo] Role promo channel ${this.rolePromoConfig.channelId} not found for cleanup`);
                return;
            }

            // Fetch recent messages and delete any promotional messages from the bot
            const messages = await channel.messages.fetch({ limit: 50 });
            // Only target messages authored by the bot and matching the promo text
            const botMessages = messages.filter(msg => 
                msg.author && msg.author.id === this.client.user.id && 
                msg.content && msg.content.includes('You can get the') // Only delete role promo messages
            );
            
            if (botMessages.size > 0) {
                // Cap deletions per run to avoid runaway deletions
                const MAX_DELETIONS = 20;
                const toDelete = Array.from(botMessages.values()).slice(0, MAX_DELETIONS);
                console.log(`[AutoPromo] Found ${botMessages.size} role promo messages; deleting up to ${toDelete.length} (cap: ${MAX_DELETIONS})`);
                for (const message of toDelete) {
                    try {
                        await message.delete();
                        console.log(`[AutoPromo] Deleted existing role promotional message ${message.id}`);
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.log(`[AutoPromo] Could not delete role promo message ${message.id}: ${error.message}`);
                    }
                }
                // If we deleted any, reset the lastMessageId if it was among deleted
                if (this.rolePromoConfig.lastMessageId && toDelete.find(m => m.id === this.rolePromoConfig.lastMessageId)) {
                    this.rolePromoConfig.lastMessageId = null;
                }
            }
        } catch (error) {
            console.error('[AutoPromo] Error during role promo message cleanup:', error);
        }
    }

    /**
     * Clear any existing promotional messages in the premium promo channel
     */
    async clearPremiumPromoMessages() {
        try {
            // Startup-safe mode: skip cleanup if destructive actions disabled at startup
            if (SAFE_MODE) {
                console.log('[AutoPromo] Skipping premium promo cleanup because startup SAFE_MODE is enabled');
                return;
            }
            const channel = await this.client.channels.fetch(this.premiumPromoConfig.channelId);
            if (!channel) {
                console.error(`[AutoPromo] Premium promo channel ${this.premiumPromoConfig.channelId} not found for cleanup`);
                return;
            }

            // Fetch recent messages and delete any promotional messages from the bot
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg => 
                msg.author && msg.author.id === this.client.user.id && 
                msg.content && msg.content.includes('Welcome to Aurora!') // Only delete premium promo messages
            );
            
            if (botMessages.size > 0) {
                const MAX_DELETIONS = 20;
                const toDelete = Array.from(botMessages.values()).slice(0, MAX_DELETIONS);
                console.log(`[AutoPromo] Found ${botMessages.size} premium promo messages; deleting up to ${toDelete.length} (cap: ${MAX_DELETIONS})`);
                for (const message of toDelete) {
                    try {
                        await message.delete();
                        console.log(`[AutoPromo] Deleted existing premium promotional message ${message.id}`);
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.log(`[AutoPromo] Could not delete premium promo message ${message.id}: ${error.message}`);
                    }
                }
                if (this.premiumPromoConfig.lastMessageId && toDelete.find(m => m.id === this.premiumPromoConfig.lastMessageId)) {
                    this.premiumPromoConfig.lastMessageId = null;
                }
            }
        } catch (error) {
            console.error('[AutoPromo] Error during premium promo message cleanup:', error);
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    async clearExistingMessages() {
        await this.clearRolePromoMessages();
    }

    /**
     * Start the auto-promotional system
     */
    async start() {
        if (this.rolePromoConfig.isRunning && this.premiumPromoConfig.isRunning) {
            console.log('[AutoPromo] Auto-promotional system is already running');
            return;
        }
        console.log('[AutoPromo] Starting auto-promotional system');

        // Ensure DB records exist and load scheduling state
        await AutoPromoConfig.findOneAndUpdate(
            { campaignType: 'role', channelId: this.rolePromoConfig.channelId },
            { $setOnInsert: { extra: {}, isRunning: true } },
            { upsert: true, new: true }
        );
        await AutoPromoConfig.findOneAndUpdate(
            { campaignType: 'premium', channelId: this.premiumPromoConfig.channelId },
            { $setOnInsert: { extra: {}, isRunning: true } },
            { upsert: true, new: true }
        );

        // By default, do NOT clear or re-send promotional messages on startup.
        // This prevents the bot from immediately re-sending promos after a restart.
        // Set AUTOPROMO_CLEANUP_ON_START=true in the environment to opt in to cleanup behavior.
        const cleanupOnStart = String(process.env.AUTOPROMO_CLEANUP_ON_START || 'false').toLowerCase() === 'true';
        if (cleanupOnStart) {
            console.log('[AutoPromo] AUTOPROMO_CLEANUP_ON_START=true — performing promo cleanup on start');
            await this.clearRolePromoMessages();
            await this.clearPremiumPromoMessages();
        } else {
            console.log('[AutoPromo] Skipping promo cleanup on start to avoid accidental re-sends (enable AUTOPROMO_CLEANUP_ON_START to change)');
        }

        // Start role promo system: load DB state and schedule (do NOT send immediately on restart)
        this.rolePromoConfig.isRunning = true;
        const roleCfg = await AutoPromoConfig.findOne({ campaignType: 'role', channelId: this.rolePromoConfig.channelId });
        if (!roleCfg.nextSendAt) {
            // First-time setup: schedule next send in the future (do not send immediately)
            roleCfg.nextSendAt = new Date(Date.now() + this.getRolePromoInterval());
            await roleCfg.save();
        }
        // If the saved nextSendAt is in the past (e.g., downtime), move it to a future slot to avoid immediate send on restart
        if (roleCfg.nextSendAt && roleCfg.nextSendAt.getTime() <= Date.now()) {
            roleCfg.nextSendAt = new Date(Date.now() + this.getRolePromoInterval());
            await roleCfg.save();
            console.log('[AutoPromo] nextSendAt was in the past — deferred next send to', roleCfg.nextSendAt.toISOString());
        }
        this.rolePromoConfig.timeoutId = setTimeout(async () => {
            await this.sendRolePromoMessage();
            // after send, schedule next
            this.scheduleRolePromoNext();
        }, Math.max(0, roleCfg.nextSendAt.getTime() - Date.now()));

        // Start premium promo system: load DB state and schedule (do NOT send immediately on restart)
        this.premiumPromoConfig.isRunning = true;
        const premCfg = await AutoPromoConfig.findOne({ campaignType: 'premium', channelId: this.premiumPromoConfig.channelId });
        if (!premCfg.nextSendAt) {
            premCfg.nextSendAt = new Date(Date.now() + this.getPremiumPromoInterval());
            await premCfg.save();
        }
        // Avoid immediate sends when nextSendAt is in the past
        if (premCfg.nextSendAt && premCfg.nextSendAt.getTime() <= Date.now()) {
            premCfg.nextSendAt = new Date(Date.now() + this.getPremiumPromoInterval());
            await premCfg.save();
            console.log('[AutoPromo] premium nextSendAt was in the past — deferred next send to', premCfg.nextSendAt.toISOString());
        }
        this.premiumPromoConfig.timeoutId = setTimeout(async () => {
            await this.sendPremiumPromoMessage();
            this.schedulePremiumPromoNext();
        }, Math.max(0, premCfg.nextSendAt.getTime() - Date.now()));
    }

    /**
     * Stop the auto-promotional system
     */
    async stop() {
        if (!this.rolePromoConfig.isRunning && !this.premiumPromoConfig.isRunning) {
            console.log('[AutoPromo] Auto-promotional system is not running');
            return;
        }

        // Stop role promo system
        if (this.rolePromoConfig.isRunning) {
            this.rolePromoConfig.isRunning = false;
            if (this.rolePromoConfig.timeoutId) {
                clearTimeout(this.rolePromoConfig.timeoutId);
                this.rolePromoConfig.timeoutId = null;
            }
        }

        // Stop premium promo system
        if (this.premiumPromoConfig.isRunning) {
            this.premiumPromoConfig.isRunning = false;
            if (this.premiumPromoConfig.timeoutId) {
                clearTimeout(this.premiumPromoConfig.timeoutId);
                this.premiumPromoConfig.timeoutId = null;
            }
        }
        
        // Clear any existing promotional messages when stopping
        await this.clearRolePromoMessages();
        await this.clearPremiumPromoMessages();
        
        console.log('[AutoPromo] Auto-promotional system stopped');
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            rolePromo: {
                isRunning: this.rolePromoConfig.isRunning,
                channelId: this.rolePromoConfig.channelId,
                nextScheduled: this.rolePromoConfig.timeoutId ? 'Scheduled' : 'Not scheduled',
                interval: `${this.rolePromoConfig.minInterval}-${this.rolePromoConfig.maxInterval} minutes`
            },
            premiumPromo: {
                isRunning: this.premiumPromoConfig.isRunning,
                channelId: this.premiumPromoConfig.channelId,
                nextScheduled: this.premiumPromoConfig.timeoutId ? 'Scheduled' : 'Not scheduled',
                interval: `${this.premiumPromoConfig.minInterval/60}-${this.premiumPromoConfig.maxInterval/60} hours`
            },
            // Legacy compatibility
            isRunning: this.rolePromoConfig.isRunning || this.premiumPromoConfig.isRunning,
            channelId: this.rolePromoConfig.channelId,
            nextScheduled: this.rolePromoConfig.timeoutId ? 'Scheduled' : 'Not scheduled'
        };
    }

    /**
     * Test role promotional message
     */
    async testRolePromo() {
        return await this.sendRolePromoMessage();
    }

    /**
     * Test premium promotional message
     */
    async testPremiumPromo() {
        return await this.sendPremiumPromoMessage();
    }

    /**
     * Suspend all campaigns (for emergency memory management)
     */
    suspendAllCampaigns() {
        console.log('[AutoPromo] SUSPENDING ALL CAMPAIGNS - Emergency memory safeguard');
        
        // Stop role promo system but don't clear messages
        if (this.rolePromoConfig.isRunning) {
            this.rolePromoConfig.wasRunning = true; // Remember it was running
            this.rolePromoConfig.isRunning = false;
            if (this.rolePromoConfig.timeoutId) {
                clearTimeout(this.rolePromoConfig.timeoutId);
                this.rolePromoConfig.timeoutId = null;
            }
        }

        // Stop premium promo system but don't clear messages
        if (this.premiumPromoConfig.isRunning) {
            this.premiumPromoConfig.wasRunning = true; // Remember it was running
            this.premiumPromoConfig.isRunning = false;
            if (this.premiumPromoConfig.timeoutId) {
                clearTimeout(this.premiumPromoConfig.timeoutId);
                this.premiumPromoConfig.timeoutId = null;
            }
        }
        
        console.log('[AutoPromo] All campaigns suspended for memory conservation');
    }

    /**
     * Resume all campaigns (after emergency situation is resolved)
     */
    resumeAllCampaigns() {
        console.log('[AutoPromo] RESUMING ALL CAMPAIGNS - Emergency resolved');
        
        // Resume role promo system if it was running
        if (this.rolePromoConfig.wasRunning) {
            this.rolePromoConfig.isRunning = true;
            this.rolePromoConfig.wasRunning = false;
            this.scheduleRolePromoNext();
            console.log('[AutoPromo] Role promotional campaign resumed');
        }

        // Resume premium promo system if it was running
        if (this.premiumPromoConfig.wasRunning) {
            this.premiumPromoConfig.isRunning = true;
            this.premiumPromoConfig.wasRunning = false;
            this.schedulePremiumPromoNext();
            console.log('[AutoPromo] Premium promotional campaign resumed');
        }
        
        console.log('[AutoPromo] All campaigns resumed successfully');
    }

    /**
     * Check if campaigns are suspended
     */
    isSuspended() {
        return (this.rolePromoConfig.wasRunning || this.premiumPromoConfig.wasRunning) &&
               (!this.rolePromoConfig.isRunning && !this.premiumPromoConfig.isRunning);
    }

    /**
     * EMERGENCY STOP - Stop all promotional campaigns immediately
     */
    async emergencyStop() {
        console.log('[AutoPromo] EMERGENCY STOP INITIATED');
        
        // Stop role promo campaign
        if (this.rolePromoConfig.isRunning) {
            this.rolePromoConfig.isRunning = false;
            if (this.rolePromoConfig.timeoutId) {
                clearTimeout(this.rolePromoConfig.timeoutId);
                this.rolePromoConfig.timeoutId = null;
            }
        }
        
        // Stop premium promo campaign
        if (this.premiumPromoConfig.isRunning) {
            this.premiumPromoConfig.isRunning = false;
            if (this.premiumPromoConfig.timeoutId) {
                clearTimeout(this.premiumPromoConfig.timeoutId);
                this.premiumPromoConfig.timeoutId = null;
            }
        }
        
        // Set emergency flags
        this.emergencyMode = true;
        this.emergencyStoppedAt = new Date();
        
        console.log('[AutoPromo] EMERGENCY STOP COMPLETE - All campaigns stopped');
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
        console.log('[AutoPromo] Emergency mode cleared');
    }
}

module.exports = AutoPromoSender;

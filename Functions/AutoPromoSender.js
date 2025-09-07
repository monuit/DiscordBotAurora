const { EmbedBuilder, WebhookClient } = require('discord.js');

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
        return `||@everyone||\n\nYou can get the <@&${this.rolePromoConfig.roleId}> role for free by posting 3 reddit posts, please follow the steps:\nPick one option to get access:\n\n✅ **Option 1: Comment on Reddit**\n1. Search for posts with keywords like "nsfw discord", "onlyfans leaks", etc.\n2️. Comment under these posts with:\n👉 " They're here: https://discord.gg/fPge4RpbNZ\n3. Repeat on 10 recent/popular posts\n4. Send a screenshot to <@${this.rolePromoConfig.adminUserId}>\n\n**List of posts:**\nhttps://www.reddit.com/r/findaserver/comments/1h3gl7q/best_tiktok_leaks_discord_server/m3qkkxl/\nhttps://www.reddit.com/r/findaserver/comments/1dmjadn/best_nsfw_discord_server/\n\n✅ **Option 2: Post on Your Reddit Profile**\n1. Go to your Reddit profile and click Create a post\n2. Use a title from this list ➡️ https://pastelink.net/kqc0i660\n3. Add the Discord server link using the "URL" button (https://discord.gg/fPge4RpbNZ)\n4. Post 3 times on your profile\n5. Send a screenshot to <@${this.rolePromoConfig.adminUserId}>\n\n⚠️ **Don't use pastelink in your posts titles!** It's only useful for getting good titles for your posts when you open the pastelink on google!\n\n📩 Once verified, you get free access with the <@&${this.rolePromoConfig.roleId}> role! For any problems, directly DM <@${this.rolePromoConfig.modMailUserId}> (ModMail) and we'll answer your questions ASAP.`;
    }

    /**
     * Get promotional message content for premium content
     */
    getPremiumPromoMessage() {
        return `**Welcome to Aurora!**\nㅤ\n**Providing Top quality leaks from all over the web with content added Daily!**\n\n**Once you pay, you will be added to the Content server automatically!**\n\n**》$50 - Aurora Lifetime (All content + NSFW)**\nAll packages displayed on our website\nExclusive N.S.F.W categories\nMassive amounts of Videos\nPreview: <#${this.premiumPromoConfig.previewChannelId}>\n\n**》$25- Exclusive leaks**\nVideos and pictures over 1000+ girls\nOver 200,000+ files\nOver 500GB of content and updated daily\nPreview: <#${this.premiumPromoConfig.previewChannelId}>\n\n**》$10.99- Snap leaks (Snapchat Leaks)**\nSnapchat leaks from 1000+ girls\nOver 200,000+ files\nOver 500GB of content and updated daily\nPreview: <#${this.premiumPromoConfig.previewChannelId}>\n\n**》$6.99 - Premium (OnlyFans Leaks)**\nOnlyfans leaks from 200+ girls\nOver 5TB of content\nCustom Requests\nNew mega folders\nPreview: <#${this.premiumPromoConfig.previewChannelId}>\n\n**Customer Reviews:** <#${this.premiumPromoConfig.reviewsChannelId}>\n\n**Click the link below to purchase! ⤵️**\n\nhttps://upgrade.chat/storeaurora`;
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

            // Delete the previous promotional message if it exists
            if (this.rolePromoConfig.lastMessageId) {
                try {
                    const previousMessage = await channel.messages.fetch(this.rolePromoConfig.lastMessageId);
                    if (previousMessage) {
                        await previousMessage.delete();
                        console.log(`[AutoPromo] Deleted previous role promo message ${this.rolePromoConfig.lastMessageId}`);
                    }
                } catch (error) {
                    console.log(`[AutoPromo] Could not delete previous role promo message ${this.rolePromoConfig.lastMessageId}: ${error.message}`);
                }
                this.rolePromoConfig.lastMessageId = null;
            }

            const message = this.getRolePromoMessage();
            
            const sentMessage = await channel.send({
                content: message,
                allowedMentions: {
                    everyone: true,
                    roles: [this.rolePromoConfig.roleId]
                }
            });

            // Store the message ID for future deletion
            this.rolePromoConfig.lastMessageId = sentMessage.id;

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

            // Delete the previous promotional message if it exists
            if (this.premiumPromoConfig.lastMessageId) {
                try {
                    const previousMessage = await channel.messages.fetch(this.premiumPromoConfig.lastMessageId);
                    if (previousMessage) {
                        await previousMessage.delete();
                        console.log(`[AutoPromo] Deleted previous premium promo message ${this.premiumPromoConfig.lastMessageId}`);
                    }
                } catch (error) {
                    console.log(`[AutoPromo] Could not delete previous premium promo message ${this.premiumPromoConfig.lastMessageId}: ${error.message}`);
                }
                this.premiumPromoConfig.lastMessageId = null;
            }

            const message = this.getPremiumPromoMessage();
            
            const sentMessage = await channel.send({
                content: message,
                allowedMentions: {
                    everyone: false,
                    roles: [],
                    users: []
                }
            });

            // Store the message ID for future deletion
            this.premiumPromoConfig.lastMessageId = sentMessage.id;

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
            const channel = await this.client.channels.fetch(this.rolePromoConfig.channelId);
            if (!channel) {
                console.error(`[AutoPromo] Role promo channel ${this.rolePromoConfig.channelId} not found for cleanup`);
                return;
            }

            // Fetch recent messages and delete any promotional messages from the bot
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg => 
                msg.author.id === this.client.user.id && 
                msg.content.includes('You can get the') // Only delete role promo messages
            );
            
            if (botMessages.size > 0) {
                console.log(`[AutoPromo] Found ${botMessages.size} existing role promotional messages to clean up`);
                for (const message of botMessages.values()) {
                    try {
                        await message.delete();
                        console.log(`[AutoPromo] Deleted existing role promotional message ${message.id}`);
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.log(`[AutoPromo] Could not delete role promo message ${message.id}: ${error.message}`);
                    }
                }
                // Reset last message ID since we cleared everything
                this.rolePromoConfig.lastMessageId = null;
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
            const channel = await this.client.channels.fetch(this.premiumPromoConfig.channelId);
            if (!channel) {
                console.error(`[AutoPromo] Premium promo channel ${this.premiumPromoConfig.channelId} not found for cleanup`);
                return;
            }

            // Fetch recent messages and delete any promotional messages from the bot
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg => 
                msg.author.id === this.client.user.id && 
                msg.content.includes('Welcome to Aurora!') // Only delete premium promo messages
            );
            
            if (botMessages.size > 0) {
                console.log(`[AutoPromo] Found ${botMessages.size} existing premium promotional messages to clean up`);
                for (const message of botMessages.values()) {
                    try {
                        await message.delete();
                        console.log(`[AutoPromo] Deleted existing premium promotional message ${message.id}`);
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.log(`[AutoPromo] Could not delete premium promo message ${message.id}: ${error.message}`);
                    }
                }
                // Reset last message ID since we cleared everything
                this.premiumPromoConfig.lastMessageId = null;
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
        
        // Clear any existing messages before starting and wait for completion
        await this.clearRolePromoMessages();
        await this.clearPremiumPromoMessages();
        
        // Start both promotional systems
        if (!this.rolePromoConfig.isRunning) {
            this.rolePromoConfig.isRunning = true;
            
            // Send initial role promo message immediately
            console.log('[AutoPromo] Sending initial role promotional message');
            await this.sendRolePromoMessage();
            
            // Then schedule the next one
            this.scheduleRolePromoNext();
        }
        
        if (!this.premiumPromoConfig.isRunning) {
            this.premiumPromoConfig.isRunning = true;
            
            // Send initial premium promo message immediately
            console.log('[AutoPromo] Sending initial premium promotional message');
            await this.sendPremiumPromoMessage();
            
            // Then schedule the next one
            this.schedulePremiumPromoNext();
        }
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
}

module.exports = AutoPromoSender;

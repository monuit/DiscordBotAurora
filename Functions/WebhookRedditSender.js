const db = require("../settings/models/AutoFeeds")
const { EmbedBuilder, ApplicationCommandOptionType, PermissionsBitField, ChannelType, WebhookClient } = require("discord.js");
const getRandomSubreddit = require('./others/randomsub');
const { enhancedRedditFetch, createRedditErrorEmbed } = require('./redditHelper');

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

module.exports = {
    webhook_reddit_sender: async function (client) {
        try {
            let randomSubreddit = getRandomSubreddit();
            
            console.log(`[Auto Reddit] Starting fetch for r/${randomSubreddit}`);

            // Use enhanced Reddit fetch
            const redditData = await enhancedRedditFetch(randomSubreddit, client);
            
            if (!redditData) {
                console.log(`[Auto Reddit] Failed to fetch data from r/${randomSubreddit} and fallbacks`);
                return;
            }

            const { subreddit, permalink, posturl, postimage, posttitle, postup, postcomments } = redditData;

            try {
                const webhooks = await db.find({ isActive: { $ne: false } });
                
                if (webhooks.length === 0) {
                    console.log('[Auto Reddit] No webhooks found in database');
                    return;
                }

                console.log(`[Auto Reddit] Sending to ${webhooks.length} webhooks`);

                await Promise.all(webhooks.map(async (webhookData) => {
                    const { guildId, channelId, webhook, _id } = webhookData;
                    const webhookKey = webhook || _id.toString();

                    // Skip disabled webhooks
                    if (disabledWebhooks.has(webhookKey)) {
                        return;
                    }

                    // Check retry count
                    const retryCount = retryTracker.get(webhookKey) || 0;
                    if (retryCount >= 5) {
                        console.log(`[Auto Reddit] Webhook ${channelId} disabled after 5 failed attempts`);
                        disabledWebhooks.add(webhookKey);
                        retryTracker.delete(webhookKey);
                        return;
                    }

                    try {
                        // Validate webhook URL format
                        if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
                            throw new Error('Invalid webhook URL format');
                        }

                        const channel = await client.channels.fetch(channelId).catch(() => null);
                        if (!channel) {
                            console.log(`[Auto Reddit] Channel ${channelId} not found, removing webhook`);
                            await db.findByIdAndDelete(webhookData._id);
                            return;
                        }

                        const web = new WebhookClient({ url: webhook });
                        
                        const content = `**r/${randomSubreddit}** • ${posttitle}\n👍 ${postup} | 💬 ${postcomments}\n${client.spoiler || ''}${postimage}`;
                        
                        await web.send({ 
                            content,
                            username: client.user.username,
                            avatarURL: client.user.displayAvatarURL()
                        });
                        
                        console.log(`[Auto Reddit] ✅ Sent to ${channel.name} (${channel.id})`);
                        // Reset retry count on success
                        retryTracker.delete(webhookKey);
                        
                    } catch (error) {
                        const newRetryCount = retryCount + 1;
                        retryTracker.set(webhookKey, newRetryCount);
                        
                        console.error(`[Auto Reddit] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                        
                        if (newRetryCount >= 5) {
                            console.log(`[Auto Reddit] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                            disabledWebhooks.add(webhookKey);
                            retryTracker.delete(webhookKey);
                            
                            // Remove invalid webhook from database after final failure
                            await db.findByIdAndDelete(webhookData._id);
                        } else {
                            console.log(`[Auto Reddit] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                        }

                        // Optional: Log to webhook logger if configured
                        if (client.logger && newRetryCount >= 5) {
                            try {
                                const webhooklogger = new WebhookClient({ url: client.logger });
                                await webhooklogger.send({
                                    content: `[Auto Reddit] Removed invalid webhook for guild ${guildId}: ${error.message}`
                                });
                            } catch (logError) {
                                console.error('[Auto Reddit] Failed to log to webhook logger:', logError.message);
                            }
                        }
                    }
                }));
                
            } catch (dbError) {
                console.error('[Auto Reddit] Database error:', dbError.message);
            }
            
        } catch (error) {
            console.error('[Auto Reddit] Critical error in webhook_reddit_sender:', error.message);
            
            // Optional: Log critical errors to webhook if configured
            if (client.er_webhook) {
                try {
                    const errorWebhook = new WebhookClient({ url: client.er_webhook });
                    await errorWebhook.send({
                        content: `[Auto Reddit] Critical error: ${error.message}`
                    });
                } catch (webhookError) {
                    console.error('[Auto Reddit] Failed to send error to webhook:', webhookError.message);
                }
            }
        }
    }
}
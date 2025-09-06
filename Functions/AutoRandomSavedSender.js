const db = require("../settings/models/AutoNudeSender")
const { EmbedBuilder, ApplicationCommandOptionType, PermissionsBitField, ChannelType, WebhookClient } = require("discord.js");
var { video } = require('../videos.json')

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

//this function is free
module.exports = {
    webhook_saved_sender: async function (client) {
        var content = `${video[Math.floor(Math.random() * video.length)]}`

        try {
            const webhooks = await db.find();

            if (webhooks.length === 0) {
                console.log("[Auto Video saved] No webhooks found in database");
                return;
            }

            await Promise.all(webhooks.map(async (webhookData) => {
                const { channelId, webhook, _id } = webhookData;
                const webhookKey = webhook || _id.toString();

                // Skip disabled webhooks
                if (disabledWebhooks.has(webhookKey)) {
                    return;
                }

                // Check retry count
                const retryCount = retryTracker.get(webhookKey) || 0;
                if (retryCount >= 5) {
                    console.log(`[Auto Video saved] Webhook ${channelId} disabled after 5 failed attempts`);
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
                        throw new Error('Channel not found');
                    }

                    const web = new WebhookClient({ url: webhook });

                    await web.send({ 
                        content: `**Random Content**[⠀](${content})`,
                        username: client.user.username,
                        avatarURL: client.user.displayAvatarURL()
                    });

                    console.log(`[Auto Video saved] sent in ${channel.id} (${channel.name})`);
                    // Reset retry count on success
                    retryTracker.delete(webhookKey);

                } catch (error) {
                    const newRetryCount = retryCount + 1;
                    retryTracker.set(webhookKey, newRetryCount);
                    
                    console.error(`[Auto Video saved] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                    
                    // If this was the 5th attempt, disable the webhook
                    if (newRetryCount >= 5) {
                        console.log(`[Auto Video saved] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                        disabledWebhooks.add(webhookKey);
                        retryTracker.delete(webhookKey);
                    } else {
                        console.log(`[Auto Video saved] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                    }
                }
            }));
        } catch (e) {
            console.log("[Auto Video saved] General error:", e.message);
        }
    }
}
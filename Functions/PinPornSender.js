//main auto nude sender
const db = require("../settings/models/AutoNudeSender")
const { EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, WebhookClient, AttachmentBuilder } = require("discord.js");
const { pinporn_requester } = require("./others/pinporn_requester");
const request = require("request")
const pinporncategory = require("./others/pinporn_categories")
const randomSubreddit = pinporncategory();
require("dotenv").config();

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

module.exports = {
    webhook_pinporn_sender: async function (client) {

        const url = `https://pin.porn/api/videoInfo/?tag_id=${randomSubreddit.id}/&ipp=${Math.floor(Math.random() * 45) + 1}&from_page=${Math.floor(Math.random() * 20) + 1}`;
        const headers = {
            'User-Agent': process.env.pinporn_agent,
        };


        pinporn_requester(url, headers, async (error, responseData) => {
            if (error) {
                console.error('[PINPORN] API Error:', error.message);
                return;
            }

            // Validate response data
            if (!responseData || !responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
                console.error('[PINPORN] Invalid or empty response data');
                return;
            }

            try {
                const webhooks = await db.find();

                if (webhooks.length === 0) {
                    console.log("[PINPORN] No webhooks found in database");
                    return;
                }

                const file = new AttachmentBuilder()
                    .setFile(responseData.data[0].link)
                    .setName('Aurora.mp4')

                const embed = new EmbedBuilder()
                    .setDescription(responseData.data[0].title)
                    .setColor(process.env.EMBED_COLOR)


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
                        console.log(`[PINPORN] Webhook ${channelId} disabled after 5 failed attempts`);
                        disabledWebhooks.add(webhookKey);
                        retryTracker.delete(webhookKey);
                        return;
                    }

                    try {
                        // Validate webhook URL format
                        if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
                            throw new Error('Invalid webhook URL format');
                        }

                        const web = new WebhookClient({ url: webhook });

                        await web.send({ 
                            embeds: [embed], 
                            files: [file],
                            username: client.user.username,
                            avatarURL: client.user.displayAvatarURL()
                        }).then(message => {
                            const attachmentLinks = message.attachments.map(attachment => attachment.url);
                            console.log("Attachment Links:", attachmentLinks);
                            const urlObject = new URL(attachmentLinks);
                            const baseURL = urlObject.origin + urlObject.pathname;
                            const emojis = ["😈", "🌶️", "❤️", "🔥"];
                            const re = emojis[Math.floor(Math.random() * emojis.length)];
                            const btns = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel("Download")
                                        .setURL(baseURL)
                                        .setEmoji(`${re}`)
                                        .setStyle(ButtonStyle.Link));

                            web.send({ 
                                components: [btns],
                                username: client.user.username,
                                avatarURL: client.user.displayAvatarURL()
                            })
                        });

                        console.log(`[PINPORN] sended in guilds !`);
                        // Reset retry count on success
                        retryTracker.delete(webhookKey);

                    } catch (error) {
                        const newRetryCount = retryCount + 1;
                        retryTracker.set(webhookKey, newRetryCount);
                        
                        console.error(`[PINPORN] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                        
                        if (newRetryCount >= 5) {
                            console.log(`[PINPORN] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                            disabledWebhooks.add(webhookKey);
                            retryTracker.delete(webhookKey);
                        } else {
                            console.log(`[PINPORN] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                        }
                    }

                }));
            } catch (e) {
                console.log("[PINPORN] General error:", e.message);
            }
        });
    }

}
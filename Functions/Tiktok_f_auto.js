const db = require("../settings/models/AutoFeeds")
const { EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, WebhookClient, AttachmentBuilder } = require("discord.js");
const { fikfud_requester } = require("./others/FiqFuq_requester");
require("dotenv").config();
const alertedChannelsData = require("../alertedChannels.json")
const fs = require('fs');

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

//this function premium
module.exports = {
    webhook_tiktok_fiqfuq_auto_requester: async function (client) {
        try {
            const webhooks = await db.find();

            if (webhooks.length === 0) {
                console.log("[FIQFUQ TikTok] No webhooks found in database");
                return;
            }

            await Promise.all(webhooks.map(async (webhookData) => {
                const { channelId, webhook, contenttype, guildId, _id } = webhookData;
                const webhookKey = webhook || _id.toString();

                // Skip disabled webhooks
                if (disabledWebhooks.has(webhookKey)) {
                    return;
                }

                // Check retry count
                const retryCount = retryTracker.get(webhookKey) || 0;
                if (retryCount >= 5) {
                    console.log(`[FIQFUQ TikTok] Webhook ${channelId} disabled after 5 failed attempts`);
                    disabledWebhooks.add(webhookKey);
                    retryTracker.delete(webhookKey);
                    return;
                }
                const url = 'https://fiqfuq.com/api';
                const headers = {
                    'User-Agent': `${process.env.USERAGENT}`,
                };
                let group = ''
                let discover = 'tiktok'
                let a_type = 'discover'
                let rn_s = Math.floor(Math.random() * 5) + 1

                fikfud_requester(url, group, discover, a_type, rn_s, headers, async (error, responseData) => {
                    if (error) {
                        const newRetryCount = retryCount + 1;
                        retryTracker.set(webhookKey, newRetryCount);
                        console.error(`[FIQFUQ TikTok] API Error - Retry ${newRetryCount}/5 for ${channelId}:`, error.message);
                        
                        if (newRetryCount >= 5) {
                            console.log(`[FIQFUQ TikTok] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                            disabledWebhooks.add(webhookKey);
                            retryTracker.delete(webhookKey);
                        }
                        return;
                    }

                    try {
                        // Validate webhook URL format
                        if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
                            throw new Error('Invalid webhook URL format');
                        }

                        // Validate response data
                        if (!responseData || !Array.isArray(responseData) || responseData.length === 0) {
                            throw new Error('Invalid API response data');
                        }

                        const channel = await client.channels.fetch(channelId).catch(() => null);
                        if (!channel) {
                            throw new Error('Channel not found');
                        }

                        const web = new WebhookClient({ url: webhook });
                        const ran = Math.floor(Math.random() * responseData.length);
                        
                        // Validate video data
                        if (!responseData[ran] || !responseData[ran].video_url) {
                            throw new Error('Invalid video data in API response');
                        }

                        const mainf = new AttachmentBuilder(responseData[ran].video_url, 'Aurora.mp4');

                        const embed = new EmbedBuilder()
                            .setDescription(`${responseData[ran].description ?? "none"}`)
                            .setColor(client.color)

                        await web.send({
                            content: "**🔥️ Nsfw TikTok**",
                            embeds: [embed], files: [mainf]
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

                            web.send({ components: [btns] })
                        });

                        console.log(`[FIQFUQ TikTok] sended in ${channel.id} (${channel.name})`);
                        // Reset retry count on success
                        retryTracker.delete(webhookKey);

                    } catch (error) {
                        const newRetryCount = retryCount + 1;
                        retryTracker.set(webhookKey, newRetryCount);
                        
                        console.error(`[FIQFUQ TikTok] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                        
                        if (newRetryCount >= 5) {
                            console.log(`[FIQFUQ TikTok] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                            disabledWebhooks.add(webhookKey);
                            retryTracker.delete(webhookKey);
                        } else {
                            console.log(`[FIQFUQ TikTok] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                        }
                    }
                })
            }));
        } catch (e) {
            console.log("[FIQFUQ TikTok] General error:", e.message);
        }
    }
}
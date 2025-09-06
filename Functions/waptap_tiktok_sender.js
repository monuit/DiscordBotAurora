//free auto tiktok (waptap) sender
const db = require("../settings/models/AutoNudeSender")
const { EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, WebhookClient, AttachmentBuilder } = require("discord.js");
const { request_site } = require("./others/one_requester");
const ranwaptappers = require("./others/waptap_tiktok_categories")
const rangot = ranwaptappers();
require("dotenv").config();

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

module.exports = {
    webhook_tiktok_waptap: async function (client) {
        //check waptap to have more changes here if you need
        let ran = Math.floor(Math.random() * 4) + 1
        const url = `https://api1.waptap.com/v1/user/${rangot.name}/media?page=${ran}`;
        const headers = {
            'Accept': "*/*",
            'Accept-Encoding': 'deflate',
            'Accept-Language': 'en-US,en;q=0.5',
            'Alt-Used': 'api1.waptap.com',
            'Connection': 'keep-alive',
            'Cookie': client.waptap_cookie,
            'Host': 'api1.waptap.com',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': process.env.WAPTAP_AGENT,
        };

        request_site(url, headers, async (error, responseData) => {
            if (error) {
                console.error('[Waptap TikTok] Error:', error.message);
                return;
            }

            // Validate response data structure
            if (!responseData || !responseData.data || !responseData.data.items || 
                !Array.isArray(responseData.data.items) || responseData.data.items.length === 0) {
                console.log('[Waptap TikTok] Invalid or empty response data, skipping...');
                return;
            }

            const ri = Math.floor(Math.random() * responseData.data.items.length);
            const ranres = responseData.data.items[ri];

            // Validate selected item has required properties
            if (!ranres || !ranres.file) {
                console.log('[Waptap TikTok] Selected item missing file property, skipping...');
                return;
            }

            try {
                const webhooks = await db.find();

                if (webhooks.length === 0) {
                    console.log("[WAPTAP TIKTOK] No webhooks found in database");
                    return;
                }

                const file = new AttachmentBuilder()
                if (ranres.file.endsWith(".mp4")) {
                    file.setFile(ranres.file)
                        .setName("Aurora.mp4");
                } else {
                    file.setFile(ranres.file)
                        .setName("Aurora.png");
                }

                const embed = new EmbedBuilder()
                    .setDescription(`${ranres.description} || "none"`)
                    .setColor(client.color)


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
                        console.log(`[WAPTAP TIKTOK] Webhook ${channelId} disabled after 5 failed attempts`);
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

                        console.log(`[WAPTAP TIKTOK] sended in guilds !`);
                        // Reset retry count on success
                        retryTracker.delete(webhookKey);

                    } catch (error) {
                        const newRetryCount = retryCount + 1;
                        retryTracker.set(webhookKey, newRetryCount);
                        
                        console.error(`[WAPTAP TIKTOK] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                        
                        if (newRetryCount >= 5) {
                            console.log(`[WAPTAP TIKTOK] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                            disabledWebhooks.add(webhookKey);
                            retryTracker.delete(webhookKey);
                        } else {
                            console.log(`[WAPTAP TIKTOK] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                        }
                    }

                }));
            } catch (e) {
                console.log("[WAPTAP TIKTOK] General error:", e.message);
            }




        });
    }

}
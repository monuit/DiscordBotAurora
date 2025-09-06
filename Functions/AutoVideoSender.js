//main auto nude sender
const db = require("../settings/models/AutoNudeSender")
const { EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, WebhookClient, AttachmentBuilder } = require("discord.js");
const { request_site } = require("./others/one_requester");
const request = require("request")
require("dotenv").config();
const APIErrorHandler = require('../utils/apiErrorHandler');

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

module.exports = {
    webhook_video_sender: async function (client) {

        const url = `https://api.hotscope.tv/videos/sort?sort=-date&page=${Math.floor(Math.random() * 20) + 1}`;
        const headers = {
            'User-Agent': process.env.HOTSCOPE_AGENT,
        };

        request_site(url, headers, async (error, responseData) => {
            if (error) {
                console.error('[Auto Video] Error:', error.message);
                return;
            }

            // Validate responseData
            if (!responseData || !Array.isArray(responseData) || responseData.length === 0) {
                console.error('[Auto Video] Invalid or empty response data');
                return;
            }

            const ri = Math.floor(Math.random() * responseData.length);
            const selectedItem = responseData[ri];
            
            // Validate selected item
            if (!selectedItem || !selectedItem.id) {
                console.error('[Auto Video] Selected item is invalid or missing id');
                return;
            }

            const randomId = selectedItem.id;
            //   console.log(randomId)

            const new_url = `https://api.hotscope.tv/videos/video/${randomId}`;
            const new_headers = {
                'User-Agent': process.env.HOTSCOPE_AGENT,

            };

            const new_options = {
                json: true,
                jsonReplacer: true,
                url: new_url,
                headers: new_headers
            };

            request(new_options, async (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    // console.log(body.video)
                    try {
                        const webhooks = await db.find();

                        if (webhooks.length === 0) {
                            console.log("[Auto Video] No webhooks found in database");
                            return;
                        }

                        const file = new AttachmentBuilder()
                            .setFile(body.video)
                            .setName("Aurora.mp4")

                        const embed = new EmbedBuilder()
                            .setDescription(`${body.title}`)
                            .setColor("ca2c2b")


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
                                console.log(`[Auto Video] Webhook ${channelId} disabled after 5 failed attempts`);
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

                                console.log(`[Auto Video] sended in guilds !`);
                                // Reset retry count on success
                                retryTracker.delete(webhookKey);

                            } catch (error) {
                                const newRetryCount = retryCount + 1;
                                retryTracker.set(webhookKey, newRetryCount);
                                
                                console.error(`[Auto Video] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                                
                                if (newRetryCount >= 5) {
                                    console.log(`[Auto Video] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                                    disabledWebhooks.add(webhookKey);
                                    retryTracker.delete(webhookKey);
                                } else {
                                    console.log(`[Auto Video] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                                }
                            }

                        }));
                    } catch (e) {
                        console.log("[Auto Video] General error:", e.message);
                    }

                } else {
                    console.error('Error:', error);
                    console.log('Response status code:', response.statusCode);
                }
            });


        });
    },

    sendAutoVideo: async function () {
        try {
            const guilds = await APIErrorHandler.safeAPICall(
                () => db.find({}),
                'AutoVideoSender - Database Query'
            );

            if (!guilds) return;

            for (const guild of guilds) {
                try {
                    // Wrap each API call
                    const videoData = await APIErrorHandler.safeAPICall(
                        () => fetchVideoFromAPI(),
                        'AutoVideoSender - Video Fetch'
                    );

                    if (!videoData) {
                        console.log(`Skipping guild ${guild.guildId} - no video data`);
                        continue;
                    }

                    // Safe webhook send
                    const success = await APIErrorHandler.safeWebhookSend(guild.webhook, {
                        embeds: [videoEmbed],
                        content: videoData.url
                    });

                    if (!success) {
                        console.log(`Failed to send to guild ${guild.guildId}`);
                    }

                } catch (guildError) {
                    console.error(`Error processing guild ${guild.guildId}:`, guildError);
                    // Continue with next guild instead of crashing
                    continue;
                }
            }
        } catch (error) {
            console.error('Critical error in AutoVideoSender:', error);
        }
    }
}
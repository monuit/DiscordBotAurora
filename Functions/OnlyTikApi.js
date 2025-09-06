const db = require("../settings/models/AutoNudeSender")
const { EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, WebhookClient, AttachmentBuilder } = require("discord.js");
const { onlytik_requester } = require("./others/onlytik_requester");
const request = require("request")
require("dotenv").config();

module.exports = {
    webhook_onlytik_sender: async function (client) {

        const url = `https://onlytik.com/api/new-videos`;
        const headers = {
            'User-Agent': process.env.G_AGENT,
        };


        onlytik_requester(url, headers, async (error, responseData) => {
            if (error) {
                console.error('Error:', error.message);
                return;
            }
            try {
                const webhooks = await db.find();

                const file = new AttachmentBuilder()
                    .setFile(responseData[Math.floor(Math.random() * responseData.length)].url)
                    .setName('Aurora.mp4')


                await Promise.all(webhooks.map(async (webhookData) => {
                    const { channelId, webhook } = webhookData;

                    try {
                        const web = new WebhookClient({ url: webhook });

                        await web.send({ 
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
                        })
                        console.log(`[ONLYTIK] sended in guilds !`);
                    } catch (error) {
                        console.error(`[ONLYTIK] error cant send:`, error.message);
                        
                        // If webhook is unknown/invalid, remove it from database
                        if (error.code === 10015) { // Unknown Webhook
                            try {
                                await db.deleteOne({ webhook: webhook });
                                console.log(`[ONLYTIK] Removed invalid webhook from database: ${webhook}`);
                            } catch (dbError) {
                                console.error(`[ONLYTIK] Failed to remove invalid webhook:`, dbError.message);
                            }
                        }
                    }

                }))
            } catch (e) {
                console.log(e)
            }
        });
    }

}
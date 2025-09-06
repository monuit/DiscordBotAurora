const db = require("../settings/models/AutoLeftRight")
const { EmbedBuilder, ApplicationCommandOptionType, PermissionsBitField, ChannelType, WebhookClient } = require("discord.js");
const alertedChannelsData = require("../alertedChannels.json")
const fs = require('fs');

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

//this function is premium
module.exports = {
    webhook_leftandright_reddit_sender: async function (client) {
        let randomSubreddit = 'Ifyouhadtopickone';
        let json = await fetch(`https://www.reddit.com/r/${randomSubreddit}/random/.json`, {
            method: 'GET',
            headers: {
                'User-Agent': process.env.G_AGENT,
                'Authorization': `Bearer `// i think reddit shit down some times so i add this
            },
        })
            .then(r => r.json())
            .catch(error => {
                console.log('[Left-Right Reddit] Fetch error:', error.message);
                return null;
            });

        // Validate Reddit API response
        if (!json || !Array.isArray(json) || json.length === 0 || 
            !json[0] || !json[0].data || !json[0].data.children || 
            json[0].data.children.length === 0 || !json[0].data.children[0].data) {
            console.log('[Left-Right Reddit] Invalid or empty Reddit response, skipping...');
            return;
        }

        let permalink = json[0].data.children[0].data.permalink;
        let posturl = `https://reddit.com${permalink}`;
        let postimage = json[0].data.children[0].data.url;
        let posttitle = json[0].data.children[0].data.title;
        let postup = json[0].data.children[0].data.ups;
        let postcomments = json[0].data.children[0].data.num_comments;


        try {
            const webhooks = await db.find();

            if (webhooks.length === 0) {
                console.log("[Auto Left right Reddit] No webhooks found in database");
                return;
            }

            await Promise.all(webhooks.map(async (webhookData) => {
                const { channelId, webhook, guildId, _id } = webhookData;
                const webhookKey = webhook || _id.toString();

                // Skip disabled webhooks
                if (disabledWebhooks.has(webhookKey)) {
                    return;
                }

                // Check retry count
                const retryCount = retryTracker.get(webhookKey) || 0;
                if (retryCount >= 5) {
                    console.log(`[Auto Left right Reddit] Webhook ${channelId} disabled after 5 failed attempts`);
                    disabledWebhooks.add(webhookKey);
                    retryTracker.delete(webhookKey);
                    return;
                }

                try {
                    const gotguild = await client.guilds.fetch(guildId);
                    const guildss = client.premiums.get(gotguild.id);

                    if (guildss && guildss.isPremium) {
                        // Validate webhook URL format
                        if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
                            throw new Error('Invalid webhook URL format');
                        }

                        const channel = await client.channels.fetch(channelId).catch(() => null);
                        if (!channel) {
                            throw new Error('Channel not found');
                        }

                        const web = new WebhookClient({ url: webhook });
                        
                        //use a shit spoiler to cover images or files
                        const message = await web.send({ 
                            content: `${client.spoiler}${postimage}`,
                            username: client.user.username,
                            avatarURL: client.user.displayAvatarURL()
                        }).then(async sendedmessage => {
                            const targetChannel = channel;
                            await targetChannel.messages.fetch({ message: sendedmessage.id }).then((r) => {
                                try {
                                    const lemoji = '👈';
                                    const remoji = '👉';
                                    const icant = '🥵';

                                    r.react(lemoji);
                                    r.react(remoji);
                                    r.react(icant);
                                    r.react("❤️");
                                } catch (e) { 
                                    console.log(`cant add reaction to some channel with id ${sendedmessage.id} and channel id :${targetChannel} er was ${e}`);
                                }
                            });
                        });

                        console.log(`[Auto Left right Reddit] sended in ${channel.id} (${channel.name})`);
                        // Reset retry count on success
                        retryTracker.delete(webhookKey);

                    } else {
                        const ch = await client.channels.fetch(channelId);
                        if (alertedChannelsData.alertedChannels.includes(ch.id)) {
                            console.log('we have sended alert already');
                        } else {
                            // Send the alert message
                            const embed = new EmbedBuilder()
                                .setTitle("Your premium subscription has expired")
                                .setColor(client.color)
                                .setImage(client.image)
                                .setDescription(`Premium features are currently disabled. To renew premium status and regain access to premium features, please join our [support server](${client.support})`);
                            ch.send({ embeds: [embed] });

                            alertedChannelsData.alertedChannels.push(ch.id);
                            fs.writeFileSync('./alertedChannels.json', JSON.stringify(alertedChannelsData, null, 2));
                        }
                    }

                } catch (error) {
                    const newRetryCount = retryCount + 1;
                    retryTracker.set(webhookKey, newRetryCount);
                    
                    console.error(`[Auto Left right Reddit] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                    
                    if (newRetryCount >= 5) {
                        console.log(`[Auto Left right Reddit] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                        disabledWebhooks.add(webhookKey);
                        retryTracker.delete(webhookKey);
                    } else {
                        console.log(`[Auto Left right Reddit] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                    }
                }
            }));
        } catch (e) {
            console.log("[Auto Left right Reddit] General error:", e.message);
        }
    }
}
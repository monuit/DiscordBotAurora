const db = require("../settings/models/AutoFeeds");

// Track retry attempts and disabled webhooks
const retryTracker = new Map();
const disabledWebhooks = new Set();

module.exports = {
    webhook_auto_feed_sender: async function (client) {
        try {
            const webhooks = await db.find({ isActive: { $ne: false } });
            console.log(`[Auto Feed] Found ${webhooks.length} active webhook configurations`);

            if (webhooks.length === 0) {
                console.log('[Auto Feed] No active webhooks found in database');
                return;
            }

            await Promise.all(webhooks.map(async (webhookData) => {
                const { channelId, webhook, contenttype, guildId, lastPost, _id } = webhookData;
                const webhookKey = webhook || _id.toString();

                // Skip disabled webhooks
                if (disabledWebhooks.has(webhookKey)) {
                    return;
                }

                // Check retry count
                const retryCount = retryTracker.get(webhookKey) || 0;
                if (retryCount >= 5) {
                    console.log(`[Auto Feed] Webhook ${channelId} disabled after 5 failed attempts`);
                    disabledWebhooks.add(webhookKey);
                    retryTracker.delete(webhookKey);
                    return;
                }

                try {
                    // Validate webhook URL format
                    if (!webhook || !webhook.includes('discord.com/api/webhooks/')) {
                        throw new Error('Invalid webhook URL format');
                    }

                    const { channelId, webhook, contenttype, guildId, lastPost } = webhookData;
                    
                    // Check if enough time has passed since last post (5-20 minutes)
                    const now = new Date();
                    const timeSinceLastPost = now - (lastPost || new Date(0));
                    const minInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
                    
                    if (timeSinceLastPost < minInterval) {
                        console.log(`[Auto Feed] Skipping ${guildId}/${channelId} - too soon (${Math.round(timeSinceLastPost/1000/60)} min ago)`);
                        return;
                    }

                    const gotguild = await client.guilds.fetch(guildId).catch(() => null);
                    if (!gotguild) {
                        console.log(`[Auto Feed] Guild ${guildId} not found, removing from database`);
                        await db.findByIdAndDelete(webhookData._id);
                        return;
                    }

                    // For self-hosted bot - treat all guilds as premium
                    console.log(`[Auto Feed] Processing auto-post for ${gotguild.name} (${contenttype})`);
                    
                    // Use Reddit-based content for self-hosted bot
                    await this.sendRedditContent(webhook, contenttype, webhookData._id);
                    
                    // Reset retry count on success
                    retryTracker.delete(webhookKey);
                    
                } catch (error) {
                    const newRetryCount = retryCount + 1;
                    retryTracker.set(webhookKey, newRetryCount);
                    
                    console.error(`[Auto Feed] Retry ${newRetryCount}/5 failed for ${channelId}:`, error.message);
                    
                    if (newRetryCount >= 5) {
                        console.log(`[Auto Feed] FINAL FAILURE: Disabling webhook ${channelId} after 5 failed attempts`);
                        disabledWebhooks.add(webhookKey);
                        retryTracker.delete(webhookKey);
                    } else {
                        console.log(`[Auto Feed] Will retry webhook ${channelId} in next cycle (${5 - newRetryCount} attempts remaining)`);
                    }
                }
            }));
        } catch (error) {
            console.error('[Auto Feed] General error:', error);
        }
    },

    sendRedditContent: async function(webhookUrl, contentType, webhookId) {
        try {
            const { WebhookClient } = require("discord.js");
            const { safeRedditFetch } = require("./redditHelper");
            
            // Map content types to Reddit subreddits
            const contentMap = {
                'reddit': ['gonewild', 'nsfw', 'realgirls', 'collegesluts'],
                'amateur': ['amateur', 'realgirls', 'gonewild', 'homemadexxx'],
                'asian': ['asians', 'asiansgonewild', 'asiangoodness'],
                'milf': ['milf', 'gonewild30plus', 'maturemilf'],
                'anal': ['anal', 'analgw', 'painal'],
                'boobs': ['boobs', 'naturaltitties', 'bigboobsgw'],
                'lesbian': ['lesbians', 'dykesgonewild', 'girlsway'],
                'hentai': ['hentai', 'rule34', 'ecchi'],
                'pussy': ['pussy', 'pussyperfection', 'pussyrating'],
                'ass': ['ass', 'asstastic', 'pawg'],
                'feet': ['feet', 'feetpics', 'footfetish'],
                'bdsm': ['bdsm', 'bondage', 'femdom'],
                'cum': ['cumsluts', 'cumshots', 'creampies'],
                'public': ['publicflashing', 'holdthemoan', 'publicsex'],
                'thick': ['thick', 'pawg', 'chubby'],
                'teens': ['legalteens', 'collegesluts', 'barelylegal'],
                'celebrity': ['celebnsfw', 'celebs', 'celebfakes']
            };

            const subreddits = contentMap[contentType] || contentMap['reddit'];
            const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
            
            console.log(`[Auto Reddit] Starting fetch for r/${randomSubreddit}`);
            const redditData = await safeRedditFetch(`r/${randomSubreddit}`);
            
            if (!redditData) {
                console.log('[Auto Reddit] No valid content found');
                return;
            }

            // Get a random avatar image from the same subreddit
            const avatarData = await this.getRandomAvatarFromSubreddit(randomSubreddit);
            const webhookAvatar = avatarData || 'https://cdn.discordapp.com/icons/1313582020310990910/a_4c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c.gif';

            const webhookClient = new WebhookClient({ url: webhookUrl });
            const { postimage, posttitle, postup, postcomments, permalink } = redditData;

            // Add some random spicy emojis for variety
            const spicyEmojis = ["🔥", "💋", "😈", "🌶️", "💦", "🍑", "❤️‍🔥"];
            const randomEmoji = spicyEmojis[Math.floor(Math.random() * spicyEmojis.length)];

            await webhookClient.send({
                content: `${randomEmoji} **[${randomSubreddit}] • ${posttitle}**\n👍 ${postup} | 💬 ${postcomments}\n[⠀](${postimage})`,
                username: 'Aurora Auto-Post',
                avatarURL: webhookAvatar
            });

            // Update last post time and increment counter
            await db.findByIdAndUpdate(webhookId, { 
                lastPost: new Date(),
                $inc: { totalPosts: 1 }
            });

            console.log(`[Auto Reddit] Successfully posted content from r/${randomSubreddit} with avatar: ${webhookAvatar}`);

        } catch (error) {
            console.error('[Auto Reddit] Error sending content:', error);
        }
    },

    getRandomAvatarFromSubreddit: async function(subreddit) {
        try {
            const { safeRedditFetch } = require("./redditHelper");
            
            // Try to get a different post for avatar
            const avatarData = await safeRedditFetch(`r/${subreddit}`);
            
            if (avatarData && avatarData.postimage) {
                // Check if it's an image URL (not video)
                const imageUrl = avatarData.postimage;
                if (imageUrl && (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png') || imageUrl.includes('.gif'))) {
                    console.log(`[Avatar] Using ${imageUrl} from r/${subreddit}`);
                    return imageUrl;
                }
            }
            
            // Fallback to default Aurora avatar
            return null;
            
        } catch (error) {
            console.log(`[Avatar] Failed to get avatar from r/${subreddit}:`, error.message);
            return null;
        }
    }
}

const db = require("../settings/models/AutoFeeds");

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
                try {
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
                    
                } catch (error) {
                    console.error(`[Auto Feed] Error processing webhook ${webhookData._id}:`, error);
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

            const webhookClient = new WebhookClient({ url: webhookUrl });
            const { postimage, posttitle, postup, postcomments, permalink } = redditData;

            // Add some random spicy emojis for variety
            const spicyEmojis = ["🔥", "💋", "😈", "🌶️", "💦", "🍑", "❤️‍🔥"];
            const randomEmoji = spicyEmojis[Math.floor(Math.random() * spicyEmojis.length)];

            await webhookClient.send({
                content: `${randomEmoji} **[${randomSubreddit}] • ${posttitle}**\n👍 ${postup} | 💬 ${postcomments}\n[⠀](${postimage})`,
                username: 'Aurora Auto-Post',
                avatarURL: 'https://cdn.discordapp.com/icons/1313582020310990910/a_4c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c.gif'
            });

            // Update last post time and increment counter
            await db.findByIdAndUpdate(webhookId, { 
                lastPost: new Date(),
                $inc: { totalPosts: 1 }
            });

            console.log(`[Auto Reddit] Successfully posted content from r/${randomSubreddit}`);

        } catch (error) {
            console.error('[Auto Reddit] Error sending content:', error);
        }
    }
}

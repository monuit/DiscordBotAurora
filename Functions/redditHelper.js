const { EmbedBuilder } = require("discord.js");

// Enhanced user agents that work better with Reddit
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "DiscordBot/1.0 (+https://discord.com/)"
];

// Fallback subreddits for when primary ones fail
const FALLBACK_SUBREDDITS = {
    'gonewild': ['RealGirls', 'Amateur'],
    'pussy': ['ass', 'boobs'],
    'anal': ['ass', 'Amateur'],
    'asian': ['AsiansGoneWild', 'AsianHotties'],
    'milf': ['Amateur', 'RealGirls'],
    'teen': ['LegalTeens', 'Amateur'],
    'gay': ['gaybrosgonewild', 'gaybears'],
    'feet': ['legs', 'Amateur'],
    'cum': ['cumsluts', 'Amateur'],
    'blowjob': ['Amateur', 'RealGirls']
};

/**
 * Get a random user agent
 */
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get fallback subreddit if the primary one fails
 */
function getFallbackSubreddit(originalSubreddit) {
    const fallbacks = FALLBACK_SUBREDDITS[originalSubreddit.toLowerCase()];
    if (fallbacks && fallbacks.length > 0) {
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    return 'Amateur'; // Ultimate fallback
}

/**
 * Enhanced Reddit fetch with multiple endpoints and fallbacks
 */
async function enhancedRedditFetch(subreddit, client, retryCount = 0) {
    const maxRetries = 3;
    const endpoints = [
        `https://www.reddit.com/r/${subreddit}/hot/.json?limit=25`,
        `https://www.reddit.com/r/${subreddit}/new/.json?limit=25`, 
        `https://www.reddit.com/r/${subreddit}/top/.json?t=day&limit=25`,
        `https://www.reddit.com/r/${subreddit}/.json?limit=25`
    ];
    
    for (const endpoint of endpoints) {
        try {
            const userAgent = process.env.REDDIT_AGENT || process.env.G_AGENT || getRandomUserAgent();
            
            console.log(`[Reddit] Attempting ${endpoint}`);
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 403) {
                console.log(`[Reddit] 403 Forbidden for r/${subreddit}, trying different endpoint...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                continue;
            }

            if (response.status === 404) {
                console.log(`[Reddit] 404 Not Found for r/${subreddit}, subreddit may not exist`);
                continue;
            }

            if (response.status === 429) {
                console.log(`[Reddit] Rate limited, waiting before retry...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }

            if (!response.ok) {
                console.log(`[Reddit] HTTP ${response.status} for r/${subreddit}`);
                continue;
            }

            const json = await response.json();
            
            // Validate response structure
            if (!json || !json.data || !json.data.children || !Array.isArray(json.data.children)) {
                console.log(`[Reddit] Invalid response structure for r/${subreddit}`);
                continue;
            }

            const posts = json.data.children.filter(post => 
                post.data && 
                post.data.url && 
                post.data.title && 
                !post.data.is_self && // Exclude text posts
                !post.data.stickied && // Exclude pinned posts
                post.data.over_18 !== false // Ensure NSFW content
            );

            if (posts.length === 0) {
                console.log(`[Reddit] No valid posts found in r/${subreddit}`);
                continue;
            }

            // Get random post from available posts
            const randomPost = posts[Math.floor(Math.random() * posts.length)];
            const postData = randomPost.data;

            // Validate post data
            if (!postData.permalink || !postData.url || !postData.title) {
                console.log(`[Reddit] Invalid post data for r/${subreddit}`);
                continue;
            }

            // Check if URL is a direct image/video
            const url = postData.url;
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];
            const isDirectMedia = validExtensions.some(ext => url.toLowerCase().includes(ext)) || 
                                 url.includes('i.redd.it') || 
                                 url.includes('i.imgur.com') ||
                                 url.includes('v.redd.it') ||
                                 url.includes('gfycat.com') ||
                                 url.includes('redgifs.com');

            if (!isDirectMedia) {
                console.log(`[Reddit] Post URL is not direct media, trying next...`);
                // Try next post if available
                const nextPost = posts.find(p => {
                    const nextUrl = p.data.url;
                    return validExtensions.some(ext => nextUrl.toLowerCase().includes(ext)) || 
                           nextUrl.includes('i.redd.it') || 
                           nextUrl.includes('i.imgur.com') ||
                           nextUrl.includes('v.redd.it') ||
                           nextUrl.includes('gfycat.com') ||
                           nextUrl.includes('redgifs.com');
                });
                
                if (nextPost) {
                    const nextPostData = nextPost.data;
                    console.log(`[Reddit] Found direct media post in r/${subreddit}`);
                    return {
                        subreddit: subreddit,
                        permalink: nextPostData.permalink,
                        posturl: `https://reddit.com${nextPostData.permalink}`,
                        postimage: nextPostData.url,
                        posttitle: nextPostData.title,
                        postup: nextPostData.ups || 0,
                        postcomments: nextPostData.num_comments || 0,
                        nsfw: nextPostData.over_18 || true
                    };
                }
                continue;
            }

            console.log(`[Reddit] Successfully fetched from r/${subreddit}`);
            
            return {
                subreddit: subreddit,
                permalink: postData.permalink,
                posturl: `https://reddit.com${postData.permalink}`,
                postimage: postData.url,
                posttitle: postData.title,
                postup: postData.ups || 0,
                postcomments: postData.num_comments || 0,
                nsfw: postData.over_18 || true
            };

        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`[Reddit] Request timeout for ${endpoint}`);
            } else {
                console.error(`[Reddit] Error with endpoint ${endpoint}:`, error.message);
            }
            continue;
        }
    }

    // If all endpoints failed, try fallback subreddit
    if (retryCount < maxRetries) {
        const fallbackSub = getFallbackSubreddit(subreddit);
        if (fallbackSub !== subreddit) {
            console.log(`[Reddit] Trying fallback subreddit: r/${fallbackSub}`);
            return enhancedRedditFetch(fallbackSub, client, retryCount + 1);
        }
    }

    return null;
}

/**
 * Safely fetch a random Reddit post with enhanced error handling and fallbacks
 * @param {string} subreddit - The subreddit to fetch from
 * @param {Object} client - The Discord client
 * @returns {Object|null} - Reddit post data or null if failed
 */
async function safeRedditFetch(subreddit, client) {
    try {
        console.log(`[Reddit] Starting fetch for r/${subreddit}`);
        
        // Try enhanced fetch first
        const result = await enhancedRedditFetch(subreddit, client);
        
        if (result) {
            return result;
        }

        // If enhanced fetch failed, try the original random endpoint as last resort
        try {
            const userAgent = process.env.REDDIT_AGENT || process.env.G_AGENT || getRandomUserAgent();
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/random/.json`, {
                method: 'GET',
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json',
                },
                timeout: 5000
            });

            if (response.ok) {
                const json = await response.json();
                if (json && json[0] && json[0].data && json[0].data.children && json[0].data.children[0]) {
                    const postData = json[0].data.children[0].data;
                    if (postData.permalink && postData.url && postData.title) {
                        console.log(`[Reddit] Fallback random endpoint worked for r/${subreddit}`);
                        return {
                            subreddit: subreddit,
                            permalink: postData.permalink,
                            posturl: `https://reddit.com${postData.permalink}`,
                            postimage: postData.url,
                            posttitle: postData.title,
                            postup: postData.ups || 0,
                            postcomments: postData.num_comments || 0,
                            nsfw: postData.over_18 || true
                        };
                    }
                }
            }
        } catch (randomError) {
            console.error(`[Reddit] Random endpoint also failed for r/${subreddit}:`, randomError.message);
        }

        console.log(`[Reddit] All methods failed for r/${subreddit}`);
        return null;
        
    } catch (error) {
        console.error(`[Reddit] Critical error fetching from r/${subreddit}:`, error.message);
        return null;
    }
}

/**
 * Create a Reddit API error embed
 * @param {Object} client - The Discord client
 * @returns {EmbedBuilder} - Error embed
 */
function createRedditErrorEmbed(client) {
    return new EmbedBuilder()
        .setDescription(`🔥 Reddit API is having issues right now or the subreddit is restricted\n\n[Support Server](${client.support || 'https://discord.gg/support'})`)
        .setColor(client.color || '#ff0000')
        .setFooter({ text: 'Try again in a few minutes' });
}

/**
 * Validate if a subreddit name is potentially valid
 */
function isValidSubredditName(subreddit) {
    if (!subreddit || typeof subreddit !== 'string') return false;
    if (subreddit.length < 1 || subreddit.length > 21) return false;
    if (!/^[a-zA-Z0-9_]+$/.test(subreddit)) return false;
    return true;
}

module.exports = {
    safeRedditFetch,
    createRedditErrorEmbed,
    enhancedRedditFetch,
    isValidSubredditName,
    getFallbackSubreddit
};

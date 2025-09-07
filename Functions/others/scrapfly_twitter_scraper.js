const { ScrapflyClient } = require('scrapfly-sdk');
const jmespath = require('jmespath');

class ScrapflyTwitterScraper {
    constructor() {
        this.client = new ScrapflyClient({ 
            key: 'scp-live-364232c310374474b9ddda5535e9b98c' 
        });
        
        // Category-specific search terms and hashtags
        this.categoryTerms = {
            amateur: ['amateur', 'homemade', 'real', 'couple', 'private'],
            anal: ['anal', 'assfuck', 'backdoor', 'buttfuck'],
            asian: ['asian', 'japanese', 'chinese', 'korean', 'thai'],
            babe: ['babe', 'hottie', 'beauty', 'gorgeous', 'stunning'],
            bbc: ['bbc', 'bigblackcock', 'interracial', 'black'],
            bbw: ['bbw', 'chubby', 'curvy', 'thick', 'voluptuous'],
            big_ass: ['bigass', 'phat', 'bubble', 'booty', 'thicc'],
            big_tits: ['bigtits', 'busty', 'boobs', 'tits', 'milf'],
            blonde: ['blonde', 'blond', 'fair', 'platinum'],
            blowjob: ['blowjob', 'oral', 'bj', 'sucking', 'deepthroat'],
            brunette: ['brunette', 'dark', 'brown'],
            creampie: ['creampie', 'cum', 'filled', 'internal'],
            cumshot: ['cumshot', 'facial', 'cum', 'jizz'],
            deepthroat: ['deepthroat', 'throatfuck', 'gagging', 'oral'],
            ebony: ['ebony', 'black', 'african', 'chocolate'],
            fetish: ['fetish', 'kink', 'bdsm', 'domination'],
            fingering: ['fingering', 'finger', 'touching', 'massage'],
            hardcore: ['hardcore', 'rough', 'intense', 'wild'],
            latina: ['latina', 'hispanic', 'spanish', 'mexican'],
            lesbian: ['lesbian', 'girls', 'sapphic', 'dyke'],
            masturbation: ['masturbation', 'solo', 'touching', 'playing'],
            milf: ['milf', 'mature', 'mom', 'cougar'],
            missionary: ['missionary', 'vanilla', 'classic', 'intimate'],
            redhead: ['redhead', 'ginger', 'auburn', 'red'],
            teen: ['teen', 'young', 'college', 'petite'],
            threesome: ['threesome', '3some', 'group', 'multiple']
        };

        // Random delay ranges (in milliseconds)
        this.delays = {
            min: 2000,
            max: 8000
        };

        // Proxy rotation settings
        this.countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR'];
        this.currentCountryIndex = 0;
    }

    /**
     * Get random delay to avoid detection
     */
    getRandomDelay() {
        return Math.floor(Math.random() * (this.delays.max - this.delays.min + 1)) + this.delays.min;
    }

    /**
     * Get next proxy country for rotation
     */
    getNextCountry() {
        const country = this.countries[this.currentCountryIndex];
        this.currentCountryIndex = (this.currentCountryIndex + 1) % this.countries.length;
        return country;
    }

    /**
     * Build search URL for Twitter based on category
     */
    buildSearchUrl(category) {
        const terms = this.categoryTerms[category] || this.categoryTerms.amateur;
        const randomTerm = terms[Math.floor(Math.random() * terms.length)];
        
        // Build Twitter search URL with media filter
        const query = encodeURIComponent(`${randomTerm} filter:media -filter:retweets`);
        return `https://twitter.com/search?q=${query}&src=typed_query&f=live`;
    }

    /**
     * Parse tweet data from GraphQL response
     */
    parseTweet(data) {
        try {
            const result = jmespath.search(
                `{
                    created_at: legacy.created_at,
                    attached_urls: legacy.entities.urls[].expanded_url,
                    attached_media: legacy.entities.media[].media_url_https,
                    video_info: legacy.extended_entities.media[].video_info,
                    tagged_hashtags: legacy.entities.hashtags[].text,
                    favorite_count: legacy.favorite_count,
                    retweet_count: legacy.retweet_count,
                    text: legacy.full_text,
                    user_id: legacy.user_id_str,
                    id: legacy.id_str,
                    user_screen_name: core.user_results.result.legacy.screen_name
                }`,
                data
            );

            return result;
        } catch (error) {
            console.log('[ScrapFly] Error parsing tweet:', error.message);
            return null;
        }
    }

    /**
     * Extract best quality media from tweet
     */
    extractBestMedia(tweetData) {
        if (!tweetData) return null;

        // Check for video first (higher priority)
        if (tweetData.video_info && tweetData.video_info.length > 0) {
            const videoInfo = tweetData.video_info[0];
            if (videoInfo.variants && videoInfo.variants.length > 0) {
                // Find highest bitrate MP4 video
                const mp4Videos = videoInfo.variants
                    .filter(v => v.content_type === 'video/mp4' && v.bitrate)
                    .sort((a, b) => b.bitrate - a.bitrate);
                
                if (mp4Videos.length > 0) {
                    return {
                        type: 'video',
                        url: mp4Videos[0].url,
                        bitrate: mp4Videos[0].bitrate
                    };
                }
            }
        }

        // Fallback to images
        if (tweetData.attached_media && tweetData.attached_media.length > 0) {
            return {
                type: 'image',
                url: tweetData.attached_media[0].replace(':small', ':large'), // Get larger size
                media_count: tweetData.attached_media.length
            };
        }

        return null;
    }

    /**
     * Scrape Twitter search results for category-relevant content
     */
    async scrapeTwitterContent(category) {
        try {
            const searchUrl = this.buildSearchUrl(category);
            const country = this.getNextCountry();
            
            console.log(`[ScrapFly] Searching Twitter for category: ${category}`);
            console.log(`[ScrapFly] Using proxy country: ${country}`);
            
            // Add random delay before request
            const delay = this.getRandomDelay();
            console.log(`[ScrapFly] Waiting ${delay}ms before request...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            const result = await this.client.scrape({
                url: searchUrl,
                render_js: true,
                asp: true, // Anti-scraping protection
                country: country,
                wait_for_selector: '[data-testid="tweet"]',
                wait: 3000, // Additional wait time
                timeout: 30000
            });

            // Extract GraphQL calls that contain tweet data
            const xhrCalls = result.scrape_result?.browser_data?.xhr_call || [];
            const tweetCalls = xhrCalls.filter(call => 
                call.url && (
                    call.url.includes('SearchTimeline') ||
                    call.url.includes('TweetResultByRestId') ||
                    call.url.includes('HomeTimeline')
                )
            );

            console.log(`[ScrapFly] Found ${tweetCalls.length} potential tweet API calls`);

            // Process each API call to find tweets with media
            for (const call of tweetCalls) {
                if (!call.response?.body) continue;

                try {
                    const data = JSON.parse(call.response.body);
                    const tweets = this.extractTweetsFromResponse(data);
                    
                    for (const tweet of tweets) {
                        const parsedTweet = this.parseTweet(tweet);
                        const media = this.extractBestMedia(parsedTweet);
                        
                        if (media && this.isRelevantContent(parsedTweet, category)) {
                            console.log(`[ScrapFly] Found relevant ${media.type} for category: ${category}`);
                            return {
                                url: media.url,
                                type: media.type,
                                tweet_url: `https://twitter.com/${parsedTweet.user_screen_name}/status/${parsedTweet.id}`,
                                user: parsedTweet.user_screen_name,
                                text: parsedTweet.text?.substring(0, 100) + '...',
                                engagement: {
                                    likes: parsedTweet.favorite_count || 0,
                                    retweets: parsedTweet.retweet_count || 0
                                }
                            };
                        }
                    }
                } catch (parseError) {
                    console.log('[ScrapFly] Error parsing API response:', parseError.message);
                    continue;
                }
            }

            console.log('[ScrapFly] No relevant media found in search results');
            return null;

        } catch (error) {
            console.log('[ScrapFly] Scraping error:', error.message);
            return null;
        }
    }

    /**
     * Extract tweets from various API response formats
     */
    extractTweetsFromResponse(data) {
        const tweets = [];

        // Try different paths where tweets might be located
        const possiblePaths = [
            'data.search_by_raw_query.search_timeline.timeline.instructions[].entries[].content.itemContent.tweet_results.result',
            'data.home.home_timeline_urt.instructions[].entries[].content.itemContent.tweet_results.result',
            'data.tweetResult.result',
            'data.threaded_conversation_with_injections_v2.instructions[].entries[].content.itemContent.tweet_results.result'
        ];

        for (const path of possiblePaths) {
            try {
                const results = jmespath.search(path, data);
                if (Array.isArray(results)) {
                    tweets.push(...results.filter(tweet => tweet && tweet.legacy));
                } else if (results && results.legacy) {
                    tweets.push(results);
                }
            } catch (error) {
                // Path doesn't exist, continue
                continue;
            }
        }

        // Additional extraction for timeline entries
        try {
            const instructions = data.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || 
                               data.data?.home?.home_timeline_urt?.instructions || [];
            
            for (const instruction of instructions) {
                if (instruction.entries) {
                    for (const entry of instruction.entries) {
                        if (entry.content?.itemContent?.tweet_results?.result?.legacy) {
                            tweets.push(entry.content.itemContent.tweet_results.result);
                        }
                    }
                }
            }
        } catch (error) {
            // Ignore extraction errors
        }

        return tweets;
    }

    /**
     * Check if content is relevant to the category
     */
    isRelevantContent(tweetData, category) {
        if (!tweetData || !tweetData.text) return false;

        const terms = this.categoryTerms[category] || this.categoryTerms.amateur;
        const text = tweetData.text.toLowerCase();
        const hashtags = (tweetData.tagged_hashtags || []).map(tag => tag.toLowerCase());
        
        // Check if any category terms appear in text or hashtags
        return terms.some(term => 
            text.includes(term.toLowerCase()) || 
            hashtags.some(tag => tag.includes(term.toLowerCase()))
        ) || hashtags.length > 0; // Or has any hashtags (likely NSFW content)
    }

    /**
     * Main method to get content for a category
     */
    async getRandomContent(category) {
        try {
            console.log(`[ScrapFly] Starting search for category: ${category}`);
            
            const content = await this.scrapeTwitterContent(category);
            
            if (content) {
                return content;
            }

            // Fallback to placeholder if no content found
            console.log('[ScrapFly] No content found, using fallback');
            return this.getFallbackContent(category);

        } catch (error) {
            console.log('[ScrapFly] Error in getRandomContent:', error.message);
            return this.getFallbackContent(category);
        }
    }

    /**
     * Fallback content when scraping fails
     */
    getFallbackContent(category) {
        const terms = this.categoryTerms[category] || this.categoryTerms.amateur;
        const randomTerm = terms[Math.floor(Math.random() * terms.length)];
        
        return {
            url: `https://pbs.twimg.com/media/placeholder_${randomTerm}.jpg`,
            type: 'image',
            tweet_url: `https://twitter.com/search?q=${encodeURIComponent(randomTerm)}`,
            user: 'ScrapFly_Search',
            text: `Content for ${category} category (${randomTerm})`,
            engagement: { likes: 0, retweets: 0 },
            fallback: true
        };
    }

    /**
     * Get content with retry mechanism
     */
    async getContentWithRetry(category, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[ScrapFly] Attempt ${attempt}/${maxRetries} for category: ${category}`);
                
                const content = await this.getRandomContent(category);
                
                if (content && !content.fallback) {
                    console.log(`[ScrapFly] Success on attempt ${attempt}`);
                    return content;
                }

                if (attempt < maxRetries) {
                    const retryDelay = this.getRandomDelay() * attempt;
                    console.log(`[ScrapFly] Retry in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

            } catch (error) {
                console.log(`[ScrapFly] Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    return this.getFallbackContent(category);
                }
            }
        }

        return this.getFallbackContent(category);
    }
}

module.exports = ScrapflyTwitterScraper;

const axios = require('axios');

class TwitterAPIClient {
    constructor() {
        this.bearerToken = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
        this.guestToken = null;
        
        // Enhanced headers with proper authentication
        this.headers = {
            'Authorization': `Bearer ${this.bearerToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'x-twitter-client-language': 'en',
            'x-twitter-active-user': 'yes',
            'x-csrf-token': this.generateCSRFToken(),
            'x-client-transaction-id': this.generateTransactionId()
        };

        // API endpoints
        this.endpoints = {
            guestActivate: 'https://api.twitter.com/1.1/guest/activate.json',
            search: 'https://api.twitter.com/2/search/tweets',
            timeline: 'https://api.twitter.com/2/timeline/home.json',
            tweetDetail: 'https://api.twitter.com/2/tweets'
        };
    }

    /**
     * Generate CSRF token
     */
    generateCSRFToken() {
        return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    /**
     * Generate transaction ID
     */
    generateTransactionId() {
        return Array.from({length: 22}, () => Math.floor(Math.random() * 36).toString(36)).join('');
    }

    /**
     * Get guest token for unauthenticated requests
     */
    async getGuestToken() {
        if (this.guestToken) {
            return this.guestToken;
        }

        try {
            const response = await axios.post(this.endpoints.guestActivate, {}, {
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });

            this.guestToken = response.data.guest_token;
            console.log('[TwitterAPI] Guest token obtained');
            return this.guestToken;

        } catch (error) {
            console.log('[TwitterAPI] Failed to get guest token:', error.message);
            throw error;
        }
    }

    /**
     * Search for tweets with media
     */
    async searchTweets(query, maxResults = 20) {
        try {
            await this.getGuestToken();

            const searchHeaders = {
                ...this.headers,
                'x-guest-token': this.guestToken,
                'Referer': 'https://twitter.com/search'
            };

            const params = {
                query: `${query} has:media -is:retweet lang:en`,
                max_results: maxResults,
                'tweet.fields': 'attachments,author_id,created_at,public_metrics',
                'media.fields': 'type,url,preview_image_url,variants',
                'expansions': 'attachments.media_keys,author_id'
            };

            const response = await axios.get(this.endpoints.search, {
                headers: searchHeaders,
                params: params,
                timeout: 15000
            });

            return this.processTweetResults(response.data);

        } catch (error) {
            console.log('[TwitterAPI] Search failed:', error.message);
            throw error;
        }
    }

    /**
     * Process tweet search results
     */
    processTweetResults(data) {
        const results = [];

        if (!data.data || !data.includes) {
            return results;
        }

        const tweets = data.data;
        const media = data.includes.media || [];
        const users = data.includes.users || [];

        for (const tweet of tweets) {
            if (!tweet.attachments || !tweet.attachments.media_keys) {
                continue;
            }

            const tweetMedia = [];
            for (const mediaKey of tweet.attachments.media_keys) {
                const mediaObject = media.find(m => m.media_key === mediaKey);
                if (mediaObject) {
                    tweetMedia.push(mediaObject);
                }
            }

            if (tweetMedia.length > 0) {
                const author = users.find(u => u.id === tweet.author_id);
                
                results.push({
                    id: tweet.id,
                    text: tweet.text,
                    author: author ? author.username : 'unknown',
                    created_at: tweet.created_at,
                    media: tweetMedia,
                    metrics: tweet.public_metrics,
                    url: `https://twitter.com/${author?.username || 'i'}/status/${tweet.id}`
                });
            }
        }

        return results;
    }

    /**
     * Extract best video URL from media variants
     */
    extractBestVideoUrl(mediaObject) {
        if (mediaObject.type !== 'video') {
            return null;
        }

        if (!mediaObject.variants || mediaObject.variants.length === 0) {
            return null;
        }

        // Sort by bitrate (highest first)
        const mp4Variants = mediaObject.variants
            .filter(v => v.content_type === 'video/mp4')
            .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0));

        return mp4Variants.length > 0 ? mp4Variants[0].url : null;
    }

    /**
     * Get direct tweet data
     */
    async getTweet(tweetId) {
        try {
            await this.getGuestToken();

            const tweetHeaders = {
                ...this.headers,
                'x-guest-token': this.guestToken
            };

            const params = {
                ids: tweetId,
                'tweet.fields': 'attachments,author_id,created_at,public_metrics',
                'media.fields': 'type,url,preview_image_url,variants',
                'expansions': 'attachments.media_keys,author_id'
            };

            const response = await axios.get(this.endpoints.tweetDetail, {
                headers: tweetHeaders,
                params: params,
                timeout: 10000
            });

            const processed = this.processTweetResults(response.data);
            return processed.length > 0 ? processed[0] : null;

        } catch (error) {
            console.log('[TwitterAPI] Tweet fetch failed:', error.message);
            throw error;
        }
    }

    /**
     * Search and get best media content
     */
    async getBestMediaContent(category, searchTerms) {
        try {
            console.log(`[TwitterAPI] Searching for ${category} content...`);
            
            const query = searchTerms.slice(0, 2).join(' OR ');
            const tweets = await this.searchTweets(query, 30);

            console.log(`[TwitterAPI] Found ${tweets.length} tweets with media`);

            if (tweets.length === 0) {
                throw new Error('No tweets found with media');
            }

            // Prioritize videos over images
            const videoPosts = tweets.filter(tweet => 
                tweet.media.some(m => m.type === 'video')
            );

            const imagePosts = tweets.filter(tweet => 
                tweet.media.some(m => m.type === 'photo')
            );

            let selectedTweet;
            let mediaType;

            if (videoPosts.length > 0) {
                selectedTweet = videoPosts[Math.floor(Math.random() * videoPosts.length)];
                mediaType = 'video';
            } else if (imagePosts.length > 0) {
                selectedTweet = imagePosts[Math.floor(Math.random() * imagePosts.length)];
                mediaType = 'image';
            } else {
                throw new Error('No suitable media found');
            }

            const mediaObject = selectedTweet.media.find(m => m.type === (mediaType === 'video' ? 'video' : 'photo'));
            
            let mediaUrl;
            if (mediaType === 'video') {
                mediaUrl = this.extractBestVideoUrl(mediaObject);
                if (!mediaUrl) {
                    throw new Error('Could not extract video URL');
                }
            } else {
                mediaUrl = mediaObject.url;
            }

            return {
                type: mediaType,
                url: mediaUrl,
                tweet_url: selectedTweet.url,
                user: selectedTweet.author,
                text: selectedTweet.text.substring(0, 100),
                engagement: {
                    likes: selectedTweet.metrics.like_count,
                    retweets: selectedTweet.metrics.retweet_count,
                    replies: selectedTweet.metrics.reply_count
                },
                created_at: selectedTweet.created_at,
                extracted: true,
                api_sourced: true
            };

        } catch (error) {
            console.log('[TwitterAPI] Media search failed:', error.message);
            throw error;
        }
    }
}

module.exports = TwitterAPIClient;

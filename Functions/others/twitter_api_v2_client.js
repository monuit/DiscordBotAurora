const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Twitter API v2 Client for Video Retrieval
 * Specifically designed to fetch ONLY videos with efficient usage tracking
 * Monthly limit: 100 posts (0 used currently)
 */
class TwitterAPIv2Client {
    constructor() {
        this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
        this.apiKey = process.env.TWITTER_API_KEY;
        this.apiSecret = process.env.TWITTER_API_SECRET;
        this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
        this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
        
        this.baseURL = 'https://api.x.com/2';
        this.usageFile = path.join(__dirname, '../../logs/twitter_api_usage.json');
        this.monthlyLimit = 100;
        this.currentUsage = 0;
        
        // Initialize usage tracking
        this.initializeUsage();
    }

    /**
     * Initialize or load API usage tracking
     */
    async initializeUsage() {
        try {
            const data = await fs.readFile(this.usageFile, 'utf8');
            const usageData = JSON.parse(data);
            
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            
            if (usageData.month === currentMonth) {
                this.currentUsage = usageData.usage || 0;
            } else {
                // New month, reset usage
                this.currentUsage = 0;
                await this.saveUsage();
            }
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
            this.currentUsage = 0;
            await this.saveUsage();
        }
    }

    /**
     * Save current usage to file
     */
    async saveUsage() {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const usageData = {
                month: currentMonth,
                usage: this.currentUsage,
                limit: this.monthlyLimit,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.usageFile, JSON.stringify(usageData, null, 2));
        } catch (error) {
            console.log('[TwitterAPIv2] Error saving usage:', error.message);
        }
    }

    /**
     * Check if we can make API calls
     */
    canMakeRequest() {
        return this.currentUsage < this.monthlyLimit;
    }

    /**
     * Get remaining API calls for this month
     */
    getRemainingCalls() {
        return Math.max(0, this.monthlyLimit - this.currentUsage);
    }

    /**
     * Increment usage counter
     */
    async incrementUsage() {
        this.currentUsage++;
        await this.saveUsage();
        console.log(`[TwitterAPIv2] Usage: ${this.currentUsage}/${this.monthlyLimit} (${this.getRemainingCalls()} remaining)`);
    }

    /**
     * Get authorization headers
     */
    getAuthHeaders() {
        if (!this.bearerToken) {
            throw new Error('Twitter Bearer Token not configured');
        }
        
        return {
            'Authorization': `Bearer ${this.bearerToken}`,
            'User-Agent': 'DiscordBotAurora/1.0',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Search for tweets with videos only - CONSERVATIVE: ONLY 1 REQUEST PER CALL
     * @param {string} query - Search query
     * @param {number} maxResults - Number of results (FIXED TO 10 - minimum allowed)
     * @returns {Promise<Object>} API response with video tweets
     */
    async searchVideos(query, maxResults = 10) {
        if (!this.canMakeRequest()) {
            throw new Error(`Monthly API limit reached (${this.currentUsage}/${this.monthlyLimit}). No more requests available.`);
        }

        try {
            // Construct search query to ONLY find videos
            const videoQuery = `${query} has:media has:videos -is:retweet -is:reply`;
            
            // FIXED: Use minimum allowed (10) to conserve API quota
            const params = new URLSearchParams({
                'query': videoQuery,
                'max_results': '10', // Minimum allowed by Twitter API
                'tweet.fields': 'id,text,author_id,created_at,public_metrics,attachments',
                'expansions': 'attachments.media_keys,author_id',
                'media.fields': 'media_key,type,url,variants,duration_ms,height,width,preview_image_url,public_metrics',
                'user.fields': 'id,username,name,verified'
            });

            const url = `${this.baseURL}/tweets/search/recent?${params.toString()}`;
            
            console.log(`[TwitterAPIv2] 🎯 CONSERVATIVE: Searching for videos (max 10): "${videoQuery}"`);
            
            const response = await axios.get(url, {
                headers: this.getAuthHeaders(),
                timeout: 10000
            });

            // Increment usage after successful request
            await this.incrementUsage();

            return this.processVideoResponse(response.data);

        } catch (error) {
            if (error.response) {
                console.log(`[TwitterAPIv2] API Error ${error.response.status}:`, error.response.data);
                throw new Error(`Twitter API Error: ${error.response.status} - ${error.response.data?.title || error.response.statusText}`);
            } else {
                console.log('[TwitterAPIv2] Request Error:', error.message);
                throw new Error(`Request failed: ${error.message}`);
            }
        }
    }

    /**
     * Process API response and extract video content
     * @param {Object} data - Raw API response
     * @returns {Object} Processed video data
     */
    processVideoResponse(data) {
        const result = {
            videos: [],
            totalResults: data.meta?.result_count || 0,
            apiUsage: {
                used: this.currentUsage,
                remaining: this.getRemainingCalls(),
                limit: this.monthlyLimit
            }
        };

        if (!data.data || data.data.length === 0) {
            console.log('[TwitterAPIv2] No video tweets found');
            return result;
        }

        const tweets = data.data;
        const mediaIncludes = data.includes?.media || [];
        const userIncludes = data.includes?.users || [];

        for (const tweet of tweets) {
            if (!tweet.attachments?.media_keys) continue;

            for (const mediaKey of tweet.attachments.media_keys) {
                const media = mediaIncludes.find(m => m.media_key === mediaKey);
                
                if (media && media.type === 'video') {
                    const author = userIncludes.find(u => u.id === tweet.author_id);
                    
                    // Get best quality video variant
                    const videoVariant = this.getBestVideoVariant(media.variants);
                    
                    if (videoVariant) {
                        result.videos.push({
                            tweetId: tweet.id,
                            text: tweet.text,
                            author: {
                                id: author?.id,
                                username: author?.username,
                                name: author?.name,
                                verified: author?.verified || false
                            },
                            video: {
                                url: videoVariant.url,
                                bitRate: videoVariant.bit_rate,
                                contentType: videoVariant.content_type,
                                duration: media.duration_ms,
                                width: media.width,
                                height: media.height,
                                previewImage: media.preview_image_url,
                                views: media.public_metrics?.view_count || 0
                            },
                            metrics: tweet.public_metrics,
                            createdAt: tweet.created_at,
                            tweetUrl: `https://twitter.com/i/status/${tweet.id}`
                        });
                    }
                }
            }
        }

        console.log(`[TwitterAPIv2] Found ${result.videos.length} videos from ${result.totalResults} tweets`);
        return result;
    }

    /**
     * Get the best quality video variant from available options
     * @param {Array} variants - Array of video variants
     * @returns {Object|null} Best quality variant
     */
    getBestVideoVariant(variants) {
        if (!variants || variants.length === 0) return null;

        // Filter for mp4 videos only
        const mp4Variants = variants.filter(v => 
            v.content_type === 'video/mp4' && v.url && v.bit_rate
        );

        if (mp4Variants.length === 0) return null;

        // Sort by bit rate (higher = better quality) and return the best
        return mp4Variants.sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];
    }

    /**
     * Get a random video from search results - CONSERVATIVE APPROACH
     * @param {string} query - Search query
     * @returns {Promise<Object|null>} Random video or null
     */
    async getRandomVideo(query) {
        try {
            const results = await this.searchVideos(query, 10); // Only get 10 tweets max per API call
            
            if (results.videos.length === 0) {
                console.log(`[TwitterAPIv2] ❌ No videos found for query: ${query}`);
                return null;
            }

            // Return random video
            const randomIndex = Math.floor(Math.random() * results.videos.length);
            const selectedVideo = results.videos[randomIndex];

            console.log(`[TwitterAPIv2] ✅ Selected random video: ${selectedVideo.video.duration}ms, ${selectedVideo.video.views} views`);
            console.log(`[TwitterAPIv2] 📊 Found ${results.videos.length} videos total from this search`);
            
            return {
                url: selectedVideo.video.url,
                type: 'video',
                title: selectedVideo.text.slice(0, 100) + (selectedVideo.text.length > 100 ? '...' : ''),
                author: selectedVideo.author.username,
                duration: selectedVideo.video.duration,
                views: selectedVideo.video.views,
                verified: selectedVideo.author.verified,
                tweetUrl: selectedVideo.tweetUrl,
                source: 'Twitter API v2',
                apiUsage: results.apiUsage
            };

        } catch (error) {
            console.log('[TwitterAPIv2] ❌ Error getting random video:', error.message);
            return null;
        }
    }

    /**
     * Get API usage statistics
     * @returns {Object} Usage statistics
     */
    getUsageStats() {
        return {
            used: this.currentUsage,
            remaining: this.getRemainingCalls(),
            limit: this.monthlyLimit,
            percentage: Math.round((this.currentUsage / this.monthlyLimit) * 100),
            canMakeRequest: this.canMakeRequest()
        };
    }

    /**
     * Test API connection and configuration
     * @returns {Promise<Object>} Test results
     */
    async testConnection() {
        try {
            if (!this.bearerToken) {
                throw new Error('Bearer token not configured');
            }

            // Test with a simple search that shouldn't use much quota
            const testQuery = 'cats has:videos -is:retweet';
            const params = new URLSearchParams({
                'query': testQuery,
                'max_results': '10',
                'tweet.fields': 'id'
            });

            const url = `${this.baseURL}/tweets/search/recent?${params.toString()}`;
            
            const response = await axios.get(url, {
                headers: this.getAuthHeaders(),
                timeout: 5000
            });

            await this.incrementUsage();

            return {
                success: true,
                status: response.status,
                message: 'Twitter API v2 connection successful',
                usage: this.getUsageStats(),
                resultCount: response.data.meta?.result_count || 0
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                usage: this.getUsageStats()
            };
        }
    }
}

module.exports = TwitterAPIv2Client;

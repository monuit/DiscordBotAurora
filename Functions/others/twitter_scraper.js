const axios = require('axios');
const { JSDOM } = require('jsdom');
const TwitterAPIClient = require('./twitter_api_client');

class TwitterScraper {
    constructor() {
        this.scrapflyKey = process.env.SCRAPFLY_API_KEY;
        this.apiClient = new TwitterAPIClient();
        
        // Enhanced headers to mimic real browser
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        };

        // Cookie string for Twitter authentication (if needed)
        this.cookies = this.buildCookieString();
        
        // Search endpoints and patterns
        this.searchUrls = {
            base: 'https://twitter.com/search',
            api: 'https://api.twitter.com/1.1/search/tweets.json',
            graphql: 'https://twitter.com/i/api/graphql'
        };

        // Video URL patterns for extraction
        this.videoPatterns = [
            /https:\/\/video\.twimg\.com\/ext_tw_video\/[^"]+\.mp4/g,
            /https:\/\/video\.twimg\.com\/amplify_video\/[^"]+\.mp4/g,
            /https:\/\/video\.twimg\.com\/tweet_video\/[^"]+\.mp4/g
        ];

        // Image URL patterns
        this.imagePatterns = [
            /https:\/\/pbs\.twimg\.com\/media\/[^"]+\.(jpg|jpeg|png|gif)/g
        ];
    }

    /**
     * Build cookie string for Twitter
     */
    buildCookieString() {
        const cookies = [
            'guest_id_marketing=v1%3A169123456789',
            'guest_id_ads=v1%3A169123456789',
            'personalization_id="v1_abcd1234efgh5678"',
            'guest_id=v1%3A169123456789',
            'ct0=abcd1234efgh5678ijkl9012mnop3456',
            'lang=en'
        ];
        return cookies.join('; ');
    }

    /**
     * Search Twitter for NSFW content by category
     */
    async searchTwitterContent(category, searchTerms) {
        try {
            console.log(`[TwitterScraper] Searching for ${category} content...`);
            
            // Build search query
            const query = this.buildSearchQuery(category, searchTerms);
            const searchUrl = `${this.searchUrls.base}?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
            
            console.log(`[TwitterScraper] Search URL: ${searchUrl}`);
            
            // Try ScrapFly first if available
            if (this.scrapflyKey) {
                try {
                    return await this.scrapeWithScrapfly(searchUrl, category);
                } catch (scrapflyError) {
                    console.log('[TwitterScraper] ScrapFly failed, trying direct scraping:', scrapflyError.message);
                }
            }

            // Fallback to direct scraping
            return await this.scrapeDirectly(searchUrl, category);

        } catch (error) {
            console.log('[TwitterScraper] Search failed:', error.message);
            throw error;
        }
    }

    /**
     * Build search query for Twitter
     */
    buildSearchQuery(category, searchTerms) {
        const terms = searchTerms.slice(0, 3); // Limit to 3 terms
        const baseQuery = terms.join(' OR ');
        
        // Add filters for media content
        return `(${baseQuery}) filter:media -filter:retweets min_faves:100`;
    }

    /**
     * Scrape using ScrapFly API
     */
    async scrapeWithScrapfly(url, category) {
        console.log('[TwitterScraper] Using ScrapFly for scraping...');
        
        const scrapflyUrl = 'https://api.scrapfly.io/scrape';
        const params = {
            key: this.scrapflyKey,
            url: url,
            render_js: true,
            asp: true,
            country: 'US',
            format: 'json',
            timeout: 30000,
            wait_for_selector: '[data-testid="tweet"]',
            wait: 3000
        };

        const response = await axios.get(scrapflyUrl, { 
            params,
            timeout: 35000
        });

        if (response.data && response.data.result) {
            return this.extractMediaFromHtml(response.data.result.content, category);
        }

        throw new Error('No content received from ScrapFly');
    }

    /**
     * Direct scraping (simplified for testing)
     */
    async scrapeDirectly(url, category) {
        console.log('[TwitterScraper] Using direct scraping...');
        
        const requestHeaders = {
            ...this.headers,
            'Cookie': this.cookies
        };

        const response = await axios.get(url, {
            headers: requestHeaders,
            timeout: 15000,
            validateStatus: (status) => status < 500 // Accept redirects
        });

        return this.extractMediaFromHtml(response.data, category);
    }

    /**
     * Extract media URLs from HTML content
     */
    extractMediaFromHtml(html, category) {
        console.log('[TwitterScraper] Extracting media from HTML...');
        
        const videos = [];
        const images = [];

        // Extract video URLs
        for (const pattern of this.videoPatterns) {
            const matches = html.match(pattern);
            if (matches) {
                videos.push(...matches);
            }
        }

        // Extract image URLs
        for (const pattern of this.imagePatterns) {
            const matches = html.match(pattern);
            if (matches) {
                images.push(...matches.map(url => url.replace(':small', ':large')));
            }
        }

        console.log(`[TwitterScraper] Found ${videos.length} videos, ${images.length} images`);

        if (videos.length > 0) {
            const videoUrl = this.selectBestVideo(videos);
            return {
                type: 'video',
                url: videoUrl,
                source: 'twitter',
                category: category,
                extracted: true
            };
        }

        if (images.length > 0) {
            const imageUrl = images[Math.floor(Math.random() * images.length)];
            return {
                type: 'image',
                url: imageUrl,
                source: 'twitter',
                category: category,
                extracted: true
            };
        }

        throw new Error('No media found in search results');
    }

    /**
     * Select best quality video from available options
     */
    selectBestVideo(videos) {
        // Prefer videos with higher resolution indicators
        const qualityOrder = ['1080', '720', '480', '360'];
        
        for (const quality of qualityOrder) {
            const qualityVideo = videos.find(url => url.includes(quality));
            if (qualityVideo) {
                return qualityVideo;
            }
        }

        // Return first video if no quality indicators found
        return videos[0];
    }

    /**
     * Alternative: Extract from specific tweet URL
     */
    async extractFromTweetUrl(tweetUrl) {
        try {
            console.log(`[TwitterScraper] Extracting from specific tweet: ${tweetUrl}`);
            
            if (this.scrapflyKey) {
                try {
                    return await this.scrapeWithScrapfly(tweetUrl, 'direct');
                } catch (scrapflyError) {
                    console.log('[TwitterScraper] ScrapFly failed for tweet extraction:', scrapflyError.message);
                }
            }

            return await this.scrapeDirectly(tweetUrl, 'direct');

        } catch (error) {
            console.log('[TwitterScraper] Tweet extraction failed:', error.message);
            throw error;
        }
    }

    /**
     * Get guest token for Twitter API (if needed)
     */
    async getGuestToken() {
        try {
            const response = await axios.post('https://api.twitter.com/1.1/guest/activate.json', {}, {
                headers: {
                    'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
                    ...this.headers
                }
            });

            return response.data.guest_token;
        } catch (error) {
            console.log('[TwitterScraper] Failed to get guest token:', error.message);
            return null;
        }
    }

    /**
     * Validate video URL accessibility
     */
    async validateVideoUrl(url) {
        try {
            const response = await axios.head(url, {
                timeout: 5000,
                validateStatus: (status) => status < 400
            });

            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get working video URL with validation - Enhanced with multiple methods
     */
    async getValidatedVideoUrl(category, searchTerms) {
        try {
            console.log(`[TwitterScraper] Trying multiple methods for ${category}...`);
            
            // Method 1: Try Twitter API client first
            try {
                console.log('[TwitterScraper] Attempting Twitter API method...');
                const apiContent = await this.apiClient.getBestMediaContent(category, searchTerms);
                
                if (apiContent && apiContent.api_sourced) {
                    console.log(`[TwitterScraper] ✅ API method successful - got ${apiContent.type}`);
                    return apiContent;
                }
            } catch (apiError) {
                console.log('[TwitterScraper] API method failed:', apiError.message);
            }

            // Method 2: Try ScrapFly if available
            if (this.scrapflyKey) {
                try {
                    console.log('[TwitterScraper] Attempting ScrapFly method...');
                    const content = await this.searchTwitterContent(category, searchTerms);
                    
                    if (content && content.extracted) {
                        console.log(`[TwitterScraper] ✅ ScrapFly method successful - got ${content.type}`);
                        return content;
                    }
                } catch (scrapflyError) {
                    console.log('[TwitterScraper] ScrapFly method failed:', scrapflyError.message);
                }
            }

            // Method 3: Try direct scraping
            try {
                console.log('[TwitterScraper] Attempting direct scraping method...');
                const directContent = await this.searchTwitterContent(category, searchTerms);
                
                if (directContent && directContent.extracted) {
                    console.log(`[TwitterScraper] ✅ Direct scraping successful - got ${directContent.type}`);
                    return directContent;
                }
            } catch (directError) {
                console.log('[TwitterScraper] Direct scraping failed:', directError.message);
            }

            // All methods failed
            throw new Error('All Twitter scraping methods failed');
            
        } catch (error) {
            console.log('[TwitterScraper] All methods failed:', error.message);
            throw error;
        }
    }
}

module.exports = TwitterScraper;

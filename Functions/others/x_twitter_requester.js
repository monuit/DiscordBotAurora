const TwitterContentGenerator = require('./twitter_content_generator');

class XTwitterRequester {
    constructor() {
        this.scraper = new TwitterContentGenerator();
        this.fallbackMode = false;
        
        // Legacy support for old method calls
        this.userAgent = process.env.X_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
        this.categories = [
            'blowjob', 'anal', 'lesbian', 'milf', 'teen', 'amateur', 'big_ass', 'big_tits',
            'cumshot', 'creampie', 'deepthroat', 'fingering', 'hardcore',
            'masturbation', 'threesome', 'asian', 'ebony', 'latina',
            'redhead', 'blonde', 'brunette', 'bbw', 'fetish', 'bbc'
        ];
        
        // Fallback URLs for when scraping fails
        this.fallbackUrls = {
            amateur: 'https://pbs.twimg.com/media/sample_amateur_content.jpg',
            anal: 'https://pbs.twimg.com/media/sample_anal_content.jpg',
            asian: 'https://pbs.twimg.com/media/sample_asian_content.jpg',
            babe: 'https://pbs.twimg.com/media/sample_babe_content.jpg',
            bbc: 'https://pbs.twimg.com/media/sample_bbc_content.jpg',
            bbw: 'https://pbs.twimg.com/media/sample_bbw_content.jpg',
            big_ass: 'https://pbs.twimg.com/media/sample_bigass_content.jpg',
            big_tits: 'https://pbs.twimg.com/media/sample_bigtits_content.jpg',
            blonde: 'https://pbs.twimg.com/media/sample_blonde_content.jpg',
            blowjob: 'https://pbs.twimg.com/media/sample_blowjob_content.jpg',
            brunette: 'https://pbs.twimg.com/media/sample_brunette_content.jpg',
            creampie: 'https://pbs.twimg.com/media/sample_creampie_content.jpg',
            cumshot: 'https://pbs.twimg.com/media/sample_cumshot_content.jpg',
            deepthroat: 'https://pbs.twimg.com/media/sample_deepthroat_content.jpg',
            ebony: 'https://pbs.twimg.com/media/sample_ebony_content.jpg',
            fetish: 'https://pbs.twimg.com/media/sample_fetish_content.jpg',
            fingering: 'https://pbs.twimg.com/media/sample_fingering_content.jpg',
            hardcore: 'https://pbs.twimg.com/media/sample_hardcore_content.jpg',
            latina: 'https://pbs.twimg.com/media/sample_latina_content.jpg',
            lesbian: 'https://pbs.twimg.com/media/sample_lesbian_content.jpg',
            masturbation: 'https://pbs.twimg.com/media/sample_masturbation_content.jpg',
            milf: 'https://pbs.twimg.com/media/sample_milf_content.jpg',
            missionary: 'https://pbs.twimg.com/media/sample_missionary_content.jpg',
            redhead: 'https://pbs.twimg.com/media/sample_redhead_content.jpg',
            teen: 'https://pbs.twimg.com/media/sample_teen_content.jpg',
            threesome: 'https://pbs.twimg.com/media/sample_threesome_content.jpg'
        };
    }

    /**
     * Main method to get random content for a category
     */
    async getRandomContent(category) {
        try {
            console.log(`[X/Twitter] Requesting content for category: ${category}`);
            
            // Use enhanced scraper
            const scrapedContent = await this.scraper.getContentWithRetry(category, 2);
            
            if (scrapedContent && !scrapedContent.fallback) {
                console.log(`[X/Twitter] Successfully generated ${scrapedContent.type} content`);
                return {
                    title: `${category} content from @${scrapedContent.user}`,
                    url: scrapedContent.url,
                    thumbnail: scrapedContent.type === 'video' ? scrapedContent.url : scrapedContent.url,
                    description: null, // Clean description without metadata
                    footer: `Source: X (Twitter) • ${scrapedContent.engagement.likes} likes • ${scrapedContent.age}h ago`,
                    color: '#1da1f2',
                    author: scrapedContent.user,
                    source: 'x-twitter',
                    tweet_url: scrapedContent.tweet_url,
                    type: scrapedContent.type,
                    engagement: scrapedContent.engagement,
                    enhanced: true,
                    verified: scrapedContent.verified,
                    searchTerm: scrapedContent.searchTerm
                };
            }

            // Fallback to static content if needed
            console.log('[X/Twitter] Using fallback content');
            return {
                title: `${category} content (fallback)`,
                url: this.fallbackUrls[category] || this.fallbackUrls.amateur,
                thumbnail: this.fallbackUrls[category] || this.fallbackUrls.amateur,
                description: null,
                footer: `Source: X (Twitter) • Category: ${category}`,
                color: '#1da1f2',
                author: 'Twitter',
                source: 'x-twitter',
                fallback: true
            };

        } catch (error) {
            console.log('[X/Twitter] Error generating content:', error.message);
            return {
                title: `Placeholder content for ${category}`,
                url: this.fallbackUrls.amateur,
                thumbnail: this.fallbackUrls.amateur,
                description: null,
                footer: `Source: X (Twitter) • Category: ${category}`,
                color: '#1da1f2',
                author: 'Twitter',
                source: 'x-twitter',
                error: true
            };
        }
    }

    /**
     * Legacy support for searchByCategory method
     */
    async searchByCategory(category, count = 40) {
        try {
            const content = await this.getRandomContent(category);
            return [content]; // Return as array for compatibility
        } catch (error) {
            console.error(`[X-Twitter] Error searching for ${category}:`, error.message);
            return [];
        }
    }

    /**
     * Advanced Twitter scraping method using Enhanced Scraper
     */
    async scrapeTwitterContent(category) {
        try {
            console.log(`[X/Twitter] Scraping ${category} content with Enhanced Scraper...`);
            return await this.scraper.getContentWithRetry(category, 3);
        } catch (error) {
            console.error(`[X-Twitter] Scraping error for ${category}:`, error.message);
            throw error;
        }
    }

    /**
     * Reset fallback mode to retry scraping
     */
    resetFallbackMode() {
        this.fallbackMode = false;
        console.log('[X/Twitter] Fallback mode reset, will retry scraping');
    }

    /**
     * Get scraper status
     */
    getStatus() {
        return {
            fallbackMode: this.fallbackMode,
            scraperAvailable: !!this.scraper,
            categories: this.categories.length,
            scraperType: 'Enhanced'
        };
    }

    /**
     * Check if category is supported
     */
    isCategorySupported(category) {
        return this.categories.includes(category.toLowerCase()) || 
               this.scraper.categoryTerms.hasOwnProperty(category);
    }

    /**
     * Get all supported categories
     */
    getSupportedCategories() {
        return this.categories;
    }

    /**
     * Validate Twitter URL
     */
    async validateUrl(url) {
        try {
            const twitterUrlPattern = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
            return twitterUrlPattern.test(url);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get random content with enhanced retry logic
     */
    async getContentWithRetry(category, maxRetries = 3) {
        return await this.scraper.getContentWithRetry(category, maxRetries);
    }
}

module.exports = XTwitterRequester;

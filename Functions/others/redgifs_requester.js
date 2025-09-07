const axios = require('axios');

class RedgifsRequester {
    constructor() {
        this.userAgent = process.env.REDGIFS_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.baseUrl = 'https://api.redgifs.com/v2';
        this.searchUrl = 'https://api.redgifs.com/v2/gifs/search';
        this.authToken = null;
        this.categories = [
            'blowjob', 'anal', 'lesbian', 'milf', 'teen', 'amateur', 'big-ass', 'big-tits',
            'cumshot', 'creampie', 'deepthroat', 'fingering', 'handjob', 'hardcore',
            'homemade', 'masturbation', 'oral', 'orgasm', 'pov', 'pussy', 'reality',
            'rough', 'squirting', 'threesome', 'webcam', 'asian', 'ebony', 'latina',
            'redhead', 'blonde', 'brunette', 'bbw', 'petite', 'mature', 'young'
        ];
    }

    /**
     * Get authentication token for Redgifs API
     */
    async getAuthToken() {
        try {
            const response = await axios.get('https://api.redgifs.com/v2/auth/temporary', {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json',
                    'Referer': 'https://www.redgifs.com/',
                    'Origin': 'https://www.redgifs.com'
                }
            });

            if (response.data && response.data.token) {
                this.authToken = response.data.token;
                console.log('[Redgifs] Authentication token obtained');
                return true;
            }
            return false;
        } catch (error) {
            console.error('[Redgifs] Failed to get auth token:', error.message);
            return false;
        }
    }

    /**
     * Search for gifs by category/tag
     */
    async searchGifs(category, count = 40) {
        if (!this.authToken) {
            const authSuccess = await this.getAuthToken();
            if (!authSuccess) {
                throw new Error('Failed to authenticate with Redgifs API');
            }
        }

        try {
            const response = await axios.get(this.searchUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                    'Referer': 'https://www.redgifs.com/',
                    'Origin': 'https://www.redgifs.com'
                },
                params: {
                    search_text: category,
                    order: 'trending',
                    count: count,
                    page: 1
                }
            });

            if (response.data && response.data.gifs) {
                return response.data.gifs.map(gif => ({
                    id: gif.id,
                    title: gif.caption || `${category} content`,
                    url: gif.urls?.hd || gif.urls?.sd || gif.urls?.webm,
                    thumbnail: gif.urls?.thumbnail,
                    duration: gif.duration,
                    views: gif.views,
                    likes: gif.likes,
                    tags: gif.tags || [category],
                    source: 'redgifs',
                    category: category
                }));
            }
            return [];
        } catch (error) {
            console.error(`[Redgifs] Error searching for ${category}:`, error.message);
            
            // If auth error, try to refresh token
            if (error.response?.status === 401) {
                console.log('[Redgifs] Token expired, refreshing...');
                this.authToken = null;
                return await this.searchGifs(category, count);
            }
            
            return [];
        }
    }

    /**
     * Get random content from a category
     */
    async getRandomContent(category) {
        try {
            const gifs = await this.searchGifs(category, 80);
            if (gifs.length === 0) {
                throw new Error(`No content found for category: ${category}`);
            }

            // Select random gif
            const randomIndex = Math.floor(Math.random() * gifs.length);
            const selectedGif = gifs[randomIndex];

            return {
                title: selectedGif.title,
                url: selectedGif.url,
                thumbnail: selectedGif.thumbnail,
                description: null, // Clean description without metadata
                footer: `Source: Redgifs • Category: ${category}`,
                color: '#ff6b6b',
                tags: selectedGif.tags,
                source: 'redgifs'
            };
        } catch (error) {
            console.error(`[Redgifs] Error getting random ${category} content:`, error.message);
            throw error;
        }
    }

    /**
     * Check if category is supported
     */
    isCategorySupported(category) {
        return this.categories.includes(category.toLowerCase());
    }

    /**
     * Get all supported categories
     */
    getSupportedCategories() {
        return this.categories;
    }

    /**
     * Validate gif URL
     */
    async validateUrl(url) {
        try {
            const response = await axios.head(url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

module.exports = RedgifsRequester;

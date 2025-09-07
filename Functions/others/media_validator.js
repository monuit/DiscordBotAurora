const axios = require('axios');

class MediaValidator {
    constructor() {
        this.cache = new Map(); // Cache validated URLs to avoid re-checking
        this.cacheExpiry = 1000 * 60 * 30; // 30 minutes cache
    }

    /**
     * Validate if a video URL is actually working
     */
    async validateVideoUrl(url) {
        try {
            // Check cache first
            const cacheKey = url;
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.valid;
            }

            console.log(`[MediaValidator] Checking video URL: ${url.substring(0, 50)}...`);

            // Make HEAD request to check if video exists
            const response = await axios.head(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const contentType = response.headers['content-type'];
            const contentLength = parseInt(response.headers['content-length'] || '0');
            
            // Check if it's actually a video and has reasonable size
            const isVideo = contentType && (
                contentType.includes('video/') || 
                contentType.includes('application/octet-stream')
            );
            const hasSize = contentLength > 100000; // At least 100KB
            
            const isValid = isVideo && hasSize && response.status === 200;
            
            // Cache result
            this.cache.set(cacheKey, {
                valid: isValid,
                timestamp: Date.now(),
                contentType,
                size: contentLength
            });

            console.log(`[MediaValidator] URL validation: ${isValid ? 'VALID' : 'INVALID'} (${contentType}, ${contentLength} bytes)`);
            return isValid;

        } catch (error) {
            console.log(`[MediaValidator] Validation failed: ${error.message}`);
            // Cache as invalid to avoid retrying soon
            this.cache.set(url, {
                valid: false,
                timestamp: Date.now(),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Validate if an image URL is working
     */
    async validateImageUrl(url) {
        try {
            const cacheKey = url;
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.valid;
            }

            const response = await axios.head(url, {
                timeout: 3000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const contentType = response.headers['content-type'];
            const isImage = contentType && contentType.includes('image/');
            const isValid = isImage && response.status === 200;

            this.cache.set(cacheKey, {
                valid: isValid,
                timestamp: Date.now(),
                contentType
            });

            return isValid;

        } catch (error) {
            this.cache.set(url, {
                valid: false,
                timestamp: Date.now(),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Clean expired cache entries
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheExpiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const entries = Array.from(this.cache.values());
        return {
            totalEntries: entries.length,
            validEntries: entries.filter(e => e.valid).length,
            invalidEntries: entries.filter(e => !e.valid).length
        };
    }
}

module.exports = MediaValidator;

const axios = require('axios');

class MediaSourceProvider {
    constructor() {
        this.workingVideoSources = [
            'https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4',
            'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
            'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
        ];

        this.workingImageSources = [
            'https://picsum.photos/800/600',
            'https://picsum.photos/1200/800',
            'https://picsum.photos/1080/720',
            'https://httpbin.org/image/jpeg',
            'https://httpbin.org/image/png',
            'https://jsonplaceholder.typicode.com/photos/1',
            'https://dummyimage.com/800x600/1da1f2/ffffff.jpg&text=Content',
            'https://fakeimg.pl/800x600/1da1f2/ffffff/?text=Media'
        ];

        this.categoryImages = {
            amateur: 'https://picsum.photos/800/600?random=1',
            anal: 'https://dummyimage.com/800x600/ff1493/ffffff.jpg&text=Content',
            asian: 'https://picsum.photos/800/600?random=3',
            babe: 'https://picsum.photos/800/600?random=4',
            bbc: 'https://dummyimage.com/800x600/333333/ffffff.jpg&text=Content',
            bbw: 'https://picsum.photos/800/600?random=6',
            big_ass: 'https://dummyimage.com/800x600/9932cc/ffffff.jpg&text=Content',
            big_tits: 'https://picsum.photos/800/600?random=8',
            blonde: 'https://picsum.photos/800/600?random=9',
            blowjob: 'https://dummyimage.com/800x600/1da1f2/ffffff.jpg&text=Content',
            brunette: 'https://picsum.photos/800/600?random=11',
            creampie: 'https://dummyimage.com/800x600/ff69b4/ffffff.jpg&text=Content',
            cumshot: 'https://picsum.photos/800/600?random=13',
            deepthroat: 'https://dummyimage.com/800x600/dc143c/ffffff.jpg&text=Content',
            ebony: 'https://picsum.photos/800/600?random=15',
            fetish: 'https://dummyimage.com/800x600/800080/ffffff.jpg&text=Content',
            fingering: 'https://picsum.photos/800/600?random=17',
            hardcore: 'https://dummyimage.com/800x600/ff4500/ffffff.jpg&text=Content',
            latina: 'https://picsum.photos/800/600?random=19',
            lesbian: 'https://dummyimage.com/800x600/ff1493/ffffff.jpg&text=Content',
            masturbation: 'https://picsum.photos/800/600?random=21',
            milf: 'https://dummyimage.com/800x600/8b4513/ffffff.jpg&text=Content',
            missionary: 'https://picsum.photos/800/600?random=23',
            redhead: 'https://dummyimage.com/800x600/ff6347/ffffff.jpg&text=Content',
            teen: 'https://picsum.photos/800/600?random=25',
            threesome: 'https://dummyimage.com/800x600/9370db/ffffff.jpg&text=Content'
        };
    }

    /**
     * Test if a URL is accessible
     */
    async testUrlAccessibility(url, timeout = 8000) {
        try {
            const response = await axios.head(url, {
                timeout: timeout,
                validateStatus: (status) => status < 400,
                maxRedirects: 3
            });

            return {
                accessible: true,
                status: response.status,
                contentType: response.headers['content-type'],
                contentLength: response.headers['content-length']
            };
        } catch (error) {
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    /**
     * Get a working video URL
     */
    async getWorkingVideoUrl() {
        console.log('[MediaSource] Finding working video URL...');
        
        for (const videoUrl of this.workingVideoSources) {
            const test = await this.testUrlAccessibility(videoUrl);
            if (test.accessible) {
                console.log(`[MediaSource] ✅ Found working video: ${videoUrl}`);
                return {
                    url: videoUrl,
                    type: 'video',
                    verified: true,
                    contentType: test.contentType,
                    size: test.contentLength
                };
            } else {
                console.log(`[MediaSource] ❌ Video failed: ${videoUrl} - ${test.error}`);
            }
        }

        // Fallback to first video even if not verified
        return {
            url: this.workingVideoSources[0],
            type: 'video',
            verified: false,
            fallback: true
        };
    }

    /**
     * Get a working image URL for category
     */
    async getWorkingImageUrl(category) {
        console.log(`[MediaSource] Getting working image for category: ${category}`);
        
        // Try category-specific image first
        if (this.categoryImages[category]) {
            const test = await this.testUrlAccessibility(this.categoryImages[category]);
            if (test.accessible) {
                return {
                    url: this.categoryImages[category],
                    type: 'image',
                    verified: true,
                    category: category
                };
            }
        }

        // Try general working images
        for (const imageUrl of this.workingImageSources) {
            const test = await this.testUrlAccessibility(imageUrl);
            if (test.accessible) {
                console.log(`[MediaSource] ✅ Found working image: ${imageUrl}`);
                return {
                    url: imageUrl,
                    type: 'image',
                    verified: true
                };
            }
        }

        // Final fallback
        return {
            url: `https://dummyimage.com/800x600/1da1f2/ffffff.jpg&text=${encodeURIComponent(category.toUpperCase())}`,
            type: 'image',
            verified: false,
            fallback: true,
            category: category
        };
    }

    /**
     * Get random verified media content
     */
    async getVerifiedContent(category) {
        try {
            console.log(`[MediaSource] Getting verified content for: ${category}`);
            
            // 60% chance for video, 40% for image
            const preferVideo = Math.random() > 0.4;
            
            if (preferVideo) {
                const video = await this.getWorkingVideoUrl();
                if (video.verified) {
                    return video;
                }
                // Fall back to image if video not working
            }

            return await this.getWorkingImageUrl(category);

        } catch (error) {
            console.log('[MediaSource] Error getting verified content:', error.message);
            
            // Ultimate fallback
            return {
                url: `https://dummyimage.com/800x600/ff1493/ffffff.jpg&text=${encodeURIComponent(category.toUpperCase())}`,
                type: 'image',
                verified: false,
                error: true,
                category: category
            };
        }
    }

    /**
     * Batch test all sources for health monitoring
     */
    async testAllSources() {
        console.log('[MediaSource] Testing all media sources...');
        
        const results = {
            videos: { working: 0, total: this.workingVideoSources.length },
            images: { working: 0, total: this.workingImageSources.length },
            tested: new Date().toISOString()
        };

        // Test videos
        for (const video of this.workingVideoSources) {
            const test = await this.testUrlAccessibility(video, 5000);
            if (test.accessible) {
                results.videos.working++;
            }
        }

        // Test images (sample a few)
        const sampleImages = this.workingImageSources.slice(0, 3);
        for (const image of sampleImages) {
            const test = await this.testUrlAccessibility(image, 5000);
            if (test.accessible) {
                results.images.working++;
            }
        }

        console.log('[MediaSource] Source health:', results);
        return results;
    }
}

module.exports = MediaSourceProvider;

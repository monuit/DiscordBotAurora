const mongoose = require('mongoose');

/**
 * Schema for tracking posted content to prevent duplicates
 */
const PostedContentSchema = new mongoose.Schema({
    // Content identification
    url: {
        type: String,
        required: true,
        index: true
    },
    urlHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Source information
    source: {
        type: String,
        required: true,
        enum: ['redgifs', 'x', 'twitter'],
        index: true
    },
    category: {
        type: String,
        required: true,
        index: true
    },
    
    // Posting details
    channelId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    messageId: {
        type: String,
        required: true
    },
    
    // Timing information
    postedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    availableAfter: {
        type: Date,
        required: true,
        index: true
    },
    
    // Content metadata
    title: String,
    thumbnail: String,
    description: String,
    
    // Performance tracking
    postCount: {
        type: Number,
        default: 1
    },
    lastPostedChannels: [{
        channelId: String,
        postedAt: Date
    }]
}, {
    timestamps: true
});

// Compound indexes for efficient queries
PostedContentSchema.index({ source: 1, category: 1, availableAfter: 1 });
PostedContentSchema.index({ channelId: 1, postedAt: 1 });
PostedContentSchema.index({ urlHash: 1, availableAfter: 1 });
PostedContentSchema.index({ availableAfter: 1 }); // For cleanup queries

// TTL index - automatically delete records older than 75 hours (3 days + buffer)
PostedContentSchema.index({ postedAt: 1 }, { expireAfterSeconds: 75 * 60 * 60 });

/**
 * Static method to check if content can be posted
 */
PostedContentSchema.statics.canPostContent = async function(url, source, category, channelId) {
    const crypto = require('crypto');
    const urlHash = crypto.createHash('sha256').update(url).digest('hex');
    const now = new Date();
    
    try {
        // Check if this exact content was posted in the last 72 hours
        const recentPost = await this.findOne({
            urlHash: urlHash,
            availableAfter: { $gt: now }
        });
        
        if (recentPost) {
            // Content was posted recently, check if it was in the same channel
            const channelPost = recentPost.lastPostedChannels.find(
                channel => channel.channelId === channelId
            );
            
            if (channelPost) {
                // Posted in same channel within 72 hours
                return {
                    canPost: false,
                    reason: 'duplicate_same_channel',
                    lastPosted: channelPost.postedAt,
                    availableAfter: recentPost.availableAfter
                };
            } else {
                // Posted in different channel within 72 hours - still allow
                return {
                    canPost: true,
                    reason: 'different_channel',
                    existingPost: recentPost
                };
            }
        }
        
        return {
            canPost: true,
            reason: 'new_content'
        };
        
    } catch (error) {
        console.error('[ContentTracker] Error checking content:', error);
        // In case of error, allow posting to avoid blocking
        return {
            canPost: true,
            reason: 'error_fallback'
        };
    }
};

/**
 * Static method to record posted content
 */
PostedContentSchema.statics.recordPostedContent = async function(contentData, channelId, guildId, messageId) {
    const crypto = require('crypto');
    const urlHash = crypto.createHash('sha256').update(contentData.url).digest('hex');
    const now = new Date();
    const availableAfter = new Date(now.getTime() + (72 * 60 * 60 * 1000)); // 72 hours from now
    
    try {
        // Try to update existing record if it exists
        const existingPost = await this.findOne({ urlHash: urlHash });
        
        if (existingPost) {
            // Update existing record
            existingPost.postCount += 1;
            existingPost.lastPostedChannels.push({
                channelId: channelId,
                postedAt: now
            });
            
            // Keep only last 10 channel records to prevent bloat
            if (existingPost.lastPostedChannels.length > 10) {
                existingPost.lastPostedChannels = existingPost.lastPostedChannels.slice(-10);
            }
            
            // Update availability if this post extends the window
            if (availableAfter > existingPost.availableAfter) {
                existingPost.availableAfter = availableAfter;
            }
            
            await existingPost.save();
            return existingPost;
        } else {
            // Create new record
            const newPost = new this({
                url: contentData.url,
                urlHash: urlHash,
                source: contentData.source || 'unknown',
                category: contentData.category || 'unknown',
                channelId: channelId,
                guildId: guildId,
                messageId: messageId,
                postedAt: now,
                availableAfter: availableAfter,
                title: contentData.title,
                thumbnail: contentData.thumbnail,
                description: contentData.description,
                lastPostedChannels: [{
                    channelId: channelId,
                    postedAt: now
                }]
            });
            
            await newPost.save();
            return newPost;
        }
        
    } catch (error) {
        console.error('[ContentTracker] Error recording content:', error);
        // Don't throw error to avoid breaking the posting flow
        return null;
    }
};

/**
 * Static method to cleanup old records (manual cleanup for maintenance)
 */
PostedContentSchema.statics.cleanupOldRecords = async function() {
    const cutoffDate = new Date(Date.now() - (75 * 60 * 60 * 1000)); // 75 hours ago
    
    try {
        const result = await this.deleteMany({
            postedAt: { $lt: cutoffDate }
        });
        
        console.log(`[ContentTracker] Cleaned up ${result.deletedCount} old content records`);
        return result.deletedCount;
    } catch (error) {
        console.error('[ContentTracker] Error during cleanup:', error);
        return 0;
    }
};

/**
 * Static method to get posting statistics
 */
PostedContentSchema.statics.getStats = async function() {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const last72h = new Date(now.getTime() - (72 * 60 * 60 * 1000));
        
        const [total, last24hCount, last72hCount, bySource] = await Promise.all([
            this.countDocuments(),
            this.countDocuments({ postedAt: { $gte: last24h } }),
            this.countDocuments({ postedAt: { $gte: last72h } }),
            this.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } }
            ])
        ]);
        
        return {
            total,
            last24h: last24hCount,
            last72h: last72hCount,
            bySource: bySource.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
    } catch (error) {
        console.error('[ContentTracker] Error getting stats:', error);
        return null;
    }
};

module.exports = mongoose.model('PostedContent', PostedContentSchema);

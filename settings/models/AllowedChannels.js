const mongoose = require("mongoose");

const AllowedChannelsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    channelName: {
        type: String,
        default: 'Unknown'
    },
    addedBy: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Compound index for efficient queries
AllowedChannelsSchema.index({ guildId: 1, channelId: 1 }, { unique: true });
AllowedChannelsSchema.index({ guildId: 1, isActive: 1 });

module.exports = mongoose.model("AllowedChannels", AllowedChannelsSchema);

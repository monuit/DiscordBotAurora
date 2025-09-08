const mongoose = require('mongoose');

const AutoPostConfigSchema = new mongoose.Schema({
    configId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    source: { type: String, required: true, enum: ['redgifs', 'x', 'twitter'] },
    category: { type: String, required: true },
    userId: String,
    isRunning: { type: Boolean, default: true, index: true },
    suspended: { type: Boolean, default: false },
    nextPostTime: { type: Date, index: true },
    lastPost: Date,
    lastPostTime: Date,
    postCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

AutoPostConfigSchema.index({ channelId: 1, isRunning: 1 });
AutoPostConfigSchema.index({ guildId: 1, isRunning: 1 });
AutoPostConfigSchema.index({ nextPostTime: 1 });

module.exports = mongoose.model('AutoPostConfig', AutoPostConfigSchema);

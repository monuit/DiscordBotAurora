const mongoose = require('mongoose');

const AutoPromoConfigSchema = new mongoose.Schema({
    campaignType: { type: String, enum: ['role', 'premium'], required: true },
    channelId: { type: String, required: true },
    extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRunning: { type: Boolean, default: false },
    lastSentAt: { type: Date, default: null },
    nextSendAt: { type: Date, default: null }
}, { timestamps: true });

AutoPromoConfigSchema.index({ campaignType: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('AutoPromoConfig', AutoPromoConfigSchema);

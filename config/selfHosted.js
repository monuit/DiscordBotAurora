const SELF_HOSTED_CONFIG = {
    isPremium: true,
    maxAutoChannels: 999, // No limit
    postingInterval: 60000, // 1 minute instead of 2
    enableAllAPIs: true,
    rateLimitBypass: true
};

module.exports = SELF_HOSTED_CONFIG;
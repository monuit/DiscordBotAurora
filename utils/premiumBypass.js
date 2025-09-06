// Create this file to bypass all premium checks

function bypassPremiumCheck(interaction) {
    return true; // Always return true for self-hosted
}

function isPremiumGuild(guildId) {
    return true; // Always return true for self-hosted
}

module.exports = {
    bypassPremiumCheck,
    isPremiumGuild
};
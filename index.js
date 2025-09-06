const MainClient = require("./spicy-flix.js");
const { displayStartupBanner } = require('./utils/startupBanner');

// Display startup banner
displayStartupBanner();

const client = new MainClient();

client.connect()
    .then(() => {
        console.log(`Logged in as ${client.user.tag}!...`);
        console.log(`Total shards: ${client.count} | id: ${client.id}`);
    })
    .catch(console.error);

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Send critical error webhook
    if (process.env.ER_WEBHOOK) {
        const { WebhookClient, EmbedBuilder } = require('discord.js');
        const errorWebhook = new WebhookClient({ url: process.env.ER_WEBHOOK });
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('CRITICAL: Uncaught Exception')
            .setDescription(`${error.message}\n\`\`\`${error.stack}\`\`\``)
            .setColor('#ff0000')
            .setTimestamp();
            
        errorWebhook.send({ embeds: [errorEmbed] }).catch(console.error);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    // Filter out timing-related errors to prevent spam
    if (reason && (reason.code === 10062 || 
                   reason.code === 40060 || // Interaction already acknowledged
                   reason.message?.includes('Unknown interaction') ||
                   reason.message?.includes('interaction has already been acknowledged'))) {
        console.log('[TIMING] Filtered unhandled rejection - interaction timing issue');
        return;
    }

    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Send critical error webhook for real errors only
    if (process.env.ER_WEBHOOK) {
        const { WebhookClient, EmbedBuilder } = require('discord.js');
        const errorWebhook = new WebhookClient({ url: process.env.ER_WEBHOOK });
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('CRITICAL: Unhandled Promise Rejection')
            .setDescription(`${reason}`)
            .setColor('#ff0000')
            .setTimestamp();
            
        errorWebhook.send({ embeds: [errorEmbed] }).catch(console.error);
    }
});

module.exports = client;

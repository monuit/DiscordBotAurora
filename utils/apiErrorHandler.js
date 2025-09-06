const { EmbedBuilder, WebhookClient } = require('discord.js');

class APIErrorHandler {
    static async safeAPICall(apiFunction, context = 'Unknown API') {
        try {
            return await apiFunction();
        } catch (error) {
            console.error(`API Error in ${context}:`, error);
            
            // Send error webhook
            if (process.env.ER_WEBHOOK) {
                try {
                    const errorWebhook = new WebhookClient({ url: process.env.ER_WEBHOOK });
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('API Error')
                        .setDescription(`**Context:** ${context}\n**Error:** ${error.message}`)
                        .setColor('#ff0000')
                        .setTimestamp();
                    await errorWebhook.send({ embeds: [errorEmbed] });
                } catch (webhookError) {
                    console.error('Failed to send API error webhook:', webhookError);
                }
            }
            
            return null; // Return null on error instead of crashing
        }
    }

    static async safeWebhookSend(webhookUrl, content) {
        try {
            const webhook = new WebhookClient({ url: webhookUrl });
            await webhook.send(content);
            return true;
        } catch (error) {
            console.error('Webhook send failed:', error);
            return false;
        }
    }

    static async retryAPICall(apiFunction, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await apiFunction();
            } catch (error) {
                console.error(`API call attempt ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
}

module.exports = APIErrorHandler;
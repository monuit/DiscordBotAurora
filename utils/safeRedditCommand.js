const { EmbedBuilder } = require('discord.js');

async function safeRedditCommand(interaction, commandLogic, commandName = 'Reddit') {
    try {
        // Check if interaction is still valid
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2900000) { // 2.9 seconds
            console.log(`[${commandName}] Interaction too old (${Math.round(interactionAge/1000)}s), skipping`);
            return;
        }

        // Check if interaction can be replied to
        if (interaction.replied || interaction.deferred) {
            console.log(`[${commandName}] Interaction already handled, skipping`);
            return;
        }

        // Attempt to defer with timeout
        try {
            await Promise.race([
                interaction.deferReply(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Defer timeout')), 2500))
            ]);
        } catch (deferError) {
            if (deferError.code === 10062 || deferError.code === 40060 || deferError.message === 'Defer timeout') {
                console.log(`[${commandName}] Interaction timing issue during defer: ${deferError.message || deferError.code}`);
                return;
            }
            throw deferError;
        }

        // Execute the command logic
        await commandLogic();

    } catch (error) {
        // Filter out timing-related errors
        if (error.code === 10062 || error.code === 40060) {
            console.log(`[${commandName}] Interaction timing issue: ${error.message || error.code}`);
            return;
        }

        // Log real errors
        console.error(`[${commandName}] Command error:`, error);

        // Try to send error message if interaction is still valid
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ Something went wrong. Please try again.', 
                    flags: 64 
                });
            } else if (interaction.deferred) {
                await interaction.editReply({ 
                    content: '❌ Something went wrong. Please try again.' 
                });
            }
        } catch (replyError) {
            if (replyError.code !== 10062 && replyError.code !== 40060) {
                console.error(`[${commandName}] Failed to send error message:`, replyError);
            }
        }
    }
}

module.exports = safeRedditCommand;

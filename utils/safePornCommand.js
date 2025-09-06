/**
 * Universal error handler for porn commands
 * Handles interaction validation, deferring, and error catching
 */
async function safePornCommand(interaction, commandFunction, commandName = 'Command') {
    try {
        // Check if interaction is valid and not expired
        const now = Date.now();
        const interactionTime = interaction.createdTimestamp;
        const age = now - interactionTime;
        
        if (age > 2900000) { // 2.9 seconds (Discord interactions expire after 3 seconds)
            console.log(`[${commandName}] Interaction expired (${age}ms old), skipping`);
            return;
        }

        // Check if interaction can be deferred
        if (!interaction.isRepliable() || interaction.replied || interaction.deferred) {
            console.log(`[${commandName}] Interaction not ready for defer, skipping`);
            return;
        }

        // Defer the interaction safely
        try {
            await interaction.deferReply();
        } catch (error) {
            if (error.code === 40060 || error.code === 10062) {
                console.log(`[${commandName}] Interaction timing issue during defer: ${error.message}`);
                return;
            }
            throw error;
        }

        // Execute the command function
        await commandFunction();

    } catch (error) {
        // Handle specific Discord API errors
        if (error.code === 40060) {
            console.log(`[${commandName} Error]: Interaction has already been acknowledged.`);
            return;
        }
        
        if (error.code === 10062) {
            console.log(`[${commandName} Error]: Unknown interaction.`);
            return;
        }

        // For other errors, log them properly
        console.log(`[${commandName} Error]:`, error.message);
        
        // Try to send error message if interaction is still valid
        try {
            if (interaction.isRepliable() && !interaction.replied && interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while processing the ${commandName.toLowerCase()} command.`,
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.log(`[${commandName}] Failed to send error reply:`, replyError.message);
        }
    }
}

module.exports = safePornCommand;

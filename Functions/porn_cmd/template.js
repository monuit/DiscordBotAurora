// STANDARDIZED FUNCTION TEMPLATE FOR INTERACTION HANDLING
// This template should be used for all functions to prevent timing issues

const standardTemplate = async function(interaction, client, functionName, requestLogic) {
    try {
        // 1. Check function-level rate limiting first
        const rateCheck = checkFunctionRateLimit(functionName, interaction.user.id);
        if (!rateCheck.allowed) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: `⏱️ Please wait ${rateCheck.remaining} seconds before using this again.`,
                    flags: 64 
                });
            }
            return;
        }

        // 2. Check interaction age immediately
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2000) { // 2 second limit
            console.log(`[${functionName.toUpperCase()}] Interaction too old (${interactionAge}ms), skipping`);
            return;
        }

        // 3. Check if interaction is still valid before deferring
        if (!interaction.isRepliable()) {
            console.log(`[${functionName.toUpperCase()}] Interaction no longer repliable`);
            return;
        }

        // 4. Defer immediately to prevent timeout
        await interaction.deferReply();

        // 5. NSFW check
        if (!interaction.channel.nsfw) {
            await interaction.editReply({ embeds: [defaultNSFW(interaction)] }).catch(() => {});
            return;
        }

        // 6. Execute the actual request logic
        await requestLogic(interaction, client);

    } catch (error) {
        console.log(`[${functionName.toUpperCase()} Error]:`, error.message);
        
        // Don't try to reply if interaction is already expired
        if (error.code !== 10062 && 
            error.code !== 40060 && 
            !error.message.includes('Unknown interaction') &&
            !error.message.includes('already been acknowledged')) {
            
            try {
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: "❌ An error occurred while processing your request.",
                        embeds: []
                    });
                } else if (interaction.isRepliable()) {
                    await interaction.reply({
                        content: "❌ An error occurred while processing your request.",
                        flags: 64 
                    });
                }
            } catch (replyError) {
                console.log(`[${functionName.toUpperCase()}] Failed to send error message:`, replyError.message);
            }
        }
    }
};

module.exports = { standardTemplate };

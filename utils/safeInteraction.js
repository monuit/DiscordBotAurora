const chalk = require('chalk');

/**
 * Safely defer an interaction reply with timeout and validation checks
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 * @param {Object} options Optional parameters for the defer operation
 * @returns {Promise<boolean>} True if successful, false if failed/timed out
 */
async function safeDeferReply(interaction, options = {}) {
    try {
        // Check if interaction is still valid
        if (!interaction.isRepliable()) {
            console.log(chalk.yellow(`[TIMING] Cannot defer ${interaction.commandName}: interaction no longer repliable`));
            return false;
        }

        // Check interaction age (Discord expires interactions after 3 seconds)
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2500) {
            console.log(chalk.yellow(`[TIMING] Cannot defer ${interaction.commandName}: interaction too old (${interactionAge}ms)`));
            return false;
        }

        // Attempt to defer with a short timeout
        const deferPromise = interaction.deferReply(options);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Defer timeout')), 2000);
        });

        await Promise.race([deferPromise, timeoutPromise]);
        return true;

    } catch (error) {
        if (error.code === 10062 || error.message.includes('Unknown interaction')) {
            console.log(chalk.yellow(`[TIMING] Defer failed for ${interaction.commandName}: interaction expired`));
        } else if (error.message === 'Defer timeout') {
            console.log(chalk.yellow(`[TIMING] Defer timed out for ${interaction.commandName}`));
        } else {
            console.log(chalk.red(`[ERROR] Defer failed for ${interaction.commandName}: ${error.message}`));
        }
        return false;
    }
}

/**
 * Safely reply to an interaction with timeout and validation checks
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 * @param {Object} replyOptions The reply options
 * @returns {Promise<boolean>} True if successful, false if failed/timed out
 */
async function safeReply(interaction, replyOptions) {
    try {
        // Check if interaction is still valid
        if (!interaction.isRepliable()) {
            console.log(chalk.yellow(`[TIMING] Cannot reply to ${interaction.commandName}: interaction no longer repliable`));
            return false;
        }

        // Check interaction age
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2500) {
            console.log(chalk.yellow(`[TIMING] Cannot reply to ${interaction.commandName}: interaction too old (${interactionAge}ms)`));
            return false;
        }

        // Attempt to reply with a short timeout
        const replyPromise = interaction.reply(replyOptions);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Reply timeout')), 2000);
        });

        await Promise.race([replyPromise, timeoutPromise]);
        return true;

    } catch (error) {
        if (error.code === 10062 || error.message.includes('Unknown interaction')) {
            console.log(chalk.yellow(`[TIMING] Reply failed for ${interaction.commandName}: interaction expired`));
        } else if (error.message === 'Reply timeout') {
            console.log(chalk.yellow(`[TIMING] Reply timed out for ${interaction.commandName}`));
        } else {
            console.log(chalk.red(`[ERROR] Reply failed for ${interaction.commandName}: ${error.message}`));
        }
        return false;
    }
}

module.exports = {
    safeDeferReply,
    safeReply
};

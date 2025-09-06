const chalk = require('chalk');

/**
 * Universal wrapper for command functions to handle interaction validation
 * This prevents commands from trying to defer expired interactions
 */
function createSafeCommandWrapper(originalFunction, commandName) {
    return async function(interaction, ...args) {
        try {
            // Skip defer validation if interaction is already deferred/replied
            if (interaction.deferred || interaction.replied) {
                console.log(chalk.blue(`[SAFE CMD] ${commandName} already processed, executing directly`));
                return await originalFunction(interaction, ...args);
            }

            // Check if interaction is still valid
            if (!interaction.isRepliable()) {
                console.log(chalk.yellow(`[SAFE CMD] ${commandName} interaction no longer repliable, skipping`));
                return;
            }

            // Check interaction age
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(chalk.yellow(`[SAFE CMD] ${commandName} interaction too old (${interactionAge}ms), skipping`));
                return;
            }

            // Execute the original function
            return await originalFunction(interaction, ...args);

        } catch (error) {
            // Handle specific interaction errors gracefully
            if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
                console.log(chalk.yellow(`[SAFE CMD] ${commandName} interaction expired during execution`));
                return;
            }
            
            if (error.code === 40060 || error.message?.includes('already been acknowledged')) {
                console.log(chalk.yellow(`[SAFE CMD] ${commandName} interaction already acknowledged`));
                return;
            }

            // Re-throw other errors
            console.log(chalk.red(`[SAFE CMD] ${commandName} error: ${error.message}`));
            throw error;
        }
    };
}

/**
 * Wraps all functions in a module with safe command wrappers
 */
function wrapCommandModule(moduleExports, moduleName = 'Unknown') {
    const wrappedModule = {};
    
    for (const [key, value] of Object.entries(moduleExports)) {
        if (typeof value === 'function') {
            wrappedModule[key] = createSafeCommandWrapper(value, `${moduleName}.${key}`);
        } else {
            wrappedModule[key] = value;
        }
    }
    
    return wrappedModule;
}

module.exports = {
    createSafeCommandWrapper,
    wrapCommandModule
};

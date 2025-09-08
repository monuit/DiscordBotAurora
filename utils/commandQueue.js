const chalk = require('chalk');

class CommandQueue {
    constructor(maxConcurrent = 1) { // Changed to 1 for sequential processing
        this.queue = [];
        this.processing = new Set();
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Add a command to the queue
     * @param {import('discord.js').ChatInputCommandInteraction} interaction 
     * @param {Function} commandFunction 
     * @param {Array} args 
     */
    async enqueue(interaction, commandFunction, args = []) {
        const taskId = `${interaction.user.id}-${Date.now()}`;
        
        // Check if interaction is still valid
        if (!interaction.isRepliable()) {
            console.log(chalk.yellow(`[QUEUE] Skipping expired interaction for ${interaction.commandName}`));
            return;
        }

        const task = {
            id: taskId,
            interaction,
            commandFunction,
            args,
            timestamp: Date.now(),
            userId: interaction.user.id,
            commandName: interaction.commandName
        };

        this.queue.push(task);
        console.log(chalk.blue(`[QUEUE] Added ${interaction.commandName} to queue (${this.queue.length} pending, ${this.processing.size} processing)`));

        this.processQueue();
    }

    async processQueue() {
        // Don't process if we're at max concurrent limit
        if (this.processing.size >= this.maxConcurrent) {
            return;
        }

        // Get next task
        const task = this.queue.shift();
        if (!task) {
            return;
        }

        // Check if task is too old (interactions expire after 3 seconds)
        const age = Date.now() - task.timestamp;
        if (age > 2500) {
            console.log(chalk.yellow(`[QUEUE] Dropping expired task ${task.commandName} (${age}ms old)`));
            this.processQueue(); // Process next task
            return;
        }

        // Check if interaction is still valid
        if (!task.interaction.isRepliable()) {
            console.log(chalk.yellow(`[QUEUE] Dropping non-repliable task ${task.commandName}`));
            this.processQueue(); // Process next task
            return;
        }

        // Mark as processing
        this.processing.add(task.id);
        console.log(chalk.green(`[QUEUE] Processing ${task.commandName} (${this.processing.size}/${this.maxConcurrent})`));

        try {
            // Pre-validate interaction before executing command
            if (!task.interaction.isRepliable()) {
                console.log(chalk.yellow(`[QUEUE] ${task.commandName} interaction no longer repliable, skipping`));
                return;
            }

            // Check interaction age again before execution
            const currentAge = Date.now() - task.timestamp;
            if (currentAge > 2500) {
                console.log(chalk.yellow(`[QUEUE] ${task.commandName} interaction too old (${currentAge}ms), skipping`));
                return;
            }

            // Execute the command with a timeout (let the command handle its own defer)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Command timeout')), 15000);
            });

            const commandPromise = task.commandFunction(task.interaction, ...task.args);
            
            await Promise.race([commandPromise, timeoutPromise]);
            
            console.log(chalk.green(`[QUEUE] Completed ${task.commandName}`));

        } catch (error) {
            console.log(chalk.red(`[QUEUE] Error in ${task.commandName}: ${error.message}`));
            
            // Only try to respond if it's not a timing error
            if (error.code !== 10062 && !error.message.includes('Unknown interaction')) {
                try {
                    // Try to send an error message if interaction is still valid
                    if (task.interaction.isRepliable()) {
                        if (!task.interaction.replied && !task.interaction.deferred) {
                            await task.interaction.reply({ 
                                content: '❌ An error occurred while processing your command.', 
                                flags: 64 
                            });
                        } else if (task.interaction.deferred && !task.interaction.replied) {
                            await task.interaction.editReply({ 
                                content: '❌ An error occurred while processing your command.' 
                            });
                        }
                    }
                } catch (replyError) {
                    console.log(chalk.yellow(`[QUEUE] Could not send error reply: ${replyError.message}`));
                }
            }
        } finally {
            // Remove from processing
            this.processing.delete(task.id);
            
            // Process next task
            setImmediate(() => this.processQueue());
        }
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            pending: this.queue.length,
            processing: this.processing.size,
            maxConcurrent: this.maxConcurrent
        };
    }

    /**
     * Clear expired tasks from queue
     */
    cleanupQueue() {
        const now = Date.now();
        const before = this.queue.length;
        
        this.queue = this.queue.filter(task => {
            const age = now - task.timestamp;
            const isValid = age < 2500 && task.interaction.isRepliable();
            
            if (!isValid) {
                console.log(chalk.yellow(`[QUEUE] Cleaned up expired task ${task.commandName}`));
            }
            
            return isValid;
        });

        const cleaned = before - this.queue.length;
        if (cleaned > 0) {
            console.log(chalk.blue(`[QUEUE] Cleaned ${cleaned} expired tasks`));
        }
    }
}

// Global command queue instance
const commandQueue = new CommandQueue(3); // Max 3 concurrent commands

// Cleanup expired tasks every 5 seconds
setInterval(() => {
    commandQueue.cleanupQueue();
}, 5000);

module.exports = { commandQueue };

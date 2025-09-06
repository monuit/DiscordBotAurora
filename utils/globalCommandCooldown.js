/**
 * Global Command Cooldown Manager
 * Ensures only one instance of each command type can run at a time across the entire server
 */

class GlobalCommandCooldown {
    constructor() {
        // Track which commands are currently running
        this.activeCommands = new Map(); // commandName -> { userId, guildId, timestamp }
        this.stats = {
            blocked: 0,
            completed: 0
        };
    }

    /**
     * Check if a command is currently active and start it if not
     * @param {string} commandName - The command name (e.g., 'anal', 'boobs')
     * @param {string} userId - User ID who is running the command
     * @param {string} guildId - Guild ID where command is being run
     * @returns {boolean} - true if command can start, false if blocked
     */
    startCommand(commandName, userId, guildId) {
        // Check if this command is already running
        if (this.activeCommands.has(commandName)) {
            const activeCommand = this.activeCommands.get(commandName);
            
            // Check if the active command is stale (over 30 seconds old)
            const age = Date.now() - activeCommand.timestamp;
            if (age > 30000) {
                console.log(`[COOLDOWN] Clearing stale ${commandName} command (${Math.round(age/1000)}s old)`);
                this.activeCommands.delete(commandName);
            } else {
                this.stats.blocked++;
                console.log(`[COOLDOWN] Blocked ${commandName} for user ${userId} - already running by ${activeCommand.userId}`);
                return false;
            }
        }

        // Start the command
        this.activeCommands.set(commandName, {
            userId,
            guildId,
            timestamp: Date.now()
        });

        console.log(`[COOLDOWN] Started ${commandName} for user ${userId}`);
        return true;
    }

    /**
     * Mark a command as completed
     * @param {string} commandName - The command name
     * @param {string} userId - User ID who was running the command
     */
    completeCommand(commandName, userId) {
        const activeCommand = this.activeCommands.get(commandName);
        
        if (activeCommand && activeCommand.userId === userId) {
            this.activeCommands.delete(commandName);
            this.stats.completed++;
            console.log(`[COOLDOWN] Completed ${commandName} for user ${userId}`);
        }
    }

    /**
     * Get the current user running a command (if any)
     * @param {string} commandName - The command name
     * @returns {object|null} - Active command info or null
     */
    getActiveCommand(commandName) {
        return this.activeCommands.get(commandName) || null;
    }

    /**
     * Get cooldown stats
     * @returns {object} - Stats object
     */
    getStats() {
        return {
            ...this.stats,
            activeCommands: this.activeCommands.size
        };
    }

    /**
     * Clean up stale commands (called periodically)
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [commandName, commandInfo] of this.activeCommands.entries()) {
            const age = now - commandInfo.timestamp;
            if (age > 30000) { // 30 seconds
                this.activeCommands.delete(commandName);
                cleaned++;
                console.log(`[COOLDOWN] Cleaned up stale ${commandName} command`);
            }
        }

        if (cleaned > 0) {
            console.log(`[COOLDOWN] Cleaned up ${cleaned} stale commands`);
        }
    }
}

// Create global instance
const globalCooldown = new GlobalCommandCooldown();

// Clean up stale commands every 30 seconds
setInterval(() => {
    globalCooldown.cleanup();
}, 30000);

module.exports = globalCooldown;

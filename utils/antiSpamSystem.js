/**
 * Anti-Spam Detection System
 * Prevents users from spamming commands and temporarily mutes repeat offenders
 */

const WhitelistRoles = require('../settings/models/WhitelistRoles');

class AntiSpamSystem {
    constructor() {
        // Track user command usage: userId -> { commands: [], lastCommand: timestamp }
        this.userActivity = new Map();
        
        // Temporarily muted users: userId -> { mutedUntil: timestamp, reason: string }
        this.mutedUsers = new Map();
        
        // Configuration
        this.config = {
            // Spam detection thresholds
            maxCommandsPerMinute: 6,        // Max commands per minute
            maxSameCommandRepeats: 3,       // Max same command in a row
            trackingWindowMs: 60000,        // 1 minute tracking window
            
            // Mute durations (in milliseconds)
            firstOffenseMute: 3 * 60000,    // 3 minutes
            secondOffenseMute: 10 * 60000,  // 10 minutes
            thirdOffenseMute: 30 * 60000,   // 30 minutes
            
            // Cleanup intervals
            cleanupInterval: 5 * 60000      // Clean old data every 5 minutes
        };
        
        // Start cleanup timer
        this.startCleanupTimer();
    }

    /**
     * Check if user is currently muted
     * @param {string} userId - User ID to check
     * @returns {boolean} - True if user is muted
     */
    isUserMuted(userId) {
        const muteInfo = this.mutedUsers.get(userId);
        if (!muteInfo) return false;
        
        // Check if mute has expired
        if (Date.now() > muteInfo.mutedUntil) {
            this.mutedUsers.delete(userId);
            console.log(`[ANTI-SPAM] User ${userId} unmuted (timeout expired)`);
            return false;
        }
        
        return true;
    }

    /**
     * Get remaining mute time for user
     * @param {string} userId - User ID to check
     * @returns {number} - Remaining mute time in seconds, 0 if not muted
     */
    getMuteTimeRemaining(userId) {
        const muteInfo = this.mutedUsers.get(userId);
        if (!muteInfo) return 0;
        
        const remaining = Math.max(0, muteInfo.mutedUntil - Date.now());
        return Math.ceil(remaining / 1000);
    }

    /**
     * Check if command should be blocked due to spam
     * @param {string} userId - User ID
     * @param {string} commandName - Command being executed
     * @param {Object} interaction - Discord interaction object (optional, for role checking)
     * @returns {Object} - { allowed: boolean, reason?: string, muteTime?: number }
     */
    async checkCommand(userId, commandName, interaction = null) {
        // Check if user has whitelisted role (bypasses all anti-spam)
        if (interaction && interaction.member && interaction.guild) {
            try {
                const whitelistRoles = await WhitelistRoles.find({
                    guildId: interaction.guild.id,
                    isActive: true
                });

                if (whitelistRoles.length > 0) {
                    const userRoleIds = interaction.member.roles.cache.map(role => role.id);
                    const hasWhitelistRole = whitelistRoles.some(wr => userRoleIds.includes(wr.roleId));
                    
                    if (hasWhitelistRole) {
                        console.log(`[ANTI-SPAM] User ${userId} bypassed via whitelist role`);
                        return { allowed: true, bypassed: true };
                    }
                }
            } catch (error) {
                console.error('[ANTI-SPAM] Error checking whitelist roles:', error);
                // Continue with normal anti-spam checking if role check fails
            }
        }

        // Check if user is muted
        if (this.isUserMuted(userId)) {
            const remaining = this.getMuteTimeRemaining(userId);
            return {
                allowed: false,
                reason: 'muted',
                muteTime: remaining
            };
        }

        // Get or create user activity record
        let userActivity = this.userActivity.get(userId);
        if (!userActivity) {
            userActivity = { commands: [], offenseCount: 0 };
            this.userActivity.set(userId, userActivity);
        }

        const now = Date.now();
        const windowStart = now - this.config.trackingWindowMs;

        // Clean old commands from tracking window
        userActivity.commands = userActivity.commands.filter(cmd => cmd.timestamp > windowStart);

        // Check for spam patterns
        const recentCommands = userActivity.commands;
        const commandsInWindow = recentCommands.length;
        
        // Count same command repeats
        let sameCommandCount = 0;
        for (let i = recentCommands.length - 1; i >= 0; i--) {
            if (recentCommands[i].name === commandName) {
                sameCommandCount++;
            } else {
                break; // Stop at first different command
            }
        }

        // Check spam conditions
        let spamDetected = false;
        let reason = '';

        if (commandsInWindow >= this.config.maxCommandsPerMinute) {
            spamDetected = true;
            reason = `too many commands (${commandsInWindow} in 1 minute)`;
        } else if (sameCommandCount >= this.config.maxSameCommandRepeats) {
            spamDetected = true;
            reason = `repeating same command (${sameCommandCount} times in a row)`;
        }

        if (spamDetected) {
            // Determine mute duration based on offense count
            userActivity.offenseCount++;
            let muteDuration;
            
            if (userActivity.offenseCount === 1) {
                muteDuration = this.config.firstOffenseMute;
            } else if (userActivity.offenseCount === 2) {
                muteDuration = this.config.secondOffenseMute;
            } else {
                muteDuration = this.config.thirdOffenseMute;
            }

            // Mute the user
            this.mutedUsers.set(userId, {
                mutedUntil: now + muteDuration,
                reason: reason,
                offenseCount: userActivity.offenseCount
            });

            console.log(`[ANTI-SPAM] User ${userId} muted for ${Math.ceil(muteDuration/60000)} minutes - ${reason}`);

            return {
                allowed: false,
                reason: 'spam_detected',
                muteTime: Math.ceil(muteDuration / 1000),
                spamReason: reason
            };
        }

        // Allow command and record it
        recentCommands.push({
            name: commandName,
            timestamp: now
        });

        return { allowed: true };
    }

    /**
     * Manually unmute a user (for admin purposes)
     * @param {string} userId - User ID to unmute
     */
    unmuteUser(userId) {
        if (this.mutedUsers.delete(userId)) {
            console.log(`[ANTI-SPAM] User ${userId} manually unmuted`);
            return true;
        }
        return false;
    }

    /**
     * Get spam statistics
     * @returns {Object} - Current spam system stats
     */
    getStats() {
        return {
            trackedUsers: this.userActivity.size,
            mutedUsers: this.mutedUsers.size,
            config: this.config
        };
    }

    /**
     * Start cleanup timer to remove old data
     */
    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    /**
     * Cleanup old tracking data
     */
    cleanup() {
        const now = Date.now();
        const windowStart = now - this.config.trackingWindowMs;
        let cleanedUsers = 0;
        let cleanedMutes = 0;

        // Clean user activity data
        for (const [userId, activity] of this.userActivity.entries()) {
            // Remove old commands
            const originalLength = activity.commands.length;
            activity.commands = activity.commands.filter(cmd => cmd.timestamp > windowStart);
            
            // Remove user record if no recent activity
            if (activity.commands.length === 0) {
                this.userActivity.delete(userId);
                cleanedUsers++;
            }
        }

        // Clean expired mutes
        for (const [userId, muteInfo] of this.mutedUsers.entries()) {
            if (now > muteInfo.mutedUntil) {
                this.mutedUsers.delete(userId);
                cleanedMutes++;
            }
        }

        if (cleanedUsers > 0 || cleanedMutes > 0) {
            console.log(`[ANTI-SPAM] Cleanup: ${cleanedUsers} users, ${cleanedMutes} expired mutes`);
        }
    }

    /**
     * Get system statistics for admin monitoring
     */
    getStats() {
        return {
            trackedUsers: this.userActivity.size,
            mutedUsers: this.mutedUsers.size,
            config: {
                maxCommandsPerMinute: this.config.maxCommandsPerMinute,
                maxSameCommandRepeats: this.config.maxSameCommandRepeats,
                trackingWindowMs: this.config.trackingWindowMs,
                firstOffenseMute: this.config.firstOffenseMute,
                secondOffenseMute: this.config.secondOffenseMute,
                thirdOffenseMute: this.config.thirdOffenseMute
            }
        };
    }

    /**
     * Manually unmute a user (admin action)
     */
    unmuteUser(userId) {
        if (this.mutedUsers.has(userId)) {
            this.mutedUsers.delete(userId);
            console.log(`[ANTI-SPAM] Admin unmuted user: ${userId}`);
            return true;
        }
        return false;
    }

    /**
     * Get list of currently muted users
     */
    getMutedUsers() {
        const result = [];
        const now = Date.now();
        
        for (const [userId, muteInfo] of this.mutedUsers.entries()) {
            if (now < muteInfo.mutedUntil) {
                result.push({
                    userId,
                    reason: muteInfo.reason,
                    remainingTime: muteInfo.mutedUntil - now
                });
            }
        }
        
        return result;
    }
}

// Create global instance
const antiSpamSystem = new AntiSpamSystem();

module.exports = antiSpamSystem;

const AccessControlRoles = require('../settings/models/AccessControlRoles');

class RoleAccessControl {
    /**
     * Check if a user has access to use bot commands
     * @param {Interaction} interaction - Discord interaction object
     * @param {Client} client - Discord client object
     * @returns {Object} - {hasAccess: boolean, message: string}
     */
    static async checkUserAccess(interaction, client) {
        try {
            // Always allow administrators
            if (interaction.member.permissions.has('Administrator')) {
                return { hasAccess: true, message: 'Administrator access' };
            }

            // Get all access control roles for this guild
            const accessRoles = await AccessControlRoles.find({
                guildId: interaction.guild.id,
                isActive: true
            });

            // If no access roles are configured, allow all users (default behavior)
            if (accessRoles.length === 0) {
                return { hasAccess: true, message: 'No access restrictions configured' };
            }

            // Check if user has any of the required roles
            const userRoles = interaction.member.roles.cache;
            const hasRequiredRole = accessRoles.some(accessRole => 
                userRoles.has(accessRole.roleId)
            );

            if (hasRequiredRole) {
                return { hasAccess: true, message: 'User has required role' };
            }

            // User doesn't have required role
            const roleNames = accessRoles.map(role => role.roleName).join(', ');
            return { 
                hasAccess: false, 
                message: `Access denied. You need one of these roles: ${roleNames}` 
            };

        } catch (error) {
            console.error('[Role Access Control] Error checking user access:', error);
            // Default to allowing access if there's an error
            return { hasAccess: true, message: 'Error checking access - default allow' };
        }
    }

    /**
     * Create an access denied embed
     * @param {string} message - Custom message to display
     * @returns {EmbedBuilder} - Discord embed object
     */
    static createAccessDeniedEmbed(message = 'Access denied') {
        const { EmbedBuilder } = require('discord.js');
        
        return new EmbedBuilder()
            .setTitle('🔒 Access Denied')
            .setDescription(`**${message}**\n\n` +
                           `To use this bot, you need to have one of the required roles.\n` +
                           `Contact a server administrator if you believe this is an error.\n\n` +
                           `**Administrators can configure role access using:**\n` +
                           `\`/manage-channels\` → **Manage Access Roles**`)
            .setColor('#ff0000')
            .setTimestamp()
            .setFooter({ text: 'Aurora Bot • Role-Based Access Control' });
    }

    /**
     * Get all access control roles for a guild
     * @param {string} guildId - Guild ID
     * @returns {Array} - Array of access control roles
     */
    static async getGuildAccessRoles(guildId) {
        try {
            return await AccessControlRoles.find({
                guildId: guildId,
                isActive: true
            });
        } catch (error) {
            console.error('[Role Access Control] Error getting guild access roles:', error);
            return [];
        }
    }

    /**
     * Add a role to access control
     * @param {string} guildId - Guild ID
     * @param {string} roleId - Role ID
     * @param {string} roleName - Role name
     * @param {string} addedBy - User ID who added the role
     * @returns {boolean} - Success status
     */
    static async addAccessRole(guildId, roleId, roleName, addedBy) {
        try {
            // Check if role already exists
            const existing = await AccessControlRoles.findOne({
                guildId: guildId,
                roleId: roleId,
                isActive: true
            });

            if (existing) {
                return { success: false, message: 'Role is already in access control list' };
            }

            // Add new access role
            const newAccessRole = new AccessControlRoles({
                guildId: guildId,
                roleId: roleId,
                roleName: roleName,
                addedBy: addedBy
            });

            await newAccessRole.save();
            return { success: true, message: 'Access role added successfully' };

        } catch (error) {
            console.error('[Role Access Control] Error adding access role:', error);
            return { success: false, message: 'Database error occurred' };
        }
    }

    /**
     * Remove a role from access control
     * @param {string} guildId - Guild ID
     * @param {string} roleId - Role ID
     * @returns {boolean} - Success status
     */
    static async removeAccessRole(guildId, roleId) {
        try {
            const result = await AccessControlRoles.updateOne(
                { guildId: guildId, roleId: roleId, isActive: true },
                { isActive: false }
            );

            if (result.modifiedCount > 0) {
                return { success: true, message: 'Access role removed successfully' };
            } else {
                return { success: false, message: 'Role not found in access control list' };
            }

        } catch (error) {
            console.error('[Role Access Control] Error removing access role:', error);
            return { success: false, message: 'Database error occurred' };
        }
    }
}

module.exports = RoleAccessControl;

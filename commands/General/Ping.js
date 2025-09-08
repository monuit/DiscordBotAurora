const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { request } = require("http");
const moment = require("moment");
require("moment-duration-format");
const RoleAccessControl = require("../../utils/roleAccessControl");

module.exports = {
    name: ["ping"],
    description: "check bot ping",
    run: async (interaction, client) => {
        try {
            // Check role-based access control
            const accessCheck = await RoleAccessControl.checkUserAccess(interaction);
            if (!accessCheck.hasAccess) {
                await interaction.reply({
                    embeds: [accessCheck.embed],
                    flags: 64
                });
                return;
            }

            // Measure the actual interaction roundtrip time
            const startTime = Date.now();
            
            // Use standard defer with error handling
            await interaction.deferReply();
            
            const endTime = Date.now();
            const interactionLatency = endTime - startTime;
            
            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(
                    `🏓 **Websocket Latency:** ${client.ws.ping}ms
` +
                    `⚡ **Interaction Latency:** ${interactionLatency}ms
` +
                    `🕐 **Bot Uptime:** ${Math.floor(client.uptime / 1000)}s`
                )

            await interaction.editReply({ embeds: [embed] }).catch(error => {
                // If edit fails, log but don't crash
                console.error('Ping command edit failed:', error.message);
            });
        } catch (error) {
            console.error('Ping command error:', error);
            // If the interaction hasn't been replied to yet, send an error message
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ An error occurred while checking ping.",
                    flags: 64
                }).catch(() => {});
            } else if (interaction.deferred) {
                await interaction.editReply({
                    content: "❌ An error occurred while checking ping."
                }).catch(() => {});
            }
        }
    }
}

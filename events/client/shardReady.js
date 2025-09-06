const { white, green, cyan } = require("chalk");
const { ShardingManager, EmbedBuilder, WebhookClient } = require('discord.js'); //imports the sharding manager
const { createDefaultHealthChecks } = require('../../utils/startupHealthCheck');
require("dotenv").config();

const web = new WebhookClient({ url: process.env.SHARDS_READY_WEBHOOK });
const erweb = new WebhookClient({ url: process.env.ER_WEBHOOK });

module.exports = async (client, id) => {
    console.log(white('[') + green('INFO') + white('] ') + green('Shard ') + white(id) + green(' Ready! Running health checks...'));
    
    // Run comprehensive health checks
    const healthCheck = createDefaultHealthChecks(client);
    const healthResults = await healthCheck.runAllChecks();
    
    // Determine status based on health check results
    const status = healthResults.success ? 'Healthy' : 'Issues Detected';
    const color = healthResults.success ? 'Green' : 'Orange';
    const emoji = healthResults.success ? '🟢' : '🟡';
    
    let embed = new EmbedBuilder()
        .setTitle(`${emoji} Shard ${id + 1} Startup Complete`)
        .setDescription(`Shard initialization finished with comprehensive health checks`)
        .setFields([
            {
                name: "🆔 Shard Information",
                value: `Shard ID: ${id + 1}\nStatus: ${status}`,
                inline: true
            },
            {
                name: "📊 Health Check Results",
                value: `✅ Passed: ${healthResults.successCount}\n⚠️ Warnings: ${healthResults.warningCount}\n❌ Critical: ${healthResults.criticalCount}`,
                inline: true
            },
            {
                name: "⏱️ Performance",
                value: `Startup Time: ${healthResults.totalDuration}ms\nTotal Checks: ${healthResults.totalChecks}`,
                inline: true
            }
        ])
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'Aurora Shard Health Monitor' });

    // Add issues field if there are any problems
    if (!healthResults.success) {
        const issues = healthResults.results
            .filter(r => r.status !== 'success')
            .slice(0, 5) // Limit to 5 issues to avoid embed limits
            .map(r => `${r.status === 'critical' ? '❌' : '⚠️'} ${r.name}`)
            .join('\n');
            
        if (issues) {
            embed.addFields([{
                name: "⚠️ Issues Detected",
                value: issues + (healthResults.results.filter(r => r.status !== 'success').length > 5 ? '\n... and more' : ''),
                inline: false
            }]);
        }
    }

    // Send to webhook if available
    if (web) {
        try {
            await web.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to send shard ready webhook:', error.message);
        }
    }
}
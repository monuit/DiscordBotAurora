const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: ["monitor"],
    description: "View system monitoring information",
    options: [
        {
            name: "action",
            description: "Monitoring action to perform",
            type: 3, // STRING
            required: true,
            choices: [
                { name: "status", value: "status" },
                { name: "detailed", value: "detailed" },
                { name: "reset", value: "reset" }
            ]
        }
    ],
    UserPermissions: ["Administrator"],
    BotPermissions: ["SendMessages", "EmbedLinks"],

    async run(interaction) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: 64 });
        }

        // Admin-only command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🚫 Access Denied')
                .setDescription('Only administrators can use monitoring commands.')
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
        }

        const action = interaction.options.getString('action');
        const client = interaction.client;

        try {
            switch (action) {
                case 'status':
                    await handleMonitorStatus(interaction, client);
                    break;
                case 'detailed':
                    await handleDetailedStatus(interaction, client);
                    break;
                case 'reset':
                    await handleMonitorReset(interaction, client);
                    break;
            }
        } catch (error) {
            console.error('[Monitor] Error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('⚠️ Monitor Command Error')
                .setDescription(`Error: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

async function handleMonitorStatus(interaction, client) {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMemMB = Math.round(memUsage.rss / 1024 / 1024);
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📊 System Monitor Status')
        .addFields(
            { name: '💾 Heap Memory', value: `${memUsageMB}MB`, inline: true },
            { name: '🖥️ Total Memory', value: `${totalMemMB}MB`, inline: true },
            { name: '⏱️ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '🆔 Bot', value: `${client.user.tag}`, inline: true },
            { name: '🏠 Guilds', value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Users', value: `${client.users.cache.size}`, inline: true }
        )
        .setTimestamp();

    if (client.systemMonitor) {
        const isRunning = client.systemMonitor.isRunning;
        embed.addFields({
            name: '🔍 Monitor Status',
            value: isRunning ? '🟢 Active' : '🔴 Stopped',
            inline: true
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleDetailedStatus(interaction, client) {
    const memUsage = process.memoryUsage();
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔍 Detailed System Status')
        .addFields(
            { name: '📈 Heap Used', value: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`, inline: true },
            { name: '📊 Heap Total', value: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`, inline: true },
            { name: '🗃️ External', value: `${Math.round(memUsage.external / 1024 / 1024)}MB`, inline: true },
            { name: '💽 RSS', value: `${Math.round(memUsage.rss / 1024 / 1024)}MB`, inline: true },
            { name: '📦 Array Buffers', value: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`, inline: true }
        )
        .setTimestamp();

    // Add system-specific info if available
    if (client.autoWebScrapeSender) {
        const activeCount = client.autoWebScrapeSender.activeAutoPosts?.size || 0;
        embed.addFields({
            name: '🌐 Active Auto-Posts',
            value: `${activeCount}`,
            inline: true
        });
    }

    if (client.autoPromo) {
        const roleRunning = client.autoPromo.rolePromoConfig?.isRunning || false;
        const premiumRunning = client.autoPromo.premiumPromoConfig?.isRunning || false;
        embed.addFields({
            name: '📢 Promo Campaigns',
            value: `Role: ${roleRunning ? '🟢' : '🔴'} | Premium: ${premiumRunning ? '🟢' : '🔴'}`,
            inline: true
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleMonitorReset(interaction, client) {
    if (client.systemMonitor) {
        // Reset monitoring metrics
        client.systemMonitor.metrics = {
            cpu: [],
            memory: [],
            dbLatency: [],
            networkLatency: []
        };
        
        client.systemMonitor.alertCooldown.clear();
        
        console.log('[Monitor] Metrics reset by admin:', interaction.user.tag);
    }

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('🔄 Monitor Reset')
        .setDescription('System monitoring metrics have been reset.')
        .addFields(
            { name: '👤 Reset By', value: interaction.user.tag, inline: true },
            { name: '⏰ Time', value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
